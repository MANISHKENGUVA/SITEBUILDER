<template>
  <aside class="palette-sidebar" :class="{ 'is-collapsed': isCollapsed }">
    <div class="palette__header">
      <div v-if="!isCollapsed" class="palette__tabs">
        <button
          type="button"
          class="palette__tab"
          :class="{ 'is-active': activeTab === 'nodes' }"
          title="Add Nodes"
          @click="activeTab = 'nodes'"
        >
          Nodes
        </button>
        <button
          type="button"
          class="palette__tab"
          :class="{ 'is-active': activeTab === 'actors' }"
          title="Dynamic Actors"
          @click="activeTab = 'actors'"
        >
          Actors
        </button>
        <button
          type="button"
          class="palette__tab"
          :class="{ 'is-active': activeTab === 'modules' }"
          title="Dynamic Modules"
          @click="activeTab = 'modules'"
        >
          Modules
        </button>
        <button
          type="button"
          class="palette__tab"
          :class="{ 'is-active': activeTab === 'outline' }"
          title="Workflow Nodes Outline"
          @click="activeTab = 'outline'"
        >
          Outline ({{ canvasNodes.length }})
        </button>
      </div>

      <button
        type="button"
        class="palette__collapse-btn"
        :title="isCollapsed ? 'Expand Palette' : 'Collapse Palette'"
        @click="isCollapsed = !isCollapsed"
      >
        <span aria-hidden="true">{{ isCollapsed ? "▶" : "◀" }}</span>
      </button>
    </div>

    <div v-if="!isCollapsed" class="palette__content">
      <!-- ── Tab 1: Node Types Palette ───────────────────────────── -->
      <div v-if="activeTab === 'nodes'" class="palette__section">
        <p class="palette__hint">
          Drag or click a node type to add it to the workflow canvas:
        </p>

        <div class="node-cards">
          <div
            v-for="(info, type) in nodeTypesInfo"
            :key="type"
            class="node-card"
            :style="{ '--node-theme': info.color }"
            draggable="true"
            @dragstart="onDragStart($event, type)"
            @click="$emit('add-node', type)"
          >
            <div class="node-card__header">
              <span class="node-card__badge" :class="info.badgeClass">{{ type }}</span>
              <span class="node-card__category">{{ info.category }}</span>
            </div>
            <h3 class="node-card__title">{{ info.name }}</h3>
            <p class="node-card__desc">{{ info.description }}</p>
            <div class="node-card__footer">
              <span class="node-card__action">+ Click or Drag</span>
            </div>
          </div>
        </div>

        <div class="palette__callout">
          <span class="palette__callout-icon">💡</span>
          <p>
            Rules are configured directly on <strong>outgoing edges</strong> between nodes. There is no separate decision node.
          </p>
        </div>
      </div>

      <!-- ── Tab 2: Dynamic Actors Registry ──────────────────────── -->
      <div v-if="activeTab === 'actors'" class="palette__section">
        <div class="palette__subhead">
          <span>Registered Actors</span>
          <button
            type="button"
            class="btn btn--sm btn--primary au-button au-button--primary"
            @click="showAddActorModal = true"
          >
            + Add Actor
          </button>
        </div>
        <p class="palette__hint">Actors are dynamic and driven by backend registry:</p>

        <ul class="actor-list">
          <li v-for="actor in actors" :key="actor.id" class="actor-item">
            <div class="actor-item__badge">{{ actor.id }}</div>
            <div class="actor-item__info">
              <strong>{{ actor.name }}</strong>
              <small>{{ actor.description || "Custom workflow actor" }}</small>
            </div>
          </li>
        </ul>
      </div>

      <!-- ── Tab 3: Dynamic Modules Registry ─────────────────────── -->
      <div v-if="activeTab === 'modules'" class="palette__section">
        <div class="palette__subhead">
          <span>Registered Modules</span>
          <button
            type="button"
            class="btn btn--sm btn--primary au-button au-button--primary"
            @click="showAddModuleModal = true"
          >
            + Add Module
          </button>
        </div>
        <p class="palette__hint">Modules group related nodes with independent versioning:</p>

        <ul class="module-list">
          <li v-for="mod in modules" :key="mod.id" class="module-item">
            <div class="module-item__head">
              <strong>{{ mod.id }}</strong>
              <span class="au-chip au-chip--default">{{ mod.defaultVersion || 'V1' }}</span>
            </div>
            <div class="module-item__name">{{ mod.name }}</div>
          </li>
        </ul>
      </div>

      <!-- ── Tab 4: Nodes Outline / Search ───────────────────────── -->
      <div v-if="activeTab === 'outline'" class="palette__section">
        <label class="palette__search-wrap">
          <span class="sr-only">Search nodes</span>
          <input
            v-model.trim="outlineSearch"
            type="search"
            class="palette__search-input"
            placeholder="Filter nodes..."
          />
        </label>

        <ul v-if="filteredCanvasNodes.length" class="outline-list">
          <li
            v-for="node in filteredCanvasNodes"
            :key="node.id"
            class="outline-item"
            :class="{ 'is-selected': selectedNodeId === node.id, 'is-start': node.id === startState }"
            @click="$emit('select-node', node.id)"
          >
            <div class="outline-item__type-dot" :class="'type-' + node.type.toLowerCase()"></div>
            <div class="outline-item__body">
              <div class="outline-item__id">
                <span v-if="node.id === startState" class="start-tag" title="Start Node">★ START</span>
                {{ node.id }}
              </div>
              <div class="outline-item__meta">
                <span class="meta-tag">{{ node.metadata?.actor || 'ACTOR' }}</span>
                <span class="meta-tag">{{ node.type }}</span>
                <span v-if="hasNodeErrors(node.id)" class="error-tag">! Error</span>
              </div>
            </div>
          </li>
        </ul>
        <p v-else class="palette__empty">No nodes match your filter.</p>
      </div>
    </div>

    <!-- Add Actor Modal -->
    <div v-if="showAddActorModal" class="palette-modal-backdrop" @click.self="showAddActorModal = false">
      <div class="palette-modal au-card">
        <h3>Add Workflow Actor</h3>
        <p class="modal-intro">Register a new dynamic workflow participant.</p>

        <div class="form-group">
          <label>Actor Identifier (e.g. COBORROWER, NOTARY)</label>
          <input v-model.trim="newActor.id" type="text" placeholder="NOTARY" class="form-input" />
        </div>
        <div class="form-group">
          <label>Display Name</label>
          <input v-model.trim="newActor.name" type="text" placeholder="Legal Notary" class="form-input" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <input v-model.trim="newActor.description" type="text" placeholder="Performs document notarization" class="form-input" />
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn--secondary au-button" @click="showAddActorModal = false">Cancel</button>
          <button type="button" class="btn btn--primary au-button" :disabled="!newActor.id || !newActor.name" @click="saveNewActor">
            Save Actor
          </button>
        </div>
      </div>
    </div>

    <!-- Add Module Modal -->
    <div v-if="showAddModuleModal" class="palette-modal-backdrop" @click.self="showAddModuleModal = false">
      <div class="palette-modal au-card">
        <h3>Add Workflow Module</h3>
        <p class="modal-intro">Register a dynamic domain module.</p>

        <div class="form-group">
          <label>Module Identifier (e.g. ESCROW, NOTARY)</label>
          <input v-model.trim="newModule.id" type="text" placeholder="ESCROW" class="form-input" />
        </div>
        <div class="form-group">
          <label>Display Name</label>
          <input v-model.trim="newModule.name" type="text" placeholder="Escrow Account Management" class="form-input" />
        </div>
        <div class="form-group">
          <label>Initial Version</label>
          <input v-model.trim="newModule.defaultVersion" type="text" placeholder="V1" class="form-input" />
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn--secondary au-button" @click="showAddModuleModal = false">Cancel</button>
          <button type="button" class="btn btn--primary au-button" :disabled="!newModule.id || !newModule.name" @click="saveNewModule">
            Save Module
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script>
import { NODE_TYPE_INFO } from "../types/nodeTypes";

