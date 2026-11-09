/**
 * Authoritative Node Identity Generator.
 *
 * Convention: ACTOR-MODULE-MODULEVERSION-NODE-NODEVERSION
 * Example: BORROWER-DETAILS-V1-PERSONAL-INFO-V1
 *
 * Critical requirement:
 * - Multiword names (e.g. "PERSONAL-INFO", "FRAUD-CHECK-PENDING") must be kept intact.
 * - Never split the generated ID blindly using hyphens.
 * - Metadata is the authoritative representation.
 */

export function sanitizeIdentityPart(str) {
  if (!str) return "";
  return String(str)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate standard node identity from 5 metadata values.
 * @param {Object} metadata
 * @param {string} metadata.actor
 * @param {string} metadata.module
 * @param {string} metadata.moduleVersion
 * @param {string} metadata.node
 * @param {string} metadata.nodeVersion
 * @returns {string} e.g. "BORROWER-DETAILS-V1-PERSONAL-INFO-V1"
 */
export function generateNodeId(metadata) {
  if (!metadata || typeof metadata !== "object") return "";
  const actor = sanitizeIdentityPart(metadata.actor);
  const mod = sanitizeIdentityPart(metadata.module);
  const modVer = sanitizeIdentityPart(metadata.moduleVersion);
  const node = sanitizeIdentityPart(metadata.node);
  const nodeVer = sanitizeIdentityPart(metadata.nodeVersion);

  return [actor, mod, modVer, node, nodeVer].filter(Boolean).join("-");
}

/**
 * Validates that all 5 metadata fields are present and valid.
 * @param {Object} metadata
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateNodeMetadata(metadata) {
  const missing = [];
  if (!metadata) return { valid: false, missing: ["actor", "module", "moduleVersion", "node", "nodeVersion"] };

  if (!metadata.actor || !String(metadata.actor).trim()) missing.push("actor");
  if (!metadata.module || !String(metadata.module).trim()) missing.push("module");
  if (!metadata.moduleVersion || !String(metadata.moduleVersion).trim()) missing.push("moduleVersion");
  if (!metadata.node || !String(metadata.node).trim()) missing.push("node");
  if (!metadata.nodeVersion || !String(metadata.nodeVersion).trim()) missing.push("nodeVersion");

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Ensures a generated state ID is unique within a set of existing IDs.
 * If collision occurs, increments version or appends copy suffix.
 * @param {string} baseId
 * @param {string[]|Set<string>} existingIds
 * @param {Object} metadata (optional: will adjust metadata.node or nodeVersion if provided)
 * @returns {{ id: string, metadata?: Object }}
 */
export function ensureUniqueNodeId(baseId, existingIds, metadata = null) {
  const idSet = existingIds instanceof Set ? existingIds : new Set(existingIds || []);
  if (!idSet.has(baseId)) {
    return { id: baseId, metadata };
  }

  let counter = 2;
  let candidate = `${baseId}-COPY`;
  let newMeta = metadata ? { ...metadata } : null;

  while (idSet.has(candidate)) {
    candidate = `${baseId}-COPY-${counter}`;
    counter++;
  }

  if (newMeta) {
    newMeta.node = `${newMeta.node}-COPY${counter > 2 ? `-${counter - 1}` : ""}`;
  }

  return { id: candidate, metadata: newMeta };
}

