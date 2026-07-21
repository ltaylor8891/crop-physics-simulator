import type { ElevatorProperties } from '../../types/elements';

/**
 * Parametric bucket-elevator visual (docs/ROADMAP.md §Stage 11).
 * Abstracted casing + head + discharge spout — buckets are not shown.
 * Spout length matches simulation discharge clearance (~0.2 m past the face).
 */

const LEG_COLOR = '#6a5b4a';
const CASING_COLOR = '#a08b6f';
const HEAD_COLOR = '#8a7760';
const SPOUT_COLOR = '#c4a574';
const INTAKE_COLOR = '#7a6b58';
const SELECTION_COLOR = '#4f9cf0';

const WALL_THICKNESS = 0.06;
const HEAD_OVERHANG = 0.15;
const DISCHARGE_X_CLEARANCE = 0.2;

interface ElevatorMeshProps {
  properties: ElevatorProperties;
  selected: boolean;
}

export function ElevatorMesh({ properties, selected }: ElevatorMeshProps) {
  const { height, footprint } = properties;
  const fx = footprint.x;
  const fz = footprint.z;

  const emissive = selected ? SELECTION_COLOR : '#000000';
  const emissiveIntensity = selected ? 0.35 : 0;
  const material = (color: string) => (
    <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
  );

  const casingHeight = Math.max(height - 0.5, height * 0.85);
  const headHeight = Math.min(0.7, height * 0.12);
  const headY = height - headHeight / 2;
  const spoutLength = fx / 2 + DISCHARGE_X_CLEARANCE;
  const spoutY = height - 0.12;
  const intakeHeight = Math.min(0.45, height * 0.08);

  return (
    <group>
      {/* Four corner uprights */}
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh
          key={`leg-${sx}-${sz}`}
          position={[(sx * fx) / 2 - sx * 0.04, height / 2, (sz * fz) / 2 - sz * 0.04]}
          castShadow
        >
          <boxGeometry args={[0.08, height, 0.08]} />
          {material(LEG_COLOR)}
        </mesh>
      ))}

      {/* Vertical casing */}
      <mesh position={[0, casingHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[fx - WALL_THICKNESS, casingHeight, fz - WALL_THICKNESS]} />
        {material(CASING_COLOR)}
      </mesh>

      {/* Head house */}
      <mesh
        position={[HEAD_OVERHANG / 2, headY, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[fx + HEAD_OVERHANG, headHeight, fz + 0.1]} />
        {material(HEAD_COLOR)}
      </mesh>

      {/* Discharge spout along local +X */}
      <mesh
        position={[spoutLength / 2, spoutY, 0]}
        castShadow
      >
        <boxGeometry args={[spoutLength, 0.16, Math.min(fz * 0.45, 0.45)]} />
        {material(SPOUT_COLOR)}
      </mesh>

      {/* Intake hopper hint at base */}
      <mesh position={[0, intakeHeight / 2, 0]} castShadow>
        <boxGeometry args={[fx * 0.95, intakeHeight, fz * 0.95]} />
        {material(INTAKE_COLOR)}
      </mesh>
    </group>
  );
}