export default {
  name: "PaletteSidebar",
  props: {
    actors: { type: Array, default: () => [] },
    modules: { type: Array, default: () => [] },
    canvasNodes: { type: Array, default: () => [] },
    selectedNodeId: { type: String, default: null },
    startState: { type: String, default: "" },
    validationErrors: { type: Array, default: () => [] },
  },
  data() {
    return {
      isCollapsed: false,
      activeTab: "nodes",
      nodeTypesInfo: NODE_TYPE_INFO,
      outlineSearch: "",
      showAddActorModal: false,
      showAddModuleModal: false,
      newActor: { id: "", name: "", description: "" },
      newModule: { id: "", name: "", defaultVersion: "V1" },
    };
  },
  computed: {
    filteredCanvasNodes() {
      if (!this.outlineSearch) return this.canvasNodes;
      const q = this.outlineSearch.toLowerCase();
      return this.canvasNodes.filter(
        (n) =>
          n.id.toLowerCase().includes(q) ||
          (n.metadata?.actor && n.metadata.actor.toLowerCase().includes(q)) ||
          (n.metadata?.module && n.metadata.module.toLowerCase().includes(q))
      );
    },
  },
  methods: {
    onDragStart(event, type) {
      event.dataTransfer.setData("application/json", JSON.stringify({ type }));
      event.dataTransfer.effectAllowed = "copy";
    },
    hasNodeErrors(nodeId) {
      return this.validationErrors.some((e) => e.nodeKey === nodeId);
    },
    saveNewActor() {
      if (!this.newActor.id || !this.newActor.name) return;
      this.$emit("create-actor", {
        id: this.newActor.id.toUpperCase().trim(),
        name: this.newActor.name.trim(),
        description: this.newActor.description.trim(),
      });
      this.showAddActorModal = false;
      this.newActor = { id: "", name: "", description: "" };
    },
    saveNewModule() {
      if (!this.newModule.id || !this.newModule.name) return;
      this.$emit("create-module", {
        id: this.newModule.id.toUpperCase().trim(),
        name: this.newModule.name.trim(),
        defaultVersion: this.newModule.defaultVersion.toUpperCase().trim() || "V1",
      });
      this.showAddModuleModal = false;
      this.newModule = { id: "", name: "", defaultVersion: "V1" };
    },
  },
};
</script>

