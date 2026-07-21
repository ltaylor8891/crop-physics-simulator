import { describe, expect, it } from 'vitest';
import { Ajv2020 } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import layoutSchema from '../../schemas/layout.schema.json';
import sampleLayout from '../../examples/sample-layout.json';

/**
 * Keeps schemas/layout.schema.json and examples/sample-layout.json honest:
 * the documented example must always validate against the documented schema
 * (docs/SAVE_FILE_FORMAT.md).
 */
describe('layout schema and sample layout', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(layoutSchema);

  it('accepts the sample layout', () => {
    const valid = validate(sampleLayout);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });

  it('rejects a layout with a missing fileVersion', () => {
    const withoutVersion: Record<string, unknown> = { ...sampleLayout };
    delete withoutVersion.fileVersion;
    expect(validate(withoutVersion)).toBe(false);
  });

  it('rejects unknown top-level fields (strict format, docs/SAVE_FILE_FORMAT.md)', () => {
    expect(validate({ ...sampleLayout, surprise: true })).toBe(false);
  });

  it('rejects malformed element ids', () => {
    const broken = structuredClone(sampleLayout);
    broken.elements[0].id = 'not-an-id';
    expect(validate(broken)).toBe(false);
  });

  it('rejects out-of-range property values', () => {
    const broken = structuredClone(sampleLayout);
    const conveyor = broken.elements.find((element) => element.type === 'conveyor');
    if (!conveyor || !('beltSpeed' in conveyor.properties)) {
      throw new Error('sample layout must contain a conveyor');
    }
    conveyor.properties.beltSpeed = 9999;
    expect(validate(broken)).toBe(false);
  });
});
