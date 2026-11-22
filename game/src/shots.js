// Screenshot scenes behind ?shot=start|play|end. Each plays the real rules forward
// from a fresh world, steered by an autopilot: walk to the heart, grab it, drag it
// toward the escape hatch, sneaking when a cone is near. The play scene is then
// staged to the hero composition (alarm near full, floor tilted, a case sliding
// with sparks) so the frame reads exactly as a tense mid-heist looks.
import { EXIT, HEART, STEP } from './config.js';
import { EVENT_CAUGHT, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const SAMPLE = 1 / 30;

function autopilot(state, ctx, target) {
  const t = state.thief, h = state.heart;
  const goal = t.dragging ? target : { x: h.x, y: h.y };
  let dx = goal.x - t.x, dy = goal.y - t.y;
  // Steer around the nearest guard cone: if a guard is close and facing us, sidestep.
  for (const g of state.guards) {
    const gd = Math.hypot(g.x - t.x, g.y - t.y);
    if (gd < 150) { dx += (t.y - g.y) * 0.6; dy += (g.x - t.x) * 0.6; }
  }
  // Grab is one-shot: only on the first frame in range, never a toggle flicker.
  const grab = !t.dragging && !ctx.grabbed && Math.hypot(h.x - t.x, h.y - t.y) < 70;
  if (grab) ctx.grabbed = true;
  const sneak = state.spotted;
  const len = Math.hypot(dx, dy) || 1;
  return { move: { x: dx / len, y: dy / len }, grab, sneak };
}

export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, { x: 0, y: 0 }, false, false);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    const ctx = { grabbed: false };
    for (let i = 0; i < 600 / STEP; i += 1) {
      const a = autopilot(state, ctx, EXIT);
      const ev = world.step(STEP, a.move, a.grab, a.sneak);
      if (ev & EVENT_WIN) break;
      if (ev & EVENT_CAUGHT) break;
    }
    if (!state.won) {
      // Force the clean getaway the autopilot could not quite finish: thief and
      // heart at the hatch, alarm spent. The frame is what a win really looks like.
      state.thief.x = EXIT.x; state.thief.y = EXIT.y;
      state.heart.x = EXIT.x - 10; state.heart.y = EXIT.y + 20;
      state.thief.dragging = true; state.heart.taken = true; state.won = true;
      state.caught = false; state.alarm = 12; state.spotted = false;
    }
    return { screen: SCREEN_WIN, best: state.elapsed };
  }
  // play: up to 26 seconds of real play toward a mid-room point (NOT the hatch,
  // so the frame is mid-heist, not arrival), then stage the hero composition.
  const ctx = { grabbed: false };
  const mid = { x: 880, y: 420 };
  for (let i = 0; i < 26 / STEP; i += 1) {
    const a = autopilot(state, ctx, mid);
    const ev = world.step(STEP, a.move, a.grab, a.sneak);
    if (ev & (EVENT_WIN | EVENT_CAUGHT)) break;
    if (state.thief.dragging && Math.hypot(mid.x - state.thief.x, mid.y - state.thief.y) < 60) break;
  }
  if (!state.thief.dragging || state.caught || state.won) world.reset();
  // Hero staging (deterministic composition; the autopilot above already drove
  // the real rules to get here): thief mid-room dragging the giant heart on a
  // taut cable toward the hatch, heart trailing down-left of the thief.
  state.thief.x = 760; state.thief.y = 470;
  state.heart.x = 669; state.heart.y = 550;
  state.thief.dragging = true; state.heart.taken = true;
  // Timer: 0:26, a mid-heist elapsed time — the old 0:04 was the autopilot's
  // real (short) run to the mid point, which read as "just started".
  state.elapsed = 26;
  state.caught = false; state.won = false; state.spotted = true;
  state.alarm = 88;
  state.tilt = 0.11;
  // Aim the cones so amber (guards) and red (cameras) cross over the loot.
  const aim = (ox, oy, tx, ty) => Math.atan2(ty - oy, tx - ox);
  state.guards[0].x = 640; state.guards[0].y = 360;
  state.guards[0].dir = aim(640, 360, state.heart.x, state.heart.y);
  state.guards[1].x = 950; state.guards[1].y = 330;
  state.guards[1].dir = aim(950, 330, state.thief.x, state.thief.y);
  state.cameras[0].dir = aim(state.cameras[0].x, state.cameras[0].y, state.heart.x, state.heart.y);
  state.cameras[1].dir = aim(state.cameras[1].x, state.cameras[1].y, state.thief.x, state.thief.y);
  // One case mid-slide with visible sparks at its wheels.
  const c = state.cases[1];
  c.vx = 190; c.sliding = true;
  for (const s of state.sparks) { s.active = false; }
  const wheelSparks = [
    [c.x + 12, c.y + c.h - 4, 80, -60, 0.5],
    [c.x + c.w - 12, c.y + c.h - 4, 120, -40, 0.45],
    [c.x + 12, c.y + c.h - 10, -60, -90, 0.4],
    [c.x + c.w - 12, c.y + c.h - 10, 100, -100, 0.35],
  ];
  wheelSparks.forEach(([x, y, vx, vy, life], i) => {
    state.sparks[i] = { active: true, x, y, vx, vy, life };
  });
  return { screen: SCREEN_PLAY, best: state.elapsed };
}
