<template>
  <article
    class="product-card au-card"
    :class="[
      'product-card--' + (product.accent || 'ink'),
      { 'product-card--disabled': !product.available },
    ]"
  >
    <div class="product-card__icon" aria-hidden="true">{{ icon }}</div>
    <div class="product-card__body">
      <span class="product-card__tag au-chip au-chip--default">{{ product.category }}</span>
      <h2 class="product-card__name au-card__title">{{ product.name }}</h2>
      <p class="product-card__tagline">{{ product.tagline }}</p>
      <p class="product-card__description">{{ product.description }}</p>
      <ul v-if="product.highlights && product.highlights.length" class="product-card__highlights">
        <li v-for="highlight in product.highlights" :key="highlight">{{ highlight }}</li>
      </ul>
      <p v-if="!product.available" class="product-card__unavailable">
        {{ product.unavailableReason }}
      </p>
    </div>
    <div class="product-card__footer">
      <button
        type="button"
        class="btn au-button"
        :class="product.available ? 'btn--primary au-button--primary' : 'btn--secondary au-button--secondary'"
        :disabled="!product.available || busy"
        @click="onSelect"
      >
        {{ actionLabel }}
      </button>
    </div>
  </article>
</template>

<script>
export default {
  name: "ProductCard",
  props: {
    product: { type: Object, required: true },
    busy: { type: Boolean, default: false },
  },
  computed: {
    icon() {
      const icons = { spark: "✦", briefcase: "▣", home: "⌂", car: "▣" };
      return icons[this.product.icon] || "◆";
    },
    actionLabel() {
      if (!this.product.available) return "Not available";
      if (this.busy) return "Starting…";
      return "Start application";
    },
  },
  methods: {
    onSelect() {
      if (!this.product.available || this.busy) return;
      this.$emit("select", this.product);
    },
  },
};
</script>
