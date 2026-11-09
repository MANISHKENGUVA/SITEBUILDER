import assert from "node:assert";
import {
  generateNodeId,
  validateNodeMetadata,
  ensureUniqueNodeId,
} from "../src/config-builder/core/nodeIdentity.js";
import {
  NODE_TYPES,
  DEFAULT_NODE_TEMPLATES,
} from "../src/config-builder/types/nodeTypes.js";
import {
  canonicalToVisualModel,
  visualModelToCanonical,
  extractCanvasLayout,
} from "../src/config-builder/core/workflowSchema.js";
import { validateClientWorkflow } from "../src/config-builder/core/validator.js";
import { HistoryManager } from "../src/config-builder/core/history.js";

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

console.log("\n=== FRONTEND TEST SUITE: CONFIGBUILDERMAKERAPP ===\n");

// ── 1. Node Identity Generator ──────────────────────────────────────────────
console.log("--- 1. Node Identity Generator ---");

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

it("keeps multiword node names with internal hyphens intact without splitting", () => {
  const meta = {
    actor: "BORROWER",
    module: "KYC",
    moduleVersion: "V1",
    node: "AADHAR-VERIFICATION",
    nodeVersion: "V2",
  };
  const id = generateNodeId(meta);
  assert.strictEqual(id, "BORROWER-KYC-V1-AADHAR-VERIFICATION-V2");
});

it("validates node metadata completeness and reports missing fields", () => {
  const incomplete = { actor: "BORROWER", module: "DETAILS" };
  const res = validateNodeMetadata(incomplete);
  assert.strictEqual(res.valid, false);
  assert.deepStrictEqual(res.missing, ["moduleVersion", "node", "nodeVersion"]);
});

it("ensures duplicate node identities are safely made unique", () => {
  const existing = ["BORROWER-DETAILS-V1-PERSONAL-INFO-V1"];
  const res = ensureUniqueNodeId("BORROWER-DETAILS-V1-PERSONAL-INFO-V1", existing);
  assert.strictEqual(res.id, "BORROWER-DETAILS-V1-PERSONAL-INFO-V1-COPY");
});

// ── 2. Four Centrally Defined Node Types ────────────────────────────────────
console.log("\n--- 2. Node Types & Capabilities ---");

it("verifies exactly four node types exist with no DECISION node", () => {
  const types = Object.values(NODE_TYPES);
  assert.deepStrictEqual(types.sort(), [
    "ACTOR",
    "API",
    "SYSTEM_INTERNAL_PROCESS",
    "WEBHOOK",
  ].sort());
  assert.strictEqual(types.includes("DECISION"), false);
});

it("provides valid default templates for all four node types", () => {
  assert.ok(DEFAULT_NODE_TEMPLATES.ACTOR.component);
  assert.ok(DEFAULT_NODE_TEMPLATES.SYSTEM_INTERNAL_PROCESS.processHandler);
  assert.ok(DEFAULT_NODE_TEMPLATES.WEBHOOK.endpoint);
  assert.ok(DEFAULT_NODE_TEMPLATES.API.endpoint);
});

// ── 3. Canonical Workflow Schema & Bi-directional Synchronization ───────────
console.log("\n--- 3. Canonical JSON Bi-directional Synchronization ---");

it("converts Canonical Workflow JSON to Visual Canvas Model", () => {
  const canonical = {
    workflowVersion: "LOAN-FLOW-V7",
    startState: "BORROWER-DETAILS-V1-PERSONAL-INFO-V1",
    states: {
      "BORROWER-DETAILS-V1-PERSONAL-INFO-V1": {
        type: "ACTOR",
        component: "PersonalInfoPage",
        access: { type: "PUBLIC" },
        metadata: {
          actor: "BORROWER",
          module: "DETAILS",
          moduleVersion: "V1",
          node: "PERSONAL-INFO",
          nodeVersion: "V1",
        },
        edges: {
          ED01: {
            toState: "BORROWER-ADDRESS-V1-ADDRESS-INFO-V1",
            ruleEngine: {
              operator: "AND",
              conditions: [{ field: "isMinor", operator: "=", value: false }],
            },
          },
        },
      },
      "BORROWER-ADDRESS-V1-ADDRESS-INFO-V1": {
        type: "ACTOR",
        component: "AddressInfoPage",
        access: { type: "PUBLIC" },
        metadata: {
          actor: "BORROWER",
          module: "ADDRESS",
          moduleVersion: "V1",
          node: "ADDRESS-INFO",
          nodeVersion: "V1",
        },
        edges: {},
      },
    },
  };

  const visual = canonicalToVisualModel(canonical);
  assert.strictEqual(visual.workflowVersion, "LOAN-FLOW-V7");
  assert.strictEqual(visual.startState, "BORROWER-DETAILS-V1-PERSONAL-INFO-V1");
  assert.strictEqual(visual.nodes.length, 2);
  assert.strictEqual(visual.edges.length, 1);
  assert.strictEqual(visual.edges[0].fromState, "BORROWER-DETAILS-V1-PERSONAL-INFO-V1");
  assert.strictEqual(visual.edges[0].toState, "BORROWER-ADDRESS-V1-ADDRESS-INFO-V1");
});

