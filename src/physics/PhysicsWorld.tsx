import { Physics } from '@react-three/rapier';
import { useSimulationStore } from '../state/simulationStore';
import { ConveyorColliders } from './ConveyorColliders';
import { DebugBalls } from './DebugBalls';
import { GroundCollider } from './GroundCollider';

/**
 * Rapier world for the scene (docs/TECHNICAL_DESIGN.md §Physics Architecture).
 * Fixed 1/60 s timestep (ADR-004); paused when the simulation is not running.
 */
export function PhysicsWorld() {
  const running = useSimulationStore((s) => s.running);
  const gravity = useSimulationStore((s) => s.settings.gravity);

  return (
    <Physics
      paused={!running}
      timeStep={1 / 60}
      gravity={[0, -gravity, 0]}
      interpolate
      colliders={false}
    >
      <GroundCollider />
      <ConveyorColliders />
      <DebugBalls />
    </Physics>
  );
}
