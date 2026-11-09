<template>
  <div class="node-inspector">
    <div class="inspector__header">
      <div class="inspector__title-wrap">
        <span class="inspector__type-badge" :style="{ background: typeColor }">
          {{ node.type }}
        </span>
        <h2>Node Configuration</h2>
      </div>
      <button
        type="button"
        class="inspector__close-btn"
        title="Close Inspector"
        @click="$emit('close')"
      >
        ✕
      </button>
    </div>

    <div class="inspector__body">
      <!-- ── SECTION 1: NODE IDENTITY GENERATOR ───────────────────── -->
      <section class="inspector__section">
        <h3 class="section-title">
          <span>Node Identity Generator</span>
          <span class="section-badge">Authoritative</span>
        </h3>
        <p class="section-hint">
          Standard format: <code>ACTOR-MODULE-MODULEVERSION-NODE-NODEVERSION</code>
        </p>

        <!-- Live Generated ID Preview -->
        <div class="identity-preview" :class="{ 'has-collision': idCollision }">
          <div class="preview-label">Generated State ID:</div>
          <code class="preview-code">{{ liveStateId || "—" }}</code>
          <div v-if="idCollision" class="collision-warning">
            ⚠️ An existing node already uses this identity. Please adjust the node name or version.
          </div>
        </div>

        <div class="form-grid">
          <!-- 1. Actor -->
          <div class="form-group">
            <label>1. Actor</label>
            <div class="input-with-select">
              <select
                :value="metadata.actor"
                @change="onActorSelect($event.target.value)"
              >
                <option value="">-- Choose Actor --</option>
                <option v-for="a in actors" :key="a.id" :value="a.id">
                  {{ a.id }} ({{ a.name }})
                </option>
                <option value="__CUSTOM__">+ Custom Actor...</option>
              </select>
              <input
                v-if="isCustomActor"
                v-model.trim="customActorInput"
                type="text"
                placeholder="CUSTOM-ACTOR"
                class="form-input custom-input"
                @input="updateMeta('actor', customActorInput)"
              />
            </div>
          </div>

          <!-- 2. Module -->
          <div class="form-group">
            <label>2. Module</label>
            <div class="input-with-select">
              <select
                :value="metadata.module"
                @change="onModuleSelect($event.target.value)"
              >
                <option value="">-- Choose Module --</option>
                <option v-for="m in modules" :key="m.id" :value="m.id">
                  {{ m.id }} ({{ m.name }})
                </option>
                <option value="__CUSTOM__">+ Custom Module...</option>
              </select>
              <input
                v-if="isCustomModule"
                v-model.trim="customModuleInput"
                type="text"
                placeholder="CUSTOM-MODULE"
                class="form-input custom-input"
                @input="updateMeta('module', customModuleInput)"
              />
            </div>
          </div>

          <!-- 3. Module Version -->
          <div class="form-group">
            <label>3. Module Version</label>
            <input
              :value="metadata.moduleVersion"
              type="text"
              placeholder="V1"
              class="form-input"
              @input="updateMeta('moduleVersion', $event.target.value)"
            />
          </div>

          <!-- 4. Node Name (Multiword supported) -->
          <div class="form-group">
            <label>4. Node Name (Multiword supported)</label>
            <input
              :value="metadata.node"
              type="text"
              placeholder="PERSONAL-INFO"
              class="form-input"
              @input="updateMeta('node', $event.target.value)"
            />
            <small class="field-hint">e.g. PERSONAL-INFO, FRAUD-CHECK-PENDING</small>
          </div>

          <!-- 5. Node Version -->
          <div class="form-group">
            <label>5. Node Version</label>
            <input
              :value="metadata.nodeVersion"
              type="text"
              placeholder="V1"
              class="form-input"
              @input="updateMeta('nodeVersion', $event.target.value)"
            />
          </div>
        </div>

        <!-- Node Type Selector -->
        <div class="form-group mt-2">
          <label>Node Execution Type</label>
          <select
            :value="node.type"
            class="form-select"
            @change="updateNodeType($event.target.value)"
          >
            <option value="ACTOR">ACTOR (User Form Step)</option>
            <option value="SYSTEM_INTERNAL_PROCESS">SYSTEM_INTERNAL_PROCESS (Backend Process)</option>
            <option value="WEBHOOK">WEBHOOK (HTTP Webhook Integration)</option>
            <option value="API">API (REST API Request)</option>
          </select>
        </div>

        <!-- Start State Toggle -->
        <div class="form-check mt-2">
          <label class="check-label">
            <input
              type="checkbox"
              :checked="isStartState"
              @change="$emit('set-start-state', node.id)"
            />
            <span>Set as Workflow Start State</span>
          </label>
        </div>
      </section>

      <!-- ── SECTION 2: TYPE-SPECIFIC CONFIGURATION ──────────────── -->

      <!-- A. ACTOR Configuration -->
      <section v-if="node.type === 'ACTOR'" class="inspector__section">
        <h3 class="section-title">Actor Step Configuration</h3>

        <div class="form-group">
          <label>Component Reference</label>
          <select
            :value="node.component"
            class="form-select"
            @change="updateField('component', $event.target.value)"
          >
            <option value="">-- Choose Registered Component --</option>
            <option v-for="name in registeredComponents" :key="name" :value="name">
              {{ name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Access Control</label>
          <select
            :value="node.access?.type || 'PUBLIC'"
            class="form-select"
            @change="updateAccessType($event.target.value)"
          >
            <option value="PUBLIC">PUBLIC (Anonymous allowed)</option>
            <option value="AUTHENTICATED">AUTHENTICATED (Session verified)</option>
            <option value="CAPTCHA">CAPTCHA (reCAPTCHA protected)</option>
          </select>
        </div>
      </section>

      <!-- B. SYSTEM_INTERNAL_PROCESS Configuration -->
      <section v-if="node.type === 'SYSTEM_INTERNAL_PROCESS'" class="inspector__section">
        <h3 class="section-title">Internal Process Configuration</h3>

        <div class="form-group">
          <label>Process Handler</label>
          <input
            :value="node.processHandler || node.settings?.processHandler"
            type="text"
            placeholder="calculateInterestRate"
            class="form-input"
            @input="updateField('processHandler', $event.target.value)"
          />
          <small class="field-hint">Backend function executed for this automatic task</small>
        </div>

        <div class="form-group">
          <label>Execution Timeout (ms)</label>
          <input
            :value="node.settings?.timeoutMs || 5000"
            type="number"
            class="form-input"
            @input="updateSettings('timeoutMs', Number($event.target.value))"
          />
        </div>
      </section>

      <!-- C. WEBHOOK Configuration -->
      <section v-if="node.type === 'WEBHOOK'" class="inspector__section">
        <h3 class="section-title">Webhook Configuration</h3>

        <div class="form-group">
          <label>Webhook Endpoint URL</label>
          <input
            :value="node.endpoint"
            type="url"
            placeholder="https://hooks.partner.com/events/trigger"
            class="form-input"
            @input="updateField('endpoint', $event.target.value)"
          />
        </div>

        <div class="form-group">
          <label>HTTP Method</label>
          <select
            :value="node.method || 'POST'"
            class="form-select"
            @change="updateField('method', $event.target.value)"
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div class="form-group">
          <label>Timeout (ms)</label>
          <input
            :value="node.timeout || 5000"
            type="number"
            class="form-input"
            @input="updateField('timeout', Number($event.target.value))"
          />
        </div>
      </section>

      <!-- D. API Configuration -->
      <section v-if="node.type === 'API'" class="inspector__section">
        <h3 class="section-title">API Integration Configuration</h3>

        <div class="form-group">
          <label>API Endpoint URL</label>
          <input
            :value="node.endpoint"
            type="url"
            placeholder="https://api.partner.com/v1/score"
            class="form-input"
            @input="updateField('endpoint', $event.target.value)"
          />
        </div>

        <div class="form-group">
          <label>HTTP Method</label>
          <select
            :value="node.method || 'POST'"
            class="form-select"
            @change="updateField('method', $event.target.value)"
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
        </div>

        <div class="form-group">
          <label>Timeout (ms)</label>
          <input
            :value="node.timeout || 8000"
            type="number"
            class="form-input"
            @input="updateField('timeout', Number($event.target.value))"
          />
        </div>
      </section>

      <!-- ── SECTION 3: OUTGOING EDGES / TRANSITIONS ──────────────── -->
      <section class="inspector__section">
        <div class="inspector__subhead">
          <h3 class="section-title">Outgoing Transitions ({{ outgoingEdges.length }})</h3>
          <button
            type="button"
            class="btn btn--sm btn--secondary au-button"
            @click="showAddEdge = !showAddEdge"
          >
            + Add Edge
          </button>
        </div>

        <!-- Add Outgoing Edge Inline Form -->
        <div v-if="showAddEdge" class="add-edge-card">
          <h4>Connect Outgoing Transition</h4>
          <div class="form-group">
            <label>Target Node</label>
            <select v-model="newEdgeTarget" class="form-select">
              <option value="">-- Choose Target State --</option>
              <option
                v-for="targetNode in potentialTargets"
                :key="targetNode.id"
                :value="targetNode.id"
              >
                {{ targetNode.id }}
              </option>
            </select>
          </div>
          <div class="add-edge-actions">
            <button type="button" class="btn btn--sm btn--secondary" @click="showAddEdge = false">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn--sm btn--primary au-button"
              :disabled="!newEdgeTarget"
              @click="confirmAddEdge"
            >
              Connect
            </button>
          </div>
        </div>

        <!-- Outgoing edges list -->
        <ul v-if="outgoingEdges.length" class="edge-list">
          <li
            v-for="edge in outgoingEdges"
            :key="edge.id"
            class="edge-item"
            @click="$emit('select-edge', edge.id)"
          >
            <div class="edge-item__head">
              <span class="edge-item__key">{{ edge.edgeKey || 'EDGE' }}</span>
              <span class="edge-item__op">{{ edge.ruleEngine?.operator || 'AND' }}</span>
            </div>
            <div class="edge-item__target">→ {{ edge.toState }}</div>
            <div class="edge-item__cond-count">
              {{ edge.ruleEngine?.conditions?.length || 0 }} condition(s)
            </div>
          </li>
        </ul>
        <p v-else class="empty-note">
          No outgoing edges configured. This node is currently a terminal step.
        </p>
      </section>

      <!-- ── SECTION 4: ACTIONS ──────────────────────────────────── -->
      <section class="inspector__section inspector__actions-section">
        <button
          type="button"
          class="btn btn--secondary au-button full-width"
          @click="$emit('duplicate-node', node.id)"
        >
          Duplicate Node
        </button>

        <button
          type="button"
          class="btn btn--danger au-button full-width mt-2"
          @click="$emit('delete-node', node.id)"
        >
          Delete Node
        </button>
      </section>
    </div>
  </div>
</template>

<script>
import { NODE_TYPE_INFO } from "../types/nodeTypes";
import { generateNodeId } from "../core/nodeIdentity";
import { registeredNames } from "@/components/registry/componentRegistry";

export default {
  name: "NodeInspector",
  props: {
    node: { type: Object, required: true },
    allNodes: { type: Array, default: () => [] },
    edges: { type: Array, default: () => [] },
    actors: { type: Array, default: () => [] },
    modules: { type: Array, default: () => [] },
    isStartState: { type: Boolean, default: false },
  },
  data() {
    return {
      registeredComponents: registeredNames(),
      isCustomActor: false,
      customActorInput: "",
      isCustomModule: false,
      customModuleInput: "",
      showAddEdge: false,
      newEdgeTarget: "",
    };
  },
  computed: {
    metadata() {
      return this.node.metadata || {};
    },
    typeColor() {
      return NODE_TYPE_INFO[this.node.type]?.color || "#034953";
    },
    liveStateId() {
      return generateNodeId(this.metadata);
    },
    idCollision() {
      if (!this.liveStateId) return false;
      return this.allNodes.some(
        (n) => n.id !== this.node.id && n.id === this.liveStateId
      );
    },
    outgoingEdges() {
      return this.edges.filter((e) => e.fromState === this.node.id);
    },
    potentialTargets() {
      return this.allNodes.filter((n) => n.id !== this.node.id);
    },
  },
  methods: {
    updateMeta(key, value) {
      const cleanVal = String(value || "").toUpperCase().trim();
      const updatedMeta = { ...this.metadata, [key]: cleanVal };
      const newCalculatedId = generateNodeId(updatedMeta);
      this.$emit("update-node", {
        id: this.node.id,
        newId: newCalculatedId,
        metadata: updatedMeta,
      });
    },
    onActorSelect(val) {
      if (val === "__CUSTOM__") {
        this.isCustomActor = true;
      } else {
        this.isCustomActor = false;
        this.updateMeta("actor", val);
      }
    },
    onModuleSelect(val) {
      if (val === "__CUSTOM__") {
        this.isCustomModule = true;
      } else {
        this.isCustomModule = false;
        this.updateMeta("module", val);
      }
    },
    updateNodeType(type) {
      this.$emit("update-node", {
        id: this.node.id,
        type,
      });
    },
    updateField(field, value) {
      this.$emit("update-node", {
        id: this.node.id,
        [field]: value,
      });
    },
    updateAccessType(type) {
      this.$emit("update-node", {
        id: this.node.id,
        access: { type },
      });
    },
    updateSettings(key, val) {
      const newSettings = { ...(this.node.settings || {}), [key]: val };
      this.$emit("update-node", {
        id: this.node.id,
        settings: newSettings,
      });
    },
    confirmAddEdge() {
      if (!this.newEdgeTarget) return;
      this.$emit("create-edge", {
        fromState: this.node.id,
        toState: this.newEdgeTarget,
      });
      this.showAddEdge = false;
      this.newEdgeTarget = "";
    },
  },
};
</script>

<style lang="scss" scoped>
.node-inspector {
  width: 340px;
  background: $color-bg-surface;
  border-left: 1px solid $color-border-light;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  flex-shrink: 0;
}

.inspector__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid $color-border-light;
  background: $color-bg-body;
}

.inspector__title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;

  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
  }
}

