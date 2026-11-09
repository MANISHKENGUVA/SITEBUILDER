<template>
  <div class="workflow-viewer">
    <AppHeader />
    <main id="main" class="viewer">
      <header class="viewer__header">
        <div>
          <p class="viewer__eyebrow">Workflow tools</p>
          <h1>Loan flow viewer</h1>
          <p class="viewer__intro">
            Load a workflow JSON file to inspect its graph, then optionally add execution logs.
            Files are read in this browser and are not uploaded.
          </p>
        </div>
        <router-link class="btn btn--ghost au-button au-button--ghost" to="/catalogue">
          Back to catalogue
        </router-link>
      </header>

      <section class="viewer__imports au-card" aria-label="Import workflow and logs">
        <div class="viewer__import">
          <label for="workflow-config">Workflow config (JSON)</label>
          <input
            id="workflow-config"
            ref="configInput"
            type="file"
            accept=".json,application/json"
            @change="loadConfig"
          >
          <p v-if="configName" class="viewer__filename">{{ configName }}</p>
        </div>
        <div class="viewer__import">
          <label for="workflow-logs">Execution logs (JSON or JSONL)</label>
          <input
            id="workflow-logs"
            ref="logsInput"
            type="file"
            accept=".json,.jsonl,application/json,text/plain"
            @change="loadLogs"
          >
          <p v-if="logsName" class="viewer__filename">{{ logsName }}</p>
        </div>
        <button
          v-if="config || logs.length"
          type="button"
          class="btn btn--ghost au-button au-button--ghost viewer__clear"
          @click="clearFiles"
        >
          Clear files
        </button>
      </section>

      <p v-if="error" class="viewer__error" role="alert">{{ error }}</p>

      <section v-if="config" class="viewer__summary" aria-label="Workflow summary">
        <span class="au-chip au-chip--default">{{ workflowLabel }}</span>
        <span>{{ graphNodes.length }} nodes</span>
        <span>{{ graphEdges.length }} connections</span>
        <span>{{ logs.length }} log entries</span>
      </section>

      <section v-if="config" class="viewer__panel au-card">
        <div class="viewer__panel-heading">
          <div>
            <h2>Workflow graph</h2>
            <p>Select a node to filter the log entries below.</p>
          </div>
          <button
            v-if="selectedNode"
            type="button"
            class="btn btn--ghost au-button au-button--ghost"
            @click="selectedNode = null"
          >
            Show all logs
          </button>
        </div>
        <div class="viewer__graph-scroll">
          <svg
            class="viewer__graph"
            :width="graphWidth"
            :height="graphHeight"
            :viewBox="'0 0 ' + graphWidth + ' ' + graphHeight"
            role="img"
            :aria-label="workflowLabel + ' workflow graph'"
          >
            <defs>
              <marker id="viewer-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="#758195" />
              </marker>
            </defs>
            <path
              v-for="(edge, index) in positionedEdges"
              :key="'edge-' + index"
              class="viewer__edge"
              :d="edgePath(edge)"
              marker-end="url(#viewer-arrow)"
            />
            <g
              v-for="node in positionedNodes"
              :key="node.id"
              class="viewer__node"
              :class="{
                'viewer__node--selected': selectedNode === node.id,
                'viewer__node--visited': node.logCount > 0,
              }"
              role="button"
              tabindex="0"
              :aria-label="node.label + ', ' + node.logCount + ' log entries'"
              @click="selectNode(node.id)"
              @keydown.enter="selectNode(node.id)"
              @keydown.space.prevent="selectNode(node.id)"
            >
              <rect :x="node.x" :y="node.y" width="180" height="70" rx="8" />
              <text class="viewer__node-label" :x="node.x + 12" :y="node.y + 29">
                {{ truncate(node.label, 22) }}
              </text>
              <text class="viewer__node-meta" :x="node.x + 12" :y="node.y + 51">
                {{ node.id }}<tspan v-if="node.logCount"> · {{ node.logCount }} logs</tspan>
              </text>
            </g>
          </svg>
        </div>
        <p v-if="!graphNodes.length" class="viewer__empty">
          No nodes found. Expected a `nodes`, `states`, or `steps` array in the workflow JSON.
        </p>
      </section>

      <section v-if="config" class="viewer__panel au-card">
        <div class="viewer__panel-heading">
          <div>
            <h2>Execution logs</h2>
            <p v-if="selectedNode">Showing entries for {{ selectedNode }}.</p>
            <p v-else>Entries from the imported log file.</p>
          </div>
          <label class="viewer__search">
            <span class="sr-only">Search logs</span>
            <input v-model.trim="search" type="search" placeholder="Search logs">
          </label>
        </div>
        <div v-if="filteredLogs.length" class="viewer__logs-wrap">
          <table class="viewer__logs">
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Level</th>
                <th scope="col">Node</th>
                <th scope="col">Event / message</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(entry, index) in filteredLogs" :key="entry.id || index">
                <td>{{ entry.time }}</td>
                <td><span class="viewer__level" :class="'viewer__level--' + entry.levelClass">{{ entry.level }}</span></td>
                <td>{{ entry.node || "—" }}</td>
                <td class="viewer__message">{{ entry.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="viewer__empty">
          {{ logs.length ? "No log entries match this filter." : "Import a JSON or JSONL log file to see execution details." }}
        </p>
      </section>
    </main>
    <AppFooter />
  </div>
</template>

<script>
import AppHeader from "@/components/common/AppHeader.vue";
import AppFooter from "@/components/common/AppFooter.vue";

function firstValue(object, keys) {
  for (const key of keys) {
    if (object && object[key] !== undefined && object[key] !== null && object[key] !== "") {
      return object[key];
    }
  }
  return null;
}

function findNodeList(config) {
  const candidates = [
    config.nodes,
    config.states,
    config.steps,
    config.workflow && config.workflow.nodes,
    config.workflow && config.workflow.states,
    config.flow && config.flow.nodes,
    config.flow && config.flow.states,
  ];
  return candidates.find(Array.isArray) || [];
}

function listTargets(value) {
  if (Array.isArray(value)) {
    return value.reduce((targets, item) => targets.concat(listTargets(item)), []);
  }
  if (typeof value === "string" || typeof value === "number") return [String(value)];
  if (!value || typeof value !== "object") return [];
  const target = firstValue(value, ["to", "target", "next", "node", "nodeKey", "state"]);
  return target === null ? [] : [String(target)];
}

function parseLogEntries(value) {
  const entries = Array.isArray(value)
    ? value
    : value && (value.logs || value.events || value.entries);
  if (!Array.isArray(entries)) {
    throw new Error("The log file must contain an array or a logs, events, or entries array.");
  }
  return entries.filter((entry) => entry && typeof entry === "object").map((entry, index) => {
    const level = String(firstValue(entry, ["level", "severity", "status"]) || "info");
    const node = firstValue(entry, ["node", "nodeKey", "state", "step", "currentNode"]);
    const time = firstValue(entry, ["timestamp", "time", "createdAt", "date"]);
    return {
      id: firstValue(entry, ["id", "eventId"]) || String(index),
      time: time ? String(time) : "—",
      level,
      levelClass: /error|fatal|critical/i.test(level) ? "error" : /warn/i.test(level) ? "warning" : "info",
      node: node === null ? "" : String(node),
      message: String(firstValue(entry, ["message", "event", "type", "action", "details"]) || JSON.stringify(entry)),
      searchable: JSON.stringify(entry).toLowerCase(),
    };
  });
}

export default {
  name: "WorkflowViewer",
  components: { AppHeader, AppFooter },
  data() {
    return {
      config: null,
      configName: "",
      logs: [],
      logsName: "",
      error: "",
      selectedNode: null,
      search: "",
    };
  },
  computed: {
    workflowLabel() {
      return String(firstValue(this.config, ["workflowVersion", "name", "id", "workflowId"]) || "Loan workflow");
    },
    graphNodes() {
      if (!this.config) return [];
      return findNodeList(this.config).map((item, index) => {
        const node = typeof item === "string" ? { id: item, label: item } : item;
        const id = String(firstValue(node, ["id", "key", "nodeKey", "name", "state"]) || "node-" + (index + 1));
        return {
          id,
          label: String(firstValue(node, ["label", "title", "displayName", "name"]) || id),
          source: node,
          logCount: this.logs.filter((log) => log.node === id).length,
        };
      });
    },
    graphEdges() {
      const edges = [];
      const addEdge = (from, to) => {
        if (from && to && this.graphNodes.some((node) => node.id === String(from)) &&
          this.graphNodes.some((node) => node.id === String(to))) {
          edges.push({ from: String(from), to: String(to) });
        }
      };
      const root = this.config || {};
      [root.edges, root.transitions, root.workflow && root.workflow.edges,
        root.workflow && root.workflow.transitions, root.flow && root.flow.edges]
        .filter(Array.isArray)
        .forEach((list) => list.forEach((edge) => {
          if (Array.isArray(edge) && edge.length >= 2) addEdge(edge[0], edge[1]);
          else if (edge && typeof edge === "object") {
            addEdge(firstValue(edge, ["from", "source", "node", "nodeKey"]), firstValue(edge, ["to", "target", "next"]));
          }
        }));

      this.graphNodes.forEach((node) => {
        const source = node.source;
        ["next", "transitions", "on"].forEach((key) => {
          const value = source && source[key];
          if (value && typeof value === "object" && !Array.isArray(value)) {
            Object.keys(value).forEach((event) => listTargets(value[event]).forEach((target) => addEdge(node.id, target)));
          } else {
            listTargets(value).forEach((target) => addEdge(node.id, target));
          }
        });
      });

      return edges.filter((edge, index) => edges.findIndex((other) =>
        other.from === edge.from && other.to === edge.to) === index);
    },
    positionedNodes() {
      const nodes = this.graphNodes;
      const levels = {};
      const incoming = {};
      const outgoing = {};
      nodes.forEach((node) => {
        incoming[node.id] = 0;
        outgoing[node.id] = [];
      });
      this.graphEdges.forEach((edge) => {
        incoming[edge.to] += 1;
        outgoing[edge.from].push(edge.to);
      });
      nodes.forEach((node) => { levels[node.id] = 0; });
      const queue = nodes.filter((node) => incoming[node.id] === 0).map((node) => node.id);
      const visited = {};
      while (queue.length) {
        const id = queue.shift();
        if (visited[id]) continue;
        visited[id] = true;
        outgoing[id].forEach((target) => {
          levels[target] = Math.max(levels[target], levels[id] + 1);
          queue.push(target);
        });
      }
      nodes.forEach((node, index) => {
        if (!visited[node.id] && incoming[node.id] > 0) levels[node.id] = Math.max(levels[node.id], index);
      });
      const rows = {};
      return nodes.map((node) => {
        const level = levels[node.id] || 0;
        const row = rows[level] || 0;
        rows[level] = row + 1;
        return Object.assign({}, node, { x: 30 + level * 240, y: 30 + row * 110 });
      });
    },
    positionedEdges() {
      return this.graphEdges.map((edge) => ({
        from: this.positionedNodes.find((node) => node.id === edge.from),
        to: this.positionedNodes.find((node) => node.id === edge.to),
      })).filter((edge) => edge.from && edge.to);
    },
    graphWidth() {
      return Math.max(260, ...this.positionedNodes.map((node) => node.x + 210));
    },
    graphHeight() {
      return Math.max(150, ...this.positionedNodes.map((node) => node.y + 100));
    },
    filteredLogs() {
      const query = this.search.toLowerCase();
      return this.logs.filter((entry) => {
        const matchesNode = !this.selectedNode || entry.node === this.selectedNode;
        return matchesNode && (!query || entry.searchable.indexOf(query) !== -1);
      });
    },
  },
  methods: {
    async readFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Could not read the selected file."));
        reader.readAsText(file);
      });
    },
    async loadConfig(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      this.error = "";
      try {
        const parsed = JSON.parse(await this.readFile(file));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Workflow config must be a JSON object.");
        }
        this.config = parsed;
        this.configName = file.name;
        this.selectedNode = null;
      } catch (error) {
        this.error = "Unable to load workflow config: " + error.message;
      }
    },
    async loadLogs(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      this.error = "";
      try {
        const text = await this.readFile(file);
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (jsonError) {
          parsed = text.split(/\r?\n/).filter(Boolean).map((line, index) => {
            try {
              return JSON.parse(line);
            } catch (error) {
              throw new Error("Invalid JSON on line " + (index + 1) + ": " + error.message);
            }
          });
        }
        this.logs = parseLogEntries(parsed);
        this.logsName = file.name;
      } catch (error) {
        this.error = "Unable to load execution logs: " + error.message;
      }
    },
    clearFiles() {
      this.config = null;
      this.configName = "";
      this.logs = [];
      this.logsName = "";
      this.error = "";
      this.selectedNode = null;
      this.search = "";
      if (this.$refs.configInput) this.$refs.configInput.value = "";
      if (this.$refs.logsInput) this.$refs.logsInput.value = "";
    },
    selectNode(id) {
      this.selectedNode = this.selectedNode === id ? null : id;
    },
    edgePath(edge) {
      const startX = edge.from.x + 180;
      const startY = edge.from.y + 35;
      const endX = edge.to.x;
      const endY = edge.to.y + 35;
      const curve = Math.max(35, Math.abs(endX - startX) / 2);
      return "M " + startX + " " + startY + " C " + (startX + curve) + " " + startY +
        ", " + (endX - curve) + " " + endY + ", " + endX + " " + endY;
    },
    truncate(value, limit) {
      return value.length > limit ? value.slice(0, limit - 1) + "…" : value;
    },
  },
};
</script>

