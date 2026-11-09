<template>
  <div class="version-drawer-backdrop" @click.self="$emit('close')">
    <div class="version-drawer">
      <div class="drawer__header">
        <div>
          <h2>Version History & Immutability</h2>
          <p class="drawer__subtitle">
            Configuration: <strong>{{ configId }}</strong> · Published versions are immutable
          </p>
        </div>
        <button type="button" class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="drawer__body">
        <!-- Version comparison banner if 2 versions selected -->
        <div v-if="selectedForCompare.length === 2" class="compare-banner au-card">
          <div class="compare-banner__text">
            Comparing <strong>{{ selectedForCompare[0] }}</strong> and <strong>{{ selectedForCompare[1] }}</strong>
          </div>
          <button
            type="button"
            class="btn btn--sm btn--primary au-button au-button--primary"
            @click="runCompare"
          >
            Show Visual Diff
          </button>
        </div>

        <!-- Versions list -->
        <div class="versions-list">
          <div
            v-for="ver in versions"
            :key="ver.id"
            class="version-card au-card"
            :class="{
              'is-current': ver.version === currentVersion,
              'is-published': ver.status === 'PUBLISHED',
            }"
          >
            <div class="version-card__header">
              <div class="version-identity">
                <span class="version-number">{{ ver.version }}</span>
                <span
                  class="au-chip"
                  :class="{
                    'au-chip--success': ver.status === 'PUBLISHED',
                    'au-chip--default': ver.status === 'DRAFT',
                  }"
                >
                  {{ ver.status }}
                </span>
                <span v-if="ver.version === currentVersion" class="current-tag">Current</span>
              </div>

              <!-- Compare Checkbox -->
              <label class="compare-checkbox-label">
                <input
                  type="checkbox"
                  :value="ver.id"
                  v-model="selectedForCompare"
                  :disabled="selectedForCompare.length >= 2 && !selectedForCompare.includes(ver.id)"
                />
                <span>Compare</span>
              </label>
            </div>

            <p class="version-summary">
              {{ ver.changeSummary || "No change description provided." }}
            </p>

            <div class="version-meta">
              <span>Author: {{ ver.createdBy || "system" }}</span>
              <span>·</span>
              <span>{{ formatDate(ver.createdAt) }}</span>
            </div>

            <div class="version-actions">
              <button
                v-if="ver.status === 'PUBLISHED'"
                type="button"
                class="btn btn--sm btn--secondary au-button"
                @click="$emit('branch-draft', ver)"
              >
                + Create Draft from this Version
              </button>
              <button
                type="button"
                class="btn btn--sm btn--ghost au-button"
                @click="inspectVersion(ver.id)"
              >
                View Snapshot
              </button>
            </div>
          </div>
        </div>

        <!-- Comparison Modal / Drawer -->
        <div v-if="diffResult" class="diff-modal-backdrop" @click.self="diffResult = null">
          <div class="diff-modal au-card">
            <div class="diff-modal__header">
              <h3>Version Comparison</h3>
              <button type="button" class="close-btn" @click="diffResult = null">✕</button>
            </div>
            <div class="diff-modal__body">
              <div class="diff-summary">
                <div class="diff-stat">
                  <span class="stat-count text-green">+{{ diffResult.diff.addedNodes.length }}</span>
                  <span>Nodes Added</span>
                </div>
                <div class="diff-stat">
                  <span class="stat-count text-red">-{{ diffResult.diff.removedNodes.length }}</span>
                  <span>Nodes Removed</span>
                </div>
                <div class="diff-stat">
                  <span class="stat-count text-amber">~{{ diffResult.diff.modifiedNodes.length }}</span>
                  <span>Nodes Modified</span>
                </div>
              </div>

              <div v-if="diffResult.diff.addedNodes.length" class="diff-section">
                <h4>Added Nodes</h4>
                <ul>
                  <li v-for="id in diffResult.diff.addedNodes" :key="id">
                    <code>+ {{ id }}</code>
                  </li>
                </ul>
              </div>

              <div v-if="diffResult.diff.removedNodes.length" class="diff-section">
                <h4>Removed Nodes</h4>
                <ul>
                  <li v-for="id in diffResult.diff.removedNodes" :key="id">
                    <code>- {{ id }}</code>
                  </li>
                </ul>
              </div>

              <div v-if="diffResult.diff.modifiedNodes.length" class="diff-section">
                <h4>Modified Nodes</h4>
                <div v-for="mod in diffResult.diff.modifiedNodes" :key="mod.nodeKey" class="diff-node-item">
                  <strong>{{ mod.nodeKey }}</strong>
                  <pre class="diff-pre">{{ JSON.stringify(mod.after, null, 2) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { compareVersions, getVersion } from "../api/configBuilderApi";

export default {
  name: "VersionHistoryDrawer",
  props: {
    configId: { type: String, required: true },
    currentVersion: { type: String, default: "" },
    versions: { type: Array, default: () => [] },
  },
  data() {
    return {
      selectedForCompare: [],
      diffResult: null,
      inspectingSnapshot: null,
    };
  },
  methods: {
    formatDate(dateStr) {
      if (!dateStr) return "—";
      try {
        const d = new Date(dateStr);
        return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } catch {
        return dateStr;
      }
    },
    async runCompare() {
      if (this.selectedForCompare.length !== 2) return;
      try {
        const res = await compareVersions(this.selectedForCompare[0], this.selectedForCompare[1]);
        this.diffResult = res;
      } catch (e) {
        alert("Failed to compare versions: " + e.message);
      }
    },
    async inspectVersion(versionId) {
      try {
        const v = await getVersion(versionId);
        alert(`Snapshot of version ${v.version}:\n\n` + JSON.stringify(v.definition, null, 2));
      } catch (e) {
        alert("Failed to load snapshot: " + e.message);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.version-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: flex-end;
  z-index: 1000;
}

.version-drawer {
  width: 460px;
  max-width: 90vw;
  background: #ffffff;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
}

.drawer__header {
  padding: 16px 20px;
  background: $color-bg-body;
  border-bottom: 1px solid $color-border-light;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  h2 {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 700;
  }
}

.drawer__subtitle {
  margin: 0;
  font-size: 11px;
  color: $color-text-secondary;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  color: $color-text-muted;
  cursor: pointer;

  &:hover {
    color: $color-text-primary;
  }
}

.drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.compare-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 12px;
}

.versions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.version-card {
  padding: 14px;
  border: 1px solid $color-border-light;
  border-radius: 8px;
  background: #ffffff;
  transition: box-shadow 0.15s ease;

  &.is-current {
    border-color: $color-spruce-base;
  }

  &.is-published {
    border-left: 4px solid #10b981;
  }
}

.version-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.version-identity {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-number {
  font-family: monospace;
  font-size: 13px;
  font-weight: 700;
  color: $color-text-primary;
}

.current-tag {
  font-size: 10px;
  font-weight: 700;
  color: $color-spruce-base;
  background: #e6f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.compare-checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: $color-text-secondary;
  cursor: pointer;
}

.version-summary {
  font-size: 12px;
  color: $color-text-primary;
  margin: 0 0 8px;
}

.version-meta {
  font-size: 11px;
  color: $color-text-muted;
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.version-actions {
  display: flex;
  gap: 8px;
}

.diff-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.diff-modal {
  width: 600px;
  max-width: 90vw;
  max-height: 85vh;
  background: #fff;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.diff-modal__header {
  padding: 14px 18px;
  border-bottom: 1px solid $color-border-light;
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 {
    margin: 0;
    font-size: 15px;
  }
}

.diff-modal__body {
  padding: 16px 18px;
  overflow-y: auto;
}

.diff-summary {
  display: flex;
  gap: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  margin-bottom: 16px;
}

.diff-stat {
  display: flex;
  flex-direction: column;
  font-size: 11px;
  color: $color-text-secondary;
}

.stat-count {
  font-size: 18px;
  font-weight: 700;

  &.text-green { color: #16a34a; }
  &.text-red { color: #dc2626; }
  &.text-amber { color: #d97706; }
}

.diff-section {
  margin-bottom: 14px;

  h4 {
    margin: 0 0 6px;
    font-size: 12px;
    color: $color-text-primary;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    font-family: monospace;
    font-size: 11px;
  }
}

.diff-pre {
  background: #f1f5f9;
  padding: 8px;
  border-radius: 4px;
  font-size: 11px;
  overflow-x: auto;
}
</style>
