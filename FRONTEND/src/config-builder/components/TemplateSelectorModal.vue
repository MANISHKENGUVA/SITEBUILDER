<template>
  <div class="template-modal-backdrop" @click.self="$emit('close')">
    <div class="template-modal au-card">
      <div class="modal__header">
        <div>
          <h2>Workflow Configuration Templates</h2>
          <p class="modal__subtitle">Select a pre-built enterprise configuration as a starting foundation:</p>
        </div>
        <button type="button" class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="modal__body">
        <div class="templates-grid">
          <div
            v-for="tpl in templates"
            :key="tpl.id"
            class="template-card"
            :class="{ 'is-selected': selectedTemplateId === tpl.id }"
            @click="selectedTemplateId = tpl.id"
          >
            <div class="template-card__header">
              <span class="category-badge">{{ tpl.category || "GENERAL" }}</span>
              <span class="node-count-badge">
                {{ Object.keys(tpl.definition?.states || {}).length }} nodes
              </span>
            </div>
            <h3 class="template-card__title">{{ tpl.name }}</h3>
            <p class="template-card__desc">{{ tpl.description }}</p>
            <div class="template-card__footer">
              <span class="version-tag">Version: {{ tpl.definition?.workflowVersion || 'V1' }}</span>
              <span class="select-indicator">{{ selectedTemplateId === tpl.id ? "✓ Selected" : "Click to select" }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal__footer">
        <button type="button" class="btn btn--secondary au-button" @click="$emit('close')">
          Cancel
        </button>
        <button
          type="button"
          class="btn btn--primary au-button au-button--primary"
          :disabled="!selectedTemplateId"
          @click="confirmSelection"
        >
          Use Selected Template
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "TemplateSelectorModal",
  props: {
    templates: { type: Array, default: () => [] },
  },
  data() {
    return {
      selectedTemplateId: this.templates[0]?.id || null,
    };
  },
  methods: {
    confirmSelection() {
      const chosen = this.templates.find((t) => t.id === this.selectedTemplateId);
      if (chosen) {
        this.$emit("select-template", chosen);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.template-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.template-modal {
  width: 780px;
  max-width: 92vw;
  max-height: 85vh;
  background: #ffffff;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal__header {
  padding: 18px 24px;
  background: $color-bg-body;
  border-bottom: 1px solid $color-border-light;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  h2 {
    margin: 0 0 4px;
    font-size: 17px;
    font-weight: 700;
  }
}

.modal__subtitle {
  margin: 0;
  font-size: 12px;
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

.modal__body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.template-card {
  padding: 16px;
  border: 1px solid $color-border-light;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;

  &:hover {
    border-color: $color-spruce-base;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  }

  &.is-selected {
    border-color: $color-spruce-base;
    background: #f0fdfa;
    box-shadow: 0 0 0 2px rgba(3, 73, 83, 0.15);
  }
}

.template-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.category-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  background: #e2e8f0;
  color: #334155;
  border-radius: 4px;
}

.node-count-badge {
  font-size: 11px;
  font-weight: 600;
  color: $color-text-muted;
}

.template-card__title {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 700;
  color: $color-text-primary;
}

.template-card__desc {
  margin: 0 0 14px;
  font-size: 12px;
  color: $color-text-secondary;
  line-height: 1.4;
  flex: 1;
}

.template-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: $color-text-muted;
  border-top: 1px solid #f1f5f9;
  padding-top: 10px;
}

.version-tag {
  font-family: monospace;
}

.select-indicator {
  font-weight: 600;
  color: $color-spruce-base;
}

.modal__footer {
  padding: 14px 24px;
  border-top: 1px solid $color-border-light;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: $color-bg-body;
}
</style>

