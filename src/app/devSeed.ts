import { createElement } from '../elements/registry';
import { useSceneStore } from '../state/sceneStore';
import { useSimulationStore } from '../state/simulationStore';
import { useUiStore } from '../state/uiStore';

/**
 * Dev-only demo seeding via URL query, e.g. `?seed=conveyors` or `?seed=physics`.
 * Lets headless-browser verification and quick manual testing populate a scene
 * without clicking. Only wired up in dev builds (see main.tsx).
 */
export function applyDevSeed(search: string): void {
  const seed = new URLSearchParams(search).get('seed');
  if (seed !== 'conveyors' && seed !== 'physics' && seed !== 'spawn') return;

  const store = useSceneStore.getState();

  const flat = createElement('conveyor', { x: -5, z: 3 }, store.elements);
  store.addElement(flat);

  const rotated = createElement('conveyor', { x: 4, z: 5 }, useSceneStore.getState().elements);
  store.addElement(rotated);
  if (rotated.type === 'conveyor') {
    store.updateElement(rotated.id, {
      rotationYaw: Math.PI / 4,
      properties: { ...rotated.properties, skirts: false },
    });
  }

  const inclined = createElement('conveyor', { x: 0, z: -3 }, useSceneStore.getState().elements);
  store.addElement(inclined);
  if (inclined.type === 'conveyor') {
    store.updateElement(inclined.id, {
      properties: { ...inclined.properties, inclineDeg: 15, length: 8 },
    });
  }

  if (seed === 'physics') {
    useUiStore.getState().select(flat.id);
    useSimulationStore.getState().setRunning(true);
  }

  if (seed === 'spawn') {
    const spawner = createElement('spawner', { x: -5, z: 3 }, useSceneStore.getState().elements);
    store.addElement(spawner);
    if (spawner.type === 'spawner') {
      store.updateElement(spawner.id, {
        position: { x: -5, y: flat.type === 'conveyor' ? flat.properties.beltHeight + 0.5 : 1.5, z: 3 },
        properties: {
          ...spawner.properties,
          cropType: 'potato',
          throughput: 20,
          emitArea: { x: 0.4, z: 0.4 },
          enabled: true,
        },
      });
    }
    useUiStore.getState().select(spawner.id);
    useSimulationStore.getState().setRunning(true);
  }
}
