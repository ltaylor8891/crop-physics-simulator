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

/** Chevron tip x-positions along the belt (assembly space, belt centre at 0). */
export function computeChevronPositions(length: number): number[] {
  const count = Math.max(1, Math.floor(length / CHEVRON_SPACING));
  const spacing = length / count;
  return Array.from({ length: count }, (_, i) => -length / 2 + spacing * (i + 0.5));
}
