<template>
  <div class="terminal-page terminal--rejected">
    <div class="terminal__icon">✕</div>
    <h1 class="terminal__title">Application not approved</h1>
    <p class="terminal__description">
      Your loan application could not be approved at this time. You may reapply
      after addressing the issues identified during review.
    </p>
    <div class="terminal__actions">
      <button class="btn btn--primary au-button au-button--primary" @click="$router.push('/catalogue')">Return to catalogue</button>
    </div>
  </div>
</template>

<script>
export default {
  name: "ApplicationRejectedPage",
};
</script>

<style lang="scss" scoped>
.terminal-page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; text-align: center; }
.terminal__icon { font-size: 48px; margin-bottom: $space-4; color: $color-error; }
.terminal__title { font-size: $font-size-3xl; color: $color-text-primary; margin: 0 0 $space-3; }
.terminal__description { font-size: $font-size-lg; color: $color-text-secondary; margin: 0 0 $space-8; max-width: 600px; }
.terminal__actions { display: flex; gap: $space-3; justify-content: center; }
</style>