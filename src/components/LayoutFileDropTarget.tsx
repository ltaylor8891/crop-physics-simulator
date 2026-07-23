import { useEffect, useState } from 'react';
import { loadLayoutFile } from '../serialization/layoutActions';
import type { ParseError } from '../serialization/types';
import { LoadErrorDialog } from './LoadErrorDialog';

/**
 * Window-level drag-and-drop for layout JSON files
 * (docs/UI_UX_SPECIFICATION.md §File group).
 */
export function LayoutFileDropTarget() {
  const [loadErrors, setLoadErrors] = useState<ParseError[] | null>(null);

  useEffect(() => {
    const onDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      const isJson = file.name.toLowerCase().endsWith('.json') || file.type === 'application/json';
      if (!isJson) return;
      event.preventDefault();
      void loadLayoutFile(file).then((errors) => {
        if (errors) setLoadErrors(errors);
      });
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  if (!loadErrors) return null;
  return <LoadErrorDialog errors={loadErrors} onClose={() => setLoadErrors(null)} />;
}
