/**
 * Fixed-size crop body pool (ADR-005 / docs/TECHNICAL_DESIGN.md §Object Pooling).
 * Pure logic — no React/Rapier. Physics bodies are bound separately via cropRuntime.
 */

import type { CropTypeId } from '../types/elements';

export type CropSlotId = number;

export interface CropSlot {
  id: CropSlotId;
  active: boolean;
  cropType: CropTypeId | null;
  massKg: number;
}

export class CropPool {
  readonly capacity: number;
  private readonly slots: CropSlot[];
  /** Free slot ids (LIFO). */
  private readonly free: CropSlotId[];
  private active = 0;

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError(`CropPool capacity must be an integer ≥ 1, got ${capacity}`);
    }
    this.capacity = capacity;
    this.slots = Array.from({ length: capacity }, (_, id) => ({
      id,
      active: false,
      cropType: null,
      massKg: 0,
    }));
    this.free = Array.from({ length: capacity }, (_, id) => capacity - 1 - id);
  }

  get activeCount(): number {
    return this.active;
  }

  get isExhausted(): boolean {
    return this.free.length === 0;
  }

  getSlot(id: CropSlotId): CropSlot {
    const slot = this.slots[id];
    if (!slot) {
      throw new RangeError(`CropPool slot ${id} out of range (capacity ${this.capacity})`);
    }
    return slot;
  }

  /**
   * Reserve a free slot. Returns `null` when exhausted (callers must throttle).
   */
  acquire(cropType: CropTypeId, massKg: number): CropSlotId | null {
    const id = this.free.pop();
    if (id === undefined) return null;
    const slot = this.slots[id]!;
    slot.active = true;
    slot.cropType = cropType;
    slot.massKg = massKg;
    this.active += 1;
    return id;
  }

  release(id: CropSlotId): void {
    const slot = this.getSlot(id);
    if (!slot.active) return;
    slot.active = false;
    slot.cropType = null;
    slot.massKg = 0;
    this.free.push(id);
    this.active -= 1;
  }

  releaseAll(): void {
    for (let id = 0; id < this.capacity; id++) {
      this.release(id);
    }
  }

  /** Active slot ids (for reset / iteration). Order is not significant. */
  activeIds(): CropSlotId[] {
    const ids: CropSlotId[] = [];
    for (const slot of this.slots) {
      if (slot.active) ids.push(slot.id);
    }
    return ids;
  }

  /** Iterate active slots without allocating (per-frame hot path). */
  forEachActive(fn: (id: CropSlotId) => void): void {
    for (let id = 0; id < this.capacity; id++) {
      if (this.slots[id]!.active) fn(id);
    }
  }
}
