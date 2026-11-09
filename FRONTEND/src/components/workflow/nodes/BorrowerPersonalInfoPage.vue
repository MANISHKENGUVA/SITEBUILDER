<template>
  <div class="node-page">
    <header class="node-page__header">
      <h1 class="node-page__title">Personal information</h1>
      <p class="node-page__description">
        These details are used for identity checks. The server stores hashed
        identifiers, not raw PAN or Aadhaar numbers.
      </p>
    </header>
    <form class="node-form" @submit.prevent="onSubmit" novalidate>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="fullName">Full name <span class="form-label--required" /></label>
          <input id="fullName" type="text" class="form-input" :class="{ error: errors.fullName }" v-model="form.fullName" autocomplete="name" />
          <p v-if="errors.fullName" class="validation-message">{{ errors.fullName }}</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="dateOfBirth">Date of birth <span class="form-label--required" /></label>
          <input id="dateOfBirth" type="date" class="form-input" :class="{ error: errors.dateOfBirth }" v-model="form.dateOfBirth" />
          <p v-if="errors.dateOfBirth" class="validation-message">{{ errors.dateOfBirth }}</p>
        </div>
        <div class="form-group">
          <fieldset class="form-fieldset">
            <legend class="form-label">Gender <span class="form-label--required" /></legend>
            <div class="form-radio-group">
              <label v-for="option in genders" :key="option" class="form-radio">
                <input type="radio" name="gender" :value="option" v-model="form.gender" />
                {{ option }}
              </label>
            </div>
          </fieldset>
          <p v-if="errors.gender" class="validation-message">{{ errors.gender }}</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="pan">PAN <span class="form-label--required" /></label>
          <input id="pan" type="text" class="form-input" maxlength="10" :class="{ error: errors.pan }" v-model="form.pan" autocomplete="off" />
          <p v-if="errors.pan" class="validation-message">{{ errors.pan }}</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="aadhaar">Aadhaar</label>
          <input id="aadhaar" type="text" class="form-input" maxlength="12" inputmode="numeric" :class="{ error: errors.aadhaar }" v-model="form.aadhaar" autocomplete="off" />
          <p v-if="errors.aadhaar" class="validation-message">{{ errors.aadhaar }}</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="email">Email</label>
          <input id="email" type="email" class="form-input" :class="{ error: errors.email }" v-model="form.email" autocomplete="email" />
          <p v-if="errors.email" class="validation-message">{{ errors.email }}</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="mobileNumber">Mobile number <span class="form-label--required" /></label>
          <input id="mobileNumber" type="tel" class="form-input" maxlength="10" inputmode="numeric" :class="{ error: errors.mobileNumber }" v-model="form.mobileNumber" autocomplete="tel" />
          <p v-if="errors.mobileNumber" class="validation-message">{{ errors.mobileNumber }}</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="loanPurpose">Loan purpose</label>
          <input id="loanPurpose" type="text" class="form-input" v-model="form.loanPurpose" />
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
  name: "BorrowerPersonalInfoPage",
  props: {
    nodeKey: { type: String, required: true },
    sessionId: { type: String, required: true },
    canSubmit: { type: Boolean, default: false },
    submitting: { type: Boolean, default: false },
  },
  data() {
    return {
      form: {
        fullName: "",
        dateOfBirth: "",
        gender: "",
        pan: "",
        aadhaar: "",
        email: "",
        mobileNumber: "",
        loanPurpose: "",
      },
      errors: {},
      genders: ["MALE", "FEMALE", "OTHER"],
    };
  },
  methods: {
    validate() {
      const errors = {};
      if (!this.form.fullName.trim()) errors.fullName = "Full name is required";
      if (!this.form.dateOfBirth) errors.dateOfBirth = "Date of birth is required";
      if (!this.form.gender) errors.gender = "Select a gender";
      const pan = this.form.pan.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) errors.pan = "Enter a valid PAN";
      if (this.form.aadhaar && !/^[0-9]{12}$/.test(this.form.aadhaar)) {
        errors.aadhaar = "Aadhaar must be 12 digits";
      }
      if (this.form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) {
        errors.email = "Enter a valid email";
      }
      if (!/^[6-9][0-9]{9}$/.test(this.form.mobileNumber)) {
        errors.mobileNumber = "Enter a 10-digit Indian mobile number";
      }
      this.errors = errors;
      return Object.keys(errors).length === 0;
    },
    onSubmit() {
      if (!this.canSubmit || this.submitting) return;
      if (!this.validate()) return;
      this.$emit("event-submitted", {
        eventType: "STEP_SUBMITTED",
        payload: {
          ...this.form,
          pan: this.form.pan.trim().toUpperCase(),
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
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: $space-5;
}
.form-radio-group { display: flex; gap: $space-4; flex-wrap: wrap; }
.form-fieldset { border: 0; margin: 0; padding: 0; }
</style>
