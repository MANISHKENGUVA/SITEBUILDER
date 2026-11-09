<template>
  <div class="spinner" role="status" aria-label="Loading">
    <div class="spinner__ring"></div>
  </div>
</template>

<script>
export default {
  name: "LoadingSpinner",
};
</script>

<style lang="scss" scoped>
.spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: $space-4;
}
.spinner__ring {
  width: 32px;
  height: 32px;
  border: 3px solid $color-border-light;
  border-top-color: $color-spruce-base;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>