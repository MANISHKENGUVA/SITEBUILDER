<template>
  <div class="gate">
    <div class="gate__card au-card">
      <h2 class="gate__title">Verification required</h2>
      <p class="gate__description">
        Complete the CAPTCHA check. This portal cannot skip the gate; the
        server must record a successful verification.
      </p>
      <div ref="captchaContainer" class="gate__captcha">
        <p v-if="bypass" class="form-hint">Development CAPTCHA bypass is enabled on the server.</p>
        <p v-else-if="!siteKey" class="form-hint">CAPTCHA is required but no public site key is configured.</p>
      </div>
      <p v-if="captchaError" class="gate__error" role="alert">{{ captchaError }}</p>
      <div class="gate__actions">
        <button type="button" class="btn btn--primary au-button au-button--primary" :disabled="submitting" @click="onVerify">
          {{ submitting ? "Verifying…" : "Verify" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { verifyCaptcha } from "@/api/workflow";

export default {
  name: "CaptchaGate",
  data() {
    return {
      submitting: false,
      captchaError: null,
      token: null,
      widgetId: null,
      siteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || "",
      bypass: import.meta.env.VITE_CAPTCHA_DEV_BYPASS === "true",
    };
  },
  mounted() {
    if (this.siteKey && !this.bypass) this.loadRecaptcha();
  },
  beforeDestroy() {
    if (this.widgetId != null && window.grecaptcha) {
      window.grecaptcha.reset(this.widgetId);
    }
  },
  methods: {
    loadRecaptcha() {
      const existing = document.getElementById("recaptcha-loader");
      if (existing) {
        this.initWidget();
        return;
      }
      window.__northlineOnRecaptcha = () => this.initWidget();
      const script = document.createElement("script");
      script.id = "recaptcha-loader";
      script.src = "https://www.google.com/recaptcha/api.js?render=explicit&onload=__northlineOnRecaptcha";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    },
    initWidget() {
      if (!window.grecaptcha || !this.$refs.captchaContainer) return;
      this.widgetId = window.grecaptcha.render(this.$refs.captchaContainer, {
        sitekey: this.siteKey,
        callback: (token) => {
          this.token = token;
        },
        "expired-callback": () => {
          this.token = null;
        },
      });
    },
    async onVerify() {
      this.submitting = true;
      this.captchaError = null;
      try {
        if (!this.bypass && this.siteKey && !this.token) {
          throw new Error("Complete the CAPTCHA before continuing.");
        }
        await verifyCaptcha({ token: this.token || "dev-bypass" });
        this.$emit("verified");
      } catch (err) {
        this.captchaError = err.message || "CAPTCHA verification failed.";
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
.gate__title { margin: 0 0 $space-3; }
.gate__description { color: $color-text-secondary; }
.gate__captcha { margin: $space-6 0; }
.gate__error { color: $color-error; }
.gate__actions { display: flex; justify-content: flex-end; }
</style>
