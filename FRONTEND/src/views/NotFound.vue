<template>
  <div class="not-found">
    <div class="not-found__card au-card">
      <h1>404</h1>
      <p>Page not found</p>
      <button class="btn btn--primary au-button au-button--primary" @click="goHome">Go to catalogue</button>
    </div>
  </div>
</template>

<script>
export default {
  name: "NotFound",
  methods: {
    goHome() {
      this.$router.push("/catalogue");
    },
  },
};
</script>

<style lang="scss" scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
.not-found__card {
  text-align: center;
  padding: $space-8;
}
.not-found h1 {
  font-size: $font-size-3xl;
  color: $color-text-primary;
  margin: 0 0 $space-2;
}
.not-found p {
  color: $color-text-secondary;
  margin: 0 0 $space-6;
}
</style>