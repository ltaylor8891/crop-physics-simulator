/**
 * Versioned layout file types (docs/SAVE_FILE_FORMAT.md).
 * Pure TypeScript — no React/DOM.
 */

import type { SceneElement, Vec3 } from '../types/elements';
import type { SimulationSettings } from '../types/settings';

/** Current writer version; bump with a migration when the schema changes. */
export const CURRENT_FILE_VERSION = 3;

/** Matches package.json version; informational only in save files. */
export const APP_VERSION = '0.1.0';

export interface LayoutMeta {
  name: string;
  createdAt: string;
  modifiedAt: string;
  appVersion: string;
}

export interface LayoutCamera {
  position: Vec3;
  target: Vec3;
}

export interface LayoutFileV2 {
  fileVersion: 2;
  meta: LayoutMeta;
  settings: SimulationSettings;
  elements: SceneElement[];
  camera: LayoutCamera;
}

export interface LayoutFileV3 {
  fileVersion: 3;
  meta: LayoutMeta;
  settings: SimulationSettings;
  elements: SceneElement[];
  camera: LayoutCamera;
}

export type LayoutFile = LayoutFileV3;

export interface ParseError {
  path: string;
  message: string;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: ParseError[] };

export const DEFAULT_LAYOUT_CAMERA: LayoutCamera = {
  position: { x: 18, y: 14, z: 18 },
  target: { x: 0, y: 0, z: 0 },
};
