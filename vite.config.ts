/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Relative base so `dist/` works when uploaded under a subpath
 * (e.g. https://taynium.com/simulation-app/) as well as at the site root.
 * Absolute `/…` asset URLs break off `/` when the app is not hosted at domain root.
 *
 * Rapier WASM is copied after build by `scripts/copy-rapier-wasm.mjs` (see package.json
 * `build`) — Vite does not emit `rapier_wasm3d_bg.wasm` beside the JS chunk.
 */
export default defineConfig({
  base: './',
  plugins: [react()],
  assetsInclude: ['**/*.wasm'],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