it("converts Visual Canvas Model back to valid Canonical Workflow JSON", () => {
  const visual = {
    workflowVersion: "LOAN-FLOW-V7",
    startState: "BORROWER-DETAILS-V1-PERSONAL-INFO-V1",
    nodes: [
      {
        id: "BORROWER-DETAILS-V1-PERSONAL-INFO-V1",
        type: "ACTOR",
        component: "PersonalInfoPage",
        access: { type: "PUBLIC" },
        metadata: {
          actor: "BORROWER",
          module: "DETAILS",
          moduleVersion: "V1",
          node: "PERSONAL-INFO",
          nodeVersion: "V1",
        },
        x: 100,
        y: 120,
      },
    ],
    edges: [],
  };

  const canonical = visualModelToCanonical(visual);
  assert.strictEqual(canonical.workflowVersion, "LOAN-FLOW-V7");
  assert.strictEqual(canonical.startState, "BORROWER-DETAILS-V1-PERSONAL-INFO-V1");
  assert.ok(canonical.states["BORROWER-DETAILS-V1-PERSONAL-INFO-V1"]);
  assert.strictEqual(canonical.states["BORROWER-DETAILS-V1-PERSONAL-INFO-V1"].component, "PersonalInfoPage");
});

it("preserves custom and unknown properties during roundtrip synchronization", () => {
  const originalCanonical = {
    workflowVersion: "CUSTOM-V1",
    startState: "BORROWER-DETAILS-V1-CUSTOM-V1",
    customWorkflowEngineSetting: "strict-audit-mode",
    states: {
      "BORROWER-DETAILS-V1-CUSTOM-V1": {
        type: "ACTOR",
        component: "CustomPage",
        metadata: {
          actor: "BORROWER",
          module: "DETAILS",
          moduleVersion: "V1",
          node: "CUSTOM",
          nodeVersion: "V1",
        },
        customBackendFlag: 42,
        edges: {},
      },
    },
  };

  const visual = canonicalToVisualModel(originalCanonical);
  const roundtrip = visualModelToCanonical(visual, originalCanonical);

  assert.strictEqual(roundtrip.customWorkflowEngineSetting, "strict-audit-mode");
  assert.strictEqual(roundtrip.states["BORROWER-DETAILS-V1-CUSTOM-V1"].customBackendFlag, 42);
});

// ── 4. Client-side Validation Engine ────────────────────────────────────────
console.log("\n--- 4. Client-side Validation Layer ---");

it("validates workflow definition and detects non-existent startState", () => {
  const invalid = {
    workflowVersion: "V1",
    startState: "UNKNOWN_START",
    states: {
      "BORROWER-DETAILS-V1-PERSONAL-INFO-V1": {
        type: "ACTOR",
        component: "PersonalInfoPage",
        metadata: { actor: "BORROWER", module: "DETAILS", moduleVersion: "V1", node: "PERSONAL-INFO", nodeVersion: "V1" },
        edges: {},
      },
    },
  };

  const res = validateClientWorkflow(invalid, "WF-01", "WFC-01");
  assert.strictEqual(res.valid, false);
  const startErr = res.errors.find((e) => e.field === "startState");
  assert.ok(startErr, "Must report invalid startState");
});

it("detects and flags edge pointing to non-existent state", () => {
  const flow = {
    workflowVersion: "V1",
    startState: "BORROWER-DETAILS-V1-PERSONAL-INFO-V1",
    states: {
      "BORROWER-DETAILS-V1-PERSONAL-INFO-V1": {
        type: "ACTOR",
        component: "PersonalInfoPage",
        metadata: { actor: "BORROWER", module: "DETAILS", moduleVersion: "V1", node: "PERSONAL-INFO", nodeVersion: "V1" },
        edges: {
          ED01: {
            toState: "GHOST-NODE-DOES-NOT-EXIST",
            ruleEngine: { operator: "AND", conditions: [] },
          },
        },
      },
    },
  };

  const res = validateClientWorkflow(flow, "WF-01", "WFC-01");
  const edgeErr = res.errors.find((e) => e.message.includes("GHOST-NODE-DOES-NOT-EXIST"));
  assert.ok(edgeErr, "Must flag missing destination state");
});

it("flags unreachable states with warning", () => {
  const flow = {
    workflowVersion: "V1",
    startState: "A-M-V1-N1-V1",
    states: {
      "A-M-V1-N1-V1": {
        type: "ACTOR",
        component: "Comp1",
        metadata: { actor: "A", module: "M", moduleVersion: "V1", node: "N1", nodeVersion: "V1" },
        edges: {},
      },
      "A-M-V1-N2-V1": { // Unreachable!
        type: "ACTOR",
        component: "Comp2",
        metadata: { actor: "A", module: "M", moduleVersion: "V1", node: "N2", nodeVersion: "V1" },
        edges: {},
      },
    },
  };

  const res = validateClientWorkflow(flow, "WF-01", "WFC-01");
  const unreachWarn = res.warnings.find((w) => w.field === "reachability");
  assert.ok(unreachWarn, "Must issue warning for unreachable node");
});

// ── 5. Undo / Redo History Stack ────────────────────────────────────────────
console.log("\n--- 5. Undo / Redo History Stack ---");

it("handles push, undo, and redo correctly", () => {
  const history = new HistoryManager(10);
  const state1 = { count: 1 };
  const state2 = { count: 2 };
  const state3 = { count: 3 };

  history.push(state1);
  history.push(state2);

  assert.strictEqual(history.canUndo, true);
  assert.strictEqual(history.canRedo, false);

  const undone = history.undo(state2);
  assert.deepStrictEqual(undone, state1);
  assert.strictEqual(history.canRedo, true);

  const redone = history.redo(state1);
  assert.deepStrictEqual(redone, state2);
});

console.log("\n=======================================================");
console.log(`Frontend Test Results: ${passedTests} passed of ${totalTests} tests.`);
console.log("=======================================================\n");

if (passedTests < totalTests) {
  process.exit(1);
}

