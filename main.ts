// Heavy Is the Haul — entrypoint for the best-heist-game submission.
//
// What this game is: a thief has stolen a giant golden heart and must drag
// it out through a vault whose floor keeps tilting. The playable game lives
// entirely in game/ next to this file (plain static files — game/index.html
// plus its ES modules, no library, no network request — so a desktop browser
// can load it offline), and the screenshots in screenshots/ show it in play.
//
// What this file does, on Node 22 with only the standard library: it gathers
// those two folders into the output directory and writes dossier.json there,
// the summary the judge reads, using the vendored make.fun helper. Run it
// locally with MAKEFUN_OUTPUT_DIR set to a scratch folder, e.g.:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Without that variable it writes to /output, the grader's location.
// Serve the game itself locally with `node serve.ts`, then open
// http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Where this file lives, and where the packaged entry should go.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Copy one folder from the repo into the output directory, creating the
// destination first so the copy never fails on a missing parent.
function carryFolder(name: string): void {
  const from = join(repoRoot, name);
  const to = join(outputDir, name);
  mkdirSync(to, { recursive: true });
  if (existsSync(from)) {
    cpSync(from, to, { recursive: true });
  }
}

// The game itself is always present; the screenshots folder is optional on
// disk but expected for a real entry (the first file by name becomes the
// cover image), so the same helper covers both cases.
mkdirSync(outputDir, { recursive: true });
carryFolder('game');
carryFolder('screenshots');

// Caps taken from the scorer's own reference (reference/gate.json). The
// text cap shapes how many bytes of text the dossier may hold; the rest are
// guard rails that refuse an entry the scorer would refuse anyway — at most
// 4 screenshots, none over 256 KiB; at most 993 files inside game/, 48 MiB
// of game files in total, and no path under game/ longer than 1000 bytes.
// (game/ is counted beside /output's own 1000-entry cap, plus its
// screenshots/ folder and dossier.json.)
const dossierText = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossierText);
