import { useEffect, useRef } from 'react';
import { useAfterPhysicsStep } from '@react-three/rapier';
import { CROP_TYPES } from '../elements/cropTypes';
import { cropRuntime, cropSpawnStats } from '../simulation/cropRuntime';
import { defaultCropGeometry } from '../simulation/cropSize';
import {
  countInElevator,
  createElevatorRuntimeState,
  elevatorIntakeSize,
  elevatorTransitSeconds,
  enqueueElevatorTransit,
  tickElevatorDischarge,
  type ElevatorRuntimeState,
} from '../simulation/elevator';
import {
  applyThrottleCap,
  applyThrottleCreditCap,
  createSpawnerRuntimeState,
  tickSpawner,
  type SpawnerRuntimeState,
} from '../simulation/spawning';
import { isPointInsideZone } from '../simulation/zoneVolume';
import { useSceneStore } from '../state/sceneStore';
import { useSimulationStore } from '../state/simulationStore';
import { isElementTypeEnabled } from '../elements/registry';
import type { ElementId, ElevatorElement, SpawnerElement } from '../types/elements';
import { kgPerSecondToTonnesPerHour } from '../utilities/flow';

const PHYSICS_DT = 1 / 60;
const STATS_HZ = 4;

const spawnerAccumulators = new Map<ElementId, SpawnerRuntimeState>();
const elevatorRuntimes = new Map<ElementId, ElevatorRuntimeState>();

/**
 * Fixed-step crop emission, elevators, and floor/zone despawn
 * (docs/ROADMAP.md §Stage 8–11). Does not run while `<Physics paused>`.
 */
