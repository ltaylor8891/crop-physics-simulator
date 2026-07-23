import { useMemo } from 'react';
import type { ConveyorProperties } from '../../types/elements';
import { degreesToRadians } from '../../utilities/units';
import {
  BELT_THICKNESS,
  computeChevronPositions,
  computeLegs,
  DIVERTER_HEIGHT,
  DIVERTER_THICKNESS,
  diverterPlacement,
  RAIL_HEIGHT,
  RAIL_WIDTH,
  SKIRT_HEIGHT,
  SKIRT_THICKNESS,
} from './conveyorGeometry';

/**
 * Parametric conveyor visuals (docs/ROADMAP.md §Stage 5). Geometry maths lives
 * in conveyorGeometry.ts; this component only renders it. The belt assembly
 * pivots about the infeed end (−length/2) at `beltHeight`; legs stay vertical.
 */

const LEG_WIDTH = 0.08;
const CHEVRON_ARM_WIDTH = 0.06;
const CHEVRON_THICKNESS = 0.012;

const BELT_COLOR = '#2f3338';
const FRAME_COLOR = '#55606a';
const SKIRT_COLOR = '#46525c';
const CHEVRON_COLOR = '#e0b45c';
const DIVERTER_COLOR = '#c98a3c';
const SELECTION_COLOR = '#4f9cf0';

interface ConveyorMeshProps {
  properties: ConveyorProperties;
  selected: boolean;
}

export function ConveyorMesh({ properties, selected }: ConveyorMeshProps) {
  const { length, width, beltHeight, inclineDeg, skirts, showLegs, diverter } = properties;
  const inclineRad = degreesToRadians(inclineDeg);

  const legs = useMemo(
    () => (showLegs ? computeLegs(length, beltHeight, inclineRad) : []),
    [showLegs, length, beltHeight, inclineRad],
  );
  const chevrons = useMemo(() => computeChevronPositions(length), [length]);
  const diverterPlace = useMemo(
    () => diverterPlacement(length, diverter.offsetAlongBelt),
    [length, diverter.offsetAlongBelt],
  );

  const emissive = selected ? SELECTION_COLOR : '#000000';
  const emissiveIntensity = selected ? 0.35 : 0;
  const material = (color: string) => (
    <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
  );

  // Chevron arms form a "V" whose tip points along +X (the flow direction).
  const armLength = Math.min(width * 0.5, 0.4);
  const armOffset = (armLength / 2) * (Math.SQRT2 / 2);
  const chevronY = CHEVRON_THICKNESS / 2 + 0.004; // just proud of the belt surface

  return (
    <group>
      {legs.map((leg) => (
        <mesh key={leg.x} position={[leg.x, leg.height / 2, 0]} castShadow>
          <boxGeometry args={[LEG_WIDTH, leg.height, width * 0.7]} />
          {material(FRAME_COLOR)}
        </mesh>
      ))}

      {/* Belt assembly, pivoting about the infeed end at belt-top height. */}
      <group position={[-length / 2, beltHeight, 0]} rotation={[0, 0, inclineRad]}>
        <group position={[length / 2, 0, 0]}>
          {/* Belt surface (top face at local y = 0). */}
          <mesh position={[0, -BELT_THICKNESS / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[length, BELT_THICKNESS, width]} />
            {material(BELT_COLOR)}
          </mesh>

          {/* Frame rails under the belt edges. */}
          {[-1, 1].map((side) => (
            <mesh
              key={`rail-${side}`}
              position={[
                0,
                -(BELT_THICKNESS + RAIL_HEIGHT / 2),
                side * (width / 2 + RAIL_WIDTH / 2),
              ]}
              castShadow
            >
              <boxGeometry args={[length, RAIL_HEIGHT, RAIL_WIDTH]} />
              {material(FRAME_COLOR)}
            </mesh>
          ))}

          {/* Side skirts above the belt surface. */}
          {skirts &&
            [-1, 1].map((side) => (
              <mesh
                key={`skirt-${side}`}
                position={[0, SKIRT_HEIGHT / 2, side * (width / 2 + SKIRT_THICKNESS / 2)]}
                castShadow
              >
                <boxGeometry args={[length, SKIRT_HEIGHT, SKIRT_THICKNESS]} />
                {material(SKIRT_COLOR)}
              </mesh>
            ))}

          {/* Direction chevrons on the belt, tips pointing to the discharge (+X). */}
          {chevrons.map((tipX) =>
            [-1, 1].map((side) => (
              <mesh
                key={`chevron-${tipX}-${side}`}
                position={[tipX - armOffset, chevronY, side * armOffset]}
                rotation={[0, side * (Math.PI / 4), 0]}
              >
                <boxGeometry args={[armLength, CHEVRON_THICKNESS, CHEVRON_ARM_WIDTH]} />
                {material(CHEVRON_COLOR)}
              </mesh>
            )),
          )}

          {/* Diverter high-side wall on the belt surface (length 0 = none). */}
          {diverter.length > 0 && (
            <mesh
              position={[diverterPlace.innerX, diverterPlace.innerY, 0]}
              rotation={[0, degreesToRadians(diverter.angleDeg), 0]}
              castShadow
            >
              <boxGeometry args={[diverter.length, DIVERTER_HEIGHT, DIVERTER_THICKNESS]} />
              {material(DIVERTER_COLOR)}
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
}
