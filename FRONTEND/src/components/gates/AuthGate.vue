<template>
  <div class="gate">
    <div class="gate__card au-card">
      <h2 class="gate__title">Authentication required</h2>
      <p class="gate__description">
        Verify the contact already recorded on this application. The code is
        issued by the server and is not stored in the browser.
      </p>

      <div class="gate__methods">
        <button
          v-for="method in availableMethods"
          :key="method"
          type="button"
          class="btn btn--ghost au-button au-button--ghost"
          :disabled="submitting"
          @click="selectedMethod = method"
        >
          {{ methodLabel(method) }}
        </button>
      </div>

      <form v-if="selectedMethod" class="gate__form" @submit.prevent="onSubmit">
        <div v-if="!challengeId" class="form-group">
          <label class="form-label" for="subject">{{ subjectLabel }}</label>
          <input id="subject" v-model="subject" class="form-input" autocomplete="off" />
        </div>
        <div v-else class="form-group">
          <label class="form-label" for="code">One-time code</label>
          <input id="code" v-model="code" class="form-input" maxlength="6" inputmode="numeric" autocomplete="one-time-code" />
          <p v-if="devCode" class="form-hint">Development code: {{ devCode }}</p>
        </div>
        <p v-if="authError" class="gate__error" role="alert">{{ authError }}</p>
        <div class="gate__actions">
          <button type="submit" class="btn btn--primary au-button au-button--primary" :disabled="submitting">
            {{ actionLabel }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { startAuth, verifyAuth } from "@/api/workflow";

export default {
  name: "AuthGate",
  props: {
    methods: { type: Array, default: () => [] },
  },
  data() {
    return {
      selectedMethod: null,
      subject: "",
      code: "",
      challengeId: null,
      devCode: null,
      submitting: false,
      authError: null,
    };
  },
  computed: {
    availableMethods() {
      return this.methods && this.methods.length ? this.methods : ["MOBILE_OTP", "AADHAAR"];
    },
    subjectLabel() {
      return this.selectedMethod === "AADHAAR" ? "Aadhaar number" : "Mobile number";
    },
    actionLabel() {
      if (this.submitting) return "Please wait…";
      return this.challengeId ? "Verify code" : "Send code";
    },
  },
  methods: {
    methodLabel(method) {
      const labels = { MOBILE_OTP: "Mobile OTP", AADHAAR: "Aadhaar" };
      return labels[method] || method;
    },
    async onSubmit() {
      this.submitting = true;
      this.authError = null;
      try {
        if (!this.challengeId) {
          const started = await startAuth({
            method: this.selectedMethod,
            subject: this.subject,
          });
          this.challengeId = started.challengeId;
          this.devCode = started.devCode || null;
        } else {
          await verifyAuth({
            challengeId: this.challengeId,
            method: this.selectedMethod,
            code: this.code,
          });
          this.$emit("authenticated");
        }
      } catch (err) {
        this.authError = err.message || "Authentication failed.";
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.gate__card {
  background: $color-card-bg;
  border: 1px solid $color-card-border;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  padding: $space-8;
  max-width: 32rem;
  margin: 0 auto;
}
.gate__methods { display: flex; gap: $space-3; flex-wrap: wrap; margin: $space-6 0; }
.gate__error { color: $color-error; }
.gate__actions { display: flex; justify-content: flex-end; }
</style>
