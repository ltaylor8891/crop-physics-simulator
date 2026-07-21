import { Toolbar } from '../components/Toolbar';
import { ElementLibrary } from '../components/ElementLibrary';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { StatusBar } from '../components/StatusBar';
import { SceneCanvas } from '../rendering/SceneCanvas';
import './app.css';

/** Application shell layout (docs/UI_UX_SPECIFICATION.md §Overall Screen Layout). */
export function App() {
  return (
    <div className="app-layout">
      <Toolbar />
      <ElementLibrary />
      <main className="viewport" aria-label="3D viewport">
        <SceneCanvas />
      </main>
      <PropertiesPanel />
      <StatusBar />
    </div>
  );
}
