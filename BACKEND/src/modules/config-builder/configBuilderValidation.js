const ALLOWED_NODE_TYPES = Object.freeze([
  "ACTOR",
  "SYSTEM_INTERNAL_PROCESS",
  "WEBHOOK",
  "API",
]);

const ALLOWED_RULE_OPERATORS = Object.freeze(["AND", "OR"]);
const ALLOWED_CONDITION_OPERATORS = Object.freeze([
  "=",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "in",
  "contains",
  "exists",
]);

/**
 * Generate standard node identity from metadata.
 * Format: ACTOR-MODULE-MODULEVERSION-NODE-NODEVERSION
 * Supports multiword names (e.g. node = "PERSONAL-INFO").
 */
function generateNodeId(metadata) {
  if (!metadata || typeof metadata !== "object") return "";
  const { actor, module, moduleVersion, node, nodeVersion } = metadata;
  const clean = (val) => String(val || "").trim().toUpperCase();
  return [
    clean(actor),
    clean(module),
    clean(moduleVersion),
    clean(node),
    clean(nodeVersion),
  ].filter(Boolean).join("-");
}

/**
 * Validates a single node.
 * Returns an array of issues: { level: 'ERROR' | 'WARNING' | 'INFO', nodeKey, field, message }
 */
function validateNode(nodeKey, state, allStateKeys = []) {
  const issues = [];
  if (!state || typeof state !== "object") {
    issues.push({
      level: "ERROR",
      nodeKey,
      field: "root",
      message: `Node '${nodeKey}' must be an object`,
    });
    return issues;
  }

  // 1. Node type validation
  if (!state.type) {
    issues.push({
      level: "ERROR",
      nodeKey,
      field: "type",
      message: `Node '${nodeKey}' is missing required field 'type'`,
    });
  } else if (!ALLOWED_NODE_TYPES.includes(state.type)) {
    issues.push({
      level: "ERROR",
      nodeKey,
      field: "type",
      message: `Node '${nodeKey}' has invalid type '${state.type}'. Allowed: ${ALLOWED_NODE_TYPES.join(", ")}`,
    });
  }

  // 2. Metadata completeness and format
  const meta = state.metadata;
  if (!meta || typeof meta !== "object") {
    issues.push({
      level: "ERROR",
      nodeKey,
      field: "metadata",
      message: `Node '${nodeKey}' is missing required 'metadata' object`,
    });
  } else {
    const requiredMeta = ["actor", "module", "moduleVersion", "node", "nodeVersion"];
    for (const key of requiredMeta) {
      if (!meta[key] || typeof meta[key] !== "string" || meta[key].trim() === "") {
        issues.push({
          level: "ERROR",
          nodeKey,
          field: `metadata.${key}`,
          message: `Node '${nodeKey}' metadata is missing '${key}'`,
        });
      }
    }

    // Node identity match
    const expectedId = generateNodeId(meta);
    if (expectedId && nodeKey !== expectedId) {
      issues.push({
        level: "ERROR",
        nodeKey,
        field: "key",
        message: `Node key '${nodeKey}' does not match expected identity from metadata: '${expectedId}'`,
      });
    }
  }

  // 3. Type-specific configuration
  if (state.type === "ACTOR") {
    if (!state.component || typeof state.component !== "string") {
      issues.push({
        level: "ERROR",
        nodeKey,
        field: "component",
        message: `ACTOR node '${nodeKey}' requires a valid 'component' reference`,
      });
    }
    if (!state.access || typeof state.access !== "object") {
      issues.push({
        level: "WARNING",
        nodeKey,
        field: "access",
        message: `ACTOR node '${nodeKey}' has no access configuration, defaulting to PUBLIC`,
      });
    }
  } else if (state.type === "SYSTEM_INTERNAL_PROCESS") {
    const handler = state.processHandler || state.handler || state.settings?.processHandler;
    if (!handler) {
      issues.push({
        level: "ERROR",
        nodeKey,
        field: "processHandler",
        message: `SYSTEM_INTERNAL_PROCESS node '${nodeKey}' requires a 'processHandler'`,
      });
    }
  } else if (state.type === "WEBHOOK") {
    if (!state.endpoint && !state.webhook?.endpoint) {
      issues.push({
        level: "ERROR",
        nodeKey,
        field: "endpoint",
        message: `WEBHOOK node '${nodeKey}' requires an 'endpoint' URL`,
      });
    }
    const method = state.method || state.webhook?.method || "POST";
    if (!["GET", "POST", "PUT", "DELETE"].includes(String(method).toUpperCase())) {
      issues.push({
        level: "ERROR",
        nodeKey,
        field: "method",
        message: `WEBHOOK node '${nodeKey}' has invalid HTTP method '${method}'`,
      });
    }
  } else if (state.type === "API") {
    if (!state.endpoint && !state.api?.endpoint) {
      issues.push({
        level: "ERROR",
        nodeKey,
        field: "endpoint",
        message: `API node '${nodeKey}' requires an 'endpoint' URL`,
      });
    }
    const method = state.method || state.api?.method || "POST";
    if (!["GET", "POST", "PUT", "DELETE", "PATCH"].includes(String(method).toUpperCase())) {
      issues.push({
        level: "ERROR",
        nodeKey,
        field: "method",
        message: `API node '${nodeKey}' has invalid HTTP method '${method}'`,
      });
    }
  }

  // 4. Edges validation
  const edges = state.edges;
  if (edges && typeof edges === "object") {
    const edgeEntries = Object.entries(edges);
    for (const [edgeKey, edge] of edgeEntries) {
      if (!edge || typeof edge !== "object") {
        issues.push({
          level: "ERROR",
          nodeKey,
          field: `edges.${edgeKey}`,
          message: `Edge '${edgeKey}' on node '${nodeKey}' must be an object`,
        });
        continue;
      }

      // toState validation
      if (!edge.toState) {
        issues.push({
          level: "ERROR",
          nodeKey,
          field: `edges.${edgeKey}.toState`,
          message: `Edge '${edgeKey}' on node '${nodeKey}' is missing 'toState'`,
        });
      } else if (allStateKeys.length > 0 && !allStateKeys.includes(edge.toState)) {
        issues.push({
          level: "ERROR",
          nodeKey,
          field: `edges.${edgeKey}.toState`,
          message: `Edge '${edgeKey}' on node '${nodeKey}' targets unknown state '${edge.toState}'`,
        });
      }

      // Rule engine validation
      if (edge.ruleEngine) {
        const re = edge.ruleEngine;
        const op = String(re.operator || re.type || "AND").toUpperCase();
        if (!ALLOWED_RULE_OPERATORS.includes(op)) {
          issues.push({
            level: "ERROR",
            nodeKey,
            field: `edges.${edgeKey}.ruleEngine.operator`,
            message: `Edge '${edgeKey}' rule engine operator must be 'AND' or 'OR'`,
          });
        }

        if (Array.isArray(re.conditions)) {
          for (let i = 0; i < re.conditions.length; i++) {
            const cond = re.conditions[i];
            if (!cond || typeof cond !== "object") {
              issues.push({
                level: "ERROR",
                nodeKey,
                field: `edges.${edgeKey}.ruleEngine.conditions[${i}]`,
                message: `Condition at index ${i} on edge '${edgeKey}' must be an object`,
              });
              continue;
            }
            if (!cond.field || typeof cond.field !== "string") {
              issues.push({
                level: "ERROR",
                nodeKey,
                field: `edges.${edgeKey}.ruleEngine.conditions[${i}].field`,
                message: `Condition at index ${i} on edge '${edgeKey}' is missing 'field'`,
              });
            }
            if (!cond.operator || !ALLOWED_CONDITION_OPERATORS.includes(cond.operator)) {
              issues.push({
                level: "ERROR",
                nodeKey,
                field: `edges.${edgeKey}.ruleEngine.conditions[${i}].operator`,
                message: `Condition at index ${i} on edge '${edgeKey}' has invalid operator '${cond.operator}'. Allowed: ${ALLOWED_CONDITION_OPERATORS.join(", ")}`,
              });
            }
          }
        }
      }
    }
  }

  return issues;
}