<style lang="scss" scoped>
.workflow-viewer {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: $color-bg-body;
}

.viewer {
  flex: 1;
  width: 100%;
  max-width: $container-max;
  box-sizing: border-box;
  margin: 0 auto;
  padding: $space-8 $container-padding $space-16;
}

.viewer__header,
.viewer__panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $space-5;
}

.viewer__header {
  margin-bottom: $space-6;
}

.viewer__eyebrow {
  margin-bottom: $space-2;
  color: $color-spruce-base;
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.viewer__header h1,
.viewer__panel h2 {
  margin-bottom: $space-2;
}

.viewer__intro,
.viewer__panel-heading p {
  margin: 0;
  color: $color-text-secondary;
}

.viewer__intro {
  max-width: 46rem;
}

.viewer__imports {
  display: flex;
  align-items: flex-end;
  gap: $space-6;
  margin-bottom: $space-5;
  padding: $space-5;
}

.viewer__import {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: $space-2;
}

.viewer__import label {
  font-weight: $font-weight-semibold;
}

.viewer__import input {
  max-width: 100%;
}

.viewer__filename {
  margin: 0;
  color: $color-text-secondary;
  font-size: $font-size-sm;
}

.viewer__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $space-4;
  margin: $space-5 0;
  color: $color-text-secondary;
}

