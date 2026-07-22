/**
 * Store snapshot → LayoutFile (docs/TECHNICAL_DESIGN.md §Save-File Architecture).
 */

import { isElementTypeEnabled } from '../elements/registry';
import type { ElementId, SceneElement } from '../types/elements';
import type { SimulationSettings } from '../types/settings';
import {
  APP_VERSION,
  CURRENT_FILE_VERSION,
  type LayoutCamera,
  type LayoutFile,
} from './types';

export interface SerializeLayoutInput {
  sceneName: string;
  /** ISO 8601 UTC when the scene was first created (preserved across saves). */
  createdAt: string;
  elements: Record<ElementId, SceneElement>;
  settings: SimulationSettings;
  camera: LayoutCamera;
  /** Clock for modifiedAt; injectable for tests. */
  now?: () => Date;
}

export function serializeLayout(input: SerializeLayoutInput): LayoutFile {
  const now = (input.now ?? (() => new Date()))().toISOString();
  const name = clampName(input.sceneName);
  const elements = Object.values(input.elements)
    .filter((el) => isElementTypeEnabled(el.type))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    fileVersion: CURRENT_FILE_VERSION,
    meta: {
      name,
      createdAt: input.createdAt || now,
      modifiedAt: now,
      appVersion: APP_VERSION,
    },
    settings: { ...input.settings },
    elements: structuredClone(elements),
    camera: {
      position: { ...input.camera.position },
      target: { ...input.camera.target },
    },
  };
}

function clampName(name: string): string {
  const trimmed = name.trim() || 'Untitled scene';
  return trimmed.slice(0, 64);
}
