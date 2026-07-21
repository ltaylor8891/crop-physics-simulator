import { useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Group, MeshStandardMaterial } from 'three';
import { createElement, ELEMENT_DESCRIPTORS, getElementBounds } from '../elements/registry';
import { useSceneStore } from '../state/sceneStore';
import { useUiStore } from '../state/uiStore';
import { BUILD_AREA_SIZE_M, isWithinBuildArea, snapPositionXZ } from '../utilities/snap';

const GHOST_VALID_COLOR = '#4f9cf0';
const GHOST_INVALID_COLOR = '#e05555';
/** Clicks that moved further than this (px) are camera drags, not placements. */
const CLICK_DRAG_TOLERANCE_PX = 4;

/**
 * Invisible interaction plane over the build area plus the translucent ghost
 * shown in placement mode (docs/UI_UX_SPECIFICATION.md §Placement Workflow).
 * The ghost follows the pointer via refs — no React state per pointer move.
 */
export function PlacementLayer() {
  const placementType = useUiStore((s) => s.placementType);
  const ghostRef = useRef<Group>(null);
  const ghostMaterialRef = useRef<MeshStandardMaterial>(null);
  const validRef = useRef(false);

  // Throwaway element used only to size the ghost from the type's default properties.
  const ghostTemplate = useMemo(
    () => (placementType ? createElement(placementType, { x: 0, z: 0 }, {}) : null),
    [placementType],
  );
  const ghostBounds = ghostTemplate ? getElementBounds(ghostTemplate) : null;

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!placementType || !ghostTemplate || !ghostBounds) return;
    const ghost = ghostRef.current;
    const material = ghostMaterialRef.current;
    if (!ghost || !material) return;

    const { gridSnap } = useUiStore.getState();
    const descriptor = ELEMENT_DESCRIPTORS[placementType];
    const snapped = snapPositionXZ(
      { x: event.point.x, y: descriptor.defaultY, z: event.point.z },
      gridSnap,
    );
    ghost.position.set(snapped.x, snapped.y, snapped.z);
    ghost.visible = true;

    const valid = isWithinBuildArea(snapped, ghostBounds.size.x, ghostBounds.size.z, 0);
    validRef.current = valid;
    material.color.set(valid ? GHOST_VALID_COLOR : GHOST_INVALID_COLOR);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > CLICK_DRAG_TOLERANCE_PX) return; // camera drag, not a click
    const ui = useUiStore.getState();

    if (!ui.placementType) {
      ui.select(null); // click on empty ground deselects
      return;
    }
    if (!validRef.current || !ghostRef.current?.visible) return;

    const scene = useSceneStore.getState();
    const ghostPosition = ghostRef.current.position;
    const element = createElement(
      ui.placementType,
      { x: ghostPosition.x, z: ghostPosition.z },
      scene.elements,
    );
    scene.addElement(element);
    ui.select(element.id);
    // Shift keeps placement mode active for repeated placement.
    if (!event.nativeEvent.shiftKey) ui.cancelPlacement();
  };

  const handleContextMenu = (event: ThreeEvent<MouseEvent>) => {
    const ui = useUiStore.getState();
    if (ui.placementType) {
      event.nativeEvent.preventDefault();
      ui.cancelPlacement();
    }
  };

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <planeGeometry args={[BUILD_AREA_SIZE_M, BUILD_AREA_SIZE_M]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {ghostTemplate && ghostBounds && (
        <group ref={ghostRef} visible={false}>
          <mesh
            position={[ghostBounds.center.x, ghostBounds.center.y, ghostBounds.center.z]}
            raycast={() => null}
          >
            <boxGeometry args={[ghostBounds.size.x, ghostBounds.size.y, ghostBounds.size.z]} />
            <meshStandardMaterial
              ref={ghostMaterialRef}
              transparent
              opacity={0.4}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </>
  );
}
