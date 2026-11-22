// Rules only: no drawing, no browser. The thief, the giant golden heart on a cable,
// the tilting floor, sliding display cases, patrolling guards, sweeping cameras,
// the alarm meter, progress reshuffles and win/lose. step() advances one fixed step
// and returns event flags so the caller can play sounds without the world knowing.
import { ALARM, CAMERAS, CASES, EXIT, FIELD, GUARDS, HEART, ROOM, START, THIEF, TILT } from './config.js';

export const EVENT_GRAB = 1;
export const EVENT_DROP = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_WIN = 8;
export const EVENT_SHUFFLE = 16;
export const EVENT_SPOTTED = 32;

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
// Segment (ax,ay)-(bx,by) blocked by rect r? Used for vision cones vs display cases.
function segHitsRect(ax, ay, bx, by, r) {
  const dx = bx - ax, dy = by - ay;
  let t0 = 0, t1 = 1;
  const p = [-dx, dx, -dy, dy], q = [ax - r.x, r.x + r.w - ax, ay - r.y, r.y + r.h - ay];
  for (let i = 0; i < 4; i += 1) {
    if (p[i] === 0) { if (q[i] < 0) return false; }
    else { const t = q[i] / p[i]; if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } }
  }
  return true;
}
function losBlocked(ax, ay, bx, by, cases) {
  for (const c of cases) if (segHitsRect(ax, ay, bx, by, c)) return true;
  return false;
}
function inCone(ox, oy, dir, range, half, tx, ty, cases) {
  const d = dist(ox, oy, tx, ty);
  if (d > range) return false;
  if (Math.abs(angDiff(angleTo(ox, oy, tx, ty), dir)) > half) return false;
  return !losBlocked(ox, oy, tx, ty, cases);
}

