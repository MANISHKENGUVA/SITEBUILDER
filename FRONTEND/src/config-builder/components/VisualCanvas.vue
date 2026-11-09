<template>
  <div
    ref="container"
    class="visual-canvas-container"
    tabindex="0"
    @wheel.prevent="onWheel"
    @mousedown="onMouseDownBackground"
    @dragover.prevent="onDragOver"
    @drop.prevent="onDrop"
    @keydown.delete="onDeleteKey"
  >
    <svg
      ref="svg"
      class="canvas-svg"
      :width="canvasWidth"
      :height="canvasHeight"
    >
      <defs>
        <!-- Grid pattern -->
        <pattern id="canvas-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="15" cy="15" r="1" fill="#cbd5e1" opacity="0.8" />
        </pattern>

        <!-- Arrowhead Marker (Normal) -->
        <marker
          id="edge-arrow"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,1 L10,5 L0,9 z" fill="#64748b" />
        </marker>

        <!-- Arrowhead Marker (Selected / Highlighted) -->
        <marker
          id="edge-arrow-active"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,1 L10,5 L0,9 z" fill="#034953" />
        </marker>
      </defs>

      <!-- Background Grid -->
      <rect width="100%" height="100%" fill="url(#canvas-grid)" />

      <!-- Main Transformed Canvas Layer -->
      <g :transform="`translate(${panX}, ${panY}) scale(${zoom})`">
        <!-- ── EDGES LAYER ──────────────────────────────────────── -->
        <g class="edges-layer">
          <g
            v-for="edge in edgeList"
            :key="edge.id"
            class="canvas-edge-group"
            :class="{
              'is-selected': selectedEdgeId === edge.id,
              'is-highlighted': isEdgeHighlighted(edge),
            }"
            @click.stop="selectEdge(edge.id)"
          >
            <!-- Edge Path Hit Area -->
            <path
              :d="computeBezierPath(edge)"
              class="edge-path-hitarea"
            />

            <!-- Edge Visual Path -->
            <path
              :d="computeBezierPath(edge)"
              class="edge-path"
              :marker-end="selectedEdgeId === edge.id || isEdgeHighlighted(edge) ? 'url(#edge-arrow-active)' : 'url(#edge-arrow)'"
            />

            <!-- Edge Condition Badge / Label -->
            <g
              v-if="edgeLabel(edge)"
              :transform="`translate(${computeEdgeMidpoint(edge).x}, ${computeEdgeMidpoint(edge).y})`"
              class="edge-label-group"
            >
              <rect
                :x="-edgeLabel(edge).length * 3.6 - 8"
                y="-10"
                :width="edgeLabel(edge).length * 7.2 + 16"
                height="20"
                rx="10"
                class="edge-label-bg"
              />
              <text class="edge-label-text" y="3" text-anchor="middle">
                {{ edgeLabel(edge) }}
              </text>
            </g>
          </g>

          <!-- Temporary in-progress edge while dragging from port -->
          <path
            v-if="connectingEdge"
            :d="computeConnectingPath"
            class="edge-path is-connecting"
            marker-end="url(#edge-arrow-active)"
          />
        </g>

        <!-- ── NODES LAYER ──────────────────────────────────────── -->
        <g class="nodes-layer">
          <g
            v-for="node in nodes"
            :key="node.id"
            class="canvas-node-group"
            :class="{
              'is-selected': selectedNodeId === node.id,
              'is-highlighted': isNodeHighlighted(node.id),
              'has-error': hasErrors(node.id),
              'is-start': node.id === startState,
            }"
            :transform="`translate(${node.x}, ${node.y})`"
            @mousedown.stop="onMouseDownNode($event, node)"
            @click.stop="selectNode(node.id)"
          >
            <!-- Node Card Body -->
            <rect
              class="node-card-bg"
              width="240"
              height="110"
              rx="8"
            />

            <!-- Type Color Accent Bar -->
            <rect
              class="node-accent-bar"
              :fill="getNodeTypeColor(node.type)"
              width="240"
              height="5"
              rx="2"
            />

            <!-- Start State Star / Pill -->
            <g v-if="node.id === startState" transform="translate(14, 20)">
              <rect width="64" height="18" rx="9" fill="#fef3c7" stroke="#f59e0b" stroke-width="1" />
              <text x="32" y="12" text-anchor="middle" font-size="9" font-weight="700" fill="#b45309">
                ★ START
              </text>
            </g>

            <!-- Node Type Pill -->
            <text
              :x="node.id === startState ? 86 : 14"
              y="32"
              class="node-type-label"
              :fill="getNodeTypeColor(node.type)"
            >
              {{ node.type }}
            </text>

            <!-- Error Badge Pill -->
            <g v-if="hasErrors(node.id)" transform="translate(196, 14)">
              <rect width="32" height="18" rx="9" fill="#fee2e2" stroke="#dc2626" stroke-width="1" />
              <text x="16" y="12" text-anchor="middle" font-size="10" font-weight="700" fill="#dc2626">
                {{ getErrorCount(node.id) }} ⚠️
              </text>
            </g>

            <!-- Node Name (Authority: metadata.node) -->
            <text x="14" y="56" class="node-name-text">
              {{ truncate(node.metadata?.node || node.id, 24) }}
            </text>

            <!-- Full Node State ID -->
            <text x="14" y="74" class="node-id-text">
              {{ truncate(node.id, 32) }}
            </text>

            <!-- Metadata Badges: Actor & Module Version -->
            <g transform="translate(14, 82)">
              <!-- Actor Chip -->
              <rect
                width="72"
                height="16"
                rx="4"
                fill="#e2e8f0"
              />
              <text x="36" y="11" text-anchor="middle" font-size="9" font-weight="600" fill="#334155">
                {{ truncate(node.metadata?.actor || "ACTOR", 10) }}
              </text>

              <!-- Module Chip -->
              <g transform="translate(76, 0)">
                <rect
                  width="70"
                  height="16"
                  rx="4"
                  fill="#f1f5f9"
                />
                <text x="35" y="11" text-anchor="middle" font-size="9" font-weight="500" fill="#475569">
                  {{ truncate(node.metadata?.module || "MOD", 10) }}
                </text>
              </g>

              <!-- Version Tag -->
              <g transform="translate(150, 0)">
                <rect
                  width="44"
                  height="16"
                  rx="4"
                  fill="#ecfdf5"
                />
                <text x="22" y="11" text-anchor="middle" font-size="9" font-weight="600" fill="#047857">
                  {{ node.metadata?.nodeVersion || "V1" }}
                </text>
              </g>
            </g>

            <!-- Input Port (Left Handle) -->
            <circle
              class="node-port input-port"
              cx="0"
              cy="55"
              r="7"
              title="Input Connection"
              @mouseup.stop="onMouseUpInputPort(node.id)"
            />

            <!-- Output Port (Right Handle) -->
            <circle
              class="node-port output-port"
              cx="240"
              cy="55"
              r="7"
              title="Drag or click to connect next step"
              @mousedown.stop="onMouseDownOutputPort($event, node.id)"
            />
          </g>
        </g>
      </g>
    </svg>

    <!-- Canvas Floating Helper Controls -->
    <div class="canvas-floating-controls">
      <button
        type="button"
        class="floating-btn"
        title="Fit all nodes in view"
        @click="fitView"
      >
        Fit View
      </button>
      <button
        type="button"
        class="floating-btn"
        title="Reset zoom and center"
        @click="resetView"
      >
        Center
      </button>
    </div>

    <!-- Canvas instructions overlay if empty -->
    <div v-if="!nodes.length" class="canvas-empty-state">
      <div class="empty-box au-card">
        <h3>Visual Workflow Canvas is Empty</h3>
        <p>Drag node types from the left palette onto this canvas, or load a pre-built template.</p>
        <div class="empty-actions">
          <button
            type="button"
            class="btn btn--primary au-button au-button--primary"
            @click="$emit('add-node', 'ACTOR')"
          >
            + Add First Actor Step
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { NODE_TYPE_INFO } from "../types/nodeTypes";

