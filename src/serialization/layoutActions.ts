/**
 * Apply a validated layout to Zustand stores atomically (docs/TECHNICAL_DESIGN.md).
 * Runtime crops/stats are cleared; on failure callers must not invoke this.
 */

import { useDebugStore } from '../state/debugStore';
import { useSceneStore } from '../state/sceneStore';
import { useSimulationStore } from '../state/simulationStore';
import { useUiStore } from '../state/uiStore';
import { resetCropSimulation } from '../simulation/cropRuntime';
import { layoutDownloadFilename } from './filenames';
import { parseLayout, formatParseErrors } from './parseLayout';
import { serializeLayout } from './serializeLayout';
import type { LayoutFile, ParseError } from './types';

/** Replace scene + settings + camera; clear simulation runtime. */
export function applyLayout(layout: LayoutFile): void {
  useSimulationStore.getState().setRunning(false);
  resetCropSimulation();
  useDebugStore.getState().clearBalls();

  const elements = Object.fromEntries(layout.elements.map((el) => [el.id, structuredClone(el)]));
  useSceneStore.getState().replaceScene({
    sceneName: layout.meta.name,
    createdAt: layout.meta.createdAt,
    elements,
  });
  useSimulationStore.getState().replaceSettings(layout.settings);
  useUiStore.getState().applyCamera(layout.camera);
  useUiStore.getState().select(null);
  useUiStore.getState().cancelPlacement();
}

export function createNewLayout(): void {
  useSimulationStore.getState().setRunning(false);
  resetCropSimulation();
  useDebugStore.getState().clearBalls();
  useSceneStore.getState().clearScene();
  useSimulationStore.getState().resetToDefaults();
  useUiStore.getState().resetCamera();
  useUiStore.getState().select(null);
  useUiStore.getState().cancelPlacement();
}

export function buildCurrentLayoutFile(): LayoutFile {
  const scene = useSceneStore.getState();
  const simulation = useSimulationStore.getState();
  const ui = useUiStore.getState();
  return serializeLayout({
    sceneName: scene.sceneName,
    createdAt: scene.createdAt,
    elements: scene.elements,
    settings: simulation.settings,
    camera: ui.camera,
  });
}

/** Trigger a browser download of the current layout. */
export function downloadCurrentLayout(): void {
  const layout = buildCurrentLayoutFile();
  const json = `${JSON.stringify(layout, null, 2)}\n`;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = layoutDownloadFilename(layout.meta.name);
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Read a File, parse/validate, and apply on success.
 * @returns null on success, or parse errors (scene untouched).
 */
export async function loadLayoutFile(file: File): Promise<ParseError[] | null> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return [{ path: '', message: `Could not read file "${file.name}"` }];
  }
  const parsed = parseLayout(text);
  if (!parsed.ok) return parsed.errors;
  applyLayout(parsed.value);
  return null;
}

export { formatParseErrors };
