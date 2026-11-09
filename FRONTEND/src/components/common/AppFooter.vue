<template>
  <footer class="app-footer">
    <p>&copy; {{ new Date().getFullYear() }} Northline — Loan Workflow Portal</p>
  </footer>
</template>

<script>
export default {
  name: "AppFooter",
};
</script>

<style lang="scss" scoped>
.app-footer {
  background: $color-bg-surface;
  border-top: 1px solid $color-border-light;
  padding: $space-4 $space-6;
  font-size: $font-size-sm;
  color: $color-text-muted;
  margin-top: auto;
}
</style>