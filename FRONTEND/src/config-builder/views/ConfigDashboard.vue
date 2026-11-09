<template>
  <div class="config-dashboard">
    <AppHeader />

    <main class="dashboard-main" id="main">
      <!-- Dashboard Hero / Header -->
      <header class="dashboard-header">
        <div class="dashboard-header__content">
          <p class="dashboard-eyebrow">Site Builder · Workflow Configuration Studio</p>
          <h1>Workflow Configurations</h1>
          <p class="dashboard-intro">
            Visually design, validate, and manage workflow configurations linked to backend execution engines.
            Convert visual configurations to authoritative workflow JSON with bi-directional synchronization.
          </p>
        </div>

        <div class="dashboard-header__actions">
          <button
            type="button"
            class="btn btn--secondary au-button au-button--secondary"
            @click="showTemplatesModal = true"
          >
            Browse Templates
          </button>
          <button
            type="button"
            class="btn btn--primary au-button au-button--primary"
            @click="openNewConfigModal"
          >
            + Create Workflow Configuration
          </button>
        </div>
      </header>

      <!-- Search & Filters Toolbar -->
      <section class="dashboard-filters au-card" aria-label="Filters and search">
        <div class="filter-item search-item">
          <label for="config-search" class="sr-only">Search configurations</label>
          <input
            id="config-search"
            v-model.trim="searchQuery"
            type="search"
            class="search-input"
            placeholder="Search by Configuration ID, Workflow ID, or title..."
          />
        </div>

        <div class="filter-item">
          <label for="status-filter">Status:</label>
          <select id="status-filter" v-model="selectedStatus" class="filter-select">
            <option value="">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PUBLISHED">PUBLISHED (Immutable)</option>
          </select>
        </div>

        <div class="filter-item">
          <label for="actor-filter">Actor:</label>
          <select id="actor-filter" v-model="selectedActor" class="filter-select">
            <option value="">All Actors</option>
            <option v-for="actor in actors" :key="actor.id" :value="actor.id">
              {{ actor.id }}
            </option>
          </select>
        </div>

        <button
          v-if="searchQuery || selectedStatus || selectedActor"
          type="button"
          class="btn btn--ghost au-button au-button--ghost clear-filters-btn"
          @click="clearFilters"
        >
          Reset Filters
        </button>
      </section>

      <!-- Loading and Error States -->
      <div v-if="isLoading" class="dashboard-loading">
        <LoadingSpinner />
        <p>Loading workflow configurations from backend...</p>
      </div>

      <div v-else-if="error" class="dashboard-error au-card" role="alert">
        <p><strong>Failed to load configurations:</strong> {{ error }}</p>
        <button type="button" class="btn btn--secondary au-button" @click="loadData">
          Retry
        </button>
      </div>

      <!-- Configurations Grid -->
      <div v-else-if="filteredConfigurations.length" class="configs-grid">
        <article
          v-for="config in filteredConfigurations"
          :key="config.id"
          class="config-card au-card"
        >
          <div class="config-card__header">
            <div class="config-card__ids">
              <span class="config-id-badge" title="Configuration ID">
                <code>{{ config.id }}</code>
              </span>
              <span class="workflow-id-badge" title="Linked 1:1 Workflow ID">
                WF: <strong>{{ config.workflowId }}</strong>
              </span>
            </div>

            <span
              class="au-chip"
              :class="{
                'au-chip--success': config.status === 'PUBLISHED',
                'au-chip--default': config.status === 'DRAFT',
              }"
            >
              {{ config.status }}
            </span>
          </div>

          <h2 class="config-card__title">
            <router-link :to="`/builder/${encodeURIComponent(config.id)}`">
              {{ config.name }}
            </router-link>
          </h2>

          <p class="config-card__desc">
            {{ config.description || "No description provided for this workflow configuration." }}
          </p>

          <div class="config-card__stats">
            <span class="stat-pill">
              <strong>{{ config.nodeCount || 0 }}</strong> nodes
            </span>
            <span class="stat-pill">
              Version: <strong>{{ config.currentVersion }}</strong>
            </span>
            <span v-if="config.actors && config.actors.length" class="stat-pill actors-pill">
              {{ config.actors.length }} actor(s): {{ config.actors.join(", ") }}
            </span>
          </div>

          <div class="config-card__footer">
            <span class="updated-time">
              Updated {{ formatDate(config.updatedAt || config.createdAt) }}
            </span>

            <div class="card-actions">
              <button
                type="button"
                class="btn btn--sm btn--ghost au-button au-button--ghost"
                title="Duplicate configuration with new identity"
                @click="openDuplicateModal(config)"
              >
                Duplicate
              </button>
              <button
                type="button"
                class="btn btn--sm btn--ghost au-button au-button--ghost"
                title="Export canonical JSON"
                @click="exportConfigJson(config.id)"
              >
                Export
              </button>
              <button
                v-if="config.status !== 'PUBLISHED'"
                type="button"
                class="btn btn--sm btn--ghost au-button text-danger"
                title="Delete draft configuration"
                @click="confirmDeleteConfig(config)"
              >
                Delete
              </button>
              <router-link
                :to="`/builder/${encodeURIComponent(config.id)}`"
                class="btn btn--sm btn--primary au-button au-button--primary"
              >
                Open Studio →
              </router-link>
            </div>
          </div>
        </article>
      </div>

      <!-- Empty State -->
      <div v-else class="dashboard-empty au-card">
        <h3>No workflow configurations found</h3>
        <p>No configurations match your current search and filters. Create a new configuration or load from templates.</p>
        <button
          type="button"
          class="btn btn--primary au-button au-button--primary"
          @click="openNewConfigModal"
        >
          + Create New Configuration
        </button>
      </div>
    </main>

    <!-- Create Configuration Modal -->
    <div v-if="showNewModal" class="modal-backdrop" @click.self="showNewModal = false">
      <div class="modal-dialog au-card">
        <div class="modal-header">
          <h2>Create Workflow Configuration</h2>
          <button type="button" class="close-btn" @click="showNewModal = false">✕</button>
        </div>

        <form @submit.prevent="submitCreateConfig" class="modal-body">
          <p class="modal-hint">
            Every workflow configuration has a unique 1:1 relationship with a workflow ID.
          </p>

          <div class="form-group">
            <label>Configuration ID (e.g. WFC-MORTGAGE-001) *</label>
            <input
              v-model.trim="newConfig.id"
              type="text"
              required
              class="form-input"
              placeholder="WFC-LOAN-002"
            />
          </div>

          <div class="form-group">
            <label>Linked Workflow ID (e.g. WF-MORTGAGE-001) *</label>
            <input
              v-model.trim="newConfig.workflowId"
              type="text"
              required
              class="form-input"
              placeholder="WF-LOAN-002"
            />
            <small class="field-hint">Enforces exactly one configuration per workflow</small>
          </div>

          <div class="form-group">
            <label>Configuration Name *</label>
            <input
              v-model.trim="newConfig.name"
              type="text"
              required
              class="form-input"
              placeholder="Home Mortgage Workflow"
            />
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea
              v-model.trim="newConfig.description"
              rows="2"
              class="form-input"
              placeholder="Brief description of the workflow purpose..."
            ></textarea>
          </div>

          <div class="form-group">
            <label>Initial Version</label>
            <input
              v-model.trim="newConfig.version"
              type="text"
              class="form-input"
              placeholder="MORTGAGE-FLOW-V1"
            />
          </div>

          <div class="form-group">
            <label>Start From Template (Optional)</label>
            <select v-model="newConfig.templateId" class="form-select">
              <option value="">-- Blank Workflow --</option>
              <option v-for="t in templates" :key="t.id" :value="t.id">
                {{ t.name }} ({{ t.category }})
              </option>
            </select>
          </div>

          <div v-if="createError" class="modal-error" role="alert">
            {{ createError }}
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn--secondary au-button"
              @click="showNewModal = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn--primary au-button au-button--primary"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? "Creating..." : "Create & Open Studio" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Duplicate Configuration Modal -->
    <div v-if="showDuplicateModal" class="modal-backdrop" @click.self="showDuplicateModal = false">
      <div class="modal-dialog au-card">
        <div class="modal-header">
          <h2>Duplicate Configuration</h2>
          <button type="button" class="close-btn" @click="showDuplicateModal = false">✕</button>
        </div>

        <form @submit.prevent="submitDuplicateConfig" class="modal-body">
          <p class="modal-hint">
            Creates an independent copy of <strong>{{ configToDuplicate?.id }}</strong> with new unique IDs.
          </p>

          <div class="form-group">
            <label>New Configuration ID *</label>
            <input
              v-model.trim="duplicateForm.newId"
              type="text"
              required
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label>New Linked Workflow ID *</label>
            <input
              v-model.trim="duplicateForm.newWorkflowId"
              type="text"
              required
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label>New Name *</label>
            <input
              v-model.trim="duplicateForm.newName"
              type="text"
              required
              class="form-input"
            />
          </div>

          <div v-if="duplicateError" class="modal-error" role="alert">
            {{ duplicateError }}
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn--secondary au-button"
              @click="showDuplicateModal = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn--primary au-button au-button--primary"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? "Duplicating..." : "Duplicate & Open Studio" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Template Selector Modal -->
    <TemplateSelectorModal
      v-if="showTemplatesModal"
      :templates="templates"
      @close="showTemplatesModal = false"
      @select-template="onTemplateSelected"
    />

    <AppFooter />
  </div>