export function createWorld(random) {
  const thief = { x: START.x, y: START.y, r: THIEF.radius, dragging: false, sneaking: false, moving: false };
  const heart = { x: HEART.pedestalX, y: HEART.pedestalY, r: HEART.radius, vx: 0, vy: 0, taken: false };
  const cases = CASES.map((c) => ({ ...c, vx: 0, vy: 0, sliding: false, spark: 0 }));
  const guards = GUARDS.map((g) => ({ x: g.x, y: g.y, wp: 0, waypoints: g.waypoints.map((w) => [...w]), speed: g.speed, range: g.range, halfAngle: g.halfAngle, dir: 0, slideVx: 0 }));
  const cameras = CAMERAS.map((c) => ({ ...c, phase: random() * Math.PI * 2 }));
  const sparks = [];
  for (let i = 0; i < 48; i += 1) sparks.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 });
  const state = {
    thief, heart, cases, guards, cameras, sparks,
    alarm: 0, tilt: 0, elapsed: 0, progress: 0, shuffleStage: 0,
    caught: false, won: false, spotted: false, best: 0,
    startDist: dist(START.x, START.y, EXIT.x, EXIT.y),
  };

  function reset() {
    thief.x = START.x; thief.y = START.y; thief.dragging = false; thief.sneaking = false; thief.moving = false;
    heart.x = HEART.pedestalX; heart.y = HEART.pedestalY; heart.vx = 0; heart.vy = 0; heart.taken = false;
    CASES.forEach((c, i) => { cases[i].x = c.x; cases[i].y = c.y; cases[i].vx = 0; cases[i].vy = 0; cases[i].sliding = false; cases[i].spark = 0; });
    GUARDS.forEach((g, i) => { guards[i].x = g.x; guards[i].y = g.y; guards[i].wp = 0; guards[i].waypoints = g.waypoints.map((w) => [...w]); guards[i].dir = 0; guards[i].slideVx = 0; });
    cameras.forEach((c, i) => { cameras[i].phase = random() * Math.PI * 2; });
    for (const s of sparks) s.active = false;
    state.alarm = 0; state.tilt = 0; state.elapsed = 0; state.progress = 0; state.shuffleStage = 0;
    state.caught = false; state.won = false; state.spotted = false;
  }

  function spawnSpark(x, y) {
    for (const s of sparks) {
      if (s.active) continue;
      s.active = true; s.x = x; s.y = y;
      s.vx = (random() - 0.5) * 160; s.vy = -random() * 120 - 20; s.life = 0.4 + random() * 0.3;
      return;
    }
  }

  // Each step toward the exit re-shuffles security a little: guard waypoints and
  // camera sweep phases jitter, so the final approach is never the same twice.
  function maybeShuffle() {
    const d = dist(thief.x, thief.y, EXIT.x, EXIT.y);
    const progress = clamp(1 - d / state.startDist, 0, 1);
    state.progress = progress;
    const stage = progress > 0.66 ? 3 : progress > 0.4 ? 2 : progress > 0.18 ? 1 : 0;
    if (stage === state.shuffleStage) return 0;
    state.shuffleStage = stage;
    for (const g of guards) for (const w of g.waypoints) { w[0] += (random() - 0.5) * 90; w[1] += (random() - 0.5) * 70; w[0] = clamp(w[0], ROOM.x + 40, ROOM.x + ROOM.width - 40); w[1] = clamp(w[1], ROOM.y + 40, ROOM.y + ROOM.height - 40); }
    for (const c of cameras) c.phase += (random() - 0.5) * 1.2;
    return EVENT_SHUFFLE;
  }

  function step(dt, move, grabToggle, sneak) {
    if (state.caught || state.won) return 0;
    let events = 0;
    state.elapsed += dt;
    thief.sneaking = !!sneak;
    const speed = thief.sneaking ? THIEF.sneakSpeed : THIEF.speed;
    const dragSlow = thief.dragging ? 0.62 : 1;
    const mx = move.x, my = move.y;
    const mlen = Math.hypot(mx, my) || 1;
    thief.moving = mx !== 0 || my !== 0;
    if (thief.moving) {
      thief.x = clamp(thief.x + (mx / mlen) * speed * dragSlow * dt, ROOM.x + thief.r, ROOM.x + ROOM.width - thief.r);
      thief.y = clamp(thief.y + (my / mlen) * speed * dragSlow * dt, ROOM.y + thief.r, ROOM.y + ROOM.height - thief.r);
    }
    if (grabToggle) {
      if (!thief.dragging && dist(thief.x, thief.y, heart.x, heart.y) < THIEF.grabRange + heart.r) {
        thief.dragging = true; heart.taken = true; events |= EVENT_GRAB;
      } else if (thief.dragging) { thief.dragging = false; events |= EVENT_DROP; }
    }
    // Heart on a taut cable: it follows the thief at cable length, lagging and swinging.
    if (thief.dragging) {
      // Spring toward the thief, damped; the cable cap below keeps it taut.
      heart.vx += (thief.x - heart.x) * 22 * dt;
      heart.vy += (thief.y - heart.y) * 22 * dt;
      heart.vx *= 0.92; heart.vy *= 0.92;
      heart.x += heart.vx * dt; heart.y += heart.vy * dt;
      const nd = dist(heart.x, heart.y, thief.x, thief.y);
      if (nd > HEART.cable) { heart.x = thief.x + (heart.x - thief.x) / nd * HEART.cable; heart.y = thief.y + (heart.y - thief.y) / nd * HEART.cable; }
      // Keep the cable taut and readable: the heart trails at near cable length,
      // it never collapses onto the thief.
      else if (nd < HEART.cable * 0.8) { heart.x = thief.x + (heart.x - thief.x) / nd * HEART.cable * 0.85; heart.y = thief.y + (heart.y - thief.y) / nd * HEART.cable * 0.85; }
      heart.x = clamp(heart.x, ROOM.x + heart.r, ROOM.x + ROOM.width - heart.r);
      heart.y = clamp(heart.y, ROOM.y + heart.r, ROOM.y + ROOM.height - heart.r);
    }
    // Tilt: the floor leans toward the heart's side of the room; dragging makes it lean harder.
    const targetTilt = clamp((heart.x - (ROOM.x + ROOM.width / 2)) / (ROOM.width / 2), -1, 1) * TILT.max * (thief.dragging ? 1 : 0.55);
    state.tilt += (targetTilt - state.tilt) * Math.min(1, dt * 2.2);
    // Cases slide downhill along the tilt; guards get nudged too.
    const ax = Math.sin(state.tilt) * TILT.gravity;
    for (const c of cases) {
      c.vx += ax * dt; c.vx *= Math.max(0, 1 - TILT.friction * dt);
      c.x = clamp(c.x + c.vx * dt, ROOM.x, ROOM.x + ROOM.width - c.w);
      if (c.x === ROOM.x || c.x === ROOM.x + ROOM.width - c.w) c.vx = 0;
      c.sliding = Math.abs(c.vx) > 40;
      if (c.sliding && random() < 0.35) spawnSpark(c.x + (c.vx > 0 ? c.w : 0), c.y + c.h - 4);
    }
    for (const g of guards) {
      g.slideVx += ax * 0.35 * dt; g.slideVx *= Math.max(0, 1 - 2 * dt);
      g.x = clamp(g.x + g.slideVx * dt, ROOM.x + 16, ROOM.x + ROOM.width - 16);
    }
    for (const s of sparks) {
      if (!s.active) continue;
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 300 * dt;
      if (s.life <= 0) s.active = false;
    }
    // Guards patrol their waypoints.
    for (const g of guards) {
      const wp = g.waypoints[g.wp];
      const dx = wp[0] - g.x, dy = wp[1] - g.y, d = Math.hypot(dx, dy);
      if (d < 8) { g.wp = (g.wp + 1) % g.waypoints.length; continue; }
      g.dir = Math.atan2(dy, dx);
      g.x += (dx / d) * g.speed * dt; g.y += (dy / d) * g.speed * dt;
    }
    // Detection: thief in any amber guard cone or red camera cone raises the alarm.
    let seen = false, rate = 0;
    for (const g of guards) {
      if (inCone(g.x, g.y, g.dir, g.range, g.halfAngle, thief.x, thief.y, cases)) { seen = true; rate = Math.max(rate, thief.sneaking ? ALARM.riseSeenSneak : ALARM.riseSeen); }
    }
    for (const c of cameras) {
      const dir = c.baseAngle + Math.sin(state.elapsed * c.speed + c.phase) * c.sweep;
      c.dir = dir;
      if (inCone(c.x, c.y, dir, c.range, c.halfAngle, thief.x, thief.y, cases)) { seen = true; rate = Math.max(rate, ALARM.riseCamera); }
    }
    state.spotted = seen;
    if (seen) { state.alarm = Math.min(ALARM.max, state.alarm + rate * dt); events |= EVENT_SPOTTED; }
    else state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
    if (state.alarm >= ALARM.max) { state.caught = true; return events | EVENT_CAUGHT; }
    events |= maybeShuffle();
    // Win: thief AND heart both inside the open escape hatch.
    if (thief.dragging && dist(thief.x, thief.y, EXIT.x, EXIT.y) < EXIT.radius && dist(heart.x, heart.y, EXIT.x, EXIT.y) < EXIT.radius + 40) {
      state.won = true; return events | EVENT_WIN;
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
