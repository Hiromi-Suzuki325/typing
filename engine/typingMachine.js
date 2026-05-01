function stateKey(i, prefix) {
  return `${i}:${prefix}`;
}

function addState(states, i, prefix) {
  states.set(stateKey(i, prefix), { i, prefix });
}

function updateCommittedIndex(activeStates) {
  const allIndexes = [];

  for (const state of activeStates.values()) {
    allIndexes.push(state.i);
  }

  return Math.min(...allIndexes);
}

export class TypingMachine {
  constructor(lattice) {
    this.lattice = lattice;
    this.reset();
  }

  reset() {
    this.activeStates = new Map();
    addState(this.activeStates, 0, "");
    this.committedIndex = 0;
  }

  step(char) {
    const input = String(char ?? "").toLowerCase();
    if (input.length !== 1) {
      return false;
    }

    const nextStates = new Map();

    for (const { i, prefix } of this.activeStates.values()) {
      if (i >= this.lattice.length) continue;

      const newPrefix = prefix + input;
      for (const option of this.lattice[i].options) {
        if (option === newPrefix) {
          addState(nextStates, i + 1, "");
        } else if (option.startsWith(newPrefix)) {
          addState(nextStates, i, newPrefix);
        }
      }
    }

    if (nextStates.size === 0) {
      return false;
    }

    this.activeStates = nextStates;
    this.committedIndex = updateCommittedIndex(this.activeStates);
    return true;
  }

  isComplete() {
    return this.activeStates.has(stateKey(this.lattice.length, ""));
  }

  getNextChars() {
    const chars = new Set();

    for (const { i, prefix } of this.activeStates.values()) {
      if (i >= this.lattice.length) continue;

      for (const option of this.lattice[i].options) {
        if (option.startsWith(prefix) && option.length > prefix.length) {
          chars.add(option[prefix.length]);
        }
      }
    }

    return chars;
  }

  getProgress() {
    return {
      moraDone: this.committedIndex,
      moraTotal: this.lattice.length,
    };
  }

  getDisplayCursor() {
    if (this.committedIndex >= this.lattice.length) {
      return { tokenIndex: Infinity, status: "complete" };
    }

    const tokenIndex = this.lattice[this.committedIndex]?.displayRange?.tokenIndex ?? 0;
    return { tokenIndex, status: "current" };
  }
}

export function acceptsString(lattice, input) {
  const machine = new TypingMachine(lattice);
  const chars = String(input ?? "").toLowerCase();

  for (let index = 0; index < chars.length; index += 1) {
    if (!machine.step(chars[index])) {
      return { ok: false, complete: false, failedAt: index };
    }
  }

  return { ok: true, complete: machine.isComplete() };
}
