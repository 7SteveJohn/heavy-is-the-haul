// Keyboard + pointer input. Held keys give a 2D move vector; E/Space toggles grab,
// Shift sneaks, P pauses, M mutes. Click-to-move sets a target the loop steers to.
// One-shot presses are queued as flags and taken once by the loop.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_GRAB = 4;
export const ACTION_MUTE = 8;

const KEYS = { up: new Set(['ArrowUp', 'KeyW']), down: new Set(['ArrowDown', 'KeyS']), left: new Set(['ArrowLeft', 'KeyA']), right: new Set(['ArrowRight', 'KeyD']) };
const CONFIRM = new Set(['Enter']);
const GRAB = new Set(['Space', 'KeyE']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(target, toField) {
  const held = { up: false, down: false, left: false, right: false, sneak: false };
  let actions = 0;
  let clickTarget = null;
  window.addEventListener('keydown', (event) => {
    if (KEYS.up.has(event.code)) held.up = true;
    else if (KEYS.down.has(event.code)) held.down = true;
    else if (KEYS.left.has(event.code)) held.left = true;
    else if (KEYS.right.has(event.code)) held.right = true;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') held.sneak = true;
    else if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (GRAB.has(event.code)) { if (!event.repeat) actions |= ACTION_GRAB; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (MUTE.has(event.code)) { if (!event.repeat) actions |= ACTION_MUTE; }
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (KEYS.up.has(event.code)) held.up = false;
    else if (KEYS.down.has(event.code)) held.down = false;
    else if (KEYS.left.has(event.code)) held.left = false;
    else if (KEYS.right.has(event.code)) held.right = false;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') held.sneak = false;
  });
  window.addEventListener('blur', () => { held.up = held.down = held.left = held.right = held.sneak = false; });
  target.addEventListener('pointerdown', (event) => {
    const p = toField(event.clientX, event.clientY);
    if (p) clickTarget = p;
    actions |= ACTION_CONFIRM;
  });
  return {
    move() {
      const x = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      const y = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      if (x !== 0 || y !== 0) { clickTarget = null; return { x, y }; }
      return { x: 0, y: 0 };
    },
    clickTarget() { return clickTarget; },
    clearClickTarget() { clickTarget = null; },
    sneak() { return held.sneak; },
    takeActions() { const t = actions; actions = 0; return t; },
  };
}
