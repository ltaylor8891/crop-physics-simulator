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

interface TrackedBody {
  body: RapierRigidBody;
  translation: () => { x: number; y: number; z: number };
}

/** Fake body that tracks its translation/enabled state, enough for spawn + grading. */
function trackedBody(): TrackedBody {
  const state = { t: { x: 0, y: 0, z: 0 }, enabled: false };
  const body = {
    setEnabled: (e: boolean) => {
      state.enabled = e;
    },
    isEnabled: () => state.enabled,
    isDynamic: () => true,
    isSleeping: () => false,
    wakeUp: () => undefined,
    setTranslation: (t: { x: number; y: number; z: number }) => {
      state.t = { x: t.x, y: t.y, z: t.z };
    },
    translation: () => state.t,
    setLinvel: () => undefined,
    setAngvel: () => undefined,
    linvel: () => ({ x: 0, y: 0, z: 0 }),
  } as unknown as RapierRigidBody;
  return { body, translation: () => state.t };
}

function fullCollider(): RapierCollider {
  return {
    setFriction: () => undefined,
    setRestitution: () => undefined,
    setRadius: () => undefined,
    setDensity: () => undefined,
  } as unknown as RapierCollider;
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

describe('cropRuntime.tickGradingScreens', () => {
  it('drops undersized crop through the deck and leaves oversized crop on it', () => {
    // Fresh pools with tracked bodies so we can read positions back.
    cropRuntime.configure(6);
    const potatoBodies: TrackedBody[] = [];
    for (const type of CROP_TYPE_IDS) {
      for (let id = 0; id < 6; id++) {
        const tracked = trackedBody();
        if (type === 'potato') potatoBodies[id] = tracked;
        cropRuntime.bindSlot(type, id, tracked.body, fullCollider());
      }
    }
    expect(cropRuntime.isBound).toBe(true);

    // 40 mm potato (radius 0.02) is under the 60 mm aperture; 100 mm (radius 0.05) is over.
    const small = cropRuntime.spawn({
      cropType: 'potato',
      massKg: 0.05,
      friction: 0.5,
      restitution: 0.1,
      position: { x: 0, y: 0.8, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      radius: 0.02,
      halfHeight: 0,
    });
    const large = cropRuntime.spawn({
      cropType: 'potato',
      massKg: 0.3,
      friction: 0.5,
      restitution: 0.1,
      position: { x: 1, y: 0.8, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      radius: 0.05,
      halfHeight: 0,
    });
    expect(small).not.toBeNull();
    expect(large).not.toBeNull();

    const screen = {
      position: { x: 0, y: 0, z: 0 },
      rotationYaw: 0,
      length: 4,
      width: 0.8,
      beltHeight: 0.75,
      inclineDeg: 0,
      apertureMm: 60,
      frontBias: 0,
    };

    // Inject: both crops are on the deck; probability 1 and random 0 ⇒ eligible crops fall.
    const result = cropRuntime.tickGradingScreens(
      [screen],
      () => ({ onDeck: true, alongFraction: 0.5, surfaceY: 0.75 }),
      () => 1,
      1 / 60,
      () => 0,
    );

    // Only the undersized crop's mass is graded off.
    expect(result.gradedKg).toBeCloseTo(0.05, 10);
    // The undersized crop was teleported below the deck surface (0.75); oversized stayed put.
    expect(potatoBodies[small!.slot]!.translation().y).toBeLessThan(0.75);
    expect(potatoBodies[large!.slot]!.translation().y).toBeCloseTo(0.8, 10);
  });

  it('grades nothing when there are no screens', () => {
    const result = cropRuntime.tickGradingScreens(
      [],
      () => ({ onDeck: true, alongFraction: 0, surfaceY: 0 }),
      () => 1,
      1 / 60,
      () => 0,
    );
    expect(result.gradedKg).toBe(0);
  });
});