.inspector__type-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  color: #fff;
  text-transform: uppercase;
}

.inspector__close-btn {
  background: transparent;
  border: none;
  font-size: 14px;
  color: $color-text-muted;
  cursor: pointer;

  &:hover {
    color: $color-text-primary;
  }
}

.inspector__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.inspector__section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid $color-border-light;
}

.section-title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 700;
  color: $color-text-primary;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-badge {
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  background: #e0f2fe;
  color: #0369a1;
  border-radius: 4px;
}

.section-hint {
  font-size: 11px;
  color: $color-text-muted;
  margin-bottom: 10px;

  code {
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 3px;
  }
}

.identity-preview {
  background: #f8fafc;
  border: 1px solid $color-border-light;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 12px;

  &.has-collision {
    border-color: #dc2626;
    background: #fef2f2;
  }
}

.preview-label {
  font-size: 10px;
  font-weight: 600;
  color: $color-text-muted;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.preview-code {
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  color: $color-spruce-base;
  word-break: break-all;
}

.collision-warning {
  margin-top: 6px;
  font-size: 10px;
  color: #dc2626;
  font-weight: 600;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 11px;
    font-weight: 600;
    color: $color-text-secondary;
  }
}

.form-input,
.form-select {
  width: 100%;
  padding: 6px 10px;
  font-size: 12px;
  border: 1px solid $color-border-light;
  border-radius: 6px;
  box-sizing: border-box;
}

