/**
 * Undo / Redo History Stack Manager.
 */
export class HistoryManager {
  constructor(maxDepth = 30) {
    this.maxDepth = maxDepth;
    this.undoStack = [];
    this.redoStack = [];
  }

  push(state) {
    if (!state) return;
    const serialized = typeof state === "string" ? state : JSON.stringify(state);
    // Don't push duplicates
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === serialized) {
      return;
    }
    this.undoStack.push(serialized);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(currentState) {
    if (!this.canUndo) return null;
    if (currentState) {
      const currentSerialized = typeof currentState === "string" ? currentState : JSON.stringify(currentState);
      this.redoStack.push(currentSerialized);
    }
    const previous = this.undoStack.pop();
    try {
      return JSON.parse(previous);
    } catch {
      return previous;
    }
  }

  redo(currentState) {
    if (!this.canRedo) return null;
    if (currentState) {
      const currentSerialized = typeof currentState === "string" ? currentState : JSON.stringify(currentState);
      this.undoStack.push(currentSerialized);
    }
    const next = this.redoStack.pop();
    try {
      return JSON.parse(next);
    } catch {
      return next;
    }
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
