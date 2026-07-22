/**
 * Vite does not emit Rapier's WASM next to the JS chunk. Without this file,
 * production deploys show the UI but never spawn crops (Physics Suspense hangs).
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const src = join(root, 'node_modules/@dimforge/rapier3d-compat/rapier_wasm3d_bg.wasm');
const dest = join(root, 'dist/assets/rapier_wasm3d_bg.wasm');

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`Copied Rapier WASM → ${dest}`);
