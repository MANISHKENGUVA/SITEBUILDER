/**
 * Central workflow session handling.
 *
 * The session id is issued by the backend. This module stores only that
 * identifier in sessionStorage so a refresh can restore the header. It never
 * stores passwords, OTPs, or captcha tokens.
 */
import { setSessionHeader } from "@/api/client";
import { createSession as createSessionApi } from "@/api/workflow";
import { store } from "@/store";

const SESSION_KEY = "workflow_session_id";
const PRODUCT_KEY = "workflow_product_id";

export function readStoredSessionId() {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function applySession(payload) {
  if (!payload || !payload.sessionId) {
    clearSession();
    return;
  }

  setSessionHeader(payload.sessionId);
  try {
    sessionStorage.setItem(SESSION_KEY, payload.sessionId);
    if (payload.productId) sessionStorage.setItem(PRODUCT_KEY, payload.productId);
  } catch {
    // Private mode may refuse sessionStorage; the in-memory store still works.
  }

  store.mutations.setSession({
    sessionId: payload.sessionId,
    actor: payload.actor || payload.workflowActor || "BORROWER",
    sessionStatus: payload.sessionStatus || payload.status || "ANONYMOUS",
    captchaVerifiedAt: payload.captchaVerifiedAt || null,
    expiresAt: payload.expiresAt || null,
    authenticationExpired: payload.authenticationExpired === true,
  });

  store.mutations.setApplication({
    applicationId: payload.applicationId || null,
    applicationNo: payload.applicationNo || null,
    productId: payload.productId || null,
    workflowId: payload.workflowId || null,
    definitionVersion: payload.definitionVersion || null,
    applicationStatus: payload.applicationStatus || "IN_PROGRESS",
  });
}

export function restoreSessionHeader() {
  const sessionId = readStoredSessionId();
  if (sessionId) {
    setSessionHeader(sessionId);
    store.mutations.setSession({
      sessionId,
      actor: store.state.actor,
    });
  }
  return sessionId;
}

export function clearSession() {
  setSessionHeader(null);
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(PRODUCT_KEY);
    sessionStorage.setItem("workflow_session_revoked", String(Date.now()));
  } catch {
    // ignore
  }
  store.mutations.reset();
}

export function isExpiredCode(code) {
  return code === "SESSION_INVALID" || code === "SESSION_EXPIRED" || code === "SESSION_REVOKED";
}

/**
 * Start or resume a product. A cookie-bound application for a different
 * product is not reused — the backend creates a new application instead.
 */
export async function startProductSession(productId) {
  if (store.state.productId && store.state.productId !== productId) {
    clearSession();
  }
  const payload = await createSessionApi({ productId });
  applySession(payload);
  return payload;
}

export async function resumeSession() {
  const payload = await createSessionApi({});
  applySession(payload);
  return payload;
}
