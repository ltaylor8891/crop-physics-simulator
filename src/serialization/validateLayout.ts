import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { ErrorObject, ValidateFunction } from 'ajv';
import layoutSchema from '../../schemas/layout.schema.json';
import type { LayoutFileV1, ParseError } from './types';

let validator: ValidateFunction<LayoutFileV1> | null = null;

function getValidator(): ValidateFunction<LayoutFileV1> {
  if (!validator) {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    validator = ajv.compile<LayoutFileV1>(layoutSchema);
  }
  return validator;
}

export function validateLayout(data: unknown): ParseError[] {
  const validate = getValidator();
  if (validate(data)) return [];
  return (validate.errors ?? []).map(ajvErrorToParseError);
}

function ajvErrorToParseError(error: ErrorObject): ParseError {
  const path = error.instancePath || '/';
  const message = error.message
    ? `${error.message}${error.params && 'additionalProperty' in error.params ? `: ${String(error.params.additionalProperty)}` : ''}`
    : 'invalid';
  return { path, message };
}
