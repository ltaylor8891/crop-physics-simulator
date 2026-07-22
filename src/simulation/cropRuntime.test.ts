import { describe, expect, it } from 'vitest';
import type { RapierCollider, RapierRigidBody } from '@react-three/rapier';
import type { CropTypeId } from '../types/elements';
import { cropRuntime } from './cropRuntime';

const CROP_TYPE_IDS: CropTypeId[] = ['wheatClump', 'potato', 'sugarBeet'];

function fakeBody(): RapierRigidBody {
  // bindSlot only parks the body: setEnabled(false) + setTranslation.
  return {
    setEnabled: () => undefined,
    setTranslation: () => undefined,
  } as unknown as RapierRigidBody;
}

function fakeCollider(): RapierCollider {
  return {} as unknown as RapierCollider;
}

function bindAll(cropType: CropTypeId, capacity: number): void {
  for (let id = 0; id < capacity; id++) {
    cropRuntime.bindSlot(cropType, id, fakeBody(), fakeCollider());
  }
}

describe('cropRuntime configure/bind ordering', () => {
  it('binds all pools with production effect ordering (each pool configures first)', () => {
    // Production mount: each CropTypePool effect runs once — configure then bind.
    // No StrictMode second pass exists to repair wiped bindings.
    for (const cropType of CROP_TYPE_IDS) {
      cropRuntime.configure(3);
      bindAll(cropType, 3);
    }
    expect(cropRuntime.isBound).toBe(true);
  });

  it('keeps bindings when configure is re-run with the same capacity', () => {
    cropRuntime.configure(3);
    for (const cropType of CROP_TYPE_IDS) bindAll(cropType, 3);
    expect(cropRuntime.isBound).toBe(true);

    cropRuntime.configure(3);
    expect(cropRuntime.isBound).toBe(true);
  });

  it('resets bindings when capacity actually changes', () => {
    cropRuntime.configure(3);
    for (const cropType of CROP_TYPE_IDS) bindAll(cropType, 3);
    expect(cropRuntime.isBound).toBe(true);

    cropRuntime.configure(4);
    expect(cropRuntime.isBound).toBe(false);
    expect(cropRuntime.pool.capacity).toBe(4);

    for (const cropType of CROP_TYPE_IDS) bindAll(cropType, 4);
    expect(cropRuntime.isBound).toBe(true);
  });
});
