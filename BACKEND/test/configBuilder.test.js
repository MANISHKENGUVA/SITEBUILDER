const assert = require("assert");
const {
  generateNodeId,
  validateNode,
  validateWorkflow,
  ALLOWED_NODE_TYPES,
} = require("../src/modules/config-builder/configBuilderValidation");
const service = require("../src/modules/config-builder/configBuilderService");

let totalTests = 0;
let passedTests = 0;

function it(title, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${title}`);
  } catch (err) {
    console.error(`  ✗ ${title}`);
    console.error(err);
  }
}

async function itAsync(title, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${title}`);
  } catch (err) {
    console.error(`  ✗ ${title}`);
    console.error(err);
  }
}

async function runTests() {
  console.log("\n=== 1. Node Identity Generator & Multiword Names ===");

  it("generates correct state ID from 5 metadata fields", () => {
    const meta = {
      actor: "BORROWER",
      module: "DETAILS",
      moduleVersion: "V1",
      node: "PERSONAL-INFO",
      nodeVersion: "V1",
    };
    const id = generateNodeId(meta);
    assert.strictEqual(id, "BORROWER-DETAILS-V1-PERSONAL-INFO-V1");
  });

  it("preserves multiword node names with existing hyphens intact without blind splitting", () => {
    const meta = {
      actor: "MANAGER",
      module: "FRAUD-CHECK",
      moduleVersion: "V1",
      node: "FRAUD-CHECK-PENDING",
      nodeVersion: "V2",
    };
    const id = generateNodeId(meta);
    assert.strictEqual(id, "MANAGER-FRAUD-CHECK-V1-FRAUD-CHECK-PENDING-V2");
  });

  it("handles dynamic actors and dynamic modules", () => {
    const meta = {
      actor: "EXTERNAL-AUDITOR",
      module: "COMPLIANCE-AUDIT",
      moduleVersion: "V3",
      node: "SOX-VALIDATION",
      nodeVersion: "V1",
    };
    const id = generateNodeId(meta);
    assert.strictEqual(id, "EXTERNAL-AUDITOR-COMPLIANCE-AUDIT-V3-SOX-VALIDATION-V1");
  });

  console.log("\n=== 2. Node Types & Required Node Configuration ===");

  it("verifies exactly four allowed node types", () => {
    assert.deepStrictEqual(ALLOWED_NODE_TYPES, [
      "ACTOR",
      "SYSTEM_INTERNAL_PROCESS",
      "WEBHOOK",
      "API",
    ]);
  });

  it("rejects unknown node types e.g. DECISION", () => {
    const issues = validateNode("DEC-01", {
      type: "DECISION",
      metadata: {
        actor: "SYSTEM",
        module: "DECISION",
        moduleVersion: "V1",
        node: "ROUTER",
        nodeVersion: "V1",
      },
    });
    const typeError = issues.find((i) => i.field === "type");
    assert.ok(typeError, "Must flag invalid node type");
  });

  it("validates ACTOR node requires component reference", () => {
    const issues = validateNode("BORROWER-DETAILS-V1-PERSONAL-INFO-V1", {
      type: "ACTOR",
      metadata: {
        actor: "BORROWER",
        module: "DETAILS",
        moduleVersion: "V1",
        node: "PERSONAL-INFO",
        nodeVersion: "V1",
      },
      // missing component
    });
    const compError = issues.find((i) => i.field === "component");
    assert.ok(compError, "Must flag missing component");
  });

  it("validates SYSTEM_INTERNAL_PROCESS requires processHandler", () => {
    const issues = validateNode("SYSTEM-OFFER-V1-INTEREST-RATE-V1", {
      type: "SYSTEM_INTERNAL_PROCESS",
      metadata: {
        actor: "SYSTEM",
        module: "OFFER",
        moduleVersion: "V1",
        node: "INTEREST-RATE",
        nodeVersion: "V1",
      },
    });
    const handlerError = issues.find((i) => i.field === "processHandler");
    assert.ok(handlerError, "Must flag missing processHandler");
  });

  it("validates WEBHOOK node requires endpoint and valid HTTP method", () => {
    const issues = validateNode("SYSTEM-DETAILS-V1-WEBHOOK-V1", {
      type: "WEBHOOK",
      method: "INVALID",
      metadata: {
        actor: "SYSTEM",
        module: "DETAILS",
        moduleVersion: "V1",
        node: "WEBHOOK",
        nodeVersion: "V1",
      },
    });
    const endpointError = issues.find((i) => i.field === "endpoint");
    const methodError = issues.find((i) => i.field === "method");
    assert.ok(endpointError, "Must flag missing endpoint");
    assert.ok(methodError, "Must flag invalid method");
  });

  it("validates API node requires endpoint and method", () => {
    const issues = validateNode("SYSTEM-DETAILS-V1-API-STEP-V1", {
      type: "API",
      endpoint: "https://api.example.com/v1/resource",
      method: "POST",
      metadata: {
        actor: "SYSTEM",
        module: "DETAILS",
        moduleVersion: "V1",
        node: "API-STEP",
        nodeVersion: "V1",
      },
    });
    const errors = issues.filter((i) => i.level === "ERROR");
    assert.strictEqual(errors.length, 0, "Valid API node should have 0 errors");
  });

  console.log("\n=== 3. Edge and Rule Engine Builder Validation ===");

  it("validates rule engine operator and conditions", () => {
    const issues = validateNode("NODE-A", {
      type: "ACTOR",
      component: "GenericForm",
      metadata: { actor: "A", module: "M", moduleVersion: "V1", node: "A", nodeVersion: "V1" },
      edges: {
        E1: {
          toState: "NODE-B",
          ruleEngine: {
            operator: "XOR", // invalid
            conditions: [
              { field: "", operator: "=" }, // invalid field
              { field: "score", operator: "~" }, // invalid operator
            ],
          },
        },
      },
    }, ["NODE-A", "NODE-B"]);

    const opError = issues.find((i) => i.field === "edges.E1.ruleEngine.operator");
    const fError = issues.find((i) => i.field === "edges.E1.ruleEngine.conditions[0].field");
    const cError = issues.find((i) => i.field === "edges.E1.ruleEngine.conditions[1].operator");

    assert.ok(opError, "Must flag invalid ruleEngine operator");
    assert.ok(fError, "Must flag empty condition field");
    assert.ok(cError, "Must flag invalid condition operator");
  });

  console.log("\n=== 4. Workflow Configuration Validation ===");

  it("validates startState existence and duplicate node identities", () => {
    const definition = {
      workflowVersion: "V1",
      startState: "NON_EXISTENT",
      states: {
        "A-M-V1-N1-V1": {
          type: "ACTOR",
          component: "Comp1",
          metadata: { actor: "A", module: "M", moduleVersion: "V1", node: "N1", nodeVersion: "V1" },
        },
        "A-M-V1-N2-V1": {
          type: "ACTOR",
          component: "Comp2",
          metadata: { actor: "A", module: "M", moduleVersion: "V1", node: "N1", nodeVersion: "V1" }, // duplicate identity!
        },
      },
    };

    const res = validateWorkflow(definition, "WF-TEST", "WFC-TEST");
    assert.strictEqual(res.valid, false);
    const startError = res.errors.find((e) => e.field === "startState");
    const dupError = res.errors.find((e) => e.field === "identity");
    assert.ok(startError, "Must flag non-existent startState");
    assert.ok(dupError, "Must flag duplicate node identity");
  });

  console.log("\n=== 5. Database Integration & 1:1 Workflow Link Constraint ===");

  await itAsync("enforces 1:1 workflowId to configurationId relationship", async () => {
    const testConfigId = `WFC-TEST-${Date.now()}`;
    const testWfId = `WF-TEST-${Date.now()}`;

    // 1. Create first config
    const config1 = await service.createConfiguration({
      id: testConfigId,
      workflowId: testWfId,
      name: "Test Config 1",
      version: "V1",
    });
    assert.strictEqual(config1.id, testConfigId);
    assert.strictEqual(config1.workflowId, testWfId);

    // 2. Try creating a second configuration for the same workflowId -> MUST REJECT
    let caught = null;
    try {
      await service.createConfiguration({
        id: `${testConfigId}-2`,
        workflowId: testWfId,
        name: "Test Config Duplicate WF",
        version: "V1",
      });
    } catch (err) {
      caught = err;
    }
    assert.ok(caught, "Should have thrown conflict error for duplicate workflowId link");
    assert.strictEqual(caught.code, "WORKFLOW_ALREADY_LINKED");

    // Clean up
    await service.deleteConfiguration(testConfigId);
  });

  await itAsync("enforces published configuration immutability", async () => {
    const testConfigId = `WFC-IMMUTABLE-${Date.now()}`;
    const testWfId = `WF-IMMUTABLE-${Date.now()}`;

    const validLoanTpl = (await service.getTemplateById("TPL-LOAN-APP")).definition;

    const config = await service.createConfiguration({
      id: testConfigId,
      workflowId: testWfId,
      name: "Immutability Test",
      version: "LOAN-FLOW-V7",
      definition: validLoanTpl,
    });

    // Publish configuration
    const published = await service.publishConfiguration(testConfigId, {
      changeSummary: "Test publish",
    });
    assert.strictEqual(published.status, "PUBLISHED");

    // Attempt to save draft directly on published configuration -> MUST REJECT
    let saveErr = null;
    try {
      await service.saveConfigurationDraft(testConfigId, {
        name: "Modified Name",
      });
    } catch (err) {
      saveErr = err;
    }
    assert.ok(saveErr, "Must reject modifying published configuration in place");
    assert.strictEqual(saveErr.code, "CONFIGURATION_IMMUTABLE");

    // Create new draft from published -> creates new draft version!
    const newDraft = await service.createNewDraftFromPublished(testConfigId, {
      newVersion: "LOAN-FLOW-V8",
    });
    assert.strictEqual(newDraft.status, "DRAFT");
    assert.strictEqual(newDraft.currentVersion, "LOAN-FLOW-V8");

    // Verify version history has both records
    const versions = await service.listVersions(testConfigId);
    assert.ok(versions.length >= 2, "Must contain at least 2 versions in history");

    // Clean up
    await service.deleteConfiguration(testConfigId);
  });

  console.log("\n=======================================================");
  console.log(`Results: ${passedTests} passed of ${totalTests} tests.`);
  console.log("=======================================================\n");

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

module.exports = { runTests };

