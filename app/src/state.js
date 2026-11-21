// Cover state + undo history. The state is plain JSON: panel photos are kept
// as keys ('pier', 'boulevard', ...) or 'upload:<n>' for user files, so a
// snapshot can be cloned, stored and restored without touching the DOM.

import { freshState, LAYOUTS } from './engine.js';

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function panelsForLayout(layout, previous) {
  const wanted = LAYOUTS[layout].panels;
  const pool = ['pier', 'boulevard', 'neon', 'palms'];
  const out = [];
  for (let i = 0; i < wanted; i++) {
    const old = previous && previous[i];
    if (old) {
      out.push({ ...old });
    } else {
      out.push({ src: pool[i % pool.length], scale: 1.0, ox: 0, oy: 0 });
    }
  }
  return out;
}

export function createHistory(initial) {
  return {
    current: cloneState(initial || freshState()),
    past: [],
    future: [],
    commit(next) {
      this.past.push(cloneState(this.current));
      if (this.past.length > 60) this.past.shift();
      this.future = [];
      this.current = cloneState(next);
    },
    // Snapshot the state before a live gesture (drag, typing, slider) so
    // undo can return to the pre-gesture state. Call once per gesture.
    checkpoint() {
      this.past.push(cloneState(this.current));
      if (this.past.length > 60) this.past.shift();
      this.future = [];
    },
    // In-place tweaks while dragging: no history entry until the drag ends.
    poke(mutator) {
      mutator(this.current);
    },
    undo() {
      if (!this.past.length) return false;
      this.future.push(cloneState(this.current));
      this.current = this.past.pop();
      return true;
    },
    redo() {
      if (!this.future.length) return false;
      this.past.push(cloneState(this.current));
      this.current = this.future.pop();
      return true;
    },
    canUndo() { return this.past.length > 0; },
    canRedo() { return this.future.length > 0; },
  };
}
