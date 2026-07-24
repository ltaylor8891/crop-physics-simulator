import type { ChuteProperties } from '../../types/elements';
import { degreesToRadians } from '../../utilities/units';
import { CHUTE_THICKNESS } from './chuteGeometry';

/**
 * Chute visuals (docs/DEVELOP_PROGRAM.md Phase B). A flat sloped deck that pivots
 * about the infeed (−X) end at `topHeight` and slopes down toward the discharge.
 * Geometry convention matches ConveyorMesh's nested-group pivot.
 */

const DECK_COLOR = '#8a94a0';
const SELECTION_COLOR = '#4f9cf0';

interface ChuteMeshProps {
  properties: ChuteProperties;
  selected: boolean;
}

export function ChuteMesh({ properties, selected }: ChuteMeshProps) {
  const { length, width, angleDeg, topHeight } = properties;
  // Down-slope toward +X: negative incline lowers the discharge end.
  const inclineRad = degreesToRadians(-angleDeg);

  const emissive = selected ? SELECTION_COLOR : '#000000';
  const emissiveIntensity = selected ? 0.35 : 0;

  return (
    <group position={[-length / 2, topHeight, 0]} rotation={[0, 0, inclineRad]}>
      <group position={[length / 2, 0, 0]}>
        {/* Deck surface (top face at local y = 0). */}
        <mesh position={[0, -CHUTE_THICKNESS / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[length, CHUTE_THICKNESS, width]} />
          <meshStandardMaterial
            color={DECK_COLOR}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      </group>
    </group>
  );
}
