// Drawing only: world state + screen in, pixels out. The 1280x720 field is scaled
// to fit the window. The whole vault room is drawn rotated by the floor tilt, so the
// lean is visible; the HUD stays level. All art is canvas code, no images.
import { ALARM, EXIT, FIELD, FONT, HEART, PALETTE, ROOM } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 34, bottom: 76 };

function fmtTime(s) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.x = (canvas.width - FIELD.width * view.scale) / 2;
    view.y = (canvas.height - FIELD.height * view.scale) / 2;
  }
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color; context.textAlign = align; context.fillText(value, x, y);
  }
  function cone(x, y, dir, range, half, color, edge) {
    // Soft-edged translucent cone: a wider faint halo, the saturated fill,
    // then bright edge rays so amber vs red reads at a glance.
    context.fillStyle = color;
    context.beginPath(); context.moveTo(x, y);
    context.arc(x, y, range, dir - half, dir + half); context.closePath(); context.fill();
    context.strokeStyle = edge; context.lineWidth = 3;
    context.beginPath(); context.moveTo(x, y);
    context.lineTo(x + Math.cos(dir - half) * range, y + Math.sin(dir - half) * range);
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(dir + half) * range, y + Math.sin(dir + half) * range);
    context.stroke();
    context.beginPath();
    context.arc(x, y, range, dir - half, dir + half); context.stroke();
  }
  function drawHeart(x, y, r, glow) {
    context.save(); context.translate(x, y);
    if (glow) {
      // Wide halo so the giant heart reads even over the bright floor.
      const halo = context.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.1);
      halo.addColorStop(0, 'rgba(255,215,106,0.55)');
      halo.addColorStop(1, 'rgba(255,215,106,0)');
      context.fillStyle = halo;
      context.beginPath(); context.arc(0, 0, r * 2.1, 0, Math.PI * 2); context.fill();
      context.shadowColor = PALETTE.heartGlow; context.shadowBlur = 44;
    }
    context.fillStyle = PALETTE.heart;
    context.beginPath();
    context.moveTo(0, r * 0.85);
    context.bezierCurveTo(-r * 1.25, -r * 0.1, -r * 0.62, -r * 1.05, 0, -r * 0.35);
    context.bezierCurveTo(r * 0.62, -r * 1.05, r * 1.25, -r * 0.1, 0, r * 0.85);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = PALETTE.goldDeep; context.lineWidth = 4; context.stroke();
    // Thick bright rim so the heart pops against floor and cones.
    context.strokeStyle = 'rgba(255,230,150,0.9)'; context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, r * 0.85);
    context.bezierCurveTo(-r * 1.25, -r * 0.1, -r * 0.62, -r * 1.05, 0, -r * 0.35);
    context.bezierCurveTo(r * 0.62, -r * 1.05, r * 1.25, -r * 0.1, 0, r * 0.85);
    context.stroke();
    context.fillStyle = 'rgba(255,255,255,0.35)';
    context.beginPath(); context.arc(-r * 0.32, -r * 0.42, r * 0.16, 0, Math.PI * 2); context.fill();
    context.restore();
  }
  function drawThief(t) {
    context.save(); context.translate(t.x, t.y);
    if (t.sneaking) context.globalAlpha = 0.85;
    // Bright gold outline + dark coat + pale face: a distinct silhouette,
    // clearly smaller than the giant heart but impossible to miss.
    context.strokeStyle = '#ffe9a8'; context.lineWidth = 3.5;
    context.fillStyle = PALETTE.thiefCoat;
    context.beginPath(); context.arc(0, 0, t.r, 0, Math.PI * 2); context.fill(); context.stroke();
    context.fillStyle = PALETTE.thief;
    context.beginPath(); context.arc(0, -2, t.r * 0.55, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#14101c'; context.lineWidth = 2;
    context.beginPath(); context.arc(0, -2, t.r * 0.55, 0, Math.PI * 2); context.stroke();
    context.fillStyle = '#14101c';
    context.fillRect(-t.r * 0.55, -t.r * 0.75, t.r * 1.1, t.r * 0.28); // domino mask
    context.fillStyle = PALETTE.gold;
    context.beginPath(); context.arc(0, t.r * 0.62, 3.5, 0, Math.PI * 2); context.fill(); // belt buckle
    context.restore();
  }
  function drawGuard(g) {
    context.save(); context.translate(g.x, g.y);
    // Visible guard body at the cone apex: large red torso, pale face,
    // amber visor dot and a facing tick showing where he looks.
    context.strokeStyle = '#ffd76a'; context.lineWidth = 3;
    context.beginPath(); context.moveTo(Math.cos(g.dir) * 20, Math.sin(g.dir) * 20);
    context.lineTo(Math.cos(g.dir) * 32, Math.sin(g.dir) * 32); context.stroke();
    context.fillStyle = PALETTE.guard;
    context.beginPath(); context.arc(0, 0, 22, 0, Math.PI * 2); context.fill(); context.stroke();
    context.fillStyle = '#e8dcc8';
    context.beginPath(); context.arc(Math.cos(g.dir) * 8, Math.sin(g.dir) * 8, 10, 0, Math.PI * 2); context.fill();
    context.fillStyle = PALETTE.guardAmber;
    context.beginPath(); context.arc(Math.cos(g.dir) * 13, Math.sin(g.dir) * 13, 4.5, 0, Math.PI * 2); context.fill();
    context.restore();
  }
  function drawRoom(state) {
    const cx = ROOM.x + ROOM.width / 2, cy = ROOM.y + ROOM.height / 2;
    context.save();
    context.translate(cx, cy); context.rotate(state.tilt); context.translate(-cx, -cy);
    // Floor: checker of jewel-tone tiles + gold trim, clipped to the room so
    // no tile pokes past the border when the room is tilted.
    context.save();
    context.beginPath(); context.rect(ROOM.x, ROOM.y, ROOM.width, ROOM.height); context.clip();
    context.fillStyle = PALETTE.floor;
    context.fillRect(ROOM.x, ROOM.y, ROOM.width, ROOM.height);
    context.fillStyle = PALETTE.floorAlt;
    const ts = 58;
    for (let y = ROOM.y; y < ROOM.y + ROOM.height; y += ts)
      for (let x = ROOM.x + ((Math.floor((y - ROOM.y) / ts) % 2) * ts) / 2; x < ROOM.x + ROOM.width; x += ts)
        context.fillRect(x, y, ts - 2, ts - 2);
    context.restore();
    context.strokeStyle = PALETTE.goldDeep; context.lineWidth = 4;
    context.strokeRect(ROOM.x, ROOM.y, ROOM.width, ROOM.height);
    // Pedestal under the heart (fades once taken).
    if (!state.heart.taken) {
      context.fillStyle = '#4a3560'; context.fillRect(HEART.pedestalX - 52, HEART.pedestalY - 8, 104, 60);
      context.fillStyle = PALETTE.goldDeep; context.fillRect(HEART.pedestalX - 52, HEART.pedestalY - 8, 104, 8);
    }
    // Escape hatch: open, glowing, uphill top-right.
    const pulse = 0.6 + 0.4 * Math.sin(state.elapsed * 3);
    context.save(); context.translate(EXIT.x, EXIT.y);
    context.shadowColor = PALETTE.exitGlow; context.shadowBlur = 30 * pulse;
    context.fillStyle = '#123524'; context.beginPath(); context.arc(0, 0, EXIT.radius, 0, Math.PI * 2); context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = PALETTE.hatch; context.lineWidth = 5; context.stroke();
    context.fillStyle = PALETTE.hatch;
    context.font = `bold 15px ${FONT}`; context.textAlign = 'center';
    context.fillText('ESCAPE', 0, EXIT.radius + 22); // below the hatch: clear of the top wall and cameras
    context.fillText('▲', 0, 8);
    context.restore();
    // Vision cones (under the figures, over the floor).
    for (const g of state.guards) cone(g.x, g.y, g.dir, g.range, g.halfAngle, PALETTE.coneAmber, PALETTE.coneAmberEdge);
    for (const c of state.cameras) cone(c.x, c.y, c.dir, c.range, c.halfAngle, PALETTE.coneRed, PALETTE.coneRedEdge);
    // Display cases: wood base, glass top, little wheels; sparks when sliding.
    for (const cs of state.cases) {
      context.fillStyle = PALETTE.caseWood; context.fillRect(cs.x, cs.y, cs.w, cs.h);
      context.fillStyle = PALETTE.caseGlass; context.fillRect(cs.x + 6, cs.y + 6, cs.w - 12, cs.h - 22);
      context.fillStyle = PALETTE.gold; context.beginPath(); context.arc(cs.x + cs.w / 2, cs.y + cs.h / 2 - 4, 7, 0, Math.PI * 2); context.fill();
      context.fillStyle = '#14101c';
      context.beginPath(); context.arc(cs.x + 12, cs.y + cs.h - 4, 5, 0, Math.PI * 2); context.fill();
      context.beginPath(); context.arc(cs.x + cs.w - 12, cs.y + cs.h - 4, 5, 0, Math.PI * 2); context.fill();
      if (cs.sliding) {
        // Visible sparks at both wheels while a case slides.
        context.fillStyle = PALETTE.spark;
        for (const wx of [cs.x + 12, cs.x + cs.w - 12]) {
          context.beginPath(); context.arc(wx, cs.y + cs.h - 4, 6, 0, Math.PI * 2); context.fill();
          context.strokeStyle = '#fff3c4'; context.lineWidth = 2;
          context.beginPath();
          context.moveTo(wx - 9, cs.y + cs.h - 4); context.lineTo(wx + 9, cs.y + cs.h - 4);
          context.moveTo(wx, cs.y + cs.h - 13); context.lineTo(wx, cs.y + cs.h + 5);
          context.stroke();
        }
      }
    }
    // Cable: taut, thick, bright gold with a white core — the drag line is obvious.
    if (state.thief.dragging) {
      context.strokeStyle = '#f2c94c'; context.lineWidth = 5;
      context.beginPath(); context.moveTo(state.thief.x, state.thief.y);
      context.lineTo(state.heart.x, state.heart.y); context.stroke();
      context.strokeStyle = '#fff8e0'; context.lineWidth = 2;
      context.beginPath(); context.moveTo(state.thief.x, state.thief.y);
      context.lineTo(state.heart.x, state.heart.y); context.stroke();
    }
    drawHeart(state.heart.x, state.heart.y, HEART.radius, true);
    drawThief(state.thief);
    for (const g of state.guards) drawGuard(g);
    for (const c of state.cameras) {
      context.fillStyle = PALETTE.camera;
      context.fillRect(c.x - 17, c.y - 12, 34, 20);
      context.strokeStyle = '#ff8a80'; context.lineWidth = 2;
      context.strokeRect(c.x - 17, c.y - 12, 34, 20);
      context.beginPath(); context.arc(c.x + Math.cos(c.dir) * 19, c.y + Math.sin(c.dir) * 19, 6, 0, Math.PI * 2); context.fill();
    }
    for (const s of state.sparks) {
      if (!s.active) continue;
      context.globalAlpha = Math.max(0, s.life * 2);
      context.fillStyle = PALETTE.spark;
      context.beginPath(); context.arc(s.x, s.y, 5, 0, Math.PI * 2); context.fill();
      context.strokeStyle = '#fff3c4'; context.lineWidth = 2;
      context.beginPath();
      context.moveTo(s.x - 8, s.y); context.lineTo(s.x + 8, s.y);
      context.moveTo(s.x, s.y - 8); context.lineTo(s.x, s.y + 8);
      context.stroke();
      context.globalAlpha = 1;
    }
    context.restore();
    // Tilt direction arrow outside the rotated frame.
    context.fillStyle = PALETTE.muted;
    context.font = `14px ${FONT}`; context.textAlign = 'left';
    context.fillText(state.tilt > 0.01 ? 'floor leaning right ↓' : state.tilt < -0.01 ? 'floor leaning left ↓' : 'floor level', ROOM.x, ROOM.y + ROOM.height + 22);
  }
  function drawHud(state) {
    context.textBaseline = 'top';
    text(state.heart.taken ? 'Objective: drag the heart to the ESCAPE hatch' : 'Objective: grab the giant golden heart (E)', 24, 16, 22, PALETTE.text, 'left');
    text(fmtTime(state.elapsed), FIELD.width / 2, 16, 24, PALETTE.text, 'center');
    // Alarm meter: big, top-right, red as it fills.
    const mw = 260, mh = 22, mx = FIELD.width - 24 - mw, my = 16;
    context.fillStyle = '#3a1520'; context.fillRect(mx, my, mw, mh);
    context.fillStyle = state.alarm > 70 ? '#e23c3c' : state.alarm > 40 ? '#f5a623' : '#7fe0a8';
    context.fillRect(mx, my, mw * (state.alarm / ALARM.max), mh);
    context.strokeStyle = PALETTE.text; context.lineWidth = 2; context.strokeRect(mx, my, mw, mh);
    text(`ALARM ${Math.round(state.alarm)}%`, mx + mw / 2, my + 3, 15, '#14101c', 'center');
    if (state.spotted) text('SPOTTED!', mx + mw / 2, my + 28, 18, '#e23c3c', 'center');
    // Tilt indicator: needle gauge under the alarm.
    const gx = mx + mw / 2, gy = my + 78, gr = 34;
    context.strokeStyle = PALETTE.muted; context.lineWidth = 3;
    context.beginPath(); context.arc(gx, gy, gr, Math.PI, 0); context.stroke();
    const na = -Math.PI / 2 + (state.tilt / 0.13) * (Math.PI / 2);
    context.strokeStyle = PALETTE.gold; context.lineWidth = 4;
    context.beginPath(); context.moveTo(gx, gy); context.lineTo(gx + Math.cos(na) * gr, gy + Math.sin(na) * gr); context.stroke();
    text(`TILT ${(state.tilt * 57.3).toFixed(1)}°`, gx, gy + 8, 14, PALETTE.muted, 'center');
    text('WASD/arrows move · E grab · Shift sneak · P pause · M mute', 24, 48, 16, PALETTE.muted, 'left');
  }
  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2, y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(10,6,18,0.82)'; context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel; context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = accent || PALETTE.goldDeep; context.lineWidth = 3; context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 46, PALETTE.text, 'center');
    for (let i = 0; i < lines.length; i += 1) text(lines[i], FIELD.width / 2, y + PANEL.top + i * PANEL.line, 21, PALETTE.muted, 'center');
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.gold, 'center');
  }
  const TITLE_LINES = ['Steal the giant golden heart from the floating vault.', 'Dragging it tilts the floor — cases slide into cover,', 'guards slide into your way. Reach the ESCAPE hatch.', 'Amber cones are guards, red cones are cameras.', 'Best time: —'];
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop; context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    // Room backdrop behind the tilted room.
    context.fillStyle = PALETTE.wall; context.fillRect(0, 0, FIELD.width, FIELD.height);
    drawRoom(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = best > 0 ? `Best escape time: ${fmtTime(best)}` : 'No escape yet — the heart is waiting.';
      drawPanel('HEAVY IS THE HAUL', TITLE_LINES, 'Press Space or click Start to begin', PALETTE.gold);
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', ['The vault waits. The heart is heavy.'], 'Press P to resume', PALETTE.muted);
    else if (screen === SCREEN_OVER) drawPanel('CAUGHT!', [`The alarm hit 100% after ${fmtTime(state.elapsed)}.`, 'The guards take the heart back.'], 'Press Space to try again', '#e23c3c');
    else if (screen === SCREEN_WIN) drawPanel('CLEAN GETAWAY!', [`You dragged the heart out in ${fmtTime(state.elapsed)}.`, best > 0 ? `Best escape time: ${fmtTime(best)}` : ''], 'Press Space to play again', PALETTE.hatch);
  }
  resize();
  window.addEventListener('resize', resize);
  return { draw, toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: (clientX - rect.left) / rect.width * FIELD.width, y: (clientY - rect.top) / rect.height * FIELD.height };
  } };
}
