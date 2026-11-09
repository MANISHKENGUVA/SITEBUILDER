<template>
  <div class="catalogue-page">
    <AppHeader />
    <main id="main" class="catalogue">
      <header class="catalogue__header">
        <p class="catalogue__eyebrow au-chip au-chip--default">Northline lending</p>
        <h1 class="catalogue__title">Choose a loan product</h1>
        <p class="catalogue__subtitle">
          Each product points at a registered workflow. Starting an application
          creates a server-side session; opening this page does not begin one.
        </p>
        <router-link class="catalogue__viewer-link" to="/workflow-viewer">
          Open workflow logs and graph viewer
        </router-link>
      </header>

      <div v-if="isLoading" class="catalogue__loading" role="status">
        <LoadingSpinner />
        <p>Loading products…</p>
      </div>

      <div v-else-if="error" class="catalogue__error" role="alert">
        <div class="empty-card au-card">
          <h2 class="au-card__title">Unable to load products</h2>
          <p>{{ error.message }}</p>
          <button type="button" class="btn btn--primary au-button au-button--primary" @click="loadProducts">Try again</button>
        </div>
      </div>

      <div v-else-if="products.length === 0" class="catalogue__empty">
        <div class="empty-card au-card">
          <h2 class="au-card__title">No products available</h2>
          <p>There are no loan products registered for this deployment.</p>
        </div>
      </div>

      <template v-else>
        <div class="catalogue__toolbar">
          <span class="catalogue__count au-chip au-chip--success">
            {{ availableCount }} product{{ availableCount === 1 ? "" : "s" }} available
          </span>
        </div>
        <div class="catalogue__grid">
          <ProductCard
            v-for="product in products"
            :key="product.id"
            :product="product"
            :busy="startingId === product.id"
            @select="onSelectProduct"
          />
        </div>
      </template>

      <p v-if="startError" class="catalogue__start-error" role="alert">{{ startError }}</p>
    </main>
    <AppFooter />
  </div>
</template>

<script>
import { listProducts } from "@/api/workflow";
import { decorateProducts } from "@/components/registry/productRegistry";
import { startProductSession } from "@/session/sessionManager";
import ProductCard from "@/components/common/ProductCard.vue";
import LoadingSpinner from "@/components/common/LoadingSpinner.vue";
import AppHeader from "@/components/common/AppHeader.vue";
import AppFooter from "@/components/common/AppFooter.vue";

export default {
  name: "Catalogue",
  components: { ProductCard, LoadingSpinner, AppHeader, AppFooter },
  data() {
    return {
      products: [],
      isLoading: true,
      error: null,
      startingId: null,
      startError: null,
    };
  },
  computed: {
    availableCount() {
      return this.products.filter((product) => product.available).length;
    },
  },
  created() {
    this.loadProducts();
  },
  methods: {
    async loadProducts() {
      this.isLoading = true;
      this.error = null;
      try {
        const products = await listProducts();
        this.products = decorateProducts(products);
      } catch (err) {
        this.error = { message: err.message || "Failed to load products" };
      } finally {
        this.isLoading = false;
      }
    },
    async onSelectProduct(product) {
      if (!product.available || this.startingId) return;
      this.startingId = product.id;
      this.startError = null;
      this.$store.mutations.setActiveProduct(product);
      try {
        await startProductSession(product.id);
        this.$router.push({ name: "WorkflowHost" });
      } catch (err) {
        this.startError = err.message || "Unable to start this application.";
        this.startingId = null;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.catalogue-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: $color-bg-body;
}

.catalogue {
  flex: 1;
  max-width: $container-max;
  margin: 0 auto;
  width: 100%;
  padding: $space-8 $container-padding $space-16;
}

.catalogue__eyebrow {
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: $color-spruce-base;
  margin: 0 0 $space-3;
}

.catalogue__title {
  font-size: $font-size-3xl;
  margin: 0 0 $space-3;
}

.catalogue__subtitle {
  font-size: $font-size-lg;
  color: $color-text-secondary;
  max-width: 40rem;
  margin: 0;
}

.catalogue__viewer-link {
  display: inline-block;
  margin-top: $space-4;
  font-weight: $font-weight-semibold;
}

.catalogue__header {
  margin-bottom: $space-8;
}

.catalogue__toolbar {
  margin-bottom: $space-6;
}

.catalogue__count {
  display: inline-flex;
}

.catalogue__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: $space-6;
}

.catalogue__loading,
.catalogue__error,
.catalogue__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  text-align: center;
}

.empty-card {
  width: 100%;
  max-width: 32rem;
  align-items: center;
  text-align: center;
}

.empty-card h2 {
  margin: 0 0 $space-3;
}

.empty-card p {
  color: $color-text-secondary;
}

.catalogue__start-error {
  margin-top: $space-6;
  color: $color-error;
}
</style>
