# Heavy Is the Haul

Steal a giant golden heart from a floating vault. The floor tilts with the
weight: dragging the heart slides wheeled display cases into cover — and can
slide a guard into your escape route. Every step toward the exit re-shuffles
the guards and cameras.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No network requests, no build step — `game/` is plain static files, all art drawn in code and all sound synthesised with WebAudio.

## Controls

- **WASD / arrow keys** — move (or click anywhere to walk there)
- **E or Space** — grab / drop the heart
- **Shift** — sneak (slower, alarm rises slower when seen)
- **P / Esc** — pause · **M** — mute
- Buttons: Start / Pause / Restart / Mute (bottom-left)

## Win / lose

- Win: drag the heart into the glowing green ESCAPE hatch (top-right).
- Lose: the alarm meter hits 100% — being seen by a guard (amber cone) or a
  camera (red cone) raises it; hiding lets it fall again.

## Play

Screenshot hooks: `?shot=start`, `?shot=play`, `?shot=end` (add `&seed=N`).

All art is drawn in canvas code, all sound is WebAudio. No network requests,
no external assets.
