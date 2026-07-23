import type { ElementId, ElementType, SceneElement, Vec3 } from '../types/elements';
import { generateElementId } from '../utilities/ids';
import { defaultSpawnerSizeProperties } from './cropTypes';

/**
 * Element descriptor registry (docs/TECHNICAL_DESIGN.md §Extension Points).
 * The library panel, placement, and placeholder rendering are all driven by
 * this registry — adding an equipment type means adding one descriptor here
 * (plus, later, its physics/rendering component).
 */
export interface ElementDescriptor {
  type: ElementType;
  label: string;
  /** Default origin height at placement. Ground-based elements use 0; spawners hang above belt height. */
  defaultY: number;
  /** Placeholder mesh colour until type-specific rendering lands (Stage 5+). */
  color: string;
  /** Zones render translucent because they are volumes, not solid machines. */
  translucent: boolean;
  createDefaultProperties: () => SceneElement['properties'];
}

export const ELEMENT_DESCRIPTORS: Record<ElementType, ElementDescriptor> = {
  conveyor: {
    type: 'conveyor',
    label: 'Belt conveyor',
    defaultY: 0,
    color: '#7d8ea0',
    translucent: false,
    createDefaultProperties: () => ({
      length: 6,
      width: 0.8,
      beltHeight: 0.75,
      inclineDeg: 0,
      beltSpeed: 90,
      skirts: true,
      showLegs: true,
      diverter: { offsetAlongBelt: 0, length: 0, angleDeg: 0 },
    }),
  },
  elevator: {
    type: 'elevator',
    label: 'Bucket elevator',
    defaultY: 0,
    color: '#a08b6f',
    translucent: false,
    createDefaultProperties: () => ({
      height: 8,
      footprint: { x: 1.2, z: 1.2 },
      transportSpeed: 2,
      dischargeRateCap: 60,
      dischargeVelocity: 1.5,
    }),
  },
  spawner: {
    type: 'spawner',
    label: 'Crop spawner',
    defaultY: 2,
    color: '#4f9cf0',
    translucent: false,
    createDefaultProperties: () => ({
      cropType: 'potato',
      throughput: 40,
      emitArea: { x: 0.6, z: 0.6 },
      enabled: true,
      ...defaultSpawnerSizeProperties('potato'),
    }),
  },
  collectionZone: {
    type: 'collectionZone',
    label: 'Collection zone',
    defaultY: 0,
    color: '#3fae6a',
    translucent: true,
    createDefaultProperties: () => ({
      size: { x: 2, y: 2, z: 2 },
    }),
  },
  despawnZone: {
    type: 'despawnZone',
    label: 'Despawn zone',
    defaultY: 0,
    color: '#c05555',
    translucent: true,
    createDefaultProperties: () => ({
      size: { x: 2, y: 2, z: 2 },
    }),
  },
};

/** All known element types (includes temporarily disabled ones). */
export const ELEMENT_TYPES: ElementType[] = [
  'conveyor',
  'elevator',
  'spawner',
  'collectionZone',
  'despawnZone',
];

/**
 * Bucket elevators are temporarily out of the product (library / saves / sim).
 * Types, mesh, and `elevator.ts` remain for a quick restore — flip this set empty
 * and restore the schema elevator branch + `fileVersion` policy when re-enabling.
 */
export const TEMPORARILY_DISABLED_ELEMENT_TYPES: ReadonlySet<ElementType> = new Set(['elevator']);

/** Library panel + placement order (excludes temporarily disabled types). */
export const PLACEABLE_ELEMENT_TYPES: ElementType[] = ELEMENT_TYPES.filter(
  (type) => !TEMPORARILY_DISABLED_ELEMENT_TYPES.has(type),
);

export function isElementTypeEnabled(type: ElementType): boolean {
  return !TEMPORARILY_DISABLED_ELEMENT_TYPES.has(type);
}

/**
 * Local-space bounding box of an element's placeholder geometry:
 * size plus the offset of the box centre from the element origin
 * (origins are defined per type in docs/DOMAIN_MODEL.md).
 */
export function getElementBounds(element: SceneElement): { size: Vec3; center: Vec3 } {
  switch (element.type) {
    case 'conveyor': {
      const { length, width, beltHeight } = element.properties;
      return {
        size: { x: length, y: beltHeight, z: width },
        center: { x: 0, y: beltHeight / 2, z: 0 },
      };
    }
    case 'elevator': {
      const { height, footprint } = element.properties;
      return {
        size: { x: footprint.x, y: height, z: footprint.z },
        center: { x: 0, y: height / 2, z: 0 },
      };
    }
    case 'spawner': {
      const { emitArea } = element.properties;
      // Origin is the centre of the (downward) emission face; the box sits above it.
      return {
        size: { x: emitArea.x, y: 0.4, z: emitArea.z },
        center: { x: 0, y: 0.2, z: 0 },
      };
    }
    case 'collectionZone':
    case 'despawnZone': {
      const { size } = element.properties;
      return {
        size: { x: size.x, y: size.y, z: size.z },
        center: { x: 0, y: size.y / 2, z: 0 },
      };
    }
  }
}

/** "Belt conveyor 3" — next free number for a default element name. */
function nextElementName(
  elements: Record<ElementId, SceneElement>,
  descriptor: ElementDescriptor,
): string {
  let highest = 0;
  for (const element of Object.values(elements)) {
    if (element.type !== descriptor.type) continue;
    const match = element.name.match(new RegExp(`^${descriptor.label} (\\d+)$`));
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `${descriptor.label} ${highest + 1}`;
}

/** Create a new element of `type` at ground position (x, z) with registry defaults. */
export function createElement(
  type: ElementType,
  groundPosition: { x: number; z: number },
  existingElements: Record<ElementId, SceneElement>,
): SceneElement {
  const descriptor = ELEMENT_DESCRIPTORS[type];
  return {
    id: generateElementId(),
    type,
    name: nextElementName(existingElements, descriptor),
    position: { x: groundPosition.x, y: descriptor.defaultY, z: groundPosition.z },
    rotationYaw: 0,
    properties: descriptor.createDefaultProperties(),
  } as SceneElement;
}
