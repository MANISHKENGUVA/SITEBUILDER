const express = require("express");
const configBuilder = require("./modules/config-builder/configBuilderController");
const { ping } = require("./db/pool");

const router = express.Router();

// ── Health ──────────────────────────────────────────────────────────────────
router.get("/health", async (req, res) => {
  const dbOk = await ping();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? "ok" : "degraded",
    database: dbOk ? "up" : "down",
    service: "northline-config-builder-api",
    timestamp: new Date().toISOString(),
  });
});

// ── Workflow Configurations ─────────────────────────────────────────────────
router.get("/config-builder/configurations", configBuilder.listConfigurations);
router.post("/config-builder/configurations", configBuilder.createConfiguration);
router.get("/config-builder/configurations/:id", configBuilder.getConfiguration);
router.put("/config-builder/configurations/:id", configBuilder.saveDraft);
router.delete("/config-builder/configurations/:id", configBuilder.remove);
router.post("/config-builder/configurations/:id/publish", configBuilder.publish);
router.post("/config-builder/configurations/:id/new-draft", configBuilder.createNewDraft);
router.post("/config-builder/configurations/:id/duplicate", configBuilder.duplicate);
router.get("/config-builder/configurations/:id/versions", configBuilder.listVersions);
router.post("/config-builder/configurations/:id/templates", configBuilder.createTemplate);

// ── Versions & Comparison ───────────────────────────────────────────────────
router.get("/config-builder/versions/compare", configBuilder.compareVersions);
router.get("/config-builder/versions/:versionId", configBuilder.getVersion);

// ── 1:1 Workflow & Configuration Linking ────────────────────────────────────
router.post("/config-builder/link", configBuilder.linkWorkflow);

// ── Validation & Identity ───────────────────────────────────────────────────
router.post("/config-builder/validate-workflow", configBuilder.validateWorkflowHandler);
router.post("/config-builder/validate-node", configBuilder.validateNodeHandler);
router.post("/config-builder/generate-identity", configBuilder.generateIdentityHandler);

// ── Registries ───────────────────────────────────────────────────────────────
router.get("/config-builder/actors", configBuilder.listActors);
router.post("/config-builder/actors", configBuilder.createActor);

router.get("/config-builder/modules", configBuilder.listModules);
router.post("/config-builder/modules", configBuilder.createModule);

// ── Templates ────────────────────────────────────────────────────────────────
router.get("/config-builder/templates", configBuilder.listTemplates);
router.get("/config-builder/templates/:id", configBuilder.getTemplate);

module.exports = router;