/**
 * Validates the complete workflow definition.
 * Returns { valid: boolean, errors: [], warnings: [], info: [] }
 */
function validateWorkflow(definition, workflowId, configurationId) {
  const issues = [];

  if (!definition || typeof definition !== "object") {
    return {
      valid: false,
      errors: [{ level: "ERROR", field: "root", message: "Workflow definition must be a valid JSON object" }],
      warnings: [],
      info: [],
    };
  }

  // 1. Workflow and Configuration IDs
  if (workflowId !== undefined && (!workflowId || typeof workflowId !== "string" || !workflowId.trim())) {
    issues.push({
      level: "ERROR",
      field: "workflowId",
      message: "workflowId is required and cannot be empty",
    });
  }

  if (configurationId !== undefined && (!configurationId || typeof configurationId !== "string" || !configurationId.trim())) {
    issues.push({
      level: "ERROR",
      field: "configurationId",
      message: "configurationId is required and cannot be empty",
    });
  }

  // 2. workflowVersion
  if (!definition.workflowVersion || typeof definition.workflowVersion !== "string" || !definition.workflowVersion.trim()) {
    issues.push({
      level: "ERROR",
      field: "workflowVersion",
      message: "workflowVersion is required",
    });
  }

  // 3. States object
  if (!definition.states || typeof definition.states !== "object" || Array.isArray(definition.states)) {
    issues.push({
      level: "ERROR",
      field: "states",
      message: "Workflow definition must contain a 'states' object map",
    });
    return partitionIssues(issues);
  }

  const stateKeys = Object.keys(definition.states);
  if (stateKeys.length === 0) {
    issues.push({
      level: "ERROR",
      field: "states",
      message: "Workflow must define at least one node in 'states'",
    });
    return partitionIssues(issues);
  }

  // 4. startState
  if (!definition.startState) {
    issues.push({
      level: "ERROR",
      field: "startState",
      message: "startState is required",
    });
  } else if (!stateKeys.includes(definition.startState)) {
    issues.push({
      level: "ERROR",
      field: "startState",
      message: `startState '${definition.startState}' does not exist in 'states'`,
    });
  }

  // 5. Individual node validations & duplicate ID check
  const seenIdentities = new Set();
  for (const [key, state] of Object.entries(definition.states)) {
    const nodeIssues = validateNode(key, state, stateKeys);
    issues.push(...nodeIssues);

    const generatedId = generateNodeId(state.metadata);
    if (generatedId) {
      if (seenIdentities.has(generatedId)) {
        issues.push({
          level: "ERROR",
          nodeKey: key,
          field: "identity",
          message: `Duplicate node identity '${generatedId}' detected`,
        });
      } else {
        seenIdentities.add(generatedId);
      }
    }
  }

  // 6. Flow topology checks (unreachable nodes & terminal nodes)
  const incomingEdgeCounts = {};
  stateKeys.forEach((k) => { incomingEdgeCounts[k] = 0; });

  for (const [, state] of Object.entries(definition.states)) {
    const edges = state.edges || {};
    for (const [, edge] of Object.entries(edges)) {
      if (edge && edge.toState && incomingEdgeCounts[edge.toState] !== undefined) {
        incomingEdgeCounts[edge.toState]++;
      }
    }
  }

  for (const key of stateKeys) {
    if (key !== definition.startState && incomingEdgeCounts[key] === 0) {
      issues.push({
        level: "WARNING",
        nodeKey: key,
        field: "topology",
        message: `Node '${key}' is unreachable (no incoming edges and is not startState)`,
      });
    }

    const outgoingCount = Object.keys(definition.states[key]?.edges || {}).length;
    if (outgoingCount === 0) {
      issues.push({
        level: "INFO",
        nodeKey: key,
        field: "topology",
        message: `Node '${key}' is a terminal state (no outgoing edges)`,
      });
    }
  }

  return partitionIssues(issues);
}

function partitionIssues(issues) {
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

module.exports = {
  ALLOWED_NODE_TYPES,
  ALLOWED_RULE_OPERATORS,
  ALLOWED_CONDITION_OPERATORS,
  generateNodeId,
  validateNode,
  validateWorkflow,
};

