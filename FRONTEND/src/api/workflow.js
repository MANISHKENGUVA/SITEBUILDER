import client, { unwrap } from "./client";

export async function createSession({ productId, actor, workflowId } = {}) {
  const body = {};
  if (productId) body.productId = productId;
  if (actor) body.actor = actor;
  if (workflowId) body.workflowId = workflowId;
  const response = await client.post("/workflow/session", body);
  return unwrap(response);
}

export async function resolveWorkflow() {
  const response = await client.post("/workflow/resolve", {});
  return unwrap(response);
}

export async function submitEvent({ eventType, payload, nodeKey, eventId }) {
  const headers = {};
  if (eventId) headers["Idempotency-Key"] = eventId;
  const response = await client.post(
    "/workflow/event",
    { eventType, payload, nodeKey, eventId },
    { headers }
  );
  return unwrap(response);
}

export async function verifyCaptcha({ token }) {
  const response = await client.post("/workflow/captcha/verify", { token });
  return unwrap(response);
}

export async function startAuth({ method, subject, mobileNumber, aadhaarNumber }) {
  const response = await client.post("/auth/start", {
    method,
    subject,
    mobileNumber,
    aadhaarNumber,
  });
  return unwrap(response);
}

export async function verifyAuth({ challengeId, method, code }) {
  const response = await client.post("/auth/verify", {
    challengeId,
    method,
    code,
  });
  return unwrap(response);
}

export async function listProducts() {
  const response = await client.get("/products");
  const data = unwrap(response);
  return data.products || data;
}

export async function getProduct(productId) {
  const response = await client.get(`/products/${productId}`);
  const data = unwrap(response);
  return data.product || data;
}

export async function revokeSession() {
  const response = await client.post("/workflow/session/revoke", {});
  return unwrap(response);
}
