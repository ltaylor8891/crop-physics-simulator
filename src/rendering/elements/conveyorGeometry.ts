/**
 * Pure geometry maths for the parametric conveyor mesh (docs/ROADMAP.md §Stage 5).
 * Kept free of React/three imports so it is unit-testable.
 *
 * Local space per docs/DOMAIN_MODEL.md: origin at the centre of the footprint at
 * ground level, flow along +X, infeed end at −length/2. The belt assembly pivots
 * about the infeed end at `beltHeight`, so positive incline raises the discharge.
 */

export const BELT_THICKNESS = 0.08;
export const RAIL_HEIGHT = 0.12;
export const RAIL_WIDTH = 0.06;
export const SKIRT_HEIGHT = 0.18;
export const SKIRT_THICKNESS = 0.04;
export const DIVERTER_HEIGHT = 0.25;
export const DIVERTER_THICKNESS = 0.04;

const LEG_SPACING = 2.5;
const LEG_END_MARGIN = 0.4;
const MIN_LEG_HEIGHT = 0.05;
const CHEVRON_SPACING = 1.5;

export interface Leg {
  /** Local x of the leg centre (follows the belt line when inclined). */
  x: number;
  /** Leg height from the ground to the belt underside at this point. */
  height: number;
}

/** Height of the belt's top surface at distance `d` along the belt from the infeed end. */
export function beltTopHeightAt(beltHeight: number, inclineRad: number, d: number): number {
  return beltHeight + d * Math.sin(inclineRad);
}

/** Vertical support legs from the ground to the (possibly inclined) belt underside. */
export function computeLegs(length: number, beltHeight: number, inclineRad: number): Leg[] {
  const count = Math.max(2, Math.floor(length / LEG_SPACING) + 1);
  const span = length - 2 * LEG_END_MARGIN;
  const legs: Leg[] = [];
  for (let i = 0; i < count; i++) {
    const d = LEG_END_MARGIN + (span * i) / (count - 1); // distance along the belt from infeed
    const undersideY = beltTopHeightAt(beltHeight, inclineRad, d) - (BELT_THICKNESS + RAIL_HEIGHT);
    if (undersideY < MIN_LEG_HEIGHT) continue;
    legs.push({ x: -length / 2 + d * Math.cos(inclineRad), height: undersideY });
  }
  return legs;
}

export interface DiverterPlacement {
  /** Belt-assembly-local X of the wall centre (belt centre at 0, discharge at +length/2). */
  innerX: number;
  /** Belt-assembly-local Y of the wall centre (belt top at 0, wall sits above). */
  innerY: number;
}

/**
 * Diverter wall centre in the belt-assembly inner frame (same frame as the belt
 * mesh: belt top at y = 0, belt spans x ∈ [−length/2, +length/2]). The wall sits
 * on the belt surface, `offsetAlongBelt` metres from the infeed (−length/2) end.
 * Rotation by `angleDeg` about local +Y is applied by the caller and does not
 * move the centre. Used by ConveyorMesh (renders in this frame directly).
 */
export function diverterPlacement(length: number, offsetAlongBelt: number): DiverterPlacement {
  return {
    innerX: -length / 2 + offsetAlongBelt,
    innerY: DIVERTER_HEIGHT / 2,
  };
}

/**
 * Diverter wall centre in element-local space (origin at footprint centre, ground
 * level, before yaw), accounting for the belt's incline pivot about the infeed end.
 * Used by ConveyorColliders to place the fixed wall collider. Mirrors the belt/skirt
 * transforms in beltVelocity.ts.
 */
export function diverterLocalCenter(
  length: number,
  beltHeight: number,
  inclineRad: number,
  offsetAlongBelt: number,
): { x: number; y: number; z: number } {
  const d = offsetAlongBelt;
  const h = DIVERTER_HEIGHT / 2;
  const cos = Math.cos(inclineRad);
  const sin = Math.sin(inclineRad);
  return {
    x: -length / 2 + d * cos - h * sin,
    y: beltHeight + d * sin + h * cos,
    z: 0,
  };
}

/** Chevron tip x-positions along the belt (assembly space, belt centre at 0). */
export function computeChevronPositions(length: number): number[] {
  const count = Math.max(1, Math.floor(length / CHEVRON_SPACING));
  const spacing = length / count;
  return Array.from({ length: count }, (_, i) => -length / 2 + spacing * (i + 0.5));
}
