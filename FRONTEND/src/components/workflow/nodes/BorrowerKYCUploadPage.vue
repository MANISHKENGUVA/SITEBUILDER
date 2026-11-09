<template>
  <div class="node-page">
    <header class="node-page__header">
      <h1 class="node-page__title">Identity documents</h1>
      <p class="node-page__description">
        This deployment accepts a local file reference while document storage is
        not configured. Production requires an uploaded file URL.
      </p>
    </header>
    <form class="node-form" novalidate @submit.prevent="onSubmit">
      <div class="form-group">
        <label class="form-label" for="aadhaarFile">Aadhaar document <span class="form-label--required" /></label>
        <input id="aadhaarFile" type="file" class="form-input" accept=".pdf,.jpg,.jpeg,.png" @change="onFile('aadhaar', $event)" />
        <p class="form-hint">{{ form.aadhaarName || "PDF, JPG or PNG" }}</p>
        <p v-if="errors.aadhaar" class="validation-message">{{ errors.aadhaar }}</p>
      </div>
      <div class="form-group">
        <label class="form-label" for="panFile">PAN document <span class="form-label--required" /></label>
        <input id="panFile" type="file" class="form-input" accept=".pdf,.jpg,.jpeg,.png" @change="onFile('pan', $event)" />
        <p class="form-hint">{{ form.panName || "PDF, JPG or PNG" }}</p>
        <p v-if="errors.pan" class="validation-message">{{ errors.pan }}</p>
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
export default {
  name: "BorrowerKYCUploadPage",
  props: {
    nodeKey: { type: String, required: true },
    sessionId: { type: String, required: true },
    canSubmit: { type: Boolean, default: false },
    submitting: { type: Boolean, default: false },
  },
  data() {
    return {
      form: {
        aadhaarName: "",
        panName: "",
        aadhaarFileUrl: "",
        panFileUrl: "",
      },
      errors: {},
    };
  },
  methods: {
    onFile(kind, event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const ref = `local-upload://${encodeURIComponent(file.name)}`;
      if (kind === "aadhaar") {
        this.form.aadhaarName = file.name;
        this.form.aadhaarFileUrl = ref;
      } else {
        this.form.panName = file.name;
        this.form.panFileUrl = ref;
      }
    },
    validate() {
      const errors = {};
      if (!this.form.aadhaarFileUrl) errors.aadhaar = "Aadhaar document is required";
      if (!this.form.panFileUrl) errors.pan = "PAN document is required";
      this.errors = errors;
      return Object.keys(errors).length === 0;
    },
    onSubmit() {
      if (!this.canSubmit || this.submitting) return;
      if (!this.validate()) return;
      this.$emit("event-submitted", {
        eventType: "STEP_SUBMITTED",
        payload: {
          aadhaarFileUrl: this.form.aadhaarFileUrl,
          panFileUrl: this.form.panFileUrl,
        },
        nodeKey: this.nodeKey,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.node-page { max-width: 44rem; }
.node-page__header { margin-bottom: $space-6; }
.node-form {
  background: $color-card-bg;
  border: 1px solid $color-card-border;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  padding: $space-8;
}
</style>
