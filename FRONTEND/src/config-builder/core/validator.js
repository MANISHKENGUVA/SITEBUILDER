/**
 * Client-Side Configuration Validator.
 * Mirrors the authoritative backend validation rules for instant feedback in the IDE.
 */
import { NODE_TYPES } from "../types/nodeTypes";
import { generateNodeId } from "./nodeIdentity";

export function validateClientWorkflow(canonicalJson, workflowId, configurationId) {
  const issues = [];

  if (!canonicalJson || typeof canonicalJson !== "object") {
    return {
      valid: false,
      errors: [{ level: "ERROR", field: "root", message: "Workflow definition must be an object" }],
      warnings: [],
      info: [],
    };
  }

  // 1. Workflow and Configuration IDs
  if (!workflowId || !String(workflowId).trim()) {
    issues.push({
      level: "ERROR",
      field: "workflowId",
      message: "workflowId is required",
    });
  }

  if (!configurationId || !String(configurationId).trim()) {
    issues.push({
      level: "ERROR",
      field: "configurationId",
      message: "configurationId is required",
    });
  }

  // 2. workflowVersion
  if (!canonicalJson.workflowVersion || !String(canonicalJson.workflowVersion).trim()) {
    issues.push({
      level: "ERROR",
      field: "workflowVersion",
      message: "workflowVersion is required",
    });
  }

  // 3. States object
  const states = canonicalJson.states;
  if (!states || typeof states !== "object" || Array.isArray(states)) {
    issues.push({
      level: "ERROR",
      field: "states",
      message: "Workflow definition must contain a 'states' object map",
    });
    return partition(issues);
  }

  const stateKeys = Object.keys(states);
  if (stateKeys.length === 0) {
    issues.push({
      level: "ERROR",
      field: "states",
      message: "At least one node must be defined in the workflow",
    });
    return partition(issues);
  }

  // 4. startState
  if (!canonicalJson.startState) {
    issues.push({
      level: "ERROR",
      field: "startState",
      message: "startState is required",
    });
  } else if (!stateKeys.includes(canonicalJson.startState)) {
    issues.push({
      level: "ERROR",
      field: "startState",
      message: `startState '${canonicalJson.startState}' does not exist in 'states'`,
    });
  }

  // 5. Individual node validations
  const seenIdentities = new Set();
  const incomingEdgesCount = {};
  stateKeys.forEach((k) => { incomingEdgesCount[k] = 0; });

  for (const [key, node] of Object.entries(states)) {
    if (!node || typeof node !== "object") {
      issues.push({
        level: "ERROR",
        nodeKey: key,
        field: "node",
        message: `Node '${key}' is invalid or empty`,
      });
      continue;
    }

    // Type check
    const allowedTypes = Object.values(NODE_TYPES);
    if (!node.type || !allowedTypes.includes(node.type)) {
      issues.push({
        level: "ERROR",
        nodeKey: key,
        field: "type",
        message: `Node '${key}' has invalid type '${node.type}'. Allowed: ${allowedTypes.join(", ")}`,
      });
    }

    // Metadata check
    const meta = node.metadata;
    if (!meta || typeof meta !== "object") {
      issues.push({
        level: "ERROR",
        nodeKey: key,
        field: "metadata",
        message: `Node '${key}' is missing required 'metadata' object`,
      });
    } else {
      ["actor", "module", "moduleVersion", "node", "nodeVersion"].forEach((reqKey) => {
        if (!meta[reqKey] || !String(meta[reqKey]).trim()) {
          issues.push({
            level: "ERROR",
            nodeKey: key,
            field: `metadata.${reqKey}`,
            message: `Node '${key}' is missing metadata field '${reqKey}'`,
          });
        }
      });

      // Identity consistency
      const expectedId = generateNodeId(meta);
      if (expectedId && expectedId !== key) {
        issues.push({
          level: "ERROR",
          nodeKey: key,
          field: "identity",
          message: `Node key '${key}' does not match metadata identity '${expectedId}'`,
        });
      }

      if (expectedId) {
        if (seenIdentities.has(expectedId)) {
          issues.push({
            level: "ERROR",
            nodeKey: key,
            field: "duplicate",
            message: `Duplicate node identity '${expectedId}' detected`,
          });
        } else {
          seenIdentities.add(expectedId);
        }
      }
    }

    // Node Type specific checks
    if (node.type === NODE_TYPES.ACTOR) {
      if (!node.component || !String(node.component).trim()) {
        issues.push({
          level: "ERROR",
          nodeKey: key,
          field: "component",
          message: `ACTOR node '${key}' requires a 'component' reference`,
        });
      }
    } else if (node.type === NODE_TYPES.SYSTEM_INTERNAL_PROCESS) {
      const handler = node.processHandler || node.settings?.processHandler;
      if (!handler || !String(handler).trim()) {
        issues.push({
          level: "ERROR",
          nodeKey: key,
          field: "processHandler",
          message: `SYSTEM_INTERNAL_PROCESS node '${key}' requires a 'processHandler'`,
        });
      }
    } else if (node.type === NODE_TYPES.WEBHOOK) {
      if (!node.endpoint || !String(node.endpoint).trim()) {
        issues.push({
          level: "ERROR",
          nodeKey: key,
          field: "endpoint",
          message: `WEBHOOK node '${key}' requires an 'endpoint'`,
        });
      }
    } else if (node.type === NODE_TYPES.API) {
      if (!node.endpoint || !String(node.endpoint).trim()) {
        issues.push({
          level: "ERROR",
          nodeKey: key,
          field: "endpoint",
          message: `API node '${key}' requires an 'endpoint'`,
        });
      }
    }

    // Outgoing edges
    const edges = node.edges || {};
    const edgeEntries = Object.entries(edges);

    if (edgeEntries.length === 0) {
      issues.push({
        level: "INFO",
        nodeKey: key,
        field: "edges",
        message: `Node '${key}' is a terminal state (no outgoing edges)`,
      });
    }

    edgeEntries.forEach(([edgeKey, edge]) => {
      if (!edge || typeof edge !== "object") return;

      if (!edge.toState) {
        issues.push({
          level: "ERROR",
          nodeKey: key,
          field: `edges.${edgeKey}.toState`,
          message: `Edge '${edgeKey}' on node '${key}' is missing target 'toState'`,
        });
      } else if (!stateKeys.includes(edge.toState)) {
        issues.push({
          level: "ERROR",
          nodeKey: key,
          field: `edges.${edgeKey}.toState`,
          message: `Edge '${edgeKey}' points to unknown target state '${edge.toState}'`,
        });
      } else {
        incomingEdgesCount[edge.toState]++;
      }

      // Rule Engine checks
      if (edge.ruleEngine) {
        const re = edge.ruleEngine;
        if (re.conditions && Array.isArray(re.conditions)) {
          re.conditions.forEach((c, idx) => {
            if (!c.field) {
              issues.push({
                level: "ERROR",
                nodeKey: key,
                field: `edges.${edgeKey}.ruleEngine.conditions[${idx}]`,
                message: `Condition #${idx + 1} on edge '${edgeKey}' is missing field name`,
              });
            }
          });
        }
      }
    });
  }

  // Check unreachable nodes
  for (const key of stateKeys) {
    if (key !== canonicalJson.startState && incomingEdgesCount[key] === 0) {
      issues.push({
        level: "WARNING",
        nodeKey: key,
        field: "reachability",
        message: `Node '${key}' is unreachable from the start node`,
      });
    }
  }

  return partition(issues);
}

function partition(issues) {
  const errors = issues.filter((i) => i.level === "ERROR");
  const warnings = issues.filter((i) => i.level === "WARNING");
  const info = issues.filter((i) => i.level === "INFO");
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
    totalIssues: issues.length,
  };
}
