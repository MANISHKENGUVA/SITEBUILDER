<template>
  <div v-if="open" class="mobile-nav" role="dialog" aria-modal="true" aria-label="Progress">
    <div class="mobile-nav__overlay" @click="close" />
    <div class="mobile-nav__panel mobile-nav__panel--open">
      <div class="mobile-nav__header">
        <span class="mobile-nav__title">Application</span>
        <button type="button" class="mobile-nav__close" aria-label="Close navigation" @click="close">
          Close
        </button>
      </div>
      <div class="mobile-nav__content">
        <slot />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "MobileNav",
  props: {
    open: { type: Boolean, default: false },
  },
  methods: {
    close() {
      this.$emit("close");
    },
  },
};
</script>

<style lang="scss" scoped>
.mobile-nav {
  display: none;
}

@media (max-width: 767px) {
  .mobile-nav {
    display: block;
  }
}
</style>
