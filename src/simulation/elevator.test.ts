import { describe, expect, it } from 'vitest';
import { CROP_TYPES } from '../elements/cropTypes';
import type { ElevatorElement } from '../types/elements';
import { kgPerSecondToTonnesPerHour, tonnesPerHourToKgPerSecond } from '../utilities/flow';
import {
  countInElevator,
  createElevatorRuntimeState,
  ELEVATOR_DISCHARGE_X_CLEARANCE,
  ELEVATOR_INTAKE_HEIGHT,
  elevatorDischargePosition,
  elevatorIntakeSize,
  elevatorTransitSeconds,
  enqueueElevatorTransit,
  sampleDischargeVelocity,
  tickElevatorDischarge,
} from './elevator';
import { applyThrottleCap, THROTTLED_ACCUMULATOR_CAP } from './spawning';

function makeElevator(
  overrides?: Partial<ElevatorElement['properties']> & {
    position?: ElevatorElement['position'];
    rotationYaw?: number;
  },
): ElevatorElement {
  const { position, rotationYaw, ...properties } = overrides ?? {};
  return {
    id: 'el_elevator0001',
    type: 'elevator',
    name: 'Elevator 1',
    position: position ?? { x: 0, y: 0, z: 0 },
    rotationYaw: rotationYaw ?? 0,
    properties: {
      height: 8,
      footprint: { x: 1.2, z: 1.2 },
      transportSpeed: 2,
      dischargeRateCap: 60,
      dischargeVelocity: 1.5,
      ...properties,
    },
  };
}

describe('elevatorTransitSeconds', () => {
  it('is height / transportSpeed', () => {
    expect(elevatorTransitSeconds(makeElevator({ height: 8, transportSpeed: 2 }))).toBe(4);
  });
});

describe('elevator geometry', () => {
  it('intake uses footprint and fixed sensor height', () => {
    expect(elevatorIntakeSize(makeElevator())).toEqual({
      x: 1.2,
      y: ELEVATOR_INTAKE_HEIGHT,
      z: 1.2,
    });
  });

  it('discharge sits at height, offset local +X past the face', () => {
    const elev = makeElevator({
      height: 8,
      footprint: { x: 1.2, z: 1.2 },
      position: { x: 10, y: 0, z: 5 },
      rotationYaw: 0,
    });
    const p = elevatorDischargePosition(elev);
    expect(p.x).toBeCloseTo(10 + 0.6 + ELEVATOR_DISCHARGE_X_CLEARANCE, 6);
    expect(p.y).toBeCloseTo(8, 6);
    expect(p.z).toBeCloseTo(5, 6);
  });

  it('yaws discharge position and velocity along local +X', () => {
    const yaw = Math.PI / 2;
    const elev = makeElevator({
      height: 4,
      footprint: { x: 2, z: 2 },
      dischargeVelocity: 2,
      position: { x: 0, y: 0, z: 0 },
      rotationYaw: yaw,
    });
    const p = elevatorDischargePosition(elev);
    // local +X at +90° yaw → world −Z
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(4, 6);
    expect(p.z).toBeCloseTo(-(1 + ELEVATOR_DISCHARGE_X_CLEARANCE), 6);

    const v = sampleDischargeVelocity(elev, () => 0.5);
    expect(v.x).toBeCloseTo(0, 6);
    expect(v.z).toBeCloseTo(-2, 6);
    expect(v.y).toBeLessThan(0);
  });
});

describe('tickElevatorDischarge', () => {
  it('holds crops until transit time elapses', () => {
    const elev = makeElevator({ height: 8, transportSpeed: 2, dischargeRateCap: 500 });
    let state = createElevatorRuntimeState();
    state = enqueueElevatorTransit(state, 'potato', 0, elevatorTransitSeconds(elev));

    let tick = tickElevatorDischarge(state, elev, 3.9, 1 / 60, () => 0.5);
    expect(tick.requested).toBe(0);
    expect(tick.queue).toHaveLength(1);

    state = { accumulator: tick.accumulator, queue: tick.queue };
    tick = tickElevatorDischarge(state, elev, 4.0, 1 / 60, () => 0.5);
    // Rate may need a few steps; force with large dt credit via high cap + enough time
    // At 500 t/h potato (0.25 kg): crops/s = (500*1000/3600)/0.25 ≈ 555 → many per step
    expect(tick.requested).toBeGreaterThanOrEqual(1);
    expect(tick.discharges[0]?.cropType).toBe('potato');
    expect(tick.queue).toHaveLength(0);
  });

  it('rate-caps long-run discharge mass within 1%', () => {
    const cap = 40;
    const elev = makeElevator({
      height: 0.01,
      transportSpeed: 100,
      dischargeRateCap: cap,
    });
    const mass = CROP_TYPES.potato.mass;
    let state = createElevatorRuntimeState();
    const duration = 30;
    const dt = 1 / 60;
    const steps = Math.round(duration / dt);
    let discharged = 0;
    let simTime = 0;

    for (let i = 0; i < steps; i++) {
      // Keep the queue topped up so the cap is the only limiter.
      while (state.queue.length < 20) {
        state = enqueueElevatorTransit(state, 'potato', simTime, 0);
      }
      const tick = tickElevatorDischarge(state, elev, simTime, dt, () => 0.5);
      state = { accumulator: tick.accumulator, queue: tick.queue };
      discharged += tick.requested;
      simTime += dt;
    }

    const massKg = discharged * mass;
    const impliedTph = kgPerSecondToTonnesPerHour(massKg / duration);
    expect(impliedTph).toBeGreaterThan(cap * 0.99);
    expect(impliedTph).toBeLessThan(cap * 1.01);
    expect(massKg).toBeCloseTo(tonnesPerHourToKgPerSecond(cap) * duration, 0);
  });

  it('FIFO: later arrivals wait behind earlier ones', () => {
    const elev = makeElevator({
      height: 1,
      transportSpeed: 100,
      dischargeRateCap: 0.1, // very slow — one crop needs many steps
    });
    let state = createElevatorRuntimeState();
    state = enqueueElevatorTransit(state, 'potato', 0, 0);
    state = enqueueElevatorTransit(state, 'wheatClump', 0, 0);

    // Advance until exactly one discharge is requested
    let simTime = 0;
    let firstType: string | undefined;
    for (let i = 0; i < 10_000 && firstType === undefined; i++) {
      const tick = tickElevatorDischarge(state, elev, simTime, 1 / 60, () => 0.5);
      state = { accumulator: tick.accumulator, queue: tick.queue };
      if (tick.requested > 0) {
        firstType = tick.discharges[0]!.cropType;
        expect(tick.requested).toBe(1);
        expect(tick.queue).toHaveLength(1);
        expect(tick.queue[0]!.cropType).toBe('wheatClump');
      }
      simTime += 1 / 60;
    }
    expect(firstType).toBe('potato');
  });
});

describe('countInElevator', () => {
  it('sums queue lengths', () => {
    const a = createElevatorRuntimeState();
    const b = enqueueElevatorTransit(createElevatorRuntimeState(), 'potato', 0, 1);
    const c = enqueueElevatorTransit(
      enqueueElevatorTransit(createElevatorRuntimeState(), 'potato', 0, 1),
      'wheatClump',
      0,
      1,
    );
    expect(countInElevator([a, b, c])).toBe(3);
  });
});

describe('throttle cap reuse', () => {
  it('still caps elevator leftover credit', () => {
    expect(applyThrottleCap(0.3, 4)).toBe(THROTTLED_ACCUMULATOR_CAP);
  });
});
