import { Physics } from '@react-three/rapier';
import { useSimulationStore } from '../state/simulationStore';
import { ChuteColliders } from './ChuteColliders';
import { ConveyorColliders } from './ConveyorColliders';
import { CropBodies } from './CropBodies';
import { DebugBalls } from './DebugBalls';
import { GradingScreenColliders } from './GradingScreenColliders';
import { GroundCollider } from './GroundCollider';
import { HopperColliders } from './HopperColliders';
import { SpawningSystem } from './SpawningSystem';

/**
 * Rapier world for the scene (docs/TECHNICAL_DESIGN.md §Physics Architecture).
 * Fixed 1/60 s timestep (ADR-004); paused when the simulation is not running.
 * Render interpolation is off (ADR-017) — with pooled crops it snapshots every
 * rigid body each step and kept the sim lagging after Reset.
 */
export function PhysicsWorld() {
  const running = useSimulationStore((s) => s.running);
  const gravity = useSimulationStore((s) => s.settings.gravity);

  return (
    <Physics
      paused={!running}
      timeStep={1 / 60}
      gravity={[0, -gravity, 0]}
      interpolate={false}
      colliders={false}
    >
      <GroundCollider />
      <ConveyorColliders />
      <ChuteColliders />
      <HopperColliders />
      <GradingScreenColliders />
      <CropBodies />
      <SpawningSystem />
      <DebugBalls />
    </Physics>
  );
}
