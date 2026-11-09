<template>
  <header class="workspace-toolbar">
    <div class="toolbar__left">
      <router-link to="/builder" class="toolbar__back-btn au-button au-button--ghost" title="Back to Configurations">
        <span class="toolbar__icon" aria-hidden="true">←</span>
        <span>Dashboard</span>
      </router-link>

      <div class="toolbar__divider" aria-hidden="true"></div>

      <div class="toolbar__meta">
        <div class="toolbar__title-row">
          <h1 class="toolbar__config-name">{{ configName || "Workflow Configuration" }}</h1>
          <span
            class="au-chip"
            :class="{
              'au-chip--success': status === 'PUBLISHED',
              'au-chip--default': status === 'DRAFT',
              'au-chip--warning': status === 'VALIDATED',
            }"
          >
            {{ status }}
          </span>
          <span v-if="saveStateText" class="toolbar__autosave-status" :class="'is-' + saveState">
            {{ saveStateText }}
          </span>
        </div>

        <div class="toolbar__ids-row">
          <span class="toolbar__id-badge">
            <span class="toolbar__id-label">CONFIG:</span>
            <strong>{{ configId }}</strong>
          </span>
          <span class="toolbar__id-badge">
            <span class="toolbar__id-label">WORKFLOW:</span>
            <strong>{{ workflowId }}</strong>
          </span>
          <span class="toolbar__id-badge">
            <span class="toolbar__id-label">VERSION:</span>
            <strong>{{ workflowVersion }}</strong>
          </span>
        </div>
      </div>
    </div>

    <div class="toolbar__center">
      <!-- Mode toggle -->
      <div class="toolbar__mode-toggle">
        <button
          type="button"
          class="mode-btn"
          :class="{ 'is-active': activeMode === 'visual' }"
          @click="$emit('switch-mode', 'visual')"
        >
          <span class="mode-icon" aria-hidden="true">⬡</span>
          Visual Canvas
        </button>
        <button
          type="button"
          class="mode-btn"
          :class="{ 'is-active': activeMode === 'json' }"
          @click="$emit('switch-mode', 'json')"
        >
          <span class="mode-icon" aria-hidden="true">{ }</span>
          JSON Editor
        </button>
      </div>
    </div>

    <div class="toolbar__right">
      <!-- Undo / Redo -->
      <div class="toolbar__btn-group">
        <button
          type="button"
          class="tool-btn"
          :disabled="!canUndo"
          title="Undo (Ctrl+Z)"
          @click="$emit('undo')"
        >
          <span aria-hidden="true">↩</span> Undo
        </button>
        <button
          type="button"
          class="tool-btn"
          :disabled="!canRedo"
          title="Redo (Ctrl+Y)"
          @click="$emit('redo')"
        >
          <span aria-hidden="true">↪</span> Redo
        </button>
      </div>

      <div class="toolbar__divider" aria-hidden="true"></div>

      <!-- Canvas zoom controls (only visible in visual mode) -->
      <div v-if="activeMode === 'visual'" class="toolbar__btn-group">
        <button type="button" class="tool-btn icon-only" title="Zoom Out" @click="$emit('zoom-out')">
          −
        </button>
        <span class="toolbar__zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
        <button type="button" class="tool-btn icon-only" title="Zoom In" @click="$emit('zoom-in')">
          +
        </button>
        <button type="button" class="tool-btn" title="Reset Zoom" @click="$emit('zoom-reset')">
          Reset
        </button>
      </div>

      <div class="toolbar__divider" aria-hidden="true"></div>

      <!-- Action buttons -->
      <button
        type="button"
        class="tool-btn"
        title="View Version History & Compare"
        @click="$emit('open-versions')"
      >
        History
      </button>

      <button
        type="button"
        class="tool-btn"
        :class="{ 'has-errors': validationErrorsCount > 0 }"
        title="Validate Configuration"
        @click="$emit('validate')"
      >
        <span>Validate</span>
        <span v-if="validationErrorsCount > 0" class="error-badge">{{ validationErrorsCount }}</span>
      </button>

      <button
        type="button"
        class="btn btn--secondary au-button au-button--secondary"
        :disabled="isSaving || status === 'PUBLISHED'"
        title="Save Draft (Ctrl+S)"
        @click="$emit('save-draft')"
      >
        {{ isSaving ? "Saving..." : "Save Draft" }}
      </button>

      <button
        type="button"
        class="btn btn--primary au-button au-button--primary"
        :disabled="isPublishing || validationErrorsCount > 0 || status === 'PUBLISHED'"
        :title="status === 'PUBLISHED' ? 'Configuration is already published (immutable)' : (validationErrorsCount > 0 ? 'Fix validation errors to publish' : 'Publish configuration')"
        @click="$emit('publish')"
      >
        {{ isPublishing ? "Publishing..." : (status === "PUBLISHED" ? "Published" : "Publish") }}
      </button>

      <button
        v-if="status === 'PUBLISHED'"
        type="button"
        class="btn btn--secondary au-button au-button--secondary"
        title="Create a new draft version from this published configuration"
        @click="$emit('create-new-draft')"
      >
        + New Draft
      </button>
    </div>
  </header>
