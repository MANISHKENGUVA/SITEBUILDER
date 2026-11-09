<template>
  <div class="config-workspace" @keydown="onGlobalKeyDown">
    <!-- Top Toolbar -->
    <WorkspaceToolbar
      :config-id="configuration?.id"
      :workflow-id="configuration?.workflowId"
      :workflow-version="visualModel.workflowVersion"
      :config-name="configuration?.name"
      :status="configuration?.status || 'DRAFT'"
      :active-mode="activeMode"
      :can-undo="history.canUndo"
      :can-redo="history.canRedo"
      :zoom-level="zoomLevel"
      :validation-errors-count="validation.errors.length"
      :is-saving="isSaving"
      :is-publishing="isPublishing"
      :save-state="saveState"
      @switch-mode="switchMode"
      @undo="triggerUndo"
      @redo="triggerRedo"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @zoom-reset="zoomReset"
      @validate="runValidation"
      @save-draft="saveDraft"
      @publish="openPublishModal"
      @create-new-draft="openNewDraftModal"
      @open-versions="showVersionsDrawer = true"
    />

    <!-- Main Workspace Studio Area -->
    <div class="workspace-studio">
      <!-- Left Sidebar: Palette -->
      <PaletteSidebar
        v-show="activeMode === 'visual'"
        :actors="actors"
        :modules="modules"
        :canvas-nodes="visualModel.nodes"
        :selected-node-id="selectedNodeId"
        :start-state="visualModel.startState"
        :validation-errors="validation.errors"
        @add-node="addNode"
        @select-node="selectNode"
        @create-actor="handleCreateActor"
        @create-module="handleCreateModule"
      />

      <!-- Center: Visual Canvas or JSON Editor -->
      <div class="workspace-center">
        <!-- Visual Canvas View -->
        <VisualCanvas
          v-show="activeMode === 'visual'"
          ref="canvas"
          :nodes="visualModel.nodes"
          :edges="visualModel.edges"
          :selected-node-id="selectedNodeId"
          :selected-edge-id="selectedEdgeId"
          :start-state="visualModel.startState"
          :validation-errors="validation.errors"
          :zoom="zoomLevel"
          @select-node="selectNode"
          @select-edge="selectEdge"
          @deselect-all="deselectAll"
          @move-node="moveNode"
          @add-node="addNode"
          @add-node-at="addNodeAt"
          @create-edge="createEdge"
          @delete-node="deleteNode"
          @delete-edge="deleteEdge"
          @change-zoom="setZoom"
        />

        <!-- Synchronized JSON Editor View -->
        <JsonEditorView
          v-show="activeMode === 'json'"
          :canonical-json="currentCanonicalJson"
          @apply-json="applyJsonChanges"
        />
      </div>

      <!-- Right Sidebar: Inspector -->
      <NodeInspector
        v-if="activeMode === 'visual' && selectedNode"
        :node="selectedNode"
        :all-nodes="visualModel.nodes"
        :edges="visualModel.edges"
        :actors="actors"
        :modules="modules"
        :is-start-state="selectedNode.id === visualModel.startState"
        @close="deselectAll"
        @update-node="updateNode"
        @set-start-state="setStartState"
        @create-edge="createEdge"
        @duplicate-node="duplicateNode"
        @delete-node="deleteNode"
        @select-edge="selectEdge"
      />

      <EdgeInspector
        v-else-if="activeMode === 'visual' && selectedEdge"
        :edge="selectedEdge"
        :all-nodes="visualModel.nodes"
        @close="deselectAll"
        @update-edge="updateEdge"
        @delete-edge="deleteEdge"
      />
    </div>

    <!-- Bottom Panel: Validation & Topology -->
    <ValidationPanel
      v-if="activeMode === 'visual'"
      :validation="validation"
      :nodes="visualModel.nodes"
      :edges="visualModel.edges"
      :start-state="visualModel.startState"
      @focus-node="focusNodeOnCanvas"
    />

    <!-- Version History Drawer -->
    <VersionHistoryDrawer
      v-if="showVersionsDrawer"
      :config-id="configuration?.id"
      :current-version="visualModel.workflowVersion"
      :versions="versions"
      @close="showVersionsDrawer = false"
      @branch-draft="branchDraftFromVersion"
    />

    <!-- Publish Confirmation Modal -->
    <div v-if="showPublishModal" class="modal-backdrop" @click.self="showPublishModal = false">
      <div class="modal-dialog au-card">
        <div class="modal-header">
          <h2>Publish Workflow Configuration</h2>
          <button type="button" class="close-btn" @click="showPublishModal = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="modal-alert">
            <strong>Important:</strong> Once published, version <code>{{ visualModel.workflowVersion }}</code> becomes <strong>strictly immutable</strong>. Any subsequent changes will require branching a new draft version.
          </p>

          <div class="form-group">
            <label>Release Notes / Change Summary</label>
            <textarea
              v-model.trim="publishSummary"
              rows="3"
              class="form-input"
              placeholder="Summary of changes in this production release..."
            ></textarea>
          </div>

          <div v-if="publishError" class="modal-error">
            {{ publishError }}
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn--secondary au-button" @click="showPublishModal = false">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn--primary au-button au-button--primary"
              :disabled="isPublishing"
              @click="confirmPublish"
            >
              {{ isPublishing ? "Publishing..." : "Confirm & Publish" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- New Draft Version Modal -->
    <div v-if="showNewDraftModal" class="modal-backdrop" @click.self="showNewDraftModal = false">
      <div class="modal-dialog au-card">
        <div class="modal-header">
          <h2>Create New Draft Version</h2>
          <button type="button" class="close-btn" @click="showNewDraftModal = false">✕</button>
        </div>
        <div class="modal-body">
          <p>
            Create an editable draft based on published version <code>{{ visualModel.workflowVersion }}</code>.
          </p>
          <div class="form-group">
            <label>New Version Identifier (e.g. LOAN-FLOW-V8)</label>
            <input v-model.trim="newDraftVersionInput" type="text" class="form-input" />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn--secondary au-button" @click="showNewDraftModal = false">
              Cancel
            </button>
            <button type="button" class="btn btn--primary au-button au-button--primary" @click="confirmCreateNewDraft">
              Create Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import WorkspaceToolbar from "../components/WorkspaceToolbar.vue";
import PaletteSidebar from "../components/PaletteSidebar.vue";
import VisualCanvas from "../components/VisualCanvas.vue";
import NodeInspector from "../components/NodeInspector.vue";
import EdgeInspector from "../components/EdgeInspector.vue";
import ValidationPanel from "../components/ValidationPanel.vue";
import JsonEditorView from "../components/JsonEditorView.vue";
import VersionHistoryDrawer from "../components/VersionHistoryDrawer.vue";

import {
  canonicalToVisualModel,
  visualModelToCanonical,
  extractCanvasLayout,
} from "../core/workflowSchema";
import { generateNodeId, ensureUniqueNodeId } from "../core/nodeIdentity";
import { validateClientWorkflow } from "../core/validator";
import { HistoryManager } from "../core/history";
import { DEFAULT_NODE_TEMPLATES, NODE_TYPES } from "../types/nodeTypes";
import {
  getConfiguration,
  saveConfigurationDraft,
  publishConfiguration,
  createNewDraft,
  listVersions,
  listActors,
  createActor,
  listModules,
  createModule,
} from "../api/configBuilderApi";

export default {
  name: "ConfigWorkspace",
  components: {
    WorkspaceToolbar,
    PaletteSidebar,
    VisualCanvas,
    NodeInspector,
    EdgeInspector,
    ValidationPanel,
    JsonEditorView,
    VersionHistoryDrawer,
  },
  data() {
    return {
      configuration: null,
      actors: [],
      modules: [],
      versions: [],
      activeMode: "visual",
      selectedNodeId: null,
      selectedEdgeId: null,
      visualModel: {
        workflowVersion: "V1",
        startState: "",
        nodes: [],
        edges: [],
        rawProperties: {},
      },
      zoomLevel: 1,
      history: new HistoryManager(40),
      saveState: "saved",
      isSaving: false,
      isPublishing: false,
      showVersionsDrawer: false,
      showPublishModal: false,
      showNewDraftModal: false,
      publishSummary: "",
      publishError: null,
      newDraftVersionInput: "",
      autosaveTimer: null,
    };
  },
  computed: {
    selectedNode() {
      return this.visualModel.nodes.find((n) => n.id === this.selectedNodeId) || null;
    },
    selectedEdge() {
      return this.visualModel.edges.find((e) => e.id === this.selectedEdgeId) || null;
    },
    currentCanonicalJson() {
      return visualModelToCanonical(this.visualModel, this.configuration?.definition || {});
    },
    validation() {
      return validateClientWorkflow(
        this.currentCanonicalJson,
        this.configuration?.workflowId || "",
        this.configuration?.id || ""
      );
    },
  },
  async mounted() {
    await this.initWorkspace();
    window.addEventListener("beforeunload", this.onBeforeUnload);
  },
  beforeDestroy() {
    window.removeEventListener("beforeunload", this.onBeforeUnload);
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
  },
  methods: {
    async initWorkspace() {
      const configId = this.$route.params.id;
      if (!configId) {
        this.$router.replace("/builder");
        return;
      }

      try {
        const [configData, actorsData, modulesData, versionsData] = await Promise.all([
          getConfiguration(configId),
          listActors().catch(() => []),
          listModules().catch(() => []),
          listVersions(configId).catch(() => []),
        ]);

        this.configuration = configData;
        this.actors = actorsData;
        this.modules = modulesData;
        this.versions = versionsData;

        // Convert canonical definition into reactive visual model
        const layout = configData.metadata?.canvasLayout || {};
        this.visualModel = canonicalToVisualModel(configData.definition, layout);

        // Seed initial history snapshot
        this.history.clear();
        this.history.push(JSON.parse(JSON.stringify(this.visualModel)));
        this.saveState = "saved";
      } catch (err) {
        alert("Failed to load configuration: " + err.message);
        this.$router.replace("/builder");
      }
    },
    pushHistory() {
      this.history.push(JSON.parse(JSON.stringify(this.visualModel)));
      this.markDirty();
    },
    markDirty() {
      if (this.configuration?.status !== "PUBLISHED") {
        this.saveState = "unsaved";
        this.scheduleAutosave();
      }
    },
    scheduleAutosave() {
      if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
      this.autosaveTimer = setTimeout(() => {
        if (this.saveState === "unsaved" && this.configuration?.status !== "PUBLISHED") {
          this.saveDraft(true);
        }
      }, 5000); // 5-second autosave debounce
    },
    triggerUndo() {
      const prev = this.history.undo(this.visualModel);
      if (prev) {
        this.visualModel = prev;
        this.saveState = "unsaved";
      }
    },
    triggerRedo() {
      const next = this.history.redo(this.visualModel);
      if (next) {
        this.visualModel = next;
        this.saveState = "unsaved";
      }
    },
    switchMode(mode) {
      this.activeMode = mode;
      this.deselectAll();
    },
    selectNode(id) {
      this.selectedNodeId = id;
      this.selectedEdgeId = null;
    },
    selectEdge(id) {
      this.selectedEdgeId = id;
      this.selectedNodeId = null;
    },
    deselectAll() {
      this.selectedNodeId = null;
      this.selectedEdgeId = null;
    },
    setStartState(id) {
      this.visualModel.startState = id;
      this.pushHistory();
    },
    focusNodeOnCanvas(nodeId) {
      this.selectNode(nodeId);
      const targetNode = this.visualModel.nodes.find((n) => n.id === nodeId);
      if (targetNode && this.$refs.canvas) {
        this.$refs.canvas.panX = 200 - targetNode.x * this.zoomLevel;
        this.$refs.canvas.panY = 200 - targetNode.y * this.zoomLevel;
      }
    },
    // Node CRUD
    addNode(type) {
      const tpl = DEFAULT_NODE_TEMPLATES[type] || DEFAULT_NODE_TEMPLATES.ACTOR;
      const count = this.visualModel.nodes.length + 1;
      const meta = {
        actor: tpl.metadata.actor,
        module: tpl.metadata.module,
        moduleVersion: tpl.metadata.moduleVersion,
        node: `STEP-${count}`,
        nodeVersion: "V1",
      };
      const desiredId = generateNodeId(meta);
      const { id: uniqueId } = ensureUniqueNodeId(desiredId, this.visualModel.nodes.map((n) => n.id));

      const newNode = {
        ...tpl,
        id: uniqueId,
        metadata: { ...meta, node: uniqueId.split("-").slice(3, -1).join("-") || `STEP-${count}` },
        x: 100 + (count % 4) * 280,
        y: 100 + Math.floor(count / 4) * 160,
      };

      this.visualModel.nodes.push(newNode);
      if (!this.visualModel.startState) {
        this.visualModel.startState = uniqueId;
      }
      this.selectNode(uniqueId);
      this.pushHistory();
    },
    addNodeAt({ type, x, y }) {
      const tpl = DEFAULT_NODE_TEMPLATES[type] || DEFAULT_NODE_TEMPLATES.ACTOR;
      const count = this.visualModel.nodes.length + 1;
      const meta = {
        actor: tpl.metadata.actor,
        module: tpl.metadata.module,
        moduleVersion: tpl.metadata.moduleVersion,
        node: `STEP-${count}`,
        nodeVersion: "V1",
      };
      const desiredId = generateNodeId(meta);
      const { id: uniqueId } = ensureUniqueNodeId(desiredId, this.visualModel.nodes.map((n) => n.id));

      const newNode = {
        ...tpl,
        id: uniqueId,
        metadata: meta,
        x,
        y,
      };

      this.visualModel.nodes.push(newNode);
      if (!this.visualModel.startState) {
        this.visualModel.startState = uniqueId;
      }
      this.selectNode(uniqueId);
      this.pushHistory();
    },
    moveNode({ id, x, y }) {
      const node = this.visualModel.nodes.find((n) => n.id === id);
      if (node) {
        node.x = x;
        node.y = y;
        this.markDirty();
      }
    },
    updateNode({ id, newId, ...updates }) {
      const index = this.visualModel.nodes.findIndex((n) => n.id === id);
      if (index === -1) return;

      const currentNode = this.visualModel.nodes[index];
      const targetId = newId || currentNode.id;

      // Handle ID rename cascade across edges and startState
      if (targetId !== id) {
        // Update edges fromState and toState
        this.visualModel.edges.forEach((e) => {
          if (e.fromState === id) {
            e.fromState = targetId;
            e.id = `${targetId}__${e.edgeKey}`;
          }
          if (e.toState === id) {
            e.toState = targetId;
          }
        });
        if (this.visualModel.startState === id) {
          this.visualModel.startState = targetId;
        }
        if (this.selectedNodeId === id) {
          this.selectedNodeId = targetId;
        }
      }

      this.visualModel.nodes.splice(index, 1, {
        ...currentNode,
        ...updates,
        id: targetId,
      });

      this.pushHistory();
    },
    duplicateNode(id) {
      const original = this.visualModel.nodes.find((n) => n.id === id);
      if (!original) return;

      const copyMeta = { ...original.metadata };
      const baseId = generateNodeId(copyMeta);
      const existingIds = this.visualModel.nodes.map((n) => n.id);
      const { id: uniqueId, metadata: newMeta } = ensureUniqueNodeId(baseId, existingIds, copyMeta);

      const duplicated = {
        ...JSON.parse(JSON.stringify(original)),
        id: uniqueId,
        metadata: newMeta || copyMeta,
        x: original.x + 40,
        y: original.y + 40,
      };

      this.visualModel.nodes.push(duplicated);
      this.selectNode(uniqueId);
      this.pushHistory();
    },
    deleteNode(id) {
      if (confirm(`Delete node '${id}'? Connected edges will also be removed.`)) {
        this.visualModel.nodes = this.visualModel.nodes.filter((n) => n.id !== id);
        this.visualModel.edges = this.visualModel.edges.filter(
          (e) => e.fromState !== id && e.toState !== id
        );
        if (this.visualModel.startState === id) {
          this.visualModel.startState = this.visualModel.nodes[0]?.id || "";
        }
        this.deselectAll();
        this.pushHistory();
      }
    },
    // Edge CRUD
    createEdge({ fromState, toState }) {
      if (!fromState || !toState) return;
      // Prevent duplicate edge to exact same destination
      const existing = this.visualModel.edges.find(
        (e) => e.fromState === fromState && e.toState === toState
      );
      if (existing) {
        this.selectEdge(existing.id);
        return;
      }

      const count = this.visualModel.edges.filter((e) => e.fromState === fromState).length + 1;
      const edgeKey = `ED${count < 10 ? "0" + count : count}`;
      const newEdge = {
        id: `${fromState}__${edgeKey}`,
        edgeKey,
        fromState,
        toState,
        ruleEngine: {
          operator: "AND",
          conditions: [],
        },
      };

      this.visualModel.edges.push(newEdge);
      this.selectEdge(newEdge.id);
      this.pushHistory();
    },
    updateEdge({ id, ...updates }) {
      const idx = this.visualModel.edges.findIndex((e) => e.id === id);
      if (idx !== -1) {
        const current = this.visualModel.edges[idx];
        const newEdgeKey = updates.edgeKey || current.edgeKey;
        const newEdgeId = `${current.fromState}__${newEdgeKey}`;

        this.visualModel.edges.splice(idx, 1, {
          ...current,
          ...updates,
          id: newEdgeId,
        });

        if (this.selectedEdgeId === id) {
          this.selectedEdgeId = newEdgeId;
        }
        this.pushHistory();
      }
    },
    deleteEdge(id) {
      this.visualModel.edges = this.visualModel.edges.filter((e) => e.id !== id);
      this.deselectAll();
      this.pushHistory();
    },
    // Zoom
    setZoom(val) {
      this.zoomLevel = Math.round(val * 100) / 100;
    },
    zoomIn() {
      this.setZoom(Math.min(this.zoomLevel + 0.1, 2.2));
    },
    zoomOut() {
      this.setZoom(Math.max(this.zoomLevel - 0.1, 0.3));
    },
    zoomReset() {
      this.setZoom(1);
    },
    // Validation
    runValidation() {
      const res = this.validation;
      if (res.valid) {
        alert("✓ Configuration is valid! Zero errors found.");
      } else {
        alert(
          `Validation failed with ${res.errors.length} error(s):\n- ` +
            res.errors.map((e) => e.message).join("\n- ")
        );
      }
    },
    // Save draft
    async saveDraft(isSilent = false) {
      if (this.configuration?.status === "PUBLISHED") {
        if (!isSilent) alert("This configuration is PUBLISHED and immutable. Create a new draft first.");
        return;
      }
      this.isSaving = true;
      this.saveState = "saving";
      try {
        const canonical = this.currentCanonicalJson;
        const layout = extractCanvasLayout(this.visualModel.nodes);
        const metadata = { ...(this.configuration?.metadata || {}), canvasLayout: layout };

        const updated = await saveConfigurationDraft(this.configuration.id, {
          definition: canonical,
          metadata,
          currentVersion: this.visualModel.workflowVersion,
        });

        this.configuration = updated;
        this.saveState = "saved";
        if (!isSilent) {
          alert("✓ Workflow configuration draft saved successfully.");
        }
      } catch (err) {
        this.saveState = "unsaved";
        if (!isSilent) {
          alert("Save draft failed: " + err.message);
        }
      } finally {
        this.isSaving = false;
      }
    },
    // Publishing
    openPublishModal() {
      if (this.validation.errors.length > 0) {
        alert(
          `Cannot publish configuration with ${this.validation.errors.length} error(s). Please resolve them first.`
        );
        return;
      }
      this.publishError = null;
      this.publishSummary = `Production release of version ${this.visualModel.workflowVersion}`;
      this.showPublishModal = true;
    },
    async confirmPublish() {
      this.isPublishing = true;
      this.publishError = null;
      try {
        // Save first to ensure server snapshot matches exactly
        await this.saveDraft(true);

        const published = await publishConfiguration(this.configuration.id, {
          changeSummary: this.publishSummary,
        });

        this.configuration = published;
        this.showPublishModal = false;
        // Refresh versions list
        this.versions = await listVersions(this.configuration.id);
        alert(`🎉 Version ${published.currentVersion} published successfully! It is now immutable.`);
      } catch (err) {
        this.publishError = err.message || "Publish failed";
      } finally {
        this.isPublishing = false;
      }
    },
    // New draft
    openNewDraftModal() {
      const match = this.visualModel.workflowVersion.match(/(.*?)(?:-?V?)(\d+)$/i);
      if (match) {
        const num = parseInt(match[2], 10) + 1;
        this.newDraftVersionInput = `LOAN-FLOW-V${num}`;
      } else {
        this.newDraftVersionInput = `${this.visualModel.workflowVersion}-DRAFT`;
      }
      this.showNewDraftModal = true;
    },
    async confirmCreateNewDraft() {
      try {
        const draft = await createNewDraft(this.configuration.id, {
          newVersion: this.newDraftVersionInput,
        });
        this.configuration = draft;
        this.visualModel.workflowVersion = draft.currentVersion;
        this.showNewDraftModal = false;
        this.versions = await listVersions(this.configuration.id);
        alert(`✓ Created new draft version ${draft.currentVersion}! You may now edit.`);
      } catch (err) {
        alert("Failed to create new draft: " + err.message);
      }
    },
    async branchDraftFromVersion(ver) {
      if (confirm(`Create a new draft version based on snapshot '${ver.version}'?`)) {
        this.newDraftVersionInput = `${ver.version}-NEW-DRAFT`;
        await this.confirmCreateNewDraft();
        this.showVersionsDrawer = false;
      }
    },
    // JSON Editor sync
    applyJsonChanges(newCanonicalJson) {
      const layout = this.configuration?.metadata?.canvasLayout || {};
      this.visualModel = canonicalToVisualModel(newCanonicalJson, layout);
      this.pushHistory();
      alert("✓ Applied JSON changes to Visual Canvas.");
    },
    // Registries
    async handleCreateActor(actorData) {
      try {
        const created = await createActor(actorData);
        this.actors.push(created);
      } catch (e) {
        alert("Failed to save actor: " + e.message);
      }
    },
    async handleCreateModule(moduleData) {
      try {
        const created = await createModule(moduleData);
        this.modules.push(created);
      } catch (e) {
        alert("Failed to save module: " + e.message);
      }
    },
    // Hotkeys
    onGlobalKeyDown(e) {
      // Save: Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        this.saveDraft();
      }
      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        this.triggerUndo();
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        this.triggerRedo();
      }
    },
    onBeforeUnload(e) {
      if (this.saveState === "unsaved") {
        e.preventDefault();
        e.returnValue = "";
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.config-workspace {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: $color-bg-body;
}

.workspace-studio {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.workspace-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-dialog {
  width: 500px;
  max-width: 90vw;
  background: #ffffff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid $color-border-light;
  background: $color-bg-body;
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
    font-size: 16px;
  }
}

.modal-body {
  padding: 20px;
}

.modal-alert {
  padding: 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
  font-size: 12px;
  color: #92400e;
  margin-bottom: 16px;
  line-height: 1.4;
}

.modal-error {
  padding: 8px 12px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  font-size: 12px;
  color: #dc2626;
  margin-top: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
}

.form-group {
  margin-bottom: 12px;

  label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 4px;
    color: $color-text-secondary;
  }
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 12px;
  border: 1px solid $color-border-light;
  border-radius: 6px;
  box-sizing: border-box;
}
</style>
