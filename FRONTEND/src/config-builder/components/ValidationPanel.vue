<template>
  <div class="bottom-panel" :class="{ 'is-collapsed': isCollapsed }">
    <!-- Panel Header / Drawer Bar -->
    <div class="bottom-panel__header" @click="toggleCollapse">
      <div class="bottom-panel__tabs">
        <button
          type="button"
          class="panel-tab"
          :class="{ 'is-active': activeTab === 'validation' && !isCollapsed }"
          @click.stop="selectTab('validation')"
        >
          <span>Validation</span>
          <span v-if="errors.length" class="counter-badge error-badge">{{ errors.length }}</span>
          <span v-if="warnings.length" class="counter-badge warning-badge">{{ warnings.length }}</span>
          <span v-if="info.length" class="counter-badge info-badge">{{ info.length }}</span>
          <span v-if="!errors.length && !warnings.length && !info.length" class="counter-badge ok-badge">✓ Clean</span>
        </button>

        <button
          type="button"
          class="panel-tab"
          :class="{ 'is-active': activeTab === 'structure' && !isCollapsed }"
          @click.stop="selectTab('structure')"
        >
          <span>Execution Structure</span>
          <span class="tab-sub">{{ nodes.length }} nodes · {{ edges.length }} edges</span>
        </button>
      </div>

      <div class="bottom-panel__controls">
        <button
          type="button"
          class="collapse-toggle-btn"
          :title="isCollapsed ? 'Expand Panel' : 'Collapse Panel'"
        >
          <span aria-hidden="true">{{ isCollapsed ? "▲ Expand" : "▼ Minimize" }}</span>
        </button>
      </div>
    </div>

    <!-- Panel Content -->
    <div v-if="!isCollapsed" class="bottom-panel__content">
      <!-- ── TAB 1: VALIDATION ISSUES ───────────────────────────── -->
      <div v-if="activeTab === 'validation'" class="tab-pane">
        <div v-if="allIssues.length" class="issues-list">
          <div
            v-for="(issue, index) in allIssues"
            :key="index"
            class="issue-row"
            :class="'is-' + issue.level.toLowerCase()"
            @click="onIssueClick(issue)"
          >
            <div class="issue-badge" :class="'badge-' + issue.level.toLowerCase()">
              {{ issue.level }}
            </div>
            <div class="issue-details">
              <div class="issue-target" v-if="issue.nodeKey">
                Node: <code>{{ issue.nodeKey }}</code>
                <span v-if="issue.field" class="issue-field">({{ issue.field }})</span>
              </div>
              <div class="issue-target" v-else-if="issue.field">
                Scope: <code>{{ issue.field }}</code>
              </div>
              <div class="issue-message">{{ issue.message }}</div>
            </div>
            <div class="issue-action">
              <span class="focus-link">Focus Node →</span>
            </div>
          </div>
        </div>

        <div v-else class="issues-clean-state">
          <div class="clean-icon">✓</div>
          <div>
            <strong>Configuration is Valid</strong>
            <p>No errors or warnings found. All nodes, identities, transitions, and rules conform to workflow standards.</p>
          </div>
        </div>
      </div>

      <!-- ── TAB 2: EXECUTION STRUCTURE ─────────────────────────── -->
      <div v-if="activeTab === 'structure'" class="tab-pane">
        <div class="structure-grid">
          <!-- Flow Topology Summary -->
          <div class="structure-card au-card">
            <h4>Graph Topology</h4>
            <div class="stats-list">
              <div class="stat-item">
                <span class="stat-label">Start State:</span>
                <code class="stat-val start-val">{{ startState || "Not set" }}</code>
              </div>
              <div class="stat-item">
                <span class="stat-label">Total Nodes:</span>
                <span class="stat-val">{{ nodes.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Total Transitions:</span>
                <span class="stat-val">{{ edges.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Terminal States:</span>
                <span class="stat-val">{{ terminalNodes.length }}</span>
              </div>
            </div>
          </div>

          <!-- Involved Actors -->
          <div class="structure-card au-card">
            <h4>Participating Actors ({{ involvedActors.length }})</h4>
            <div class="tags-wrap">
              <span v-for="actor in involvedActors" :key="actor" class="actor-tag">
                {{ actor }}
              </span>
            </div>
          </div>

          <!-- Involved Modules -->
          <div class="structure-card au-card">
            <h4>Participating Modules ({{ involvedModules.length }})</h4>
            <div class="tags-wrap">
              <span v-for="mod in involvedModules" :key="mod" class="module-tag">
                {{ mod }}
              </span>
            </div>
          </div>

          <!-- Terminal / Leaf States -->
          <div class="structure-card au-card">
            <h4>Terminal States</h4>
            <ul v-if="terminalNodes.length" class="terminal-list">
              <li v-for="tNode in terminalNodes" :key="tNode.id" @click="$emit('focus-node', tNode.id)">
                <code>{{ tNode.id }}</code>
              </li>
            </ul>
            <p v-else class="empty-note">No terminal states (all nodes have outgoing transitions)</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ValidationPanel",
  props: {
    validation: {
      type: Object,
      default: () => ({ valid: true, errors: [], warnings: [], info: [] }),
    },
    nodes: { type: Array, default: () => [] },
    edges: { type: Array, default: () => [] },
    startState: { type: String, default: "" },
  },
  data() {
    return {
      isCollapsed: false,
      activeTab: "validation",
    };
  },
  computed: {
    errors() {
      return this.validation.errors || [];
    },
    warnings() {
      return this.validation.warnings || [];
    },
    info() {
      return this.validation.info || [];
    },
    allIssues() {
      return [...this.errors, ...this.warnings, ...this.info];
    },
    terminalNodes() {
      return this.nodes.filter(
        (n) => !this.edges.some((e) => e.fromState === n.id)
      );
    },
    involvedActors() {
      return Array.from(
        new Set(this.nodes.map((n) => n.metadata?.actor).filter(Boolean))
      );
    },
    involvedModules() {
      return Array.from(
        new Set(this.nodes.map((n) => n.metadata?.module).filter(Boolean))
      );
    },
  },
  methods: {
    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
    },
    selectTab(tab) {
      this.activeTab = tab;
      this.isCollapsed = false;
    },
    onIssueClick(issue) {
      if (issue.nodeKey) {
        this.$emit("focus-node", issue.nodeKey);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.bottom-panel {
  background: $color-bg-surface;
  border-top: 1px solid $color-border-light;
  display: flex;
  flex-direction: column;
  transition: max-height 0.25s ease;
  max-height: 220px;
  z-index: 15;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);

  &.is-collapsed {
    max-height: 38px;
  }
}

.bottom-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 38px;
  background: $color-bg-body;
  border-bottom: 1px solid $color-border-light;
  cursor: pointer;
  user-select: none;
}

.bottom-panel__tabs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: $color-text-secondary;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;

  &.is-active {
    background: $color-bg-surface;
    color: $color-spruce-base;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
}

.tab-sub {
  font-size: 11px;
  font-weight: 400;
  color: $color-text-muted;
}

.counter-badge {
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 10px;
  line-height: 1.2;

  &.error-badge {
    background: #dc2626;
    color: #fff;
  }
  &.warning-badge {
    background: #d97706;
    color: #fff;
  }
  &.info-badge {
    background: #0284c7;
    color: #fff;
  }
  &.ok-badge {
    background: #10b981;
    color: #fff;
  }
}

.collapse-toggle-btn {
  background: transparent;
  border: none;
  font-size: 11px;
  font-weight: 500;
  color: $color-text-muted;
  cursor: pointer;
}

.bottom-panel__content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.issues-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.issue-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid $color-border-light;
  background: $color-bg-surface;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: #f8fafc;
  }

  &.is-error {
    border-left: 4px solid #dc2626;
  }
  &.is-warning {
    border-left: 4px solid #d97706;
  }
  &.is-info {
    border-left: 4px solid #0284c7;
  }
}

.issue-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  color: #fff;

  &.badge-error { background: #dc2626; }
  &.badge-warning { background: #d97706; }
  &.badge-info { background: #0284c7; }
}

.issue-details {
  flex: 1;
  min-width: 0;
}

.issue-target {
  font-size: 11px;
  font-weight: 600;
  color: $color-text-secondary;
  margin-bottom: 2px;

  code {
    font-family: monospace;
    color: $color-text-primary;
  }
}

.issue-field {
  font-size: 10px;
  color: $color-text-muted;
  margin-left: 4px;
}

.issue-message {
  font-size: 12px;
  color: $color-text-primary;
}

.issue-action {
  font-size: 11px;
  font-weight: 600;
  color: $color-spruce-base;
}

.issues-clean-state {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;

  .clean-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #22c55e;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 700;
  }

  strong {
    display: block;
    color: #166534;
    font-size: 13px;
  }

  p {
    margin: 2px 0 0;
    font-size: 12px;
    color: #15803d;
  }
}

.structure-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.structure-card {
  padding: 10px 14px;
  background: #f8fafc;
  border: 1px solid $color-border-light;
  border-radius: 6px;

  h4 {
    margin: 0 0 8px;
    font-size: 12px;
    font-weight: 700;
    color: $color-text-primary;
  }
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}

.stat-label {
  color: $color-text-muted;
}

.stat-val {
  font-weight: 700;
  color: $color-text-primary;

  &.start-val {
    font-family: monospace;
    font-size: 10px;
    color: #b45309;
  }
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.actor-tag,
.module-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: #e2e8f0;
  color: #1e293b;
}

.terminal-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  li {
    font-size: 10px;
    cursor: pointer;
    color: $color-spruce-base;

    &:hover {
      text-decoration: underline;
    }
  }
}

.empty-note {
  font-size: 11px;
  color: $color-text-muted;
  font-style: italic;
  margin: 0;
}
</style>
