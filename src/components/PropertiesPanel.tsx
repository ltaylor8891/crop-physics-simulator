import { CROP_TYPES, defaultSpawnerSizeProperties } from '../elements/cropTypes';
import { ELEMENT_DESCRIPTORS } from '../elements/registry';
import {
  getPropertyPath,
  NAME_MAX_LENGTH,
  POSITION_RANGE,
  PROPERTY_FIELDS,
  ROTATION_DEG_RANGE,
  setPropertyPath,
} from '../elements/propertySchema';
import { clampDiameterRangeMm, clampLengthPct } from '../simulation/cropSize';
import { useSceneStore } from '../state/sceneStore';
import { useSimulationStore } from '../state/simulationStore';
import { useUiStore } from '../state/uiStore';
import type { CropTypeId, SceneElement } from '../types/elements';
import { degreesToRadians, radiansToDegrees } from '../utilities/units';
import { CheckboxField } from './fields/CheckboxField';
import { EnumField } from './fields/EnumField';
import { NumberField } from './fields/NumberField';
import { TextField } from './fields/TextField';

/**
 * Right-hand properties panel (docs/UI_UX_SPECIFICATION.md §Properties Panel).
 * Type-specific fields come from PROPERTY_FIELDS (Stage 7).
 */
export function PropertiesPanel() {
  const selectedElementId = useUiStore((s) => s.selectedElementId);
  const select = useUiStore((s) => s.select);
  const element = useSceneStore((s) =>
    selectedElementId ? s.elements[selectedElementId] : undefined,
  );
  const updateElement = useSceneStore((s) => s.updateElement);
  const duplicateElement = useSceneStore((s) => s.duplicateElement);
  const removeElement = useSceneStore((s) => s.removeElement);
  const zoneCollectedTph = useSimulationStore((s) =>
    selectedElementId ? (s.statistics.collectedTphByZoneId[selectedElementId] ?? 0) : 0,
  );

  if (!element) {
    return (
      <aside className="panel properties-panel" aria-label="Properties">
        <h2>Properties</h2>
        <p className="empty-state">
          Select an element to edit its properties, or choose one from the library to place.
        </p>
      </aside>
    );
  }

  const idPrefix = element.id;
  const fields = PROPERTY_FIELDS[element.type];

  const patchProperties = (path: string, value: unknown) => {
    let nextProperties = setPropertyPath(
      element.properties as unknown as Record<string, unknown>,
      path,
      value,
    ) as Record<string, unknown>;

    if (element.type === 'spawner') {
      if (path === 'cropType' && typeof value === 'string') {
        // Reset density + diameter range to the new type’s defaults (plan).
        const size = defaultSpawnerSizeProperties(value as CropTypeId);
        nextProperties = { ...nextProperties, ...size, cropType: value };
      } else {
        const cropType = nextProperties.cropType as CropTypeId;
        if (cropType in CROP_TYPES) {
          const diam = clampDiameterRangeMm(
            cropType,
            Number(nextProperties.diameterMinMm),
            Number(nextProperties.diameterMaxMm),
          );
          const len = clampLengthPct(
            Number(nextProperties.lengthMinPct),
            Number(nextProperties.lengthMaxPct),
          );
          nextProperties = { ...nextProperties, ...diam, ...len };
        }
      }
    }

    updateElement(element.id, {
      properties: nextProperties as unknown as SceneElement['properties'],
    });
  };

  return (
    <aside className="panel properties-panel" aria-label="Properties">
      <h2>Properties</h2>

      <div className="property-form" key={element.id}>
        <TextField
          id={`${idPrefix}-name`}
          label="Name"
          value={element.name}
          maxLength={NAME_MAX_LENGTH}
          onCommit={(name) => updateElement(element.id, { name })}
        />

        <div className="field field-readonly">
          <span className="field-readonly-label">Type</span>
          <span>{ELEMENT_DESCRIPTORS[element.type].label}</span>
        </div>

        <NumberField
          id={`${idPrefix}-pos-x`}
          label="Position X"
          value={element.position.x}
          min={POSITION_RANGE.min}
          max={POSITION_RANGE.max}
          step={0.1}
          unit="m"
          onCommit={(x) => updateElement(element.id, { position: { ...element.position, x } })}
        />
        <NumberField
          id={`${idPrefix}-pos-z`}
          label="Position Z"
          value={element.position.z}
          min={POSITION_RANGE.min}
          max={POSITION_RANGE.max}
          step={0.1}
          unit="m"
          onCommit={(z) => updateElement(element.id, { position: { ...element.position, z } })}
        />
        {element.type === 'spawner' && (
          <NumberField
            id={`${idPrefix}-pos-y`}
            label="Position Y"
            value={element.position.y}
            min={0}
            max={20}
            step={0.1}
            unit="m"
            onCommit={(y) => updateElement(element.id, { position: { ...element.position, y } })}
          />
        )}
        <NumberField
          id={`${idPrefix}-yaw`}
          label="Rotation"
          value={radiansToDegrees(element.rotationYaw)}
          min={ROTATION_DEG_RANGE.min}
          max={ROTATION_DEG_RANGE.max}
          step={1}
          unit="°"
          decimals={1}
          onCommit={(deg) => updateElement(element.id, { rotationYaw: degreesToRadians(deg) })}
        />

        <h3 className="property-section">Equipment</h3>
        {element.type === 'collectionZone' && (
          <div className="field field-readonly">
            <span className="field-readonly-label">Collected (10 s)</span>
            <span>{zoneCollectedTph.toFixed(1)} t/h</span>
          </div>
        )}
        {fields.map((field) => {
          if (field.kind === 'number') {
            const raw = getPropertyPath(element.properties, field.path);
            const value = typeof raw === 'number' ? raw : field.min;
            return (
              <NumberField
                key={field.path}
                id={`${idPrefix}-${field.path}`}
                label={field.label}
                value={value}
                min={field.min}
                max={field.max}
                step={field.step}
                unit={field.unit}
                onCommit={(next) => patchProperties(field.path, next)}
              />
            );
          }
          if (field.kind === 'boolean') {
            const raw = getPropertyPath(element.properties, field.path);
            return (
              <CheckboxField
                key={field.path}
                id={`${idPrefix}-${field.path}`}
                label={field.label}
                checked={Boolean(raw)}
                onChange={(checked) => patchProperties(field.path, checked)}
              />
            );
          }
          const raw = getPropertyPath(element.properties, field.path);
          return (
            <EnumField
              key={field.path}
              id={`${idPrefix}-${field.path}`}
              label={field.label}
              value={typeof raw === 'string' ? raw : (field.options[0]?.value ?? '')}
              options={field.options}
              onChange={(next) => patchProperties(field.path, next)}
            />
          );
        })}
      </div>

      <p className="hint">Drag to move in the viewport, or R / Shift+R to rotate.</p>
      <div className="panel-actions">
        <button
          type="button"
          onClick={() => {
            const copyId = duplicateElement(element.id);
            if (copyId) select(copyId);
          }}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => {
            removeElement(element.id);
            select(null);
          }}
        >
          Delete
        </button>
      </div>
    </aside>
  );
}
