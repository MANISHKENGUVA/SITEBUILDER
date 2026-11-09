import client, { unwrap } from "@/api/client";

export async function listConfigurations(params = {}) {
  const response = await client.get("/config-builder/configurations", { params });
  const data = unwrap(response);
  return data.configurations || [];
}

export async function getConfiguration(id) {
  const response = await client.get(`/config-builder/configurations/${encodeURIComponent(id)}`);
  const data = unwrap(response);
  return data.configuration;
}

export async function createConfiguration(payload) {
  const response = await client.post("/config-builder/configurations", payload);
  const data = unwrap(response);
  return data.configuration;
}

export async function linkWorkflow(workflowId, configurationId) {
  const response = await client.post("/config-builder/link", { workflowId, configurationId });
  const data = unwrap(response);
  return data.configuration;
}

export async function saveConfigurationDraft(id, payload) {
  const response = await client.put(`/config-builder/configurations/${encodeURIComponent(id)}`, payload);
  const data = unwrap(response);
  return data.configuration;
}

export async function publishConfiguration(id, payload = {}) {
  const response = await client.post(`/config-builder/configurations/${encodeURIComponent(id)}/publish`, payload);
  const data = unwrap(response);
  return data.configuration;
}

export async function createNewDraft(id, payload = {}) {
  const response = await client.post(`/config-builder/configurations/${encodeURIComponent(id)}/new-draft`, payload);
  const data = unwrap(response);
  return data.configuration;
}

export async function duplicateConfiguration(id, payload = {}) {
  const response = await client.post(`/config-builder/configurations/${encodeURIComponent(id)}/duplicate`, payload);
  const data = unwrap(response);
  return data.configuration;
}

export async function deleteConfiguration(id) {
  const response = await client.delete(`/config-builder/configurations/${encodeURIComponent(id)}`);
  return unwrap(response);
}

export async function validateWorkflowApi(payload) {
  const response = await client.post("/config-builder/validate-workflow", payload);
  return unwrap(response);
}

export async function validateNodeApi(payload) {
  const response = await client.post("/config-builder/validate-node", payload);
  return unwrap(response);
}

export async function generateIdentityApi(metadata) {
  const response = await client.post("/config-builder/generate-identity", { metadata });
  const data = unwrap(response);
  return data.stateId;
}

export async function listVersions(id) {
  const response = await client.get(`/config-builder/configurations/${encodeURIComponent(id)}/versions`);
  const data = unwrap(response);
  return data.versions || [];
}

export async function getVersion(versionId) {
  const response = await client.get(`/config-builder/versions/${encodeURIComponent(versionId)}`);
  const data = unwrap(response);
  return data.version;
}

export async function compareVersions(v1, v2) {
  const response = await client.get("/config-builder/versions/compare", { params: { v1, v2 } });
  return unwrap(response);
}

export async function listActors() {
  const response = await client.get("/config-builder/actors");
  const data = unwrap(response);
  return data.actors || [];
}

export async function createActor(payload) {
  const response = await client.post("/config-builder/actors", payload);
  const data = unwrap(response);
  return data.actor;
}

export async function listModules() {
  const response = await client.get("/config-builder/modules");
  const data = unwrap(response);
  return data.modules || [];
}

export async function createModule(payload) {
  const response = await client.post("/config-builder/modules", payload);
  const data = unwrap(response);
  return data.module;
}

export async function listTemplates() {
  const response = await client.get("/config-builder/templates");
  const data = unwrap(response);
  return data.templates || [];
}

export async function getTemplate(id) {
  const response = await client.get(`/config-builder/templates/${encodeURIComponent(id)}`);
  const data = unwrap(response);
  return data.template;
}

export async function createTemplateFromConfig(configId, payload) {
  const response = await client.post(`/config-builder/configurations/${encodeURIComponent(configId)}/templates`, payload);
  const data = unwrap(response);
  return data.template;
}
