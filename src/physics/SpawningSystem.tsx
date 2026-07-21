import { useEffect, useRef } from 'react';
import { useAfterPhysicsStep } from '@react-three/rapier';
import { CROP_TYPES } from '../elements/cropTypes';
import { cropRuntime, cropSpawnStats } from '../simulation/cropRuntime';
import {
  applyThrottleCap,
  createSpawnerRuntimeState,
  tickSpawner,
  type SpawnerRuntimeState,
} from '../simulation/spawning';
import { isPointInsideZone } from '../simulation/zoneVolume';
import { useSceneStore } from '../state/sceneStore';
import { useSimulationStore } from '../state/simulationStore';
import type { ElementId, SpawnerElement } from '../types/elements';
import { kgPerSecondToTonnesPerHour } from '../utilities/flow';

const PHYSICS_DT = 1 / 60;
const STATS_HZ = 4;

const spawnerAccumulators = new Map<ElementId, SpawnerRuntimeState>();

/**
 * Fixed-step crop emission + floor/zone despawn (docs/ROADMAP.md §Stage 8–10).
 * Does not run while `<Physics paused>` — play/pause gates spawning automatically.
 */
export function SpawningSystem() {
  const accumulatorsRef = useRef(spawnerAccumulators);

  useEffect(() => {
    cropSpawnStats.clearAccumulators = () => {
      spawnerAccumulators.clear();
    };
    return () => {
      cropSpawnStats.clearAccumulators = null;
    };
  }, []);

  useEffect(() => {
    return useSceneStore.subscribe((state) => {
      const live = new Set(
        Object.values(state.elements)
          .filter((el): el is SpawnerElement => el.type === 'spawner')
          .map((el) => el.id),
      );
      for (const id of accumulatorsRef.current.keys()) {
        if (!live.has(id)) accumulatorsRef.current.delete(id);
      }
    });
  }, []);

  useAfterPhysicsStep(() => {
    if (!cropRuntime.isBound) return;

    cropSpawnStats.simulationTime += PHYSICS_DT;
    const floorDespawnSeconds = useSimulationStore.getState().settings.floorDespawnSeconds;
    const spilled = cropRuntime.tickFloorDespawn(
      cropSpawnStats.simulationTime,
      floorDespawnSeconds,
    );
    if (spilled > 0) {
      cropSpawnStats.spilledMassKg += spilled;
    }

    const elements = useSceneStore.getState().elements;
    const zones: Array<{
      kind: 'collection' | 'despawn';
      position: { x: number; y: number; z: number };
      rotationYaw: number;
      size: { x: number; y: number; z: number };
    }> = [];
    for (const el of Object.values(elements)) {
      if (el.type === 'collectionZone') {
        zones.push({
          kind: 'collection',
          position: el.position,
          rotationYaw: el.rotationYaw,
          size: el.properties.size,
        });
      } else if (el.type === 'despawnZone') {
        zones.push({
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

    const spawners = Object.values(elements).filter(
      (el): el is SpawnerElement => el.type === 'spawner',
    );

    let stepThrottled = false;

    for (const spawner of spawners) {
      let state = accumulatorsRef.current.get(spawner.id);
      if (!state) {
        state = createSpawnerRuntimeState();
        accumulatorsRef.current.set(spawner.id, state);
      }

      const tick = tickSpawner(state, spawner, PHYSICS_DT);
      const preset = CROP_TYPES[spawner.properties.cropType];
      let spawned = 0;

      for (const pose of tick.poses) {
        const handle = cropRuntime.spawn({
          cropType: spawner.properties.cropType,
          massKg: preset.mass,
          friction: preset.friction,
          restitution: preset.restitution,
          position: pose.position,
          velocity: pose.velocity,
        });

        if (handle === null) {
          stepThrottled = true;
          break;
        }
        spawned += 1;
        cropSpawnStats.massSpawnedKg += preset.mass;
      }

      if (spawned < tick.requested) {
        state.accumulator = applyThrottleCap(
          tick.accumulator,
          tick.requested - spawned,
        );
        stepThrottled = true;
      } else {
        state.accumulator = tick.accumulator;
      }
    }

    const throttled = stepThrottled || cropRuntime.pool.isExhausted;

    cropSpawnStats.statsAge += PHYSICS_DT;
    if (cropSpawnStats.statsAge >= 1 / STATS_HZ) {
      cropSpawnStats.statsAge = 0;
      const t = cropSpawnStats.simulationTime;
      const prev = useSimulationStore.getState().statistics;
      useSimulationStore.getState().setStatistics({
        ...prev,
        activeCrops: cropRuntime.pool.activeCount,
        totalMassSpawnedKg: cropSpawnStats.massSpawnedKg,
        spilledMassKg: cropSpawnStats.spilledMassKg,
        throughputInTph:
          t > 0 ? kgPerSecondToTonnesPerHour(cropSpawnStats.massSpawnedKg / t) : 0,
        throughputCollectedTph:
          t > 0 ? kgPerSecondToTonnesPerHour(cropSpawnStats.collectedMassKg / t) : 0,
        throttled,
      });
    }
  });

  return null;
}
