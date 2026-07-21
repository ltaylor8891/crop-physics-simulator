/** Filename helpers for layout download (docs/UI_UX_SPECIFICATION.md). */

function sanitizeFilenameSegment(name: string): string {
  let out = '';
  for (const char of name.trim()) {
    const code = char.charCodeAt(0);
    if (code < 32 || '<>:"/\\|?*'.includes(char)) {
      out += '_';
    } else {
      out += char;
    }
  }
  return out.replace(/\s+/g, ' ').replace(/^\.+/, '').slice(0, 64);
}

export function layoutDownloadFilename(sceneName: string): string {
  const base = sanitizeFilenameSegment(sceneName) || 'layout';
  return base.toLowerCase().endsWith('.json') ? base : `${base}.json`;
}
