// Boot and the one loop: input every frame, world in fixed 1/60 s steps, renderer
// paints what is there. Screens: title, play, paused, caught, win.
// ?seed=N fixes the pattern. ?shot=start|play|end stages that scene, paints it twice
// and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_DROP, EVENT_GRAB, EVENT_SHUFFLE, EVENT_SPOTTED, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_GRAB, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try { return Number.parseFloat(window.localStorage.getItem(BEST_KEY) ?? '0') || 0; } catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* private window: best lasts this visit only */ }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (cx, cy) => renderer.toField(cx, cy));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let wasSpotted = false;
  let pendingGrab = false; // one-shot flags are taken once per frame, in handleActions

  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnRestart = document.getElementById('btn-restart');
  const btnMute = document.getElementById('btn-mute');
  function announce(message) { status.textContent = message; }
  function startGame() {
    world.reset(); accumulator = 0; screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Steal the golden heart and reach the escape hatch.');
  }
  function endCaught() {
    screen = SCREEN_OVER; audio.lose();
    announce(`Caught. The alarm hit 100% after ${Math.round(world.state.elapsed)} seconds.`);
  }
  function endWin() {
    screen = SCREEN_WIN; audio.win();
    if (best === 0 || world.state.elapsed < best) { best = world.state.elapsed; saveBest(best); }
    announce(`Clean getaway in ${Math.round(world.state.elapsed)} seconds.`);
  }
  function togglePause() {
    if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
    else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
  }
  btnStart.addEventListener('click', () => { audio.unlock(); if (screen !== SCREEN_PLAY) startGame(); });
  btnPause.addEventListener('click', togglePause);
  btnRestart.addEventListener('click', startGame);
  btnMute.addEventListener('click', () => {
    audio.setMuted(!audio.isMuted());
    btnMute.textContent = audio.isMuted() ? 'Unmute' : 'Mute';
  });

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_GRAB) pendingGrab = true;
    if (actions & ACTION_MUTE) btnMute.click();
    if (actions & ACTION_PAUSE && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) togglePause();
    else if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) startGame();
  }

  function step() {
    if (screen === SCREEN_TITLE) { world.step(STEP, { x: 0, y: 0 }, false, false); return; }
    let move = input.move();
    const click = input.clickTarget();
    if ((move.x === 0 && move.y === 0) && click) {
      const dx = click.x - world.state.thief.x, dy = click.y - world.state.thief.y;
      const d = Math.hypot(dx, dy);
      if (d < 12) input.clearClickTarget();
      else move = { x: dx / d, y: dy / d };
    }
    const grab = pendingGrab; pendingGrab = false;
    const events = world.step(STEP, move, grab, input.sneak());
    if (events & EVENT_GRAB) audio.grab();
    if (events & EVENT_DROP) audio.drop();
    if (events & EVENT_SHUFFLE) audio.shuffle();
    if (events & EVENT_SPOTTED) { audio.alarm(STEP); if (!wasSpotted) announce('Spotted! The alarm is rising.'); }
    wasSpotted = !!(events & EVENT_SPOTTED);
    if (world.state.cases.some((c) => c.sliding)) audio.scrape();
    if (events & EVENT_WIN) endWin();
    else if (events & EVENT_CAUGHT) endCaught();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) { step(); accumulator -= STEP; }
    } else accumulator = 0;
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });

  announce('Heavy is the Haul. Press Space or click Start to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
