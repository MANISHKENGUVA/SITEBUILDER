/**
 * Canonical Workflow JSON Engine.
 *
 * Provides bidirectional conversion between Canonical Workflow JSON and the
 * internal Visual Canvas model, preserving custom properties and unknown fields.
 */
import { generateNodeId } from "./nodeIdentity.js";
import { NODE_TYPES } from "../types/nodeTypes.js";

/**
 * Transforms Canonical JSON into Visual Canvas Model.
 * @param {Object} canonicalJson
 * @param {Object} canvasLayoutPositions { [nodeKey]: { x, y } }
 * @returns {Object} visualModel
 */
export function canonicalToVisualModel(canonicalJson, canvasLayoutPositions = {}) {
  if (!canonicalJson || typeof canonicalJson !== "object") {
    return {
      workflowVersion: "V1",
      startState: "",
      nodes: [],
      edges: [],
      rawProperties: {},
    };
  }

  const {
    workflowVersion = "V1",
    startState = "",
    states = {},
    ...rawProperties
  } = canonicalJson;

  const stateEntries = Object.entries(states);
  const nodes = [];
  const edges = [];

  // Default grid layout generator if no positions provided
  let autoX = 80;
  let autoY = 100;
  const COL_WIDTH = 300;
  const ROW_HEIGHT = 160;
  const MAX_COLS = 4;

  stateEntries.forEach(([nodeKey, state], index) => {
    const col = index % MAX_COLS;
    const row = Math.floor(index / MAX_COLS);
    const pos = canvasLayoutPositions[nodeKey] || {
      x: autoX + col * COL_WIDTH,
      y: autoY + row * ROW_HEIGHT,
    };

    // Extract node-specific properties
    const {
      type = NODE_TYPES.ACTOR,
      metadata = {},
      edges: nodeEdges = {},
      component,
      access,
      processHandler,
      endpoint,
      method,
      headers,
      query: queryParams,
      auth,
      payload,
      timeout,
      retry,
      responseMapping,
      settings,
      ...extraNodeProps
    } = state || {};

    const nodeItem = {
      id: nodeKey,
      type,
      metadata: {
        actor: metadata.actor || "",
        module: metadata.module || "",
        moduleVersion: metadata.moduleVersion || "V1",
        node: metadata.node || "",
        nodeVersion: metadata.nodeVersion || "V1",
      },
      component: component || "",
      access: access || { type: "PUBLIC" },
      processHandler: processHandler || settings?.processHandler || "",
      endpoint: endpoint || "",
      method: method || "POST",
      headers: headers || {},
      query: queryParams || {},
      auth: auth || {},
      payload: payload || {},
      timeout: timeout || 5000,
      retry: retry || { maxRetries: 2, backoffMs: 500 },
      responseMapping: responseMapping || {},
      settings: settings || {},
      extraProperties: extraNodeProps,
      x: pos.x,
      y: pos.y,
    };

    nodes.push(nodeItem);

    // Extract edges
    if (nodeEdges && typeof nodeEdges === "object") {
      Object.entries(nodeEdges).forEach(([edgeKey, edge]) => {
        if (!edge) return;
        edges.push({
          id: `${nodeKey}__${edgeKey}`,
          edgeKey,
          fromState: nodeKey,
          toState: edge.toState || "",
          ruleEngine: edge.ruleEngine || {
            operator: "AND",
            conditions: [],
          },
          extraProperties: Object.fromEntries(
            Object.entries(edge).filter(([k]) => !["toState", "ruleEngine"].includes(k))
          ),
        });
      });
    }
  });

  return {
    workflowVersion,
    startState,
    nodes,
    edges,
    rawProperties,
  };
}

/**
 * Converts Visual Canvas Model back into Canonical Workflow JSON.
 * @param {Object} visualModel
 * @param {Object} existingCanonical
 * @returns {Object} canonicalJson
 */
export function visualModelToCanonical(visualModel, existingCanonical = {}) {
  if (!visualModel) return {};

  const {
    workflowVersion = "V1",
    startState = "",
    nodes = [],
    edges = [],
    rawProperties = {},
  } = visualModel;

  const states = {};

  nodes.forEach((node) => {
    // Generate authoritative identity if metadata is present
    const calculatedId = generateNodeId(node.metadata) || node.id;
    const nodeKey = node.id || calculatedId;

    // Build edges for this node
    const nodeOutgoingEdges = {};
    edges
      .filter((e) => e.fromState === nodeKey)
      .forEach((e) => {
        const edgeKey = e.edgeKey || `E_${e.toState}`;
        nodeOutgoingEdges[edgeKey] = {
          toState: e.toState,
          ruleEngine: {
            operator: e.ruleEngine?.operator || e.ruleEngine?.type || "AND",
            conditions: Array.isArray(e.ruleEngine?.conditions)
              ? e.ruleEngine.conditions
              : [],
          },
          ...(e.extraProperties || {}),
        };
      });

    // Construct canonical state object according to node type
    const stateObj = {
      type: node.type,
      metadata: {
        actor: node.metadata?.actor || "",
        module: node.metadata?.module || "",
        moduleVersion: node.metadata?.moduleVersion || "V1",
        node: node.metadata?.node || "",
        nodeVersion: node.metadata?.nodeVersion || "V1",
      },
      edges: nodeOutgoingEdges,
    };

    // Type-specific field mapping
    if (node.type === NODE_TYPES.ACTOR) {
      stateObj.component = node.component || "";
      stateObj.access = node.access || { type: "PUBLIC" };
    } else if (node.type === NODE_TYPES.SYSTEM_INTERNAL_PROCESS) {
      stateObj.processHandler = node.processHandler || "";
      if (node.settings && Object.keys(node.settings).length > 0) {
        stateObj.settings = node.settings;
      }
    } else if (node.type === NODE_TYPES.WEBHOOK) {
      stateObj.endpoint = node.endpoint || "";
      stateObj.method = node.method || "POST";
      if (node.headers && Object.keys(node.headers).length > 0) {
        stateObj.headers = node.headers;
      }
      if (node.timeout) stateObj.timeout = node.timeout;
      if (node.retry) stateObj.retry = node.retry;
    } else if (node.type === NODE_TYPES.API) {
      stateObj.endpoint = node.endpoint || "";
      stateObj.method = node.method || "POST";
      if (node.headers && Object.keys(node.headers).length > 0) {
        stateObj.headers = node.headers;
      }
      if (node.query && Object.keys(node.query).length > 0) {
        stateObj.query = node.query;
      }
      if (node.auth && Object.keys(node.auth).length > 0) {
        stateObj.auth = node.auth;
      }
      if (node.timeout) stateObj.timeout = node.timeout;
      if (node.retry) stateObj.retry = node.retry;
    }

    // Merge any extra unknown properties preserved from earlier load
    if (node.extraProperties && typeof node.extraProperties === "object") {
      Object.assign(stateObj, node.extraProperties);
    }

    states[nodeKey] = stateObj;
  });

  return {
    ...rawProperties,
    workflowVersion,
    startState,
    states,
  };
}

/**
 * Extracts canvas layout coordinates from visual model nodes.
 * @param {Array} nodes
 * @returns {Object}
 */
export function extractCanvasLayout(nodes = []) {
  const layout = {};
  nodes.forEach((n) => {
    if (n && n.id) {
      layout[n.id] = {
        x: Math.round(n.x || 0),
        y: Math.round(n.y || 0),
      };
    }
  });
  return layout;
}
