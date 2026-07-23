/**
 * Material defaults from docs/PHYSICS_SPECIFICATION.md §Friction and Restitution.
 * Plausible defaults, not measured properties.
 */
export const Materials = {
  belt: { friction: 0.9, restitution: 0.0 },
  machine: { friction: 0.4, restitution: 0.1 },
  ground: { friction: 0.6, restitution: 0.2 },
  /** @deprecated Prefer CROP_TYPES presets; kept for Stage 6 debug balls. */
  debugBall: { friction: 0.5, restitution: 0.15 },
} as const;
