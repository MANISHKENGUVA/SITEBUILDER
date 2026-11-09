<template>
  <div class="node-page">
    <header class="node-page__header">
      <h1 class="node-page__title">{{ schema.title }}</h1>
      <p class="node-page__description">{{ schema.description }}</p>
    </header>
    <form class="node-form" @submit.prevent="onSubmit">
      <div v-for="field in schema.fields" :key="field.name" class="form-group">
        <label class="form-label" :for="field.name">
          {{ field.label }}
          <span v-if="field.required" class="form-label--required" />
        </label>
        <select
          v-if="field.type === 'select'"
          :id="field.name"
          v-model="form[field.name]"
          class="form-select"
          :class="{ error: errors[field.name] }"
        >
          <option value="">Select</option>
          <option v-for="option in field.options" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <textarea
          v-else-if="field.type === 'textarea'"
          :id="field.name"
          v-model="form[field.name]"
          class="form-textarea"
        />
        <label v-else-if="field.type === 'checkbox'" class="form-checkbox">
          <input :id="field.name" v-model="form[field.name]" type="checkbox" />
          {{ field.label }}
        </label>
        <input
          v-else
          :id="field.name"
          v-model="form[field.name]"
          class="form-input"
          :class="{ error: errors[field.name] }"
          :type="field.type === 'number' ? 'number' : 'text'"
        />
        <p v-if="field.hint && field.type !== 'checkbox'" class="form-hint">{{ field.hint }}</p>
        <p v-if="errors[field.name]" class="validation-message">{{ errors[field.name] }}</p>
      </div>

      <div v-if="schema.extraDocuments" class="form-group">
        <p class="form-hint">No extra documents are required for this step.</p>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn--primary au-button au-button--primary" :disabled="!canSubmit || submitting">
          {{ submitting ? "Submitting…" : "Continue" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { schemaFor } from "@/workflow/formSchemas";

export default {
  name: "GenericFormPage",
  props: {
    nodeKey: { type: String, required: true },
    sessionId: { type: String, required: true },
    canSubmit: { type: Boolean, default: false },
    submitting: { type: Boolean, default: false },
    componentName: { type: String, default: "" },
  },
  data() {
    return {
      form: {},
      errors: {},
    };
  },
  computed: {
    schema() {
      return schemaFor(this.componentName);
    },
  },
  created() {
    const next = {};
    (this.schema.fields || []).forEach((field) => {
      next[field.name] = field.type === "checkbox" ? false : "";
    });
    this.form = next;
  },
  methods: {
    validate() {
      const errors = {};
      (this.schema.fields || []).forEach((field) => {
        const value = this.form[field.name];
        if (field.required && field.type === "checkbox" && value !== true) {
          errors[field.name] = "This confirmation is required";
        } else if (field.required && field.type !== "checkbox" && (value === "" || value == null)) {
          errors[field.name] = "This field is required";
        } else if (field.pattern && value && !new RegExp(field.pattern).test(String(value))) {
          errors[field.name] = "Enter a valid value";
        }
      });
      this.errors = errors;
      return Object.keys(errors).length === 0;
    },
    payload() {
      const out = { ...this.form };
      if (this.schema.extraDocuments) out.documents = [];
      Object.keys(out).forEach((key) => {
        const field = (this.schema.fields || []).find((item) => item.name === key);
        if (field && field.type === "number" && out[key] !== "" && out[key] != null) {
          out[key] = Number(out[key]);
        }
      });
      return out;
    },
    onSubmit() {
      if (!this.canSubmit || this.submitting) return;
      if (!this.validate()) return;
      this.$emit("event-submitted", {
        eventType: "STEP_SUBMITTED",
        payload: this.payload(),
        nodeKey: this.nodeKey,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.node-page {
  max-width: 44rem;
}

.node-page__header {
  margin-bottom: $space-6;
}

.node-form {
  background: $color-card-bg;
  border: 1px solid $color-card-border;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  padding: $space-8;
}
</style>