export default {
  name: "VisualCanvas",
  props: {
    nodes: { type: Array, default: () => [] },
    edges: { type: Array, default: () => [] },
    selectedNodeId: { type: String, default: null },
    selectedEdgeId: { type: String, default: null },
    startState: { type: String, default: "" },
    validationErrors: { type: Array, default: () => [] },
    zoom: { type: Number, default: 1 },
  },
  data() {
    return {
      canvasWidth: 2400,
      canvasHeight: 1600,
      panX: 40,
      panY: 40,
      isPanning: false,
      startPanX: 0,
      startPanY: 0,
      // Node drag
      draggingNode: null,
      dragOffsetX: 0,
      dragOffsetY: 0,
      // Edge creation
      connectingEdge: null, // { fromState, mouseX, mouseY }
    };
  },
  computed: {
    edgeList() {
      return this.edges;
    },
    computeConnectingPath() {
      if (!this.connectingEdge) return "";
      const sourceNode = this.nodes.find((n) => n.id === this.connectingEdge.fromState);
      if (!sourceNode) return "";
      const startX = sourceNode.x + 240;
      const startY = sourceNode.y + 55;
      const endX = (this.connectingEdge.mouseX - this.panX) / this.zoom;
      const endY = (this.connectingEdge.mouseY - this.panY) / this.zoom;

      const dx = Math.abs(endX - startX) * 0.5;
      return `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;
    },
  },
  mounted() {
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
  },
  beforeDestroy() {
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
  },
  methods: {
    getNodeTypeColor(type) {
      return NODE_TYPE_INFO[type]?.color || "#034953";
    },
    truncate(str, max = 25) {
      if (!str) return "";
      return str.length > max ? str.substring(0, max) + "…" : str;
    },
    hasErrors(nodeId) {
      return this.validationErrors.some((e) => e.nodeKey === nodeId);
    },
    getErrorCount(nodeId) {
      return this.validationErrors.filter((e) => e.nodeKey === nodeId).length;
    },
    // Connected Path Highlighting
    isNodeHighlighted(nodeId) {
      if (!this.selectedNodeId) return false;
      if (this.selectedNodeId === nodeId) return true;
      // Is direct parent or child
      const isParent = this.edges.some((e) => e.fromState === nodeId && e.toState === this.selectedNodeId);
      const isChild = this.edges.some((e) => e.fromState === this.selectedNodeId && e.toState === nodeId);
      return isParent || isChild;
    },
    isEdgeHighlighted(edge) {
      if (!this.selectedNodeId) return false;
      return edge.fromState === this.selectedNodeId || edge.toState === this.selectedNodeId;
    },
    // Bezier curve calculations
    computeBezierPath(edge) {
      const fromNode = this.nodes.find((n) => n.id === edge.fromState);
      const toNode = this.nodes.find((n) => n.id === edge.toState);
      if (!fromNode || !toNode) return "";

      const startX = fromNode.x + 240;
      const startY = fromNode.y + 55;
      const endX = toNode.x;
      const endY = toNode.y + 55;

      const deltaX = Math.max(Math.abs(endX - startX) * 0.5, 50);
      return `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;
    },
    computeEdgeMidpoint(edge) {
      const fromNode = this.nodes.find((n) => n.id === edge.fromState);
      const toNode = this.nodes.find((n) => n.id === edge.toState);
      if (!fromNode || !toNode) return { x: 0, y: 0 };
      const startX = fromNode.x + 240;
      const startY = fromNode.y + 55;
      const endX = toNode.x;
      const endY = toNode.y + 55;
      return {
        x: (startX + endX) / 2,
        y: (startY + endY) / 2 - 12,
      };
    },
    edgeLabel(edge) {
      const re = edge.ruleEngine;
      if (!re) return edge.edgeKey || "";
      const condCount = re.conditions?.length || 0;
      if (condCount === 0) return edge.edgeKey || "DEFAULT";
      if (condCount === 1) {
        const c = re.conditions[0];
        return `${c.field || "field"} ${c.operator || "="} ${c.value !== undefined ? c.value : ""}`;
      }
      return `${edge.edgeKey || "RULE"} [${re.operator || "AND"}: ${condCount} cond]`;
    },
    selectNode(nodeId) {
      this.$emit("select-node", nodeId);
    },
    selectEdge(edgeId) {
      this.$emit("select-edge", edgeId);
    },
    onWheel(event) {
      const delta = event.deltaY < 0 ? 0.08 : -0.08;
      const newZoom = Math.min(Math.max(this.zoom + delta, 0.3), 2.2);
      this.$emit("change-zoom", newZoom);
    },
    onMouseDownBackground(event) {
      if (event.button === 0) {
        this.isPanning = true;
        this.startPanX = event.clientX - this.panX;
        this.startPanY = event.clientY - this.panY;
        this.$emit("deselect-all");
      }
    },
    onMouseDownNode(event, node) {
      if (event.button !== 0) return;
      this.draggingNode = node;
      this.dragOffsetX = event.clientX - node.x * this.zoom;
      this.dragOffsetY = event.clientY - node.y * this.zoom;
      this.selectNode(node.id);
    },
    onMouseDownOutputPort(event, nodeId) {
      event.stopPropagation();
      this.connectingEdge = {
        fromState: nodeId,
        mouseX: event.clientX,
        mouseY: event.clientY,
      };
    },
    onMouseUpInputPort(targetNodeId) {
      if (this.connectingEdge && this.connectingEdge.fromState) {
        if (this.connectingEdge.fromState !== targetNodeId) {
          this.$emit("create-edge", {
            fromState: this.connectingEdge.fromState,
            toState: targetNodeId,
          });
        }
      }
      this.connectingEdge = null;
    },
    onMouseMove(event) {
      if (this.isPanning) {
        this.panX = event.clientX - this.startPanX;
        this.panY = event.clientY - this.startPanY;
      } else if (this.draggingNode) {
        const newX = Math.round((event.clientX - this.dragOffsetX) / this.zoom);
        const newY = Math.round((event.clientY - this.dragOffsetY) / this.zoom);
        this.$emit("move-node", {
          id: this.draggingNode.id,
          x: Math.max(newX, 10),
          y: Math.max(newY, 10),
        });
      } else if (this.connectingEdge) {
        this.connectingEdge.mouseX = event.clientX;
        this.connectingEdge.mouseY = event.clientY;
      }
    },
    onMouseUp() {
      this.isPanning = false;
      this.draggingNode = null;
      this.connectingEdge = null;
    },
    onDragOver(event) {
      event.dataTransfer.dropEffect = "copy";
    },
    onDrop(event) {
      const raw = event.dataTransfer.getData("application/json");
      if (!raw) return;
      try {
        const { type } = JSON.parse(raw);
        if (type) {
          const rect = this.$refs.container.getBoundingClientRect();
          const dropX = Math.round((event.clientX - rect.left - this.panX) / this.zoom);
          const dropY = Math.round((event.clientY - rect.top - this.panY) / this.zoom);
          this.$emit("add-node-at", { type, x: dropX, y: dropY });
        }
      } catch (e) {
        console.error("Drop parse error", e);
      }
    },
    onDeleteKey() {
      if (this.selectedNodeId) {
        this.$emit("delete-node", this.selectedNodeId);
      } else if (this.selectedEdgeId) {
        this.$emit("delete-edge", this.selectedEdgeId);
      }
    },
    fitView() {
      if (!this.nodes.length) return;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      this.nodes.forEach((n) => {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + 240);
        maxY = Math.max(maxY, n.y + 110);
      });

      const padding = 80;
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;
      const rect = this.$refs.container.getBoundingClientRect();

      const scaleX = rect.width / width;
      const scaleY = rect.height / height;
      const fitZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.2);

      this.panX = Math.round(rect.width / 2 - ((minX + maxX) / 2) * fitZoom);
      this.panY = Math.round(rect.height / 2 - ((minY + maxY) / 2) * fitZoom);
      this.$emit("change-zoom", fitZoom);
    },
    resetView() {
      this.panX = 60;
      this.panY = 60;
      this.$emit("change-zoom", 1);
    },
  },
};
</script>

