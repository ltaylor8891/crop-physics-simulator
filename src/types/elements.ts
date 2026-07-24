/**
 * Domain types for scene elements. Pure TypeScript — no React/three/Rapier imports.
 * Conventions (docs/DOMAIN_MODEL.md): metres, radians, Y-up, flow along local +X.
 */

export type ElementId = string;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface AxisXZ {
  x: number;
  z: number;
}

export type ElementType = 'conveyor' | 'elevator' | 'spawner' | 'collectionZone' | 'despawnZone';

export interface ElementBase<TType extends ElementType, TProps> {
  id: ElementId;
  type: TType;
  name: string;
  /** World-space element origin, metres. Origin point per type: docs/DOMAIN_MODEL.md */
  position: Vec3;
  /** Radians, CCW about +Y viewed from above. 0 = local +X along world +X. */
  rotationYaw: number;
  properties: TProps;
}

/**
 * Optional diverter: an angled high-side wall that locks to the belt surface to
 * deflect crop across the belt. `length = 0` means "no diverter" (nothing rendered
 * or collided). Positioned along the belt from the infeed end and angled in the
 * belt plane about its local +Y.
 */
export interface DiverterProperties {
  /** m along the belt from the infeed (−length/2) end (0–50). */
  offsetAlongBelt: number;
  /** m across the belt from its centreline; +/− shift the wall toward a side (−1.5–1.5). */
  lateralOffset: number;
  /** m, wall length; 0 = no diverter (0–20). */
  length: number;
  /** degrees, rotation in the belt plane about local +Y (−80–80). */
  angleDeg: number;
}

export interface ConveyorProperties {
  /** m, along local X (1–50) */
  length: number;
  /** m (0.3–3) */
  width: number;
  /** m, top of belt surface above ground (0.2–5) */
  beltHeight: number;
  /** degrees, pitch about local Z (−30–30); positive raises the discharge (+X) end */
  inclineDeg: number;
  /** m/min (0–300) */
  beltSpeed: number;
  /** side-skirt walls */
  skirts: boolean;
  /** support legs from ground to belt underside; off lets belts stack vertically */
  showLegs: boolean;
  /** diverter attachment; `length = 0` means none */
  diverter: DiverterProperties;
}

export interface ElevatorProperties {
  /** m, discharge height (1–30) */
  height: number;
  /** m footprint (each 0.5–4) */
  footprint: AxisXZ;
  /** m/s (0.5–5) */
  transportSpeed: number;
  /** t/h (0.1–500) */
  dischargeRateCap: number;
  /** m/s horizontal at discharge (0–5) */
  dischargeVelocity: number;
}

export type CropTypeId = 'wheatClump' | 'potato' | 'sugarBeet';

export interface SpawnerProperties {
  cropType: CropTypeId;
  /** t/h (0.1–500) */
  throughput: number;
  /** m emission face (each 0.1–3) */
  emitArea: AxisXZ;
  enabled: boolean;
  /** Diameter range (mm), clamped to crop-type preset limits at spawn */
  diameterMinMm: number;
  diameterMaxMm: number;
  /** −100…100; 0 = uniform; negative favours small, positive favours large */
  diameterBias: number;
  /**
   * Total tuber length as % of diameter (0–100): L = (pct/100)×D.
   * Capsule halfHeight = max(0,(L−D)/2); with pct≤100 this is always a sphere.
   * Ball types ignore length for geometry.
   */
  lengthMinPct: number;
  lengthMaxPct: number;
  /** −100…100 length bias */
  lengthBias: number;
  /** kg/m³ — mass = density × volume */
  densityKgPerM3: number;
}

export interface ZoneProperties {
  /** m (each 0.5–20) */
  size: Vec3;
}

export type ConveyorElement = ElementBase<'conveyor', ConveyorProperties>;
export type ElevatorElement = ElementBase<'elevator', ElevatorProperties>;
export type SpawnerElement = ElementBase<'spawner', SpawnerProperties>;
export type CollectionZoneElement = ElementBase<'collectionZone', ZoneProperties>;
export type DespawnZoneElement = ElementBase<'despawnZone', ZoneProperties>;

export type SceneElement =
  ConveyorElement | ElevatorElement | SpawnerElement | CollectionZoneElement | DespawnZoneElement;
