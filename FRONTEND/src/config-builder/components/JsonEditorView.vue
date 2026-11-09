<template>
  <div class="json-editor-view">
    <div class="json-toolbar">
      <div class="json-toolbar__left">
        <span class="json-title">Canonical Workflow JSON</span>
        <span v-if="parseError" class="json-status is-error">
          ⚠️ Syntax Error (line {{ parseErrorLine }})
        </span>
        <span v-else-if="isDirty" class="json-status is-dirty">
          ● Unapplied Changes
        </span>
        <span v-else class="json-status is-synced">
          ✓ In Sync with Canvas
        </span>
      </div>

      <div class="json-toolbar__right">
        <button
          type="button"
          class="btn btn--sm btn--secondary au-button"
          @click="formatJson"
          title="Format and Indent JSON"
        >
          Format JSON
        </button>

        <button
          type="button"
          class="btn btn--sm btn--secondary au-button"
          @click="copyJson"
          title="Copy JSON to Clipboard"
        >
          {{ copied ? "Copied! ✓" : "Copy JSON" }}
        </button>

        <button
          type="button"
          class="btn btn--sm btn--secondary au-button"
          @click="downloadJson"
          title="Export Workflow JSON to File"
        >
          Export JSON
        </button>

        <label class="btn btn--sm btn--secondary au-button file-label" title="Import JSON file">
          Import JSON
          <input type="file" accept=".json,application/json" class="sr-only" @change="onFileImport" />
        </label>

        <button
          type="button"
          class="btn btn--sm btn--primary au-button au-button--primary"
          :disabled="!isDirty || !!parseError"
          @click="applyJsonToCanvas"
        >
          Apply to Canvas
        </button>
      </div>
    </div>

    <!-- Error message banner if syntax error -->
    <div v-if="parseError" class="json-error-banner" role="alert">
      <strong>JSON Parse Error:</strong> {{ parseError }}
    </div>

    <!-- Raw Editor Textarea with line numbers -->
    <div class="editor-wrapper">
      <div class="line-numbers" aria-hidden="true">
        <div v-for="n in lineCount" :key="n" class="line-num" :class="{ 'is-error-line': n === parseErrorLine }">
          {{ n }}
        </div>
      </div>
      <textarea
        ref="textarea"
        v-model="rawText"
        class="json-textarea"
        spellcheck="false"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        @input="onTextInput"
        @keydown.tab.prevent="onTabKey"
      ></textarea>
    </div>
  </div>
</template>

<script>
export default {
  name: "JsonEditorView",
  props: {
    canonicalJson: { type: Object, default: () => ({}) },
  },
  data() {
    return {
      rawText: "",
      isDirty: false,
      parseError: null,
      parseErrorLine: null,
      copied: false,
    };
  },
  computed: {
    lineCount() {
      return (this.rawText.match(/\n/g) || []).length + 1;
    },
  },
  watch: {
    canonicalJson: {
      immediate: true,
      handler(val) {
        if (!this.isDirty) {
          this.rawText = JSON.stringify(val || {}, null, 2);
          this.parseError = null;
          this.parseErrorLine = null;
        }
      },
    },
  },
  methods: {
    onTextInput() {
      this.isDirty = true;
      this.validateSyntax();
    },
    validateSyntax() {
      try {
        JSON.parse(this.rawText);
        this.parseError = null;
        this.parseErrorLine = null;
        return true;
      } catch (err) {
        this.parseError = err.message;
        // Attempt to extract line number from error message
        const lineMatch = err.message.match(/line (\d+)/i) || err.message.match(/position (\d+)/i);
        if (lineMatch) {
          const pos = parseInt(lineMatch[1], 10);
          if (err.message.includes("position")) {
            const before = this.rawText.substring(0, pos);
            this.parseErrorLine = (before.match(/\n/g) || []).length + 1;
          } else {
            this.parseErrorLine = pos;
          }
        } else {
          this.parseErrorLine = null;
        }
        return false;
      }
    },
    formatJson() {
      if (!this.validateSyntax()) return;
      try {
        const obj = JSON.parse(this.rawText);
        this.rawText = JSON.stringify(obj, null, 2);
      } catch {
        // Syntax error already flagged
      }
    },
    applyJsonToCanvas() {
      if (!this.validateSyntax()) return;
      try {
        const parsed = JSON.parse(this.rawText);
        this.$emit("apply-json", parsed);
        this.isDirty = false;
      } catch (e) {
        this.parseError = e.message;
      }
    },
    async copyJson() {
      try {
        await navigator.clipboard.writeText(this.rawText);
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 2000);
      } catch (e) {
        console.error("Clipboard copy failed", e);
      }
    },
    downloadJson() {
      const blob = new Blob([this.rawText], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workflow-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onFileImport(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          JSON.parse(content); // Test valid
          this.rawText = content;
          this.formatJson();
          this.isDirty = true;
          this.applyJsonToCanvas();
        } catch (err) {
          alert("Selected file is not valid JSON:\n" + err.message);
        }
      };
      reader.readAsText(file);
      event.target.value = "";
    },
    onTabKey(e) {
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      this.rawText = this.rawText.substring(0, start) + "  " + this.rawText.substring(end);
      this.$nextTick(() => {
        if (this.$refs.textarea) {
          this.$refs.textarea.selectionStart = this.$refs.textarea.selectionEnd = start + 2;
        }
      });
      this.onTextInput();
    },
  },
};
</script>

<style lang="scss" scoped>
.json-editor-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1e293b;
  color: #f8fafc;
  overflow: hidden;
}

.json-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #0f172a;
  border-bottom: 1px solid #334155;
  gap: 12px;
}

.json-toolbar__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.json-title {
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
}

.json-status {
  font-size: 11px;
  font-weight: 500;

  &.is-synced { color: #22c55e; }
  &.is-dirty { color: #f59e0b; }
  &.is-error { color: #ef4444; }
}

.json-toolbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-label {
  cursor: pointer;
}

.json-error-banner {
  padding: 8px 16px;
  background: #7f1d1d;
  color: #fecaca;
  font-size: 12px;
  border-bottom: 1px solid #991b1b;
}

.editor-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.line-numbers {
  width: 48px;
  padding: 12px 0;
  background: #0f172a;
  border-right: 1px solid #334155;
  user-select: none;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
  text-align: right;
  color: #64748b;
  overflow: hidden;
}

.line-num {
  padding-right: 8px;

  &.is-error-line {
    background: rgba(220, 38, 38, 0.4);
    color: #f87171;
    font-weight: 700;
  }
}

.json-textarea {
  flex: 1;
  padding: 12px 16px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
  background: transparent;
  color: #f8fafc;
  border: none;
  outline: none;
  resize: none;
  white-space: pre;
  overflow: auto;
  tab-size: 2;
}
</style>
