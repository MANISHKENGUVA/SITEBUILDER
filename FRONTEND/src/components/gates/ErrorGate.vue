<template>
  <div class="gate gate--error">
    <div class="gate__card au-card">
      <h2 class="gate__title">Error</h2>
      <p class="gate__description">{{ message }}</p>
      <div class="gate__actions">
        <button class="btn btn--primary au-button au-button--primary" @click="retry">Try again</button>
        <button class="btn btn--ghost au-button au-button--ghost" @click="$router.push('/catalogue')">Return to catalogue</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ErrorGate",
  props: {
    message: { type: String, required: true },
  },
  methods: {
    retry() {
      this.$emit("retry");
      this.$router.replace("/workflow");
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
  max-width: 480px;
  margin: 0 auto;
  text-align: center;
}
.gate__title {
  font-size: $font-size-2xl;
  color: $color-text-primary;
  margin: 0 0 $space-3;
}
.gate__description {
  font-size: $font-size-base;
  color: $color-text-secondary;
  margin: 0 0 $space-6;
}
.gate__actions {
  display: flex;
  gap: $space-3;
  justify-content: center;
}
</style>