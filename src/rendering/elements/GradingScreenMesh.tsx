import { useMemo } from 'react';
import type { GradingScreenProperties } from '../../types/elements';
import { degreesToRadians } from '../../utilities/units';
import {
  BELT_THICKNESS,
  computeChevronPositions,
  computeLegs,
  RAIL_HEIGHT,
  RAIL_WIDTH,
  SKIRT_HEIGHT,
  SKIRT_THICKNESS,
} from './conveyorGeometry';

/**
 * Grading-screen visuals (docs/DEVELOP_PROGRAM.md Phase C). A conveyor-like deck
 * with transverse slats to read as a screen; geometry mirrors ConveyorMesh's
 * infeed-pivot convention. Belt-carry + drop-through are handled in physics/sim.
 */

const LEG_WIDTH = 0.08;
const CHEVRON_ARM_WIDTH = 0.06;
const CHEVRON_THICKNESS = 0.012;
const SLAT_THICKNESS = 0.03;
const SLAT_HEIGHT = 0.02;
const SLAT_SPACING = 0.35;

const DECK_COLOR = '#3b444d';
const FRAME_COLOR = '#5b6b78';
const SLAT_COLOR = '#7d8b96';
const SKIRT_COLOR = '#46525c';
const CHEVRON_COLOR = '#e0b45c';
const SELECTION_COLOR = '#4f9cf0';

interface GradingScreenMeshProps {
  properties: GradingScreenProperties;
  selected: boolean;
}

export function GradingScreenMesh({ properties, selected }: GradingScreenMeshProps) {
  const { length, width, beltHeight, inclineDeg, skirts } = properties;
  const inclineRad = degreesToRadians(inclineDeg);

  const legs = useMemo(
    () => computeLegs(length, beltHeight, inclineRad),
    [length, beltHeight, inclineRad],
  );
  const chevrons = useMemo(() => computeChevronPositions(length), [length]);
  const slats = useMemo(() => {
    const count = Math.max(1, Math.floor(length / SLAT_SPACING));
    const spacing = length / count;
    return Array.from({ length: count }, (_, i) => -length / 2 + spacing * (i + 0.5));
  }, [length]);

  const emissive = selected ? SELECTION_COLOR : '#000000';
  const emissiveIntensity = selected ? 0.35 : 0;
  const material = (color: string) => (
    <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
  );

  const armLength = Math.min(width * 0.5, 0.4);
  const armOffset = (armLength / 2) * (Math.SQRT2 / 2);
  const chevronY = CHEVRON_THICKNESS / 2 + 0.028;

  return (
    <group>
      {legs.map((leg) => (
        <mesh key={leg.x} position={[leg.x, leg.height / 2, 0]} castShadow>
          <boxGeometry args={[LEG_WIDTH, leg.height, width * 0.7]} />
          {material(FRAME_COLOR)}
        </mesh>
      ))}

      <group position={[-length / 2, beltHeight, 0]} rotation={[0, 0, inclineRad]}>
        <group position={[length / 2, 0, 0]}>
          {/* Deck surface (top face at local y = 0). */}
          <mesh position={[0, -BELT_THICKNESS / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[length, BELT_THICKNESS, width]} />
            {material(DECK_COLOR)}
          </mesh>

          {/* Frame rails under the deck edges. */}
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

          {/* Transverse slats proud of the deck to read as a screen. */}
          {slats.map((slatX) => (
            <mesh key={`slat-${slatX}`} position={[slatX, SLAT_HEIGHT / 2, 0]} castShadow>
              <boxGeometry args={[SLAT_THICKNESS, SLAT_HEIGHT, width]} />
              {material(SLAT_COLOR)}
            </mesh>
          ))}

          {/* Side skirts above the deck surface. */}
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

          {/* Direction chevrons pointing to the discharge (+X). */}
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
        </group>
      </group>
    </group>
  );
}
