import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { useSceneStore } from './state/sceneStore';
import { useSimulationStore } from './state/simulationStore';
import { useUiStore } from './state/uiStore';

declare global {
  interface Window {
    __cropSim?: {
      useSceneStore: typeof useSceneStore;
      useUiStore: typeof useUiStore;
      useSimulationStore: typeof useSimulationStore;
    };
  }
}

// Dev-only hooks for browser-automation and debugging (not present in production builds).
if (import.meta.env.DEV) {
  window.__cropSim = { useSceneStore, useUiStore, useSimulationStore };
  const { applyDevSeed } = await import('./app/devSeed');
  applyDevSeed(window.location.search);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Missing #root element in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
