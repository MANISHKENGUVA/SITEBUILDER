const { query, withTransaction } = require("../../db/pool");
const { validateWorkflow, validateNode } = require("./configBuilderValidation");

class ConfigServiceError extends Error {
  constructor(message, statusCode = 400, code = "CONFIG_ERROR") {
    super(message);
    this.name = "ConfigServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

// ── Configurations ───────────────────────────────────────────────────────────

async function listConfigurations({ status, search } = {}) {
  let sql = `
    SELECT
      id,
      workflow_id AS "workflowId",
      name,
      description,
      current_version AS "currentVersion",
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      published_at AS "publishedAt",
      jsonb_object_keys(definition->'states') AS node_keys
    FROM workflow_configurations
  `;
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status.toUpperCase());
    conditions.push(`status = $${params.length}`);
  }

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conditions.push(`(LOWER(name) LIKE $${params.length} OR LOWER(id) LIKE $${params.length} OR LOWER(workflow_id) LIKE $${params.length})`);
  }

  // Fetch configs
  const mainSql = `
    SELECT
      id,
      workflow_id AS "workflowId",
      name,
      description,
      current_version AS "currentVersion",
      status,
      definition,
      metadata,
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      published_at AS "publishedAt"
    FROM workflow_configurations
    ${conditions.length ? "WHERE " + conditions.join(" AND ") : ""}
    ORDER BY updated_at DESC
  `;

  const result = await query(mainSql, params);
  return result.rows.map((row) => {
    const states = row.definition?.states || {};
    const stateKeys = Object.keys(states);
    const actors = Array.from(
      new Set(
        stateKeys
          .map((k) => states[k]?.metadata?.actor)
          .filter(Boolean)
      )
    );
    return {
      id: row.id,
      workflowId: row.workflowId,
      name: row.name,
      description: row.description,
      currentVersion: row.currentVersion,
      status: row.status,
      nodeCount: stateKeys.length,
      actors,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      publishedAt: row.publishedAt,
    };
  });
}

