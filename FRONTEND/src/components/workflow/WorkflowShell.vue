<template>
  <div class="workflow-shell">
    <AppHeader
      :product="currentProduct"
      :application-no="applicationNo"
      :actor="currentActor"
      @toggle-mobile-nav="mobileNavOpen = !mobileNavOpen"
    />

    <div class="workflow-shell__body">
      <aside class="workflow-shell__sidebar" aria-label="Application progress">
        <slot name="sidebar" />
      </aside>
      <main id="main" class="workflow-shell__main">
        <slot name="main" />
      </main>
    </div>

    <MobileNav :open="mobileNavOpen" @close="mobileNavOpen = false">
      <slot name="sidebar" />
    </MobileNav>

    <AppFooter />
  </div>
</template>

<script>
import AppHeader from "@/components/common/AppHeader.vue";
import AppFooter from "@/components/common/AppFooter.vue";
import MobileNav from "@/components/common/MobileNav.vue";
import { store } from "@/store";

export default {
  name: "WorkflowShell",
  components: { AppHeader, AppFooter, MobileNav },
  props: {
    resolution: { type: Object, required: true },
  },
  data() {
    return {
      mobileNavOpen: false,
    };
  },
  computed: {
    currentProduct() {
      return store.state.activeProduct;
    },
    currentActor() {
      return store.state.actor || "BORROWER";
    },
    applicationNo() {
      return store.state.applicationNo;
    },
  },
};
</script>

<style lang="scss" scoped>
.workflow-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: $color-bg-body;
}

.workflow-shell__body {
  display: flex;
  flex: 1;
  max-width: $container-max;
  margin: 0 auto;
  width: 100%;
  padding: $space-6 $container-padding $space-8;
  gap: $space-8;
}

.workflow-shell__sidebar {
  width: 300px;
  flex-shrink: 0;
  align-self: flex-start;
  box-sizing: border-box;
  padding: $space-6;
  background: $color-bg-surface;
  border: 1px solid $color-border-light;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
}

.workflow-shell__main {
  flex: 1;
  min-width: 0;
}

@media (max-width: 767px) {
  .workflow-shell__body {
    flex-direction: column;
  }

  .workflow-shell__sidebar {
    width: 100%;
    order: 2;
  }

  .workflow-shell__main {
    order: 1;
  }
}
</style>
