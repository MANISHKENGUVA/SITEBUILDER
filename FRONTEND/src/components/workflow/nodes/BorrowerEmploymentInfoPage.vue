<template>
  <div class="node-page">
    <header class="node-page__header">
      <h1 class="node-page__title">Employment</h1>
      <p class="node-page__description">
        Employment type selects the next authorised path on the server. Income
        thresholds are not evaluated in this form.
      </p>
    </header>
    <form class="node-form" @submit.prevent="onSubmit" novalidate>
      <div class="form-group">
        <label class="form-label" for="employmentType">Employment type <span class="form-label--required" /></label>
        <select id="employmentType" class="form-select" :class="{ error: errors.employmentType }" v-model="form.employmentType">
          <option value="">Select</option>
          <option value="SALARIED">Salaried</option>
          <option value="BUSINESS_OWNER">Business owner</option>
          <option value="UNEMPLOYED">Unemployed</option>
        </select>
        <p v-if="errors.employmentType" class="validation-message">{{ errors.employmentType }}</p>
      </div>
      <div v-if="form.employmentType === 'SALARIED'" class="form-grid">
        <div class="form-group">
          <label class="form-label" for="employerName">Employer name <span class="form-label--required" /></label>
          <input id="employerName" class="form-input" :class="{ error: errors.employerName }" v-model="form.employerName" />
          <p v-if="errors.employerName" class="validation-message">{{ errors.employerName }}</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="designation">Designation</label>
          <input id="designation" class="form-input" v-model="form.designation" />
        </div>
      </div>
      <div v-if="form.employmentType === 'BUSINESS_OWNER'" class="form-group">
        <label class="form-checkbox">
          <input type="checkbox" v-model="form.registrationExists" />
          This is a registered business
        </label>
        <p v-if="errors.registrationExists" class="validation-message">{{ errors.registrationExists }}</p>
        <label class="form-label" for="registrationNumber">Registration number</label>
        <input id="registrationNumber" class="form-input" v-model="form.registrationNumber" />
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
  name: "BorrowerEmploymentInfoPage",
  props: {
    nodeKey: { type: String, required: true },
    sessionId: { type: String, required: true },
    canSubmit: { type: Boolean, default: false },
    submitting: { type: Boolean, default: false },
  },
  data() {
    return {
      form: {
        employmentType: "",
        employerName: "",
        designation: "",
        registrationExists: false,
        registrationNumber: "",
      },
      errors: {},
    };
  },
  methods: {
    validate() {
      const errors = {};
      if (!this.form.employmentType) errors.employmentType = "Select an employment type";
      if (this.form.employmentType === "SALARIED" && !this.form.employerName.trim()) {
        errors.employerName = "Employer name is required";
      }
      if (this.form.employmentType === "BUSINESS_OWNER" && !this.form.registrationExists) {
        errors.registrationExists = "A registered business is required for this path";
      }
      this.errors = errors;
      return Object.keys(errors).length === 0;
    },
    payload() {
      if (this.form.employmentType === "BUSINESS_OWNER") {
        return {
          employmentType: this.form.employmentType,
          business: {
            registrationExists: true,
            registrationNumber: this.form.registrationNumber,
          },
        };
      }
      return {
        employmentType: this.form.employmentType,
        employerName: this.form.employerName,
        designation: this.form.designation,
        isActive: this.form.employmentType === "SALARIED",
      };
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
.node-page { max-width: 44rem; }
.node-page__header { margin-bottom: $space-6; }
.node-form {
  background: $color-card-bg;
  border: 1px solid $color-card-border;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  padding: $space-8;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: $space-5;
}
</style>