<style lang="scss" scoped>
.visual-canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #f8fafc;
  outline: none;
  user-select: none;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.canvas-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* ── Node Group Styles ────────────────────────────────────────── */
.canvas-node-group {
  cursor: pointer;
  transition: filter 0.15s ease;

  .node-card-bg {
    fill: #ffffff;
    stroke: #cbd5e1;
    stroke-width: 1.5;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.05));
    transition: stroke 0.15s ease, stroke-width 0.15s ease, filter 0.15s ease;
  }

  &:hover .node-card-bg {
    stroke: #94a3b8;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
  }

  &.is-selected .node-card-bg {
    stroke: $color-spruce-base;
    stroke-width: 2.5;
    filter: drop-shadow(0 0 10px rgba(3, 73, 83, 0.25));
  }

  &.is-highlighted:not(.is-selected) .node-card-bg {
    stroke: #38bdf8;
    stroke-width: 2;
  }

  &.has-error .node-card-bg {
    stroke: #dc2626 !important;
  }

  &.is-start .node-card-bg {
    stroke: #f59e0b;
  }
}

.node-type-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.node-name-text {
  font-size: 13px;
  font-weight: 700;
  fill: #0f172a;
}

.node-id-text {
  font-size: 10px;
  font-family: monospace;
  fill: #64748b;
}

/* ── Ports ────────────────────────────────────────────────────── */
.node-port {
  fill: #ffffff;
  stroke: #64748b;
  stroke-width: 2.5;
  cursor: crosshair;
  transition: r 0.15s ease, fill 0.15s ease, stroke 0.15s ease;

  &:hover {
    r: 9;
    fill: $color-spruce-base;
    stroke: #ffffff;
  }

  &.output-port:hover {
    fill: #0284c7;
  }
}

/* ── Edges ────────────────────────────────────────────────────── */
.canvas-edge-group {
  cursor: pointer;

  .edge-path-hitarea {
    fill: none;
    stroke: transparent;
    stroke-width: 20;
  }

  .edge-path {
    fill: none;
    stroke: #94a3b8;
    stroke-width: 2;
    transition: stroke 0.15s ease, stroke-width 0.15s ease;
  }

  &:hover .edge-path {
    stroke: #475569;
    stroke-width: 3;
  }

  &.is-selected .edge-path {
    stroke: $color-spruce-base;
    stroke-width: 3.5;
  }

  &.is-highlighted:not(.is-selected) .edge-path {
    stroke: #0284c7;
    stroke-width: 2.5;
  }
}

.edge-path.is-connecting {
  stroke: #0284c7;
  stroke-width: 2.5;
  stroke-dasharray: 4 4;
}

.edge-label-bg {
  fill: #ffffff;
  stroke: #cbd5e1;
  stroke-width: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.08));
}

.edge-label-text {
  font-size: 9px;
  font-weight: 600;
  fill: #334155;
  font-family: monospace;
}

/* ── Floating Controls ────────────────────────────────────────── */
.canvas-floating-controls {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  gap: 6px;
  background: rgba(255, 255, 255, 0.95);
  padding: 4px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid $color-border-light;
  z-index: 10;
}

.floating-btn {
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  color: $color-text-secondary;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    color: $color-text-primary;
    background: #f1f5f9;
  }
}

.canvas-empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.empty-box {
  pointer-events: auto;
  max-width: 440px;
  text-align: center;
  padding: 32px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);

  h3 {
    margin: 0 0 8px;
    font-size: 18px;
  }
  p {
    margin: 0 0 18px;
    font-size: 13px;
    color: $color-text-secondary;
  }
}
</style>
