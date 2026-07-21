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
import { useSceneStore } from '../state/sceneStore';
import { useSimulationStore } from '../state/simulationStore';
import type { ElementId, SpawnerElement } from '../types/elements';

const PHYSICS_DT = 1 / 60;
const STATS_HZ = 4;

const spawnerAccumulators = new Map<ElementId, SpawnerRuntimeState>();

/**
 * Fixed-step crop emission for every enabled spawner (docs/ROADMAP.md §Stage 8).
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
    const elements = useSceneStore.getState().elements;
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
        const slotId = cropRuntime.spawn({
          cropType: spawner.properties.cropType,
          massKg: preset.mass,
          friction: preset.friction,
          restitution: preset.restitution,
          radius: preset.collider.radius,
          color: preset.color,
          position: pose.position,
          velocity: pose.velocity,
        });

        if (slotId === null) {
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
      const prev = useSimulationStore.getState().statistics;
      useSimulationStore.getState().setStatistics({
        ...prev,
        activeCrops: cropRuntime.pool.activeCount,
        totalMassSpawnedKg: cropSpawnStats.massSpawnedKg,
        throttled,
      });
    }
  });

  return null;
}