async function getConfigurationById(id) {
  const result = await query(
    `SELECT
      id,
      workflow_id AS "workflowId",
      name,
      description,
      current_version AS "currentVersion",
      status,
      definition,
      metadata,
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      published_at AS "publishedAt"
     FROM workflow_configurations
     WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new ConfigServiceError(`Workflow configuration '${id}' not found`, 404, "NOT_FOUND");
  }

  return result.rows[0];
}

async function getConfigurationByWorkflowId(workflowId) {
  const result = await query(
    `SELECT
      id,
      workflow_id AS "workflowId",
      name,
      description,
      current_version AS "currentVersion",
      status,
      definition,
      metadata,
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      published_at AS "publishedAt"
     FROM workflow_configurations
     WHERE workflow_id = $1`,
    [workflowId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function createConfiguration({
  id,
  workflowId,
  name,
  description,
  version = "V1",
  definition,
  metadata = {},
  templateId,
}) {
  if (!id || typeof id !== "string" || !id.trim()) {
    throw new ConfigServiceError("configurationId ('id') is required", 400, "VALIDATION_FAILED");
  }
  if (!workflowId || typeof workflowId !== "string" || !workflowId.trim()) {
    throw new ConfigServiceError("workflowId is required", 400, "VALIDATION_FAILED");
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    throw new ConfigServiceError("name is required", 400, "VALIDATION_FAILED");
  }

  const cleanId = id.trim().toUpperCase();
  const cleanWorkflowId = workflowId.trim().toUpperCase();

  // 1. Enforce 1:1 link constraint: workflowId must not already have a configuration
  const existingWf = await getConfigurationByWorkflowId(cleanWorkflowId);
  if (existingWf) {
    throw new ConfigServiceError(
      `Workflow '${cleanWorkflowId}' is already linked to configuration '${existingWf.id}'. Each workflow must have exactly one configuration.`,
      409,
      "WORKFLOW_ALREADY_LINKED"
    );
  }

  // Check if config ID already exists
  const existingConfig = await query(`SELECT id FROM workflow_configurations WHERE id = $1`, [cleanId]);
  if (existingConfig.rows.length > 0) {
    throw new ConfigServiceError(
      `Configuration with ID '${cleanId}' already exists`,
      409,
      "CONFIG_ALREADY_EXISTS"
    );
  }

  let finalDefinition = definition;
  if (!finalDefinition && templateId) {
    const tpl = await query(`SELECT definition FROM workflow_templates WHERE id = $1`, [templateId]);
    if (tpl.rows.length > 0) {
      finalDefinition = tpl.rows[0].definition;
    }
  }

  if (!finalDefinition) {
    finalDefinition = {
      workflowVersion: version,
      startState: "",
      states: {},
    };
  }

  // Insert config row
  const result = await query(
    `INSERT INTO workflow_configurations
      (id, workflow_id, name, description, current_version, status, definition, metadata)
     VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, $7)
     RETURNING
      id,
      workflow_id AS "workflowId",
      name,
      description,
      current_version AS "currentVersion",
      status,
      definition,
      metadata,
      created_at AS "createdAt",
      updated_at AS "updatedAt"`,
    [
      cleanId,
      cleanWorkflowId,
      name.trim(),
      description || "",
      version,
      JSON.stringify(finalDefinition),
      JSON.stringify(metadata),
    ]
  );

  // Create initial version entry
  await query(
    `INSERT INTO workflow_configuration_versions
      (configuration_id, workflow_id, version, status, definition, change_summary)
     VALUES ($1, $2, $3, 'DRAFT', $4, 'Initial draft creation')`,
    [cleanId, cleanWorkflowId, version, JSON.stringify(finalDefinition)]
  );

  return result.rows[0];
}

async function linkWorkflowAndConfiguration(workflowId, configurationId) {
  const cleanWf = String(workflowId || "").trim().toUpperCase();
  const cleanConfig = String(configurationId || "").trim().toUpperCase();

  const config = await getConfigurationById(cleanConfig);
  if (config.workflowId === cleanWf) {
    return config;
  }

  // Check if target workflowId is already taken
  const existingWithWf = await getConfigurationByWorkflowId(cleanWf);
  if (existingWithWf && existingWithWf.id !== cleanConfig) {
    throw new ConfigServiceError(
      `Workflow '${cleanWf}' is already linked to configuration '${existingWithWf.id}'`,
      409,
      "WORKFLOW_ALREADY_LINKED"
    );
  }

  const result = await query(
    `UPDATE workflow_configurations
     SET workflow_id = $1, updated_at = now()
     WHERE id = $2
     RETURNING
      id,
      workflow_id AS "workflowId",
      name,
      description,
      current_version AS "currentVersion",
      status,
      definition,
      metadata,
      updated_at AS "updatedAt"`,
    [cleanWf, cleanConfig]
  );

  return result.rows[0];
}

async function saveConfigurationDraft(id, { name, description, definition, metadata, currentVersion }) {
  const existing = await getConfigurationById(id);

  if (existing.status === "PUBLISHED") {
    throw new ConfigServiceError(
      `Configuration '${id}' is PUBLISHED and immutable. Create a new draft version to make changes.`,
      400,
      "CONFIGURATION_IMMUTABLE"
    );
  }

  const updates = [];
  const params = [id];

  if (name !== undefined) {
    params.push(name.trim());
    updates.push(`name = $${params.length}`);
  }
  if (description !== undefined) {
    params.push(description);
    updates.push(`description = $${params.length}`);
  }
  if (definition !== undefined) {
    params.push(JSON.stringify(definition));
    updates.push(`definition = $${params.length}`);
  }
  if (metadata !== undefined) {
    params.push(JSON.stringify(metadata));
    updates.push(`metadata = $${params.length}`);
  }
  if (currentVersion !== undefined) {
    params.push(currentVersion);
    updates.push(`current_version = $${params.length}`);
  }

  updates.push("updated_at = now()");

  const result = await query(
    `UPDATE workflow_configurations
     SET ${updates.join(", ")}
     WHERE id = $1
     RETURNING
      id,
      workflow_id AS "workflowId",
      name,
      description,
      current_version AS "currentVersion",
      status,
      definition,
      metadata,
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      published_at AS "publishedAt"`,
    params
  );

  return result.rows[0];
}

async function publishConfiguration(id, { changeSummary = "Published version", createdBy = "system" } = {}) {
  const existing = await getConfigurationById(id);

  if (existing.status === "PUBLISHED") {
    throw new ConfigServiceError(
      `Configuration '${id}' is already PUBLISHED.`,
      400,
      "ALREADY_PUBLISHED"
    );
  }

  // 1. Authoritative server-side validation
  const validation = validateWorkflow(existing.definition, existing.workflowId, existing.id);
  if (!validation.valid) {
    throw new ConfigServiceError(
      `Cannot publish invalid configuration. Unresolved validation errors:\n- ${validation.errors.map((e) => e.message).join("\n- ")}`,
      422,
      "VALIDATION_FAILED"
    );
  }

  // 2. Mark published and record immutable snapshot
  return withTransaction(async (client) => {
    const updateRes = await client.query(
      `UPDATE workflow_configurations
       SET status = 'PUBLISHED', published_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING
        id,
        workflow_id AS "workflowId",
        name,
        description,
        current_version AS "currentVersion",
        status,
        definition,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        published_at AS "publishedAt"`,
      [id]
    );

    await client.query(
      `INSERT INTO workflow_configuration_versions
        (configuration_id, workflow_id, version, status, definition, change_summary, created_by)
       VALUES ($1, $2, $3, 'PUBLISHED', $4, $5, $6)`,
      [
        existing.id,
        existing.workflowId,
        existing.currentVersion,
        JSON.stringify(existing.definition),
        changeSummary,
        createdBy,
      ]
    );

    return updateRes.rows[0];
  });
}

async function createNewDraftFromPublished(id, { newVersion, changeSummary = "New draft from published version" } = {}) {
  const existing = await getConfigurationById(id);

  let nextVersion = newVersion;
  if (!nextVersion) {
    // Auto-increment version e.g. V7 -> V8 or add -draft
    const match = existing.currentVersion.match(/(.*?)(?:-?V?)(\d+)$/i);
    if (match) {
      const prefix = match[1] || "V";
      const num = parseInt(match[2], 10) + 1;
      nextVersion = `${prefix}${prefix.endsWith("-") ? "" : "-"}V${num}`;
    } else {
      nextVersion = `${existing.currentVersion}-DRAFT`;
    }
  }

  // Deep clone definition with updated workflowVersion
  const newDefinition = JSON.parse(JSON.stringify(existing.definition));
  newDefinition.workflowVersion = nextVersion;

  return withTransaction(async (client) => {
    const updateRes = await client.query(
      `UPDATE workflow_configurations
       SET status = 'DRAFT',
           current_version = $2,
           definition = $3,
           updated_at = now()
       WHERE id = $1
       RETURNING
        id,
        workflow_id AS "workflowId",
        name,
        description,
        current_version AS "currentVersion",
        status,
        definition,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        published_at AS "publishedAt"`,
      [id, nextVersion, JSON.stringify(newDefinition)]
    );

    await client.query(
      `INSERT INTO workflow_configuration_versions
        (configuration_id, workflow_id, version, status, definition, change_summary)
       VALUES ($1, $2, $3, 'DRAFT', $4, $5)`,
      [id, existing.workflowId, nextVersion, JSON.stringify(newDefinition), changeSummary]
    );

    return updateRes.rows[0];
  });
}

async function duplicateConfiguration(id, { newId, newWorkflowId, newName }) {
  const existing = await getConfigurationById(id);

  const targetId = (newId || `${existing.id}-COPY`).trim().toUpperCase();
  const targetWorkflowId = (newWorkflowId || `${existing.workflowId}-COPY`).trim().toUpperCase();
  const targetName = newName || `${existing.name} (Copy)`;

  return createConfiguration({
    id: targetId,
    workflowId: targetWorkflowId,
    name: targetName,
    description: existing.description,
    version: existing.currentVersion,
    definition: existing.definition,
    metadata: existing.metadata,
  });
}

async function deleteConfiguration(id) {
  const existing = await getConfigurationById(id);
  if (existing.status === "PUBLISHED") {
    throw new ConfigServiceError(
      `Cannot delete PUBLISHED configuration '${id}'. It is locked.`,
      400,
      "CANNOT_DELETE_PUBLISHED"
    );
  }

  await query(`DELETE FROM workflow_configurations WHERE id = $1`, [id]);
  return { success: true, deletedId: id };
}

// ── Versions & Comparison ───────────────────────────────────────────────────

async function listVersions(configurationId) {
  const result = await query(
    `SELECT
      id,
      configuration_id AS "configurationId",
      workflow_id AS "workflowId",
      version,
      status,
      change_summary AS "changeSummary",
      created_by AS "createdBy",
      created_at AS "createdAt"
     FROM workflow_configuration_versions
     WHERE configuration_id = $1
     ORDER BY created_at DESC`,
    [configurationId]
  );
  return result.rows;
}

async function getVersion(versionId) {
  const result = await query(
    `SELECT
      id,
      configuration_id AS "configurationId",
      workflow_id AS "workflowId",
      version,
      status,
      definition,
      change_summary AS "changeSummary",
      created_by AS "createdBy",
      created_at AS "createdAt"
     FROM workflow_configuration_versions
     WHERE id = $1`,
    [versionId]
  );

  if (result.rows.length === 0) {
    throw new ConfigServiceError(`Version '${versionId}' not found`, 404, "NOT_FOUND");
  }

  return result.rows[0];
}

async function compareVersions(versionId1, versionId2) {
  const v1 = await getVersion(versionId1);
  const v2 = await getVersion(versionId2);

  const states1 = v1.definition?.states || {};
  const states2 = v2.definition?.states || {};

  const keys1 = new Set(Object.keys(states1));
  const keys2 = new Set(Object.keys(states2));

  const addedNodes = [...keys2].filter((k) => !keys1.has(k));
  const removedNodes = [...keys1].filter((k) => !keys2.has(k));
  const commonNodes = [...keys1].filter((k) => keys2.has(k));

  const modifiedNodes = [];
  for (const k of commonNodes) {
    const s1 = JSON.stringify(states1[k]);
    const s2 = JSON.stringify(states2[k]);
    if (s1 !== s2) {
      modifiedNodes.push({
        nodeKey: k,
        before: states1[k],
        after: states2[k],
      });
    }
  }

  return {
    version1: { id: v1.id, version: v1.version, status: v1.status, createdAt: v1.createdAt },
    version2: { id: v2.id, version: v2.version, status: v2.status, createdAt: v2.createdAt },
    diff: {
      addedNodes,
      removedNodes,
      modifiedNodes,
      startStateChanged: v1.definition?.startState !== v2.definition?.startState,
      workflowVersionChanged: v1.definition?.workflowVersion !== v2.definition?.workflowVersion,
    },
  };
}

// ── Actor & Module Registries ────────────────────────────────────────────────

async function listActors() {
  const result = await query(
    `SELECT id, name, description, is_system AS "isSystem", created_at AS "createdAt"
     FROM workflow_actors
     ORDER BY name ASC`
  );
  return result.rows;
}

async function createActor({ id, name, description, isSystem = false }) {
  if (!id || !name) throw new ConfigServiceError("Actor ID and name are required", 400);
  const cleanId = String(id).trim().toUpperCase();

  const result = await query(
    `INSERT INTO workflow_actors (id, name, description, is_system)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
     RETURNING id, name, description, is_system AS "isSystem"`,
    [cleanId, name.trim(), description || "", Boolean(isSystem)]
  );
  return result.rows[0];
}

async function listModules() {
  const result = await query(
    `SELECT id, name, default_version AS "defaultVersion", versions, created_at AS "createdAt"
     FROM workflow_modules
     ORDER BY name ASC`
  );
  return result.rows;
}

async function createModule({ id, name, defaultVersion = "V1", versions = ["V1"] }) {
  if (!id || !name) throw new ConfigServiceError("Module ID and name are required", 400);
  const cleanId = String(id).trim().toUpperCase();

  const result = await query(
    `INSERT INTO workflow_modules (id, name, default_version, versions)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, versions = EXCLUDED.versions
     RETURNING id, name, default_version AS "defaultVersion", versions`,
    [cleanId, name.trim(), defaultVersion, JSON.stringify(versions)]
  );
  return result.rows[0];
}

// ── Templates ────────────────────────────────────────────────────────────────

async function listTemplates() {
  const result = await query(
    `SELECT id, name, description, category, definition, metadata, created_at AS "createdAt"
     FROM workflow_templates
     ORDER BY name ASC`
  );
  return result.rows;
}

async function getTemplateById(id) {
  const result = await query(
    `SELECT id, name, description, category, definition, metadata, created_at AS "createdAt"
     FROM workflow_templates
     WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    throw new ConfigServiceError(`Template '${id}' not found`, 404, "NOT_FOUND");
  }
  return result.rows[0];
}

async function createTemplateFromConfig(configId, { name, description, category = "CUSTOM" }) {
  const config = await getConfigurationById(configId);
  const templateId = `TPL-${Date.now().toString(36).toUpperCase()}`;

  const result = await query(
    `INSERT INTO workflow_templates (id, name, description, category, definition, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, description, category, created_at AS "createdAt"`,
    [
      templateId,
      name || `${config.name} Template`,
      description || config.description || "",
      category,
      JSON.stringify(config.definition),
      JSON.stringify(config.metadata || {}),
    ]
  );
  return result.rows[0];
}

module.exports = {
  listConfigurations,
  getConfigurationById,
  getConfigurationByWorkflowId,
  createConfiguration,
  linkWorkflowAndConfiguration,
  saveConfigurationDraft,
  publishConfiguration,
  createNewDraftFromPublished,
  duplicateConfiguration,
  deleteConfiguration,
  listVersions,
  getVersion,
  compareVersions,
  listActors,
  createActor,
  listModules,
  createModule,
  listTemplates,
  getTemplateById,
  createTemplateFromConfig,
  ConfigServiceError,
};
