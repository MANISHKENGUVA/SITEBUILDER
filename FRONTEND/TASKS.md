# Implementation Checklist — Config-Driven Loan Workflow Portal

## Phase 1 — Audit (COMPLETED)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Inspect package.json and source structure | Existing and verified | Backend only; no frontend exists yet |
| 2 | Identify app entry point and router config | Missing | Created new frontend scaffold |
| 3 | Locate loan workflow JSON files | Existing and verified | `backend/src/workflow/loan-flow-v7.json` |
| 4 | Identify workflow IDs, versions, states, actors | Existing and verified | workflowVersion: LOAN-FLOW-V7; actors: BORROWER, COBORROWER, MANAGER, LENDER |
| 5 | Locate component registry and dynamic renderer | Missing | Created new component registry |
| 6 | Inspect workflow API clients and endpoints | Existing and verified | POST /workflow/session, /workflow/resolve, /workflow/event, /workflow/captcha/verify, /auth/verify |
| 7 | Inspect session management | Existing and verified | Session header: x-workflow-session; SQLite persistence |
| 8 | Inspect CAPTCHA and auth gates | Existing and verified | reCAPTCHA v2; MOBILE_OTP/AADHAAR methods |
| 9 | Inspect event submission and validation | Existing and verified | Backend step handlers validate all payloads |
| 10 | Inspect theme files, SCSS variables | Missing | Created new SCSS design system |
| 11 | Identify duplicated loan components | Missing | No existing frontend components |
| 12 | Identify incomplete pages, broken routes | Missing | Created all routes from scratch |

## Phase 2 — Product and Workflow Registry (IMPLEMENTED)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 13 | Create product registry from backend products.js | Implemented | `src/components/registry/productRegistry.js` - mirrors backend PRODUCTS |
| 14 | Create component registry for workflow components | Implemented | `src/components/registry/componentRegistry.js` - maps component names to Vue components |
| 15 | Connect catalogue to workflow definition references | Implemented | All available products reference LOAN-FLOW-V7 |

## Phase 3 — Shared Application Shell (IMPLEMENTED)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 16 | Create Vue 2 + Vite project scaffold | Implemented | package.json, vite.config.js, index.html |
| 17 | Implement App.vue with router-view | Implemented | `src/App.vue` |
| 18 | Implement shared layout shell (header, sidebar, main, footer) | Implemented | `src/components/workflow/WorkflowShell.vue` |
| 19 | Implement loan catalogue view | Implemented | `src/views/Catalogue.vue` with loading/empty/error states |
| 20 | Implement workflow host view | Implemented | `src/views/WorkflowHost.vue` - shared host that resolves state dynamically |

## Phase 4 — Workflow Runtime (IMPLEMENTED)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 21 | Create API client (axios) with session header | Implemented | `src/api/client.js`, `src/api/workflow.js` |
| 22 | Implement session manager | Implemented | `src/store.js` - centralized session state |
| 23 | Implement workflow resolver | Implemented | POST /workflow/resolve via api/workflow.js |
| 24 | Implement event publisher | Implemented | POST /workflow/event via api/workflow.js |
| 25 | Implement dynamic node renderer | Implemented | `src/components/workflow/NodeRenderer.vue` |
| 26 | Implement gate handling | Implemented | CaptchaGate, AuthGate, NotYourTurnGate, AccessDeniedGate, InternalGate, CompletedGate, ErrorGate |
| 27 | Configure Vue Router | Implemented | `src/router.js` - /catalogue, /workflow, /workflow/:workflowId |

## Phase 5 — Forms and Validation (PARTIALLY IMPLEMENTED)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 28 | Implement reusable form controls | Implemented | Form controls in node components (text, select, radio, date, file) |
| 29 | Implement workflow-specific form components | Implemented | BorrowerPersonalInfoPage, BorrowerAddressInfoPage, BorrowerKYCUploadPage, BorrowerEmploymentInfoPage |
| 30 | Implement form validation with field-level errors | Implemented | Client-side validation in each node component |
| 31 | Implement duplicate submission prevention | Implemented | Submitting flag in NodeRenderer and node components |
| 32 | Implement re-resolution after successful event | Implemented | WorkflowHost re-resolves after event submission |

## Phase 6 — Design System (IMPLEMENTED)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 33 | Create SCSS design tokens | Implemented | _variables, _colors, _typography, _spacing |
| 34 | Implement button, card, form control styles | Implemented | _buttons, _cards, _forms |
| 35 | Implement progress tracker component | Implemented | `src/components/workflow/ProgressTracker.vue` |
| 36 | Implement responsive layouts | Implemented | Mobile/tablet/desktop breakpoints in _navigation, _progress |

## Phase 7 — Security and Error Recovery (IMPLEMENTED)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 37 | Implement controlled error states for unknown components | Implemented | NodeRenderer shows controlled error for unregistered components |
| 38 | Implement session expiration recovery | Implemented | SESSION_INVALID/SESSION_EXPIRED triggers recovery flow |
| 39 | Implement invalid session handling | Implemented | Session reset and redirect to catalogue |
| 40 | Implement unauthorized access prevention | Implemented | Backend-authoritative; frontend never bypasses access rules |

## Phase 8 — Verification

| # | Task | Status | Notes |
|---|------|--------|-------|
| 41 | Run build | Implemented and tested | `npm.cmd run build` - builds successfully (79 modules, 174KB JS) |
| 42 | Run lint | Missing | ESLint config not yet set up |
| 43 | Add focused tests | Missing | No test runner configured for frontend |
| 44 | Update TASKS.md with results | Implemented | This document |

## Phase 9 — Workflow Diagnostics Viewer

| # | Task | Status | Notes |
|---|------|--------|-------|
| 45 | Add workflow config graph and execution log viewer | Implemented | `/workflow-viewer` imports JSON/JSONL locally; linked from catalogue |
