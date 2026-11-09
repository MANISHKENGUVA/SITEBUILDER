/**
 * Centralized UI state.
 *
 * The backend remains authoritative for workflow resolution, authorization,
 * and transitions. This store only mirrors what the last successful API call
 * returned so the shell can render.
 */
import { reactive, readonly } from "vue";

function emptyAuth() {
  return {
    required: false,
    methods: null,
    satisfied: false,
    expired: false,
  };
}

const state = reactive({
  sessionId: null,
  actor: null,
  sessionStatus: "ANONYMOUS",
  captchaVerifiedAt: null,
  expiresAt: null,
  authenticationExpired: false,

  applicationId: null,
  applicationNo: null,
  productId: null,
  workflowId: null,
  definitionVersion: null,
  applicationStatus: null,

  currentNode: null,
  currentComponent: null,
  currentComponentView: null,
  workflowActor: null,
  actorStatus: null,
  workflowStatus: null,
  canSubmit: false,
  accessType: null,
  captchaRequired: false,
  authentication: emptyAuth(),
  message: null,
  duplicateEvent: false,

  isLoading: false,
  submitting: false,
  error: null,
  activeProduct: null,
});

const mutations = {
  setSession(payload) {
    if (!payload) return;
    if (payload.sessionId !== undefined) state.sessionId = payload.sessionId;
    if (payload.actor !== undefined) state.actor = payload.actor;
    if (payload.sessionStatus !== undefined) state.sessionStatus = payload.sessionStatus;
    if (payload.captchaVerifiedAt !== undefined) state.captchaVerifiedAt = payload.captchaVerifiedAt;
    if (payload.expiresAt !== undefined) state.expiresAt = payload.expiresAt;
    if (payload.authenticationExpired !== undefined) {
      state.authenticationExpired = payload.authenticationExpired;
    }
  },
  setApplication(payload) {
    if (!payload) return;
    if (payload.applicationId !== undefined) state.applicationId = payload.applicationId;
    if (payload.applicationNo !== undefined) state.applicationNo = payload.applicationNo;
    if (payload.productId !== undefined) state.productId = payload.productId;
    if (payload.workflowId !== undefined) state.workflowId = payload.workflowId;
    if (payload.definitionVersion !== undefined) {
      state.definitionVersion = payload.definitionVersion;
    }
    if (payload.applicationStatus !== undefined) {
      state.applicationStatus = payload.applicationStatus;
    }
  },
  setWorkflowResolution(payload) {
    if (!payload) return;
    state.currentNode = payload.node || null;
    state.currentComponent = payload.component || null;
    state.currentComponentView = payload.componentView || null;
    state.workflowActor = payload.workflowActor || null;
    state.actorStatus = payload.actorStatus || null;
    state.workflowStatus = payload.status || null;
    state.canSubmit = payload.canSubmit === true;
    state.accessType = payload.access && payload.access.type ? payload.access.type : null;
    state.captchaRequired = payload.captcha && payload.captcha.required === true;
    state.authentication = payload.authentication
      ? { ...emptyAuth(), ...payload.authentication }
      : emptyAuth();
    state.message = payload.message || null;
    state.duplicateEvent = payload.duplicateEvent === true;
    if (payload.applicationId) {
      mutations.setApplication(payload);
    }
    if (payload.sessionStatus || payload.expiresAt) {
      mutations.setSession(payload);
    }
  },
  setLoading(isLoading) {
    state.isLoading = Boolean(isLoading);
  },
  setSubmitting(submitting) {
    state.submitting = Boolean(submitting);
  },
  setError(error) {
    state.error = error;
  },
  clearError() {
    state.error = null;
  },
  setActiveProduct(product) {
    state.activeProduct = product;
  },
  reset() {
    state.sessionId = null;
    state.actor = null;
    state.sessionStatus = "ANONYMOUS";
    state.captchaVerifiedAt = null;
    state.expiresAt = null;
    state.authenticationExpired = false;
    state.applicationId = null;
    state.applicationNo = null;
    state.productId = null;
    state.workflowId = null;
    state.definitionVersion = null;
    state.applicationStatus = null;
    state.currentNode = null;
    state.currentComponent = null;
    state.currentComponentView = null;
    state.workflowActor = null;
    state.actorStatus = null;
    state.workflowStatus = null;
    state.canSubmit = false;
    state.accessType = null;
    state.captchaRequired = false;
    state.authentication = emptyAuth();
    state.message = null;
    state.duplicateEvent = false;
    state.error = null;
    state.activeProduct = null;
    state.submitting = false;
  },
};

export const store = {
  state: readonly(state),
  mutations,
};
