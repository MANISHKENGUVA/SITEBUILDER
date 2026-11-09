<template>
  <div class="node-renderer">
    <div v-if="!isRegisteredName" class="node-renderer__error" role="alert">
      <h2>Component not available</h2>
      <p>The resolved component is not on the frontend allow-list.</p>
      <p class="node-renderer__detail">
        Component: <code>{{ componentName }}</code>
        · Node: <code>{{ nodeKey }}</code>
      </p>
    </div>
    <component
      v-else
      :is="resolved"
      :node-key="nodeKey"
      :session-id="sessionId"
      :can-submit="canSubmit"
      :submitting="submitting"
      :component-name="componentName"
      @event-submitted="$emit('event-submitted', $event)"
    />
  </div>
</template>

<script>
import { isRegistered, resolveComponent } from "@/components/registry/componentRegistry";

export default {
  name: "NodeRenderer",
  props: {
    nodeKey: { type: String, required: true },
    componentName: { type: String, default: "" },
    sessionId: { type: String, required: true },
    canSubmit: { type: Boolean, default: false },
    submitting: { type: Boolean, default: false },
  },
  computed: {
    isRegisteredName() {
      return Boolean(this.componentName) && isRegistered(this.componentName);
    },
    resolved() {
      return resolveComponent(this.componentName);
    },
  },
};
</script>

<style lang="scss" scoped>
.node-renderer__error {
  text-align: center;
  padding: $space-8;
}

.node-renderer__detail {
  font-family: $font-mono;
  font-size: $font-size-xs;
  color: $color-text-muted;
  background: $color-ink-tint;
  padding: $space-3;
  border-radius: $radius-md;
}
</style>
