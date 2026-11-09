<template>
  <header class="app-header">
    <router-link to="/catalogue" class="header__brand">
      <span class="header__logo" aria-hidden="true">N</span>
      <span class="header__brand-name">Northline</span>
    </router-link>

    <div v-if="product || applicationNo || actor" class="header__context">
      <div v-if="product" class="header__context-item au-chip au-chip--default">
        <span class="header__label">Product</span>
        <span class="header__value">{{ product.name }}</span>
      </div>
      <div v-if="applicationNo" class="header__context-item au-chip au-chip--default">
        <span class="header__label">Application</span>
        <span class="header__value">{{ applicationNo }}</span>
      </div>
      <div v-if="actor" class="header__context-item au-chip au-chip--default">
        <span class="header__label">Actor</span>
        <span class="header__value">{{ actor }}</span>
      </div>
    </div>

    <nav class="header__nav" aria-label="Main Navigation">
      <router-link to="/catalogue" class="nav-link" active-class="is-active">Catalogue</router-link>
      <router-link to="/builder" class="nav-link" active-class="is-active">Config Builder</router-link>
      <router-link to="/workflow-viewer" class="nav-link" active-class="is-active">Workflow Viewer</router-link>
    </nav>

    <div class="header__actions">
      <button
        type="button"
        class="btn btn--ghost btn--sm au-button au-button--ghost header__menu"
        aria-label="Open progress navigation"
        @click="$emit('toggle-mobile-nav')"
      >
        Menu
      </button>
    </div>
  </header>
</template>

<script>
export default {
  name: "AppHeader",
  props: {
    product: { type: Object, default: null },
    applicationNo: { type: String, default: null },
    actor: { type: String, default: null },
  },
};
</script>

<style lang="scss" scoped>
.app-header {
  background: $color-bg-surface;
  border-bottom: 1px solid $color-border-light;
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-4;
  padding: 0 $space-6;
  position: sticky;
  top: 0;
  z-index: $z-sticky;
}

.header__nav {
  display: flex;
  align-items: center;
  gap: $space-4;
}

.nav-link {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-secondary;
  padding: $space-2 $space-3;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.15s ease;

  &:hover {
    color: $color-text-primary;
    background: $color-bg-body;
    text-decoration: none;
  }

  &.is-active {
    color: $color-spruce-base;
    background: #e6f4f6;
    font-weight: $font-weight-semibold;
  }
}

.header__menu {
  display: none;
}

@media (max-width: 767px) {
  .header__context {
    display: none;
  }

  .header__nav {
    display: none;
  }

  .header__menu {
    display: inline-flex;
  }
}
</style>