export function SpawningSystem() {
  const accumulatorsRef = useRef(spawnerAccumulators);
  const elevatorsRef = useRef(elevatorRuntimes);

  useEffect(() => {
    cropSpawnStats.clearAccumulators = () => {
      spawnerAccumulators.clear();
      elevatorRuntimes.clear();
    };
    return () => {
      cropSpawnStats.clearAccumulators = null;
    };
  }, []);

  useEffect(() => {
    return useSceneStore.subscribe((state) => {
      const liveSpawners = new Set(
        Object.values(state.elements)
          .filter((el): el is SpawnerElement => el.type === 'spawner')
          .map((el) => el.id),
      );
      for (const id of accumulatorsRef.current.keys()) {
        if (!liveSpawners.has(id)) accumulatorsRef.current.delete(id);
      }

      const liveElevators = new Set(
        Object.values(state.elements)
          .filter(
            (el): el is ElevatorElement =>
              el.type === 'elevator' && isElementTypeEnabled('elevator'),
          )
          .map((el) => el.id),
      );
      for (const id of elevatorsRef.current.keys()) {
        if (!liveElevators.has(id)) elevatorsRef.current.delete(id);
      }
    });
  }, []);

  useAfterPhysicsStep(() => {
    if (!cropRuntime.isBound) return;
    const stepStarted = performance.now();

    cropSpawnStats.simulationTime += PHYSICS_DT;
    const simTime = cropSpawnStats.simulationTime;
    const floorDespawnSeconds = useSimulationStore.getState().settings.floorDespawnSeconds;
    const spilled = cropRuntime.tickFloorDespawn(simTime, floorDespawnSeconds);
    if (spilled > 0) {
      cropSpawnStats.spilledMassKg += spilled;
    }

    const elements = useSceneStore.getState().elements;
    const zones: Array<{
      id: string;
      kind: 'collection' | 'despawn';
      position: { x: number; y: number; z: number };
      rotationYaw: number;
      size: { x: number; y: number; z: number };
    }> = [];
    for (const el of Object.values(elements)) {
      if (el.type === 'collectionZone') {
        zones.push({
          id: el.id,
          kind: 'collection',
          position: el.position,
          rotationYaw: el.rotationYaw,
          size: el.properties.size,
        });
      } else if (el.type === 'despawnZone') {
        zones.push({
          id: el.id,
          kind: 'despawn',
          position: el.position,
          rotationYaw: el.rotationYaw,
          size: el.properties.size,
        });
      }
    }

    const zoneResult = cropRuntime.tickZoneDespawn(zones, isPointInsideZone);
    cropSpawnStats.collectedMassKg += zoneResult.collectedKg;
    cropSpawnStats.spilledMassKg += zoneResult.spilledKg;
    if (zoneResult.collectedKg > 0) {
      cropSpawnStats.outWindow.push(simTime, zoneResult.collectedKg);
    }
    for (const [zoneId, kg] of Object.entries(zoneResult.collectedByZoneId)) {
      cropSpawnStats.zoneWindow(zoneId).push(simTime, kg);
    }

    const elevators = Object.values(elements).filter(
      (el): el is ElevatorElement => el.type === 'elevator' && isElementTypeEnabled('elevator'),
    );

    const intakes = elevators.map((el) => ({
      elevatorId: el.id,
      position: el.position,
      rotationYaw: el.rotationYaw,
      size: elevatorIntakeSize(el),
    }));
    const accepted = cropRuntime.tickElevatorIntake(intakes, isPointInsideZone);
    for (const item of accepted) {
      const elev = elements[item.elevatorId];
      if (!elev || elev.type !== 'elevator') continue;
      let runtime = elevatorsRef.current.get(elev.id);
      if (!runtime) {
        runtime = createElevatorRuntimeState();
        elevatorsRef.current.set(elev.id, runtime);
      }
      const next = enqueueElevatorTransit(
        runtime,
        item.cropType,
        cropSpawnStats.simulationTime,
        elevatorTransitSeconds(elev),
      );
      elevatorsRef.current.set(elev.id, next);
    }

    let stepThrottled = false;

    for (const elev of elevators) {
      let runtime = elevatorsRef.current.get(elev.id);
      if (!runtime) {
        runtime = createElevatorRuntimeState();
        elevatorsRef.current.set(elev.id, runtime);
      }

      const tick = tickElevatorDischarge(runtime, elev, cropSpawnStats.simulationTime, PHYSICS_DT);
      let discharged = 0;

      for (const pose of tick.discharges) {
        const preset = CROP_TYPES[pose.cropType];
        const geom = defaultCropGeometry(pose.cropType);
        const handle = cropRuntime.spawn({
          cropType: pose.cropType,
          massKg: geom.massKg,
          friction: preset.friction,
          restitution: preset.restitution,
          position: pose.position,
          velocity: pose.velocity,
          radius: geom.radius,
          halfHeight: geom.halfHeight,
        });
        if (handle === null) {
          stepThrottled = true;
          break;
        }
        discharged += 1;
      }

      if (discharged < tick.requested) {
        const unmet = tick.discharges.slice(discharged);
        elevatorsRef.current.set(elev.id, {
          accumulator: applyThrottleCap(tick.accumulator, tick.requested - discharged),
          queue: [
            ...unmet.map((d) => ({
              cropType: d.cropType,
              readyAt: cropSpawnStats.simulationTime,
            })),
            ...tick.queue,
          ],
        });
        stepThrottled = true;
      } else {
        elevatorsRef.current.set(elev.id, {
          accumulator: tick.accumulator,
          queue: tick.queue,
        });
      }
    }

    const spawners = Object.values(elements).filter(
      (el): el is SpawnerElement => el.type === 'spawner',
    );

    let stepSpawnedKg = 0;
    for (const spawner of spawners) {
      let state = accumulatorsRef.current.get(spawner.id);
      if (!state) {
        state = createSpawnerRuntimeState();
        accumulatorsRef.current.set(spawner.id, state);
      }

      const tick = tickSpawner(state, spawner, PHYSICS_DT);
      const preset = CROP_TYPES[spawner.properties.cropType];
      let spawned = 0;
      let unmetMassKg = 0;

      for (const pose of tick.poses) {
        const handle = cropRuntime.spawn({
          cropType: spawner.properties.cropType,
          massKg: pose.massKg,
          friction: preset.friction,
          restitution: preset.restitution,
          position: pose.position,
          velocity: pose.velocity,
          radius: pose.radius,
          halfHeight: pose.halfHeight,
        });

        if (handle === null) {
          unmetMassKg += pose.massKg;
          for (let i = spawned + 1; i < tick.poses.length; i++) {
            unmetMassKg += tick.poses[i]!.massKg;
          }
          stepThrottled = true;
          break;
        }
        spawned += 1;
        cropSpawnStats.massSpawnedKg += pose.massKg;
        stepSpawnedKg += pose.massKg;
      }

      if (spawned < tick.requested) {
        state.creditKg = applyThrottleCreditCap(tick.creditKg, unmetMassKg);
        stepThrottled = true;
      } else {
        state.creditKg = tick.creditKg;
      }
    }

    if (stepSpawnedKg > 0) {
      cropSpawnStats.inWindow.push(simTime, stepSpawnedKg);
    }

    const throttled = stepThrottled || cropRuntime.pool.isExhausted;
    const inElevator = countInElevator(elevatorsRef.current.values());
    cropSpawnStats.lastPhysicsStepMs = performance.now() - stepStarted;

    cropSpawnStats.statsAge += PHYSICS_DT;
    if (cropSpawnStats.statsAge >= 1 / STATS_HZ) {
      cropSpawnStats.statsAge = 0;
      const prev = useSimulationStore.getState().statistics;
      const liveZoneIds = new Set(
        Object.values(elements)
          .filter((el) => el.type === 'collectionZone')
          .map((el) => el.id),
      );
      for (const id of cropSpawnStats.zoneOutWindows.keys()) {
        if (!liveZoneIds.has(id)) cropSpawnStats.zoneOutWindows.delete(id);
      }
      const collectedTphByZoneId: Record<string, number> = {};
      for (const id of liveZoneIds) {
        collectedTphByZoneId[id] = kgPerSecondToTonnesPerHour(
          cropSpawnStats.zoneWindow(id).rateKgPerSecond(simTime),
        );
      }
      useSimulationStore.getState().setStatistics({
        ...prev,
        activeCrops: cropRuntime.pool.activeCount,
        inElevator,
        totalMassSpawnedKg: cropSpawnStats.massSpawnedKg,
        spilledMassKg: cropSpawnStats.spilledMassKg,
        throughputInTph: kgPerSecondToTonnesPerHour(
          cropSpawnStats.inWindow.rateKgPerSecond(simTime),
        ),
        throughputCollectedTph: kgPerSecondToTonnesPerHour(
          cropSpawnStats.outWindow.rateKgPerSecond(simTime),
        ),
        collectedTphByZoneId,
        throttled,
        physicsStepMs: cropSpawnStats.lastPhysicsStepMs,
      });
    }
  });

  return null;
}