</template>

<script>
export default {
  name: "WorkspaceToolbar",
  props: {
    configId: { type: String, default: "" },
    workflowId: { type: String, default: "" },
    workflowVersion: { type: String, default: "" },
    configName: { type: String, default: "" },
    status: { type: String, default: "DRAFT" },
    activeMode: { type: String, default: "visual" },
    canUndo: { type: Boolean, default: false },
    canRedo: { type: Boolean, default: false },
    zoomLevel: { type: Number, default: 1 },
    validationErrorsCount: { type: Number, default: 0 },
    isSaving: { type: Boolean, default: false },
    isPublishing: { type: Boolean, default: false },
    saveState: { type: String, default: "saved" }, // "saved" | "unsaved" | "saving"
  },
  computed: {
    saveStateText() {
      if (this.saveState === "saving") return "Saving...";
      if (this.saveState === "unsaved") return "Unsaved changes";
      return "All changes saved";
    },
  },
};
</script>

<style lang="scss" scoped>
.workspace-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: $color-bg-surface;
  border-bottom: 1px solid $color-border-light;
  gap: 16px;
  z-index: 20;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.toolbar__left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.toolbar__back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: $color-text-secondary;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid $color-border-light;
  background: $color-bg-body;
  cursor: pointer;
  text-decoration: none;

  &:hover {
    color: $color-text-primary;
    background: #e9ecef;
  }
}

.toolbar__divider {
  width: 1px;
  height: 28px;
  background: $color-border-light;
}

.toolbar__meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.toolbar__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar__config-name {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: $color-text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}

.toolbar__autosave-status {
  font-size: 11px;
  color: $color-text-muted;

  &.is-unsaved {
    color: #b45309;
    font-weight: 500;
  }
  &.is-saving {
    color: $color-spruce-base;
  }
}

.toolbar__ids-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
}

.toolbar__id-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: $color-text-secondary;

  strong {
    color: $color-text-primary;
    font-family: monospace;
    font-size: 11px;
  }
}

.toolbar__id-label {
  color: $color-text-muted;
  font-size: 10px;
  text-transform: uppercase;
}

.toolbar__center {
  display: flex;
  align-items: center;
}

.toolbar__mode-toggle {
  display: flex;
  background: $color-bg-body;
  padding: 3px;
  border-radius: 8px;
  border: 1px solid $color-border-light;
}

.mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 600;
  color: $color-text-secondary;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;

  &.is-active {
    background: $color-bg-surface;
    color: $color-spruce-base;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  &:hover:not(.is-active) {
    color: $color-text-primary;
  }
}

.toolbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar__btn-group {
  display: flex;
  align-items: center;
  background: $color-bg-body;
  border: 1px solid $color-border-light;
  border-radius: 6px;
  overflow: hidden;
}

.tool-btn {
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  color: $color-text-primary;
  background: transparent;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;

  &:hover:not(:disabled) {
    background: #e9ecef;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.icon-only {
    padding: 6px 10px;
    font-weight: 700;
  }

  &.has-errors {
    color: #dc2626;
  }
}

.toolbar__zoom-level {
  font-size: 11px;
  font-weight: 600;
  color: $color-text-secondary;
  padding: 0 4px;
  min-width: 42px;
  text-align: center;
}

.error-badge {
  display: inline-block;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: #dc2626;
  border-radius: 10px;
  line-height: 1.2;
}

.au-chip--success {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}
.au-chip--warning {
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
}
</style>
