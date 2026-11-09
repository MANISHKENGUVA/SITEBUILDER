/**
 * Presentation overlay for loan products.
 *
 * Availability, workflowId, and workflowVersion come from the backend
 * catalogue. This file only supplies display copy used when the API payload
 * omits a field. It is never authorization evidence.
 */
const PRESENTATION = Object.freeze({
  "personal-loan": Object.freeze({
    icon: "spark",
    accent: "spruce",
    sortOrder: 1,
  }),
  "business-loan": Object.freeze({
    icon: "briefcase",
    accent: "brass",
    sortOrder: 2,
  }),
  "home-loan": Object.freeze({
    icon: "home",
    accent: "ink",
    sortOrder: 3,
  }),
  "vehicle-loan": Object.freeze({
    icon: "car",
    accent: "ink",
    sortOrder: 4,
  }),
});

export function decorateProduct(product) {
  if (!product) return null;
  const extra = PRESENTATION[product.id] || {};
  return {
    ...extra,
    ...product,
    highlights: Array.isArray(product.highlights) ? [...product.highlights] : [],
    icon: product.icon || extra.icon || "spark",
    accent: product.accent || extra.accent || "ink",
    sortOrder: product.sortOrder != null ? product.sortOrder : extra.sortOrder || 99,
  };
}

export function decorateProducts(products) {
  return (products || [])
    .map(decorateProduct)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function productUsesWorkflow(product, workflowId) {
  return Boolean(product && product.workflowId && product.workflowId === workflowId);
}

export { PRESENTATION };
