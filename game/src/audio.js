// Tiny WebAudio synth: no audio files. A soft pluck for grab, a low alarm pulse
// while spotted, a scrape noise while a case slides, and short win/lose phrases.
export function createAudio() {
  let ctx = null, muted = false, alarmTimer = 0;
  function ensure() {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    return ctx;
  }
  function tone(freq, dur, type, vol, when = 0) {
    const c = ensure(); if (!c || muted) return;
    const t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur);
  }
  function noise(dur, vol) {
    const c = ensure(); if (!c || muted) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(c.destination); src.start();
  }
  return {
    unlock() { ensure(); },
    setMuted(m) { muted = m; },
    isMuted() { return muted; },
    grab() { tone(520, 0.12, 'triangle', 0.18); tone(780, 0.16, 'triangle', 0.14, 0.07); },
    drop() { tone(300, 0.1, 'triangle', 0.12); },
    shuffle() { tone(660, 0.09, 'sine', 0.12); tone(880, 0.09, 'sine', 0.1, 0.08); },
    scrape() { noise(0.12, 0.05); },
    alarm(dt) {
      alarmTimer -= dt;
      if (alarmTimer <= 0) { alarmTimer = 0.5; tone(220, 0.18, 'square', 0.06); }
    },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.16, i * 0.13)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.08, i * 0.16)); },
  };
}