.viewer__panel {
  margin-bottom: $space-6;
  padding: $space-5;
}

.viewer__panel-heading {
  align-items: center;
  margin-bottom: $space-5;
}

.viewer__graph-scroll {
  overflow: auto;
  border: 1px solid $color-border-light;
  border-radius: $radius-md;
  background: $color-bg-body;
}

.viewer__graph {
  display: block;
}

.viewer__edge {
  fill: none;
  stroke: #758195;
  stroke-width: 2;
}

.viewer__node {
  cursor: pointer;
  outline: none;
}

.viewer__node rect {
  fill: $color-bg-surface;
  stroke: $color-border-light;
  stroke-width: 1.5;
}

.viewer__node:hover rect,
.viewer__node:focus rect {
  stroke: $color-spruce-base;
}

.viewer__node--selected rect {
  fill: #edf5f2;
  stroke: $color-spruce-base;
  stroke-width: 2;
}

.viewer__node--visited rect {
  stroke: $color-spruce-base;
}

.viewer__node-label {
  fill: $color-text-primary;
  font-size: 14px;
  font-weight: 600;
}

.viewer__node-meta {
  fill: $color-text-secondary;
  font-size: 11px;
}

.viewer__search input {
  min-width: 14rem;
}

.viewer__logs-wrap {
  overflow-x: auto;
}

.viewer__logs {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.viewer__logs th,
.viewer__logs td {
  padding: $space-3;
  border-bottom: 1px solid $color-border-light;
  vertical-align: top;
}

.viewer__logs th {
  color: $color-text-secondary;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
}

.viewer__message {
  min-width: 16rem;
  overflow-wrap: anywhere;
}

.viewer__level {
  text-transform: uppercase;
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;
}

.viewer__level--error {
  color: #b42318;
}

.viewer__level--warning {
  color: #9a6700;
}

.viewer__level--info {
  color: $color-spruce-base;
}

.viewer__error {
  padding: $space-4;
  color: #b42318;
  background: #fef3f2;
  border-radius: $radius-md;
}

.viewer__empty {
  margin: $space-4 0 0;
  color: $color-text-secondary;
}

@media (max-width: 767px) {
  .viewer__header,
  .viewer__imports,
  .viewer__panel-heading {
    flex-direction: column;
    align-items: stretch;
  }

  .viewer__clear {
    align-self: flex-start;
  }
}
</style>
