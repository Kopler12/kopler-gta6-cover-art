// VICE HEAT — the entry program for gta6-cover-art-01 (Node 22, standard library
// only). It hands the app in: it copies this repository's app/ and screenshots/
// into the output directory and writes output/dossier.json with the vendored
// make.fun library, so the sealed scorer can check the entry byte for byte.
// Run it outside the grader with MAKEFUN_OUTPUT_DIR set:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The program is deterministic: two runs write identical bytes.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps, from the competition's gate: app/ is at most 993 files
// and directories and 48 MiB in all, screenshots/ at most 4 images of 256 KiB
// each, and the dossier's text at most 160 KiB. Passing them here makes this
// program fail exactly where the scorer would refuse the entry.
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}
writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, dossierCaps));