</template>

<script>
import AppHeader from "@/components/common/AppHeader.vue";
import AppFooter from "@/components/common/AppFooter.vue";
import LoadingSpinner from "@/components/common/LoadingSpinner.vue";
import TemplateSelectorModal from "../components/TemplateSelectorModal.vue";
import {
  listConfigurations,
  createConfiguration,
  duplicateConfiguration,
  deleteConfiguration,
  listActors,
  listTemplates,
  getConfiguration,
} from "../api/configBuilderApi";

export default {
  name: "ConfigDashboard",
  components: {
    AppHeader,
    AppFooter,
    LoadingSpinner,
    TemplateSelectorModal,
  },
  data() {
    return {
      configurations: [],
      actors: [],
      templates: [],
      isLoading: true,
      error: null,
      searchQuery: "",
      selectedStatus: "",
      selectedActor: "",
      showNewModal: false,
      showDuplicateModal: false,
      showTemplatesModal: false,
      isSubmitting: false,
      createError: null,
      duplicateError: null,
      configToDuplicate: null,
      newConfig: {
        id: "",
        workflowId: "",
        name: "",
        description: "",
        version: "V1",
        templateId: "",
      },
      duplicateForm: {
        newId: "",
        newWorkflowId: "",
        newName: "",
      },
    };
  },
  computed: {
    filteredConfigurations() {
      return this.configurations.filter((c) => {
        if (this.selectedStatus && c.status !== this.selectedStatus) {
          return false;
        }
        if (this.selectedActor && (!c.actors || !c.actors.includes(this.selectedActor))) {
          return false;
        }
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase();
          const matchId = c.id.toLowerCase().includes(q);
          const matchWf = c.workflowId.toLowerCase().includes(q);
          const matchName = c.name.toLowerCase().includes(q);
          if (!matchId && !matchWf && !matchName) return false;
        }
        return true;
      });
    },
  },
  mounted() {
    this.loadData();
  },
  methods: {
    async loadData() {
      this.isLoading = true;
      this.error = null;
      try {
        const [configs, actors, templates] = await Promise.all([
          listConfigurations(),
          listActors().catch(() => []),
          listTemplates().catch(() => []),
        ]);
        this.configurations = configs;
        this.actors = actors;
        this.templates = templates;
      } catch (err) {
        this.error = err.message || "Failed to communicate with workflow configuration backend.";
      } finally {
        this.isLoading = false;
      }
    },
    clearFilters() {
      this.searchQuery = "";
      this.selectedStatus = "";
      this.selectedActor = "";
    },
    formatDate(dateStr) {
      if (!dateStr) return "recently";
      try {
        const d = new Date(dateStr);
        return d.toLocaleDateString();
      } catch {
        return dateStr;
      }
    },
    openNewConfigModal() {
      this.createError = null;
      this.newConfig = {
        id: `WFC-FLOW-${Date.now().toString().slice(-4)}`,
        workflowId: `WF-FLOW-${Date.now().toString().slice(-4)}`,
        name: "",
        description: "",
        version: "FLOW-V1",
        templateId: "",
      };
      this.showNewModal = true;
    },
    onTemplateSelected(tpl) {
      this.showTemplatesModal = false;
      this.newConfig = {
        id: `WFC-${tpl.id.replace("TPL-", "")}-${Date.now().toString().slice(-4)}`,
        workflowId: `WF-${tpl.id.replace("TPL-", "")}-${Date.now().toString().slice(-4)}`,
        name: `${tpl.name}`,
        description: tpl.description || "",
        version: tpl.definition?.workflowVersion || "V1",
        templateId: tpl.id,
      };
      this.showNewModal = true;
    },
    async submitCreateConfig() {
      this.isSubmitting = true;
      this.createError = null;
      try {
        const created = await createConfiguration({
          id: this.newConfig.id.trim().toUpperCase(),
          workflowId: this.newConfig.workflowId.trim().toUpperCase(),
          name: this.newConfig.name.trim(),
          description: this.newConfig.description.trim(),
          version: this.newConfig.version.trim(),
          templateId: this.newConfig.templateId || undefined,
        });
        this.showNewModal = false;
        this.$router.push(`/builder/${encodeURIComponent(created.id)}`);
      } catch (err) {
        this.createError = err.message || "Failed to create configuration";
      } finally {
        this.isSubmitting = false;
      }
    },
    openDuplicateModal(config) {
      this.configToDuplicate = config;
      this.duplicateError = null;
      this.duplicateForm = {
        newId: `${config.id}-COPY`,
        newWorkflowId: `${config.workflowId}-COPY`,
        newName: `${config.name} (Copy)`,
      };
      this.showDuplicateModal = true;
    },
    async submitDuplicateConfig() {
      if (!this.configToDuplicate) return;
      this.isSubmitting = true;
      this.duplicateError = null;
      try {
        const duplicated = await duplicateConfiguration(this.configToDuplicate.id, {
          newId: this.duplicateForm.newId.trim().toUpperCase(),
          newWorkflowId: this.duplicateForm.newWorkflowId.trim().toUpperCase(),
          newName: this.duplicateForm.newName.trim(),
        });
        this.showDuplicateModal = false;
        this.$router.push(`/builder/${encodeURIComponent(duplicated.id)}`);
      } catch (err) {
        this.duplicateError = err.message || "Failed to duplicate configuration";
      } finally {
        this.isSubmitting = false;
      }
    },
    async confirmDeleteConfig(config) {
      if (confirm(`Are you sure you want to delete draft configuration '${config.id}'? This cannot be undone.`)) {
        try {
          await deleteConfiguration(config.id);
          this.configurations = this.configurations.filter((c) => c.id !== config.id);
        } catch (err) {
          alert("Delete failed: " + err.message);
        }
      }
    },
    async exportConfigJson(configId) {
      try {
        const c = await getConfiguration(configId);
        const blob = new Blob([JSON.stringify(c.definition, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${configId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert("Export failed: " + err.message);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.config-dashboard {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: $color-bg-body;
}

.dashboard-main {
  flex: 1;
  max-width: 1240px;
  width: 100%;
  margin: 0 auto;
  padding: 32px 24px;
}

.dashboard-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.dashboard-eyebrow {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: $color-spruce-base;
  margin: 0 0 6px;
}

.dashboard-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 800;
  color: $color-text-primary;
}

.dashboard-intro {
  margin: 0;
  font-size: 14px;
  color: $color-text-secondary;
  max-width: 700px;
  line-height: 1.5;
}

.dashboard-header__actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.dashboard-filters {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 18px;
  background: $color-bg-surface;
  border-radius: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    font-size: 12px;
    font-weight: 600;
    color: $color-text-secondary;
  }
}

.search-item {
  flex: 1;
  min-width: 240px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid $color-border-light;
  border-radius: 6px;
  box-sizing: border-box;
}

.filter-select {
  padding: 6px 10px;
  font-size: 12px;
  border: 1px solid $color-border-light;
  border-radius: 6px;
  background: #ffffff;
}

.clear-filters-btn {
  font-size: 12px;
  padding: 6px 10px;
}

.configs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.config-card {
  padding: 20px;
  background: $color-bg-surface;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
  }
}

.config-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.config-card__ids {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.config-id-badge {
  code {
    font-family: monospace;
    font-size: 12px;
    font-weight: 700;
    color: $color-spruce-base;
  }
}

.workflow-id-badge {
  font-size: 11px;
  color: $color-text-secondary;

  strong {
    font-family: monospace;
    color: $color-text-primary;
  }
}

.config-card__title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 700;

  a {
    color: $color-text-primary;
    text-decoration: none;

    &:hover {
      color: $color-spruce-base;
      text-decoration: underline;
    }
  }
}

.config-card__desc {
  font-size: 13px;
  color: $color-text-secondary;
  margin: 0 0 16px;
  line-height: 1.45;
  flex: 1;
}

.config-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.stat-pill {
  font-size: 11px;
  padding: 3px 8px;
  background: #f1f5f9;
  border-radius: 4px;
  color: #334155;

  &.actors-pill {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.config-card__footer {
  border-top: 1px solid $color-border-light;
  padding-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.updated-time {
  font-size: 11px;
  color: $color-text-muted;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.text-danger {
  color: #dc2626 !important;
}

.dashboard-empty {
  text-align: center;
  padding: 48px;
  background: $color-bg-surface;
  border-radius: 12px;

  h3 {
    margin: 0 0 8px;
    font-size: 18px;
  }
  p {
    margin: 0 0 20px;
    font-size: 13px;
    color: $color-text-secondary;
  }
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
  width: 520px;
  max-width: 92vw;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 18px 24px;
  border-bottom: 1px solid $color-border-light;
  background: $color-bg-body;
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
    font-size: 17px;
  }
}

.modal-body {
  padding: 20px 24px;
}

.modal-hint {
  font-size: 12px;
  color: $color-text-secondary;
  margin-bottom: 16px;
}

.modal-error {
  padding: 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 12px;
  margin-top: 14px;
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
  color: $color-text-muted;
  cursor: pointer;

  &:hover {
    color: $color-text-primary;
  }
}
</style>
