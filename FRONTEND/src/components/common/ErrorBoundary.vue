<template>
  <div v-if="!error" class="error-boundary__content">
    <slot />
  </div>
  <div v-else class="error-boundary__error au-card" role="alert" aria-live="polite">
    <h3 class="au-card__title">Something went wrong</h3>
    <p>{{ error.message }}</p>
    <button class="btn btn--primary au-button au-button--primary" @click="resetError">Try again</button>
  </div>
</template>

<script>
export default {
  name: "ErrorBoundary",
  data() {
    return {
      error: null,
    };
  },
  methods: {
    resetError() {
      this.error = null;
      this.$emit("reset");
    },
  },
  // Vue 2 error capture
  errorCaptured(err, vm, info) {
    this.error = {
      message: err.message || "An unexpected error occurred",
      info,
    };
    return false;
  },
};
</script>

<style lang="scss" scoped>
.error-boundary__error {
  text-align: center;
  padding: $space-8;
  color: $color-text-primary;
}
.error-boundary__error h3 {
  font-size: $font-size-xl;
  margin: 0 0 $space-3;
}
.error-boundary__error p {
  color: $color-text-secondary;
  margin: 0 0 $space-6;
}
</style>