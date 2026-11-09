<template>
  <div class="edge-inspector">
    <div class="inspector__header">
      <div class="inspector__title-wrap">
        <span class="inspector__type-badge">EDGE</span>
        <h2>Rule Engine Builder</h2>
      </div>
      <button
        type="button"
        class="inspector__close-btn"
        title="Close Inspector"
        @click="$emit('close')"
      >
        ✕
      </button>
    </div>

    <div class="inspector__body">
      <!-- ── TRANSITION OVERVIEW ────────────────────────────────── -->
      <section class="inspector__section">
        <h3 class="section-title">Transition Information</h3>

        <div class="form-group">
          <label>Transition Key</label>
          <input
            :value="edge.edgeKey"
            type="text"
            class="form-input"
            placeholder="ED01 or APPROVED"
            @input="updateEdgeKey($event.target.value)"
          />
        </div>

        <div class="transition-summary">
          <div class="summary-node">
            <span class="node-label">FROM</span>
            <code class="node-code">{{ edge.fromState }}</code>
          </div>
          <div class="summary-arrow">↓</div>
          <div class="summary-node">
            <span class="node-label">TO</span>
            <select
              :value="edge.toState"
              class="form-select"
              @change="updateToState($event.target.value)"
            >
              <option v-for="target in availableTargets" :key="target.id" :value="target.id">
                {{ target.id }}
              </option>
            </select>
          </div>
        </div>
      </section>

      <!-- ── RULE ENGINE CONFIGURATION ───────────────────────────── -->
      <section class="inspector__section">
        <div class="inspector__subhead">
          <h3 class="section-title">
            <span>Rule Engine Conditions</span>
            <span v-if="conditions.length === 0" class="badge-default">Default / Fallback</span>
          </h3>
          <button
            type="button"
            class="btn btn--sm btn--primary au-button au-button--primary"
            @click="addCondition"
          >
            + Add Condition
          </button>
        </div>

        <!-- Logic Operator: AND / OR -->
        <div v-if="conditions.length > 1" class="form-group">
          <label>Logical Combinator</label>
          <div class="operator-toggle">
            <button
              type="button"
              class="op-btn"
              :class="{ 'is-active': operator === 'AND' }"
              @click="setOperator('AND')"
            >
              AND (All must match)
            </button>
            <button
              type="button"
              class="op-btn"
              :class="{ 'is-active': operator === 'OR' }"
              @click="setOperator('OR')"
            >
              OR (Any match)
            </button>
          </div>
        </div>

        <!-- Conditions List -->
        <div v-if="conditions.length" class="conditions-list">
          <div
            v-for="(cond, index) in conditions"
            :key="index"
            class="condition-row au-card"
          >
            <div class="condition-row__head">
              <span class="condition-num">#{{ index + 1 }}</span>
              <button
                type="button"
                class="remove-cond-btn"
                title="Remove condition"
                @click="removeCondition(index)"
              >
                ✕
              </button>
            </div>

            <!-- Field Path Input -->
            <div class="form-group">
              <label>Field Path</label>
              <input
                :value="cond.field"
                type="text"
                placeholder="creditScore or PERSONALDETAILS.isMinor"
                class="form-input"
                @input="updateConditionField(index, $event.target.value)"
              />
            </div>

            <!-- Operator Dropdown -->
            <div class="form-group">
              <label>Comparison Operator</label>
              <select
                :value="cond.operator || '='"
                class="form-select"
                @change="updateConditionOperator(index, $event.target.value)"
              >
                <option v-for="op in conditionOperators" :key="op.value" :value="op.value">
                  {{ op.label }}
                </option>
              </select>
            </div>

            <!-- Expected Value & Value Type -->
            <div class="form-group">
              <div class="value-head">
                <label>Expected Value</label>
                <select
                  :value="detectValueType(cond.value)"
                  class="type-select"
                  @change="changeConditionValueType(index, $event.target.value)"
                >
                  <option value="string">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              <!-- Boolean Value Selector -->
              <select
                v-if="detectValueType(cond.value) === 'boolean'"
                :value="String(cond.value)"
                class="form-select"
                @change="updateConditionValue(index, $event.target.value === 'true')"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>

              <!-- Number or Text Value Input -->
              <input
                v-else
                :value="formatValueForInput(cond.value)"
                :type="detectValueType(cond.value) === 'number' ? 'number' : 'text'"
                class="form-input"
                placeholder="Value"
                @input="onInputValue(index, $event.target.value, detectValueType(cond.value))"
              />
            </div>
          </div>
        </div>

        <div v-else class="empty-conditions-note">
          <p>
            No conditions configured. This transition acts as an <strong>unconditional or default fallback transition</strong>.
          </p>
          <button
            type="button"
            class="btn btn--sm btn--secondary au-button"
            @click="addCondition"
          >
            + Add First Condition Rule
          </button>
        </div>
      </section>

      <!-- ── ACTIONS ────────────────────────────────────────────── -->
      <section class="inspector__section">
        <button
          type="button"
          class="btn btn--danger au-button full-width"
          @click="$emit('delete-edge', edge.id)"
        >
          Delete Transition
        </button>
      </section>
    </div>
  </div>
</template>

<script>
import { CONDITION_OPERATORS } from "../types/ruleEngine";

export default {
  name: "EdgeInspector",
  props: {
    edge: { type: Object, required: true },
    allNodes: { type: Array, default: () => [] },
  },
  data() {
    return {
      conditionOperators: CONDITION_OPERATORS,
    };
  },
  computed: {
    ruleEngine() {
      return this.edge.ruleEngine || { operator: "AND", conditions: [] };
    },
    operator() {
      return this.ruleEngine.operator || this.ruleEngine.type || "AND";
    },
    conditions() {
      return Array.isArray(this.ruleEngine.conditions) ? this.ruleEngine.conditions : [];
    },
    availableTargets() {
      return this.allNodes;
    },
  },
  methods: {
    updateEdgeKey(key) {
      this.$emit("update-edge", {
        id: this.edge.id,
        edgeKey: String(key || "").trim().toUpperCase(),
      });
    },
    updateToState(targetId) {
      this.$emit("update-edge", {
        id: this.edge.id,
        toState: targetId,
      });
    },
    setOperator(op) {
      const newRuleEngine = {
        ...this.ruleEngine,
        operator: op,
        conditions: [...this.conditions],
      };
      this.$emit("update-edge", {
        id: this.edge.id,
        ruleEngine: newRuleEngine,
      });
    },
    addCondition() {
      const newConditions = [
        ...this.conditions,
        { field: "status", operator: "=", value: "APPROVED" },
      ];
      this.$emit("update-edge", {
        id: this.edge.id,
        ruleEngine: {
          ...this.ruleEngine,
          operator: this.operator,
          conditions: newConditions,
        },
      });
    },
    removeCondition(index) {
      const newConditions = this.conditions.filter((_, i) => i !== index);
      this.$emit("update-edge", {
        id: this.edge.id,
        ruleEngine: {
          ...this.ruleEngine,
          operator: this.operator,
          conditions: newConditions,
        },
      });
    },
    updateConditionField(index, field) {
      const updated = this.conditions.map((c, i) => (i === index ? { ...c, field } : c));
      this.$emit("update-edge", {
        id: this.edge.id,
        ruleEngine: { ...this.ruleEngine, conditions: updated },
      });
    },
    updateConditionOperator(index, operator) {
      const updated = this.conditions.map((c, i) => (i === index ? { ...c, operator } : c));
      this.$emit("update-edge", {
        id: this.edge.id,
        ruleEngine: { ...this.ruleEngine, conditions: updated },
      });
    },
    updateConditionValue(index, value) {
      const updated = this.conditions.map((c, i) => (i === index ? { ...c, value } : c));
      this.$emit("update-edge", {
        id: this.edge.id,
        ruleEngine: { ...this.ruleEngine, conditions: updated },
      });
    },
    detectValueType(val) {
      if (typeof val === "boolean") return "boolean";
      if (typeof val === "number") return "number";
      if (Array.isArray(val) || (typeof val === "object" && val !== null)) return "json";
      return "string";
    },
    formatValueForInput(val) {
      if (typeof val === "object" && val !== null) return JSON.stringify(val);
      return val !== undefined && val !== null ? String(val) : "";
    },
    changeConditionValueType(index, type) {
      let defaultValue = "";
      if (type === "boolean") defaultValue = true;
      else if (type === "number") defaultValue = 0;
      else if (type === "json") defaultValue = [];
      this.updateConditionValue(index, defaultValue);
    },
    onInputValue(index, rawVal, type) {
      let finalVal = rawVal;
      if (type === "number") {
        finalVal = Number(rawVal);
      } else if (type === "json") {
        try {
          finalVal = JSON.parse(rawVal);
        } catch {
          finalVal = rawVal;
        }
      }
      this.updateConditionValue(index, finalVal);
    },
  },
};
</script>