<style lang="scss" scoped>
.palette-sidebar {
  width: 290px;
  background: $color-bg-surface;
  border-right: 1px solid $color-border-light;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  overflow: hidden;
  flex-shrink: 0;

  &.is-collapsed {
    width: 44px;
  }
}

.palette__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-bottom: 1px solid $color-border-light;
  background: $color-bg-body;
}

.palette__tabs {
  display: flex;
  gap: 2px;
  overflow-x: auto;
}

.palette__tab {
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: $color-text-secondary;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;

  &.is-active {
    background: $color-bg-surface;
    color: $color-spruce-base;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
}

.palette__collapse-btn {
  padding: 4px 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: $color-text-muted;
  font-size: 11px;

  &:hover {
    color: $color-text-primary;
  }
}

.palette__content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.palette__hint {
  font-size: 12px;
  color: $color-text-muted;
  margin-bottom: 12px;
}

.palette__subhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 700;
  font-size: 13px;
  color: $color-text-primary;
}

.node-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.node-card {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid $color-border-light;
  background: $color-bg-surface;
  cursor: grab;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  border-left: 4px solid var(--node-theme);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  }
}

.node-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.node-card__badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--node-theme);
}

.node-card__category {
  font-size: 10px;
  color: $color-text-muted;
}

.node-card__title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
  color: $color-text-primary;
}

.node-card__desc {
  margin: 0 0 8px;
  font-size: 11px;
  color: $color-text-secondary;
  line-height: 1.35;
}

.node-card__footer {
  font-size: 10px;
  font-weight: 600;
  color: $color-spruce-base;
}

.palette__callout {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  padding: 10px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  font-size: 11px;
  color: #166534;
  line-height: 1.35;

  p {
    margin: 0;
  }
}

.actor-list,
.module-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.actor-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid $color-border-light;
  border-radius: 6px;
  background: $color-bg-body;
}

.actor-item__badge {
  font-family: monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  background: #e2e8f0;
  color: #1e293b;
  border-radius: 4px;
}

.actor-item__info {
  display: flex;
  flex-direction: column;

  strong {
    font-size: 12px;
    color: $color-text-primary;
  }
  small {
    font-size: 10px;
    color: $color-text-muted;
  }
}

.module-item {
  padding: 8px 10px;
  border: 1px solid $color-border-light;
  border-radius: 6px;
  background: $color-bg-body;
}

.module-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
  font-size: 12px;
}

.module-item__name {
  font-size: 11px;
  color: $color-text-secondary;
}

.palette__search-input {
  width: 100%;
  padding: 6px 10px;
  font-size: 12px;
  border: 1px solid $color-border-light;
  border-radius: 6px;
  margin-bottom: 10px;
  box-sizing: border-box;
}

.outline-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.outline-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border: 1px solid $color-border-light;
  border-radius: 6px;
  background: $color-bg-surface;
  cursor: pointer;

  &:hover {
    background: #f8fafc;
  }

  &.is-selected {
    border-color: $color-spruce-base;
    background: #f0fdfa;
  }
}

.outline-item__type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;

  &.type-actor { background: #034953; }
  &.type-system_internal_process { background: #6b21a8; }
  &.type-webhook { background: #c2410c; }
  &.type-api { background: #0284c7; }
}

.outline-item__body {
  min-width: 0;
  flex: 1;
}

.outline-item__id {
  font-size: 11px;
  font-weight: 600;
  font-family: monospace;
  word-break: break-all;
  color: $color-text-primary;
}

.start-tag {
  color: #d97706;
  font-weight: 700;
  font-size: 9px;
  margin-right: 4px;
}

.outline-item__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
}

.meta-tag {
  font-size: 9px;
  color: $color-text-muted;
}

.error-tag {
  font-size: 9px;
  font-weight: 700;
  color: #dc2626;
}

.palette-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.palette-modal {
  width: 380px;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);

  h3 {
    margin: 0 0 6px;
    font-size: 16px;
  }
}

.modal-intro {
  font-size: 12px;
  color: $color-text-secondary;
  margin-bottom: 14px;
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
  padding: 6px 10px;
  font-size: 12px;
  border: 1px solid $color-border-light;
  border-radius: 6px;
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
}
</style>
