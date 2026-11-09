<template>
  <div class="node-page">
    <header class="node-page__header">
      <h1 class="node-page__title">Address</h1>
      <p class="node-page__description">Current residential address for this applicant.</p>
    </header>
    <form class="node-form" novalidate @submit.prevent="onSubmit">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="flatNo">Flat / house no.</label>
          <input id="flatNo" v-model="form.flatNo" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label" for="building">Building</label>
          <input id="building" v-model="form.building" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label" for="street">Street <span class="form-label--required" /></label>
          <input id="street" v-model="form.street" class="form-input" :class="{ error: errors.street }" />
          <p v-if="errors.street" class="validation-message">{{ errors.street }}</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="landmark">Landmark</label>
          <input id="landmark" v-model="form.landmark" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label" for="city">City <span class="form-label--required" /></label>
          <input id="city" v-model="form.city" class="form-input" :class="{ error: errors.city }" />
          <p v-if="errors.city" class="validation-message">{{ errors.city }}</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="district">District</label>
          <input id="district" v-model="form.district" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label" for="state">State <span class="form-label--required" /></label>
          <input id="state" v-model="form.state" class="form-input" :class="{ error: errors.state }" />
          <p v-if="errors.state" class="validation-message">{{ errors.state }}</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="pincode">Pincode <span class="form-label--required" /></label>
          <input id="pincode" v-model="form.pincode" class="form-input" maxlength="6" inputmode="numeric" :class="{ error: errors.pincode }" />
          <p v-if="errors.pincode" class="validation-message">{{ errors.pincode }}</p>
        </div>
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
  name: "BorrowerAddressInfoPage",
  props: {
    nodeKey: { type: String, required: true },
    sessionId: { type: String, required: true },
    canSubmit: { type: Boolean, default: false },
    submitting: { type: Boolean, default: false },
  },
  data() {
    return {
      form: {
        flatNo: "",
        building: "",
        street: "",
        landmark: "",
        city: "",
        district: "",
        state: "",
        pincode: "",
        country: "INDIA",
      },
      errors: {},
    };
  },
  methods: {
    validate() {
      const errors = {};
      if (!this.form.street.trim()) errors.street = "Street is required";
      if (!this.form.city.trim()) errors.city = "City is required";
      if (!this.form.state.trim()) errors.state = "State is required";
      if (!/^[1-9][0-9]{5}$/.test(this.form.pincode)) errors.pincode = "Enter a 6-digit pincode";
      this.errors = errors;
      return Object.keys(errors).length === 0;
    },
    onSubmit() {
      if (!this.canSubmit || this.submitting) return;
      if (!this.validate()) return;
      this.$emit("event-submitted", {
        eventType: "STEP_SUBMITTED",
        payload: this.form,
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
