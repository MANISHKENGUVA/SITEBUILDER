/**
 * Centrally defined workflow node types.
 * Exactly four types supported by the workflow execution backend.
 * NO separate DECISION node — rule conditions live on outgoing edges.
 */
export const NODE_TYPES = Object.freeze({
  ACTOR: "ACTOR",
  SYSTEM_INTERNAL_PROCESS: "SYSTEM_INTERNAL_PROCESS",
  WEBHOOK: "WEBHOOK",
  API: "API",
});

export const NODE_TYPE_INFO = Object.freeze({
  [NODE_TYPES.ACTOR]: {
    name: "Actor (User Step)",
    description: "User-facing workflow form or screen completed by an actor (e.g. Borrower, Lender, Manager).",
    icon: "user",
    badgeClass: "badge-actor",
    color: "#034953", // Spruce base
    defaultAccess: "PUBLIC",
    category: "Interactive",
  },
  [NODE_TYPES.SYSTEM_INTERNAL_PROCESS]: {
    name: "System Process",
    description: "Internal backend process or computation (e.g. interest rate, score calculation).",
    icon: "cpu",
    badgeClass: "badge-system",
    color: "#6b21a8", // Purple
    category: "Backend",
  },
  [NODE_TYPES.WEBHOOK]: {
    name: "Webhook Integration",
    description: "Outbound HTTP webhook event notification to external services.",
    icon: "broadcast",
    badgeClass: "badge-webhook",
    color: "#c2410c", // Orange
    category: "Integration",
  },
  [NODE_TYPES.API]: {
    name: "API Integration",
    description: "Synchronous REST API request / response call (e.g. Bureau, KYC lookup).",
    icon: "code",
    badgeClass: "badge-api",
    color: "#0284c7", // Sky blue
    category: "Integration",
  },
});

export const ACCESS_TYPES = Object.freeze([
  { value: "PUBLIC", label: "Public (No auth required)" },
  { value: "AUTHENTICATED", label: "Authenticated (Session & Identity required)" },
  { value: "CAPTCHA", label: "Captcha Protected (reCAPTCHA v2 required)" },
]);

export const HTTP_METHODS = Object.freeze(["GET", "POST", "PUT", "DELETE", "PATCH"]);

export const DEFAULT_NODE_TEMPLATES = Object.freeze({
  [NODE_TYPES.ACTOR]: {
    type: NODE_TYPES.ACTOR,
    component: "PersonalInfoPage",
    access: { type: "PUBLIC" },
    metadata: {
      actor: "BORROWER",
      module: "DETAILS",
      moduleVersion: "V1",
      node: "NEW-STEP",
      nodeVersion: "V1",
    },
    edges: {},
  },
  [NODE_TYPES.SYSTEM_INTERNAL_PROCESS]: {
    type: NODE_TYPES.SYSTEM_INTERNAL_PROCESS,
    processHandler: "calculateMetrics",
    settings: {
      timeoutMs: 5000,
      retryCount: 2,
    },
    metadata: {
      actor: "SYSTEM",
      module: "PROCESS",
      moduleVersion: "V1",
      node: "METRICS-CALC",
      nodeVersion: "V1",
    },
    edges: {},
  },
  [NODE_TYPES.WEBHOOK]: {
    type: NODE_TYPES.WEBHOOK,
    endpoint: "https://api.partner.com/events/webhook",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    timeout: 5000,
    retry: { maxRetries: 3, backoffMs: 1000 },
    metadata: {
      actor: "SYSTEM",
      module: "INTEGRATION",
      moduleVersion: "V1",
      node: "DISPATCH-WEBHOOK",
      nodeVersion: "V1",
    },
    edges: {},
  },
  [NODE_TYPES.API]: {
    type: NODE_TYPES.API,
    endpoint: "https://api.partner.com/v1/score",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    timeout: 8000,
    retry: { maxRetries: 2, backoffMs: 500 },
    metadata: {
      actor: "SYSTEM",
      module: "INTEGRATION",
      moduleVersion: "V1",
      node: "FETCH-DATA",
      nodeVersion: "V1",
    },
    edges: {},
  },
});
