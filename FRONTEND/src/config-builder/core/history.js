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
    if (this.undoStack.length === 0) return null;
    const currentSerialized = currentState
      ? (typeof currentState === "string" ? currentState : JSON.stringify(currentState))
      : null;

    if (currentSerialized && this.undoStack[this.undoStack.length - 1] === currentSerialized) {
      const top = this.undoStack.pop();
      this.redoStack.push(top);
    } else if (currentSerialized) {
      this.redoStack.push(currentSerialized);
    }

    if (this.undoStack.length === 0) return null;
    const previous = this.undoStack.pop();
    try {
      return JSON.parse(previous);
    } catch {
      return previous;
    }
  }

  redo(currentState) {
    if (this.redoStack.length === 0) return null;
    const nextSerialized = this.redoStack.pop();
    if (currentState) {
      const currentSerialized = typeof currentState === "string" ? currentState : JSON.stringify(currentState);
      this.undoStack.push(currentSerialized);
    }
    try {
      return JSON.parse(nextSerialized);
    } catch {
      return nextSerialized;
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