.custom-input {
  margin-top: 4px;
}

.field-hint {
  font-size: 10px;
  color: $color-text-muted;
}

.check-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: $color-text-primary;
  cursor: pointer;
}

.mt-2 { margin-top: 8px; }
.full-width { width: 100%; }

.btn--danger {
  background: #dc2626;
  color: #fff;
  border: 1px solid #b91c1c;

  &:hover {
    background: #b91c1c;
  }
}

.inspector__subhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.add-edge-card {
  padding: 10px;
  border: 1px solid $color-border-light;
  border-radius: 6px;
  background: #f8fafc;
  margin-bottom: 12px;

  h4 {
    margin: 0 0 8px;
    font-size: 12px;
  }
}

.add-edge-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}

.edge-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.edge-item {
  padding: 8px 10px;
  border: 1px solid $color-border-light;
  border-radius: 6px;
  background: #f8fafc;
  cursor: pointer;

  &:hover {
    background: #f1f5f9;
    border-color: $color-spruce-base;
  }
}

.edge-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.edge-item__key {
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  color: $color-text-primary;
}

.edge-item__op {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  background: #e2e8f0;
  border-radius: 3px;
}

.edge-item__target {
  font-size: 11px;
  color: $color-spruce-base;
  font-family: monospace;
  word-break: break-all;
}

.edge-item__cond-count {
  font-size: 10px;
  color: $color-text-muted;
  margin-top: 2px;
}

.empty-note {
  font-size: 11px;
  color: $color-text-muted;
  font-style: italic;
  margin: 0;
}
</style>

