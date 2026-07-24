import { useMemo } from 'react';
import type { HopperProperties } from '../../types/elements';
import { hopperWalls } from './hopperGeometry';

/**
 * Hopper visuals (docs/DEVELOP_PROGRAM.md Phase B): open-top box of wall slabs,
 * no floor. Walls come from the pure `hopperWalls` helper so mesh and colliders
 * stay in sync.
 */

const WALL_COLOR = '#6f7a86';
const SELECTION_COLOR = '#4f9cf0';

interface HopperMeshProps {
  properties: HopperProperties;
  selected: boolean;
}

export function HopperMesh({ properties, selected }: HopperMeshProps) {
  const { footprint, height, wallThickness, backstopOnly } = properties;
  const walls = useMemo(
    () => hopperWalls(footprint, height, wallThickness, backstopOnly),
    [footprint, height, wallThickness, backstopOnly],
  );

  const emissive = selected ? SELECTION_COLOR : '#000000';
  const emissiveIntensity = selected ? 0.35 : 0;

  return (
    <group>
      {walls.map((wall, i) => (
        <mesh
          key={i}
          position={[wall.center.x, wall.center.y, wall.center.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[wall.size.x, wall.size.y, wall.size.z]} />
          <meshStandardMaterial
            color={WALL_COLOR}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      ))}
    </group>
  );
}
