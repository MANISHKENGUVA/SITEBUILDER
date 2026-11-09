<template>
  <div class="gate gate--completed">
    <div class="gate__card au-card">
      <h2 class="gate__title">Workflow completed</h2>
      <p class="gate__description">{{ message || "Your application has reached a terminal state." }}</p>
      <div class="gate__actions">
        <button class="btn btn--primary au-button au-button--primary" @click="$router.push('/catalogue')">Return to catalogue</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "CompletedGate",
  props: {
    message: { type: String, default: null },
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
  justify-content: center;
}
</style>