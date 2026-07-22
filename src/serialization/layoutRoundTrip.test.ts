import { describe, expect, it } from 'vitest';
import sampleLayout from '../../examples/sample-layout.json';
import type { SceneElement } from '../types/elements';
import { DEFAULT_SIMULATION_SETTINGS } from '../types/settings';
import { layoutDownloadFilename } from './filenames';
import { parseLayout } from './parseLayout';
import { serializeLayout } from './serializeLayout';
import { DEFAULT_LAYOUT_CAMERA } from './types';

describe('serializeLayout / parseLayout round-trip', () => {
  it('round-trips a multi-element scene losslessly (ignoring meta timestamps)', () => {
    const elements = Object.fromEntries(
      sampleLayout.elements.map((el) => [el.id, structuredClone(el) as SceneElement]),
    );
    const file = serializeLayout({
      sceneName: sampleLayout.meta.name,
      createdAt: sampleLayout.meta.createdAt,
      elements,
      settings: sampleLayout.settings,
      camera: sampleLayout.camera,
      now: () => new Date('2026-07-21T20:00:00.000Z'),
    });

    const parsed = parseLayout(file);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.value.fileVersion).toBe(3);
    expect(parsed.value.meta.name).toBe(sampleLayout.meta.name);
    expect(parsed.value.meta.createdAt).toBe(sampleLayout.meta.createdAt);
    expect(parsed.value.meta.modifiedAt).toBe('2026-07-21T20:00:00.000Z');
    expect(parsed.value.settings).toEqual(sampleLayout.settings);
    expect(parsed.value.camera).toEqual(sampleLayout.camera);
    expect(parsed.value.elements).toEqual(
      [...sampleLayout.elements].sort((a, b) => a.id.localeCompare(b.id)),
    );
  });

  it('parses the sample layout JSON string', () => {
    const result = parseLayout(JSON.stringify(sampleLayout));
    expect(result.ok).toBe(true);
  });

  it('rejects corrupt JSON without throwing', () => {
    const result = parseLayout('{ not json');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.message).toMatch(/JSON/i);
  });

  it('rejects a newer fileVersion and leaves callers able to abort', () => {
    const result = parseLayout({ ...sampleLayout, fileVersion: 99 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.message).toMatch(/newer version/i);
  });

  it('rejects unknown fields after migration', () => {
    const result = parseLayout({ ...sampleLayout, surprise: true });
    expect(result.ok).toBe(false);
  });

  it('serializes an empty scene with defaults', () => {
    const file = serializeLayout({
      sceneName: '  ',
      createdAt: '2026-07-21T19:00:00.000Z',
      elements: {},
      settings: DEFAULT_SIMULATION_SETTINGS,
      camera: DEFAULT_LAYOUT_CAMERA,
      now: () => new Date('2026-07-21T19:00:00.000Z'),
    });
    expect(file.meta.name).toBe('Untitled scene');
    expect(file.elements).toEqual([]);
    expect(parseLayout(file).ok).toBe(true);
  });
});

describe('layoutDownloadFilename', () => {
  it('sanitises illegal path characters', () => {
    expect(layoutDownloadFilename('North/intake:line')).toBe('North_intake_line.json');
  });

  it('falls back when the name is empty', () => {
    expect(layoutDownloadFilename('   ')).toBe('layout.json');
  });
});
