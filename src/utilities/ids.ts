import type { ElementId } from '../types/elements';

export const ELEMENT_ID_PATTERN = /^el_[a-z0-9]{12}$/;

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 12;

/**
 * Generate a unique, stable element id: `el_` + 12 random base-36 chars
 * (docs/DOMAIN_MODEL.md §Element IDs). Uses crypto randomness; rejection
 * sampling keeps the character distribution uniform.
 */
export function generateElementId(): ElementId {
  const chars: string[] = [];
  const bytes = new Uint8Array(ID_LENGTH * 2);
  while (chars.length < ID_LENGTH) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      // 252 = largest multiple of 36 ≤ 256; reject above it to avoid modulo bias.
      if (byte < 252) {
        chars.push(ALPHABET[byte % ALPHABET.length]);
        if (chars.length === ID_LENGTH) break;
      }
    }
  }
  return `el_${chars.join('')}`;
}
