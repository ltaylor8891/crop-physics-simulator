/**
 * Elevator transit + rate-capped discharge (docs/PHYSICS_SPECIFICATION.md §Elevator).
 * Pure — no React/Rapier. Wired from SpawningSystem on the physics step.
 */

import type { CropTypeId, ElevatorElement, Vec3 } from '../types/elements';
import { advanceSpawnAccumulator, cropsPerSecond } from '../utilities/flow';
import { defaultCropGeometry, type RandomFn } from './cropSize';
import {
  SPAWN_BASE_DOWNWARD_SPEED,
  SPAWN_VELOCITY_JITTER_HORIZONTAL,
  SPAWN_VELOCITY_JITTER_VERTICAL,
} from './spawning';

/** Intake sensor height above footprint base (m). */
export const ELEVATOR_INTAKE_HEIGHT = 0.8;

/**
 * Discharge point local +X offset past the column face (m), so crops clear the
 * head before falling.
 */
export const ELEVATOR_DISCHARGE_X_CLEARANCE = 0.2;

export interface ElevatorTransitItem {
  cropType: CropTypeId;
  /** Simulation time when the crop becomes eligible for discharge. */
  readyAt: number;
}

export interface ElevatorRuntimeState {
  accumulator: number;
  queue: ElevatorTransitItem[];
}

export interface ElevatorDischargePose {
  cropType: CropTypeId;
  position: Vec3;
  velocity: Vec3;
}

export interface ElevatorDischargeTickResult {
  accumulator: number;
  queue: ElevatorTransitItem[];
  /** Crops this step wants to emit (before pool throttling). */
  requested: number;
  discharges: ElevatorDischargePose[];
}

export function createElevatorRuntimeState(): ElevatorRuntimeState {
  return { accumulator: 0, queue: [] };
}

/** Transit delay in seconds: height / transportSpeed. */
export function elevatorTransitSeconds(elevator: ElevatorElement): number {
  const { height, transportSpeed } = elevator.properties;
  if (transportSpeed <= 0) return Number.POSITIVE_INFINITY;
  return height / transportSpeed;
}

/** Intake AABB size (origin = footprint centre at base). */
export function elevatorIntakeSize(elevator: ElevatorElement): Vec3 {
  const { footprint } = elevator.properties;
  return { x: footprint.x, y: ELEVATOR_INTAKE_HEIGHT, z: footprint.z };
}

/**
 * World-space discharge point: top of column, offset local +X past the face.
 */
export function elevatorDischargePosition(elevator: ElevatorElement): Vec3 {
  const { height, footprint } = elevator.properties;
  const localX = footprint.x / 2 + ELEVATOR_DISCHARGE_X_CLEARANCE;
  const cos = Math.cos(elevator.rotationYaw);
  const sin = Math.sin(elevator.rotationYaw);
  return {
    x: elevator.position.x + localX * cos,
    y: elevator.position.y + height,
    z: elevator.position.z - localX * sin,
  };
}

/**
 * Horizontal `dischargeVelocity` along local +X, plus small downward component
 * and the same jitter magnitudes as spawners.
 */
export function sampleDischargeVelocity(
  elevator: ElevatorElement,
  random: RandomFn = Math.random,
): Vec3 {
  const speed = elevator.properties.dischargeVelocity;
  const cos = Math.cos(elevator.rotationYaw);
  const sin = Math.sin(elevator.rotationYaw);
  const jitterX = (random() - 0.5) * 2 * SPAWN_VELOCITY_JITTER_HORIZONTAL;
  const jitterZ = (random() - 0.5) * 2 * SPAWN_VELOCITY_JITTER_HORIZONTAL;
  const jitterY = (random() - 0.5) * 2 * SPAWN_VELOCITY_JITTER_VERTICAL;
  return {
    x: speed * cos + jitterX,
    y: -SPAWN_BASE_DOWNWARD_SPEED + jitterY,
    z: -speed * sin + jitterZ,
  };
}

/** Enqueue a crop that just entered the intake. */
export function enqueueElevatorTransit(
  state: ElevatorRuntimeState,
  cropType: CropTypeId,
  simulationTime: number,
  transitSeconds: number,
): ElevatorRuntimeState {
  return {
    ...state,
    queue: [...state.queue, { cropType, readyAt: simulationTime + transitSeconds }],
  };
}

/**
 * Advance discharge rate credit and emit poses for ready queue heads.
 * FIFO: only crops whose `readyAt` has elapsed and that sit at the front may leave.
 */
export function tickElevatorDischarge(
  state: ElevatorRuntimeState,
  elevator: ElevatorElement,
  simulationTime: number,
  dtSeconds: number,
  random: RandomFn = Math.random,
): ElevatorDischargeTickResult {
  const queue = state.queue.slice();
  if (dtSeconds <= 0 || elevator.properties.dischargeRateCap <= 0) {
    return {
      accumulator: state.accumulator,
      queue,
      requested: 0,
      discharges: [],
    };
  }

  const readyCount = countReadyFromFront(queue, simulationTime);
  if (readyCount === 0) {
    return {
      accumulator: state.accumulator,
      queue,
      requested: 0,
      discharges: [],
    };
  }

  const headType = queue[0]!.cropType;
  const headMass = defaultCropGeometry(headType).massKg;
  const rate = cropsPerSecond(elevator.properties.dischargeRateCap, headMass);
  const { spawnCount, accumulator } = advanceSpawnAccumulator(state.accumulator, rate, dtSeconds);

  const toEmit = Math.min(spawnCount, readyCount);
  const discharges: ElevatorDischargePose[] = [];
  for (let i = 0; i < toEmit; i++) {
    const item = queue.shift()!;
    discharges.push({
      cropType: item.cropType,
      position: elevatorDischargePosition(elevator),
      velocity: sampleDischargeVelocity(elevator, random),
    });
  }

  return {
    accumulator,
    queue,
    requested: toEmit,
    discharges,
  };
}

function countReadyFromFront(
  queue: ReadonlyArray<ElevatorTransitItem>,
  simulationTime: number,
): number {
  let n = 0;
  for (const item of queue) {
    if (item.readyAt > simulationTime) break;
    n += 1;
  }
  return n;
}

/** Total crops currently in transit across a set of elevator runtimes. */
export function countInElevator(states: Iterable<ElevatorRuntimeState>): number {
  let n = 0;
  for (const state of states) {
    n += state.queue.length;
  }
  return n;
}
