import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSimulationStore } from '../state/simulationStore';

const REPORT_HZ = 4;

/**
 * Samples render FPS inside the R3F loop and patches statistics at ~4 Hz
 * (docs/ROADMAP.md §Stage 13). Does not touch throughput fields.
 */
export function FpsReporter() {
  const framesRef = useRef(0);
  const ageRef = useRef(0);

  useFrame((_, dt) => {
    framesRef.current += 1;
    ageRef.current += dt;
    if (ageRef.current < 1 / REPORT_HZ) return;
    const fps = framesRef.current / ageRef.current;
    framesRef.current = 0;
    ageRef.current = 0;
    useSimulationStore.getState().patchStatistics({ fps });
  });

  return null;
}