<style lang="scss" scoped>
.edge-inspector {
  width: 340px;
  background: $color-bg-surface;
  border-left: 1px solid $color-border-light;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  flex-shrink: 0;
}

.inspector__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid $color-border-light;
  background: $color-bg-body;
}

.inspector__title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;

  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
  }
}

.inspector__type-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: $color-spruce-base;
  color: #fff;
}

.inspector__close-btn {
  background: transparent;
  border: none;
  font-size: 14px;
  color: $color-text-muted;
  cursor: pointer;

  &:hover {
    color: $color-text-primary;
  }
}

.inspector__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.inspector__section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid $color-border-light;
}

.section-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.badge-default {
  font-size: 9px;
  font-weight: 600;
  background: #f1f5f9;
  color: #475569;
  padding: 2px 6px;
  border-radius: 4px;
}

.transition-summary {
  background: #f8fafc;
  border: 1px solid $color-border-light;
  border-radius: 6px;
  padding: 10px;
  margin-top: 8px;
}

.summary-node {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.node-label {
  font-size: 9px;
  font-weight: 700;
  color: $color-text-muted;
}

.node-code {
  font-family: monospace;
  font-size: 11px;
  font-weight: 600;
  color: $color-text-primary;
  word-break: break-all;
}

.summary-arrow {
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: $color-spruce-base;
  margin: 4px 0;
}

.inspector__subhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.operator-toggle {
  display: flex;
  gap: 4px;
  background: $color-bg-body;
  padding: 3px;
  border-radius: 6px;
  border: 1px solid $color-border-light;
}

.op-btn {
  flex: 1;
  padding: 5px;
  font-size: 11px;
  font-weight: 600;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: $color-text-secondary;

  &.is-active {
    background: $color-bg-surface;
    color: $color-spruce-base;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }
}

.conditions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.condition-row {
  padding: 10px;
  border: 1px solid $color-border-light;
  border-radius: 6px;
  background: #f8fafc;
}

.condition-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.condition-num {
  font-size: 11px;
  font-weight: 700;
  color: $color-text-secondary;
}

.remove-cond-btn {
  background: transparent;
  border: none;
  color: #dc2626;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    color: #991b1b;
  }
}

.value-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.type-select {
  font-size: 10px;
  padding: 2px 4px;
  border: 1px solid $color-border-light;
  border-radius: 4px;
  background: #fff;
}

.form-group {
  margin-bottom: 8px;

  label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 3px;
    color: $color-text-secondary;
  }
}

.form-input,
.form-select {
  width: 100%;
  padding: 5px 8px;
  font-size: 11px;
  border: 1px solid $color-border-light;
  border-radius: 4px;
  box-sizing: border-box;
}

.empty-conditions-note {
  padding: 14px;
  background: #f8fafc;
  border: 1px dashed $color-border-light;
  border-radius: 6px;
  text-align: center;

  p {
    margin: 0 0 10px;
    font-size: 11px;
    color: $color-text-muted;
    line-height: 1.4;
  }
}

.full-width { width: 100%; }

.btn--danger {
  background: #dc2626;
  color: #fff;
  border: 1px solid #b91c1c;

  &:hover {
    background: #b91c1c;
  }
}
</style>
