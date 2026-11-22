// HEAVY IS THE HAUL — tuning numbers and colours in one place.
// One vault room, 1280x720 logical field, renderer scales it to the window.
export const FIELD = { width: 1280, height: 720 };
// Vault room (walls) inside the field; HUD lives above it.
export const ROOM = { x: 84, y: 108, width: 1112, height: 512 };
export const STEP = 1 / 60;

export const THIEF = { radius: 18, speed: 235, sneakSpeed: 115, grabRange: 78 };
export const HEART = { radius: 60, cable: 132, pedestalX: 430, pedestalY: 330 };
export const EXIT = { x: 1090, y: 180, radius: 48 }; // escape hatch, uphill (top-right)
export const START = { x: 170, y: 580 };

export const TILT = { max: 0.13, slideThreshold: 0.035, gravity: 1200, friction: 1.4 };
// Cases slide downhill along the tilt axis; guards slide a little too.
export const CASES = [
  { x: 560, y: 250, w: 78, h: 48 },
  { x: 700, y: 430, w: 78, h: 48 },
  { x: 880, y: 260, w: 78, h: 48 },
  { x: 980, y: 500, w: 78, h: 48 },
  { x: 350, y: 500, w: 78, h: 48 },
];
export const GUARDS = [
  { x: 620, y: 330, waypoints: [[620, 330], [820, 330], [820, 470], [620, 470]], speed: 62, range: 225, halfAngle: 0.62 },
  { x: 950, y: 330, waypoints: [[950, 330], [1080, 330], [1080, 520], [950, 520]], speed: 70, range: 230, halfAngle: 0.62 },
  { x: 480, y: 480, waypoints: [[480, 480], [480, 250], [660, 250], [660, 480]], speed: 58, range: 215, halfAngle: 0.62 },
];
export const CAMERAS = [
  { x: 640, y: 118, baseAngle: Math.PI / 2, sweep: 0.85, speed: 0.45, range: 265, halfAngle: 0.42 },
  { x: 1010, y: 118, baseAngle: Math.PI / 2, sweep: 0.7, speed: 0.6, range: 255, halfAngle: 0.42 },
];
export const ALARM = { riseSeen: 30, riseSeenSneak: 15, riseCamera: 36, decay: 7, max: 100 };
export const BEST_KEY = 'heavy-is-the-haul.best';
export const PALETTE = {
  backdrop: '#0d0a14', wall: '#2c2140', floor: '#5a4376', floorAlt: '#6d5390',
  gold: '#f2c94c', goldDeep: '#c9962e', heart: '#f0b23e', heartGlow: '#ffd76a',
  thief: '#f4efe2', thiefCoat: '#2e1e4d', guard: '#8a2f2f', guardAmber: '#ffb020',
  coneAmber: 'rgba(255,176,32,0.38)', coneAmberEdge: 'rgba(255,196,64,0.85)',
  coneRed: 'rgba(235,45,45,0.38)', coneRedEdge: 'rgba(255,90,90,0.85)',
  camera: '#d0342c', hatch: '#7fe0a8', caseWood: '#7a5636', caseGlass: '#aee2f0',
  panel: '#1c1428', text: '#f2ead8', muted: '#b3a6cc', spark: '#ffd76a', exitGlow: '#8ff0b3',
};
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
