import { useEffect } from 'react';
import { useSceneStore } from '../state/sceneStore';
import { useSimulationStore } from '../state/simulationStore';
import { useUiStore } from '../state/uiStore';
import { downloadCurrentLayout } from '../serialization/layoutActions';
import { stepYaw } from '../utilities/snap';

/** True for elements where typing must not trigger shortcuts (text/number inputs). */
function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
    return true;
  }
  if (target instanceof HTMLInputElement) {
    return !['checkbox', 'radio', 'button', 'range'].includes(target.type);
  }
  return false;
}

/**
 * Global keyboard shortcuts (docs/UI_UX_SPECIFICATION.md §Keyboard Shortcuts).
 * Reads stores via getState() so the listener never goes stale.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextEntryTarget(event.target)) return;

      const ui = useUiStore.getState();
      const scene = useSceneStore.getState();

      switch (event.key) {
        case 'Escape':
          if (ui.placementType) ui.cancelPlacement();
          else ui.select(null);
          break;

        case 'Delete':
        case 'Backspace':
          if (ui.selectedElementId) {
            scene.removeElement(ui.selectedElementId);
            ui.select(null);
          }
          break;

        case 'd':
        case 'D':
          if ((event.ctrlKey || event.metaKey) && ui.selectedElementId) {
            event.preventDefault(); // override browser bookmark shortcut
            const copyId = scene.duplicateElement(ui.selectedElementId);
            if (copyId) ui.select(copyId);
          }
          break;

        case 'r':
        case 'R': {
          if (event.ctrlKey || event.metaKey) break; // leave browser reload alone
          const id = ui.selectedElementId;
          const element = id ? scene.elements[id] : undefined;
          if (!id || !element) break;
          scene.updateElement(id, {
            rotationYaw: stepYaw(element.rotationYaw, event.shiftKey ? -1 : 1, ui.gridSnap),
          });
          break;
        }

        case 'g':
        case 'G':
          if (!event.ctrlKey && !event.metaKey) ui.toggleGridSnap();
          break;

        case ' ': {
          // Let a focused button handle Space itself.
          if (event.target instanceof HTMLElement && event.target.tagName === 'BUTTON') break;
          event.preventDefault(); // stop page scroll
          const simulation = useSimulationStore.getState();
          simulation.setRunning(!simulation.running);
          break;
        }

        case 's':
        case 'S':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            downloadCurrentLayout();
          }
          break;

        case 'o':
        case 'O':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            document.getElementById('layout-file-input')?.click();
          }
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
