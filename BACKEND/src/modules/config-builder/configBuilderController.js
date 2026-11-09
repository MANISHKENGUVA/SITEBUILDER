const service = require("./configBuilderService");
const { validateWorkflow, validateNode, generateNodeId } = require("./configBuilderValidation");

function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function failure(res, error) {
  const status = error.statusCode || 500;
  const code = error.code || "INTERNAL_ERROR";
  return res.status(status).json({
    success: false,
    code,
    message: error.message || "An unexpected error occurred",
  });
}

// ── Configurations ───────────────────────────────────────────────────────────

async function listConfigurations(req, res) {
  try {
    const { status, search } = req.query;
    const configs = await service.listConfigurations({ status, search });
    return success(res, { configurations: configs });
  } catch (err) {
    return failure(res, err);
  }
}

async function getConfiguration(req, res) {
  try {
    const config = await service.getConfigurationById(req.params.id);
    return success(res, { configuration: config });
  } catch (err) {
    return failure(res, err);
  }
}

async function createConfiguration(req, res) {
  try {
    const config = await service.createConfiguration(req.body);
    return success(res, { configuration: config }, 201);
  } catch (err) {
    return failure(res, err);
  }
}

async function linkWorkflow(req, res) {
  try {
    const { workflowId, configurationId } = req.body;
    if (!workflowId || !configurationId) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_FAILED",
        message: "Both 'workflowId' and 'configurationId' are required",
      });
    }
    const updated = await service.linkWorkflowAndConfiguration(workflowId, configurationId);
    return success(res, { configuration: updated });
  } catch (err) {
    return failure(res, err);
  }
}

async function saveDraft(req, res) {
  try {
    const updated = await service.saveConfigurationDraft(req.params.id, req.body);
    return success(res, { configuration: updated });
  } catch (err) {
    return failure(res, err);
  }
}

async function publish(req, res) {
  try {
    const published = await service.publishConfiguration(req.params.id, req.body);
    return success(res, { configuration: published });
  } catch (err) {
    return failure(res, err);
  }
}

async function createNewDraft(req, res) {
  try {
    const draft = await service.createNewDraftFromPublished(req.params.id, req.body);
    return success(res, { configuration: draft });
  } catch (err) {
    return failure(res, err);
  }
}

async function duplicate(req, res) {
  try {
    const duplicated = await service.duplicateConfiguration(req.params.id, req.body);
    return success(res, { configuration: duplicated }, 201);
  } catch (err) {
    return failure(res, err);
  }
}

async function remove(req, res) {
  try {
    const result = await service.deleteConfiguration(req.params.id);
    return success(res, result);
  } catch (err) {
    return failure(res, err);
  }
}

// ── Validation ───────────────────────────────────────────────────────────────

async function validateWorkflowHandler(req, res) {
  try {
    const { definition, workflowId, configurationId } = req.body;
    const result = validateWorkflow(definition, workflowId, configurationId);
    return success(res, result);
  } catch (err) {
    return failure(res, err);
  }
}

async function validateNodeHandler(req, res) {
  try {
    const { nodeKey, state, allStateKeys } = req.body;
    const issues = validateNode(nodeKey, state, allStateKeys || []);
    const errors = issues.filter((i) => i.level === "ERROR");
    return success(res, {
      valid: errors.length === 0,
      issues,
      errors,
      warnings: issues.filter((i) => i.level === "WARNING"),
      info: issues.filter((i) => i.level === "INFO"),
    });
  } catch (err) {
    return failure(res, err);
  }
}

async function generateIdentityHandler(req, res) {
  try {
    const { metadata } = req.body;
    const stateId = generateNodeId(metadata);
    return success(res, { stateId });
  } catch (err) {
    return failure(res, err);
  }
}

// ── Versions & History ───────────────────────────────────────────────────────

async function listVersions(req, res) {
  try {
    const versions = await service.listVersions(req.params.id);
    return success(res, { versions });
  } catch (err) {
    return failure(res, err);
  }
}

async function getVersion(req, res) {
  try {
    const version = await service.getVersion(req.params.versionId);
    return success(res, { version });
  } catch (err) {
    return failure(res, err);
  }
}

async function compareVersions(req, res) {
  try {
    const { v1, v2 } = req.query;
    if (!v1 || !v2) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_FAILED",
        message: "Parameters 'v1' and 'v2' are required",
      });
    }
    const comparison = await service.compareVersions(v1, v2);
    return success(res, comparison);
  } catch (err) {
    return failure(res, err);
  }
}

// ── Registries ───────────────────────────────────────────────────────────────

async function listActors(req, res) {
  try {
    const actors = await service.listActors();
    return success(res, { actors });
  } catch (err) {
    return failure(res, err);
  }
}

async function createActor(req, res) {
  try {
    const actor = await service.createActor(req.body);
    return success(res, { actor }, 201);
  } catch (err) {
    return failure(res, err);
  }
}

async function listModules(req, res) {
  try {
    const modules = await service.listModules();
    return success(res, { modules });
  } catch (err) {
    return failure(res, err);
  }
}

async function createModule(req, res) {
  try {
    const mod = await service.createModule(req.body);
    return success(res, { module: mod }, 201);
  } catch (err) {
    return failure(res, err);
  }
}

// ── Templates ────────────────────────────────────────────────────────────────

async function listTemplates(req, res) {
  try {
    const templates = await service.listTemplates();
    return success(res, { templates });
  } catch (err) {
    return failure(res, err);
  }
}

async function getTemplate(req, res) {
  try {
    const template = await service.getTemplateById(req.params.id);
    return success(res, { template });
  } catch (err) {
    return failure(res, err);
  }
}

async function createTemplate(req, res) {
  try {
    const template = await service.createTemplateFromConfig(req.params.id, req.body);
    return success(res, { template }, 201);
  } catch (err) {
    return failure(res, err);
  }
}

module.exports = {
  listConfigurations,
  getConfiguration,
  createConfiguration,
  linkWorkflow,
  saveDraft,
  publish,
  createNewDraft,
  duplicate,
  remove,
  validateWorkflowHandler,
  validateNodeHandler,
  generateIdentityHandler,
  listVersions,
  getVersion,
  compareVersions,
  listActors,
  createActor,
  listModules,
  createModule,
  listTemplates,
  getTemplate,
  createTemplate,
};
