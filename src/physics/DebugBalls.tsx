import { BallCollider, RigidBody } from '@react-three/rapier';
import { useDebugStore } from '../state/debugStore';
import { CROP_COLLISION_GROUPS } from './collisionGroups';
import { Materials } from './materials';

const BALL_RADIUS = 0.08;
const BALL_MASS = 0.25;

/**
 * Temporary Stage 6 drop-test balls (docs/ROADMAP.md §Stage 6).
 * Replaced by the crop pool in Stages 8–9.
 */
export function DebugBalls() {
  const balls = useDebugStore((s) => s.balls);

  return (
    <>
      {balls.map((ball) => (
        <RigidBody
          key={ball.id}
          type="dynamic"
          position={[ball.position.x, ball.position.y, ball.position.z]}
          colliders={false}
          mass={BALL_MASS}
          linearDamping={0.05}
          ccd
          collisionGroups={CROP_COLLISION_GROUPS}
        >
          <BallCollider
            args={[BALL_RADIUS]}
            collisionGroups={CROP_COLLISION_GROUPS}
            friction={Materials.debugBall.friction}
            restitution={Materials.debugBall.restitution}
          />
          <mesh castShadow>
            <sphereGeometry args={[BALL_RADIUS, 16, 16]} />
            <meshStandardMaterial color="#d9b45b" />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}
