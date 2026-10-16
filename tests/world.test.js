import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { GameWorld, OBSTACLE_TYPES, WORLD_CONFIG } from '../src/world.js';
import { LANE_COORDINATES } from '../src/character.js';

describe('GameWorld — Object Pooling & Invariance', () => {
  let scene;
  let world;

  beforeEach(() => {
    scene = new THREE.Scene();
    world = new GameWorld({ scene, rngSeed: 42 });
  });

  it('pre-allocates all obstacle, collectible, and particle meshes', () => {
    expect(world.obstaclePool.length).toBe(18);
    expect(world.collectiblePool.length).toBe(20);
    expect(world.particlePool.length).toBe(36);

    // Initial state: all pooled elements are inactive and hidden
    for (const obs of world.obstaclePool) {
      expect(obs.active).toBe(false);
      expect(obs.mesh.visible).toBe(false);
    }
    for (const col of world.collectiblePool) {
      expect(col.active).toBe(false);
      expect(col.mesh.visible).toBe(false);
    }
  });

  it('maintains zero new object allocations during simulation and spawning', () => {
    const initialChildrenCount = world.rootGroup.children.reduce(
      (acc, group) => acc + group.children.length,
      0
    );

    world.resetRun();

    // Mock player character
    const mockCharacter = {
      getCollisionBounds: () => ({ x: 0, y: 0.9, z: 0, width: 0.8, height: 1.8, depth: 0.8 })
    };

    // Simulate 30 seconds of gameplay with multiple waves
    const dt = 0.05;
    for (let t = 0; t < 30; t += dt) {
      world.update(dt, { state: 'PLAYING', character: mockCharacter });
    }

    const postSimulationCount = world.rootGroup.children.reduce(
      (acc, group) => acc + group.children.length,
      0
    );

    // No new meshes or groups added to scene graph!
    expect(postSimulationCount).toBe(initialChildrenCount);
  });

  it('guarantees at least one clear, hazard-free lane per wave', () => {
    // Generate 50 waves with deterministic RNG
    for (let i = 0; i < 50; i++) {
      world.resetRun();
      world._spawnWave();

      const activeObstacles = world.obstaclePool.filter((o) => o.active);
      expect(activeObstacles.length).toBeGreaterThanOrEqual(1);
      expect(activeObstacles.length).toBeLessThanOrEqual(2);

      const occupiedLanes = new Set(activeObstacles.map((o) => o.laneIndex));
      expect(occupiedLanes.size).toBeLessThan(3); // Never all 3 lanes!
      expect([0, 1, 2].some((lane) => !occupiedLanes.has(lane))).toBe(true);
    }
  });
});

describe('GameWorld — Collision Detection per PRD.md §8.10', () => {
  let scene;
  let world;

  beforeEach(() => {
    scene = new THREE.Scene();
    world = new GameWorld({ scene });
    world.resetRun();
  });

  it('Type A (Ground Barrier): collides when player is grounded, clears when player jumps', () => {
    let collisionOccurred = false;
    world.onCollision(() => {
      collisionOccurred = true;
    });

    // Spawn Barrier at Center Lane (lane 1, X = 0) at Z = 0
    const barrier = world.obstaclePool.find((o) => o.type === OBSTACLE_TYPES.BARRIER);
    barrier.spawn(1, 0);

    // 1. Grounded Player (y = 0, bounding box Y from 0 to 1.8)
    const groundedPlayer = {
      getCollisionBounds: () => ({ x: 0, y: 0.9, z: 0, width: 0.8, height: 1.8, depth: 0.8 })
    };

    world.update(0.016, { state: 'PLAYING', character: groundedPlayer });
    expect(collisionOccurred).toBe(true);

    // 2. Jumping Player (y = 0.75, bounding box Y from 0.75 to 2.55) -> Barrier top is 0.55
    collisionOccurred = false;
    world.isGameOver = false;

    const jumpingPlayer = {
      getCollisionBounds: () => ({ x: 0, y: 1.65, z: 0, width: 0.8, height: 1.8, depth: 0.8 })
    };

    world.update(0.016, { state: 'PLAYING', character: jumpingPlayer });
    expect(collisionOccurred).toBe(false); // Clean jump clears!
  });

  it('Type B (Solid Block): collides whether player is grounded or jumping', () => {
    let collisionOccurred = false;
    world.onCollision(() => {
      collisionOccurred = true;
    });

    // Spawn Block at Center Lane at Z = 0
    const block = world.obstaclePool.find((o) => o.type === OBSTACLE_TYPES.BLOCK);
    block.spawn(1, 0);

    // 1. Grounded Player -> collides
    const groundedPlayer = {
      getCollisionBounds: () => ({ x: 0, y: 0.9, z: 0, width: 0.8, height: 1.8, depth: 0.8 })
    };
    world.update(0.016, { state: 'PLAYING', character: groundedPlayer });
    expect(collisionOccurred).toBe(true);

    // 2. Jumping Player -> still collides because block reaches Y = 2.6
    collisionOccurred = false;
    world.isGameOver = false;

    const jumpingPlayer = {
      getCollisionBounds: () => ({ x: 0, y: 1.8, z: 0, width: 0.8, height: 1.8, depth: 0.8 })
    };
    world.update(0.016, { state: 'PLAYING', character: jumpingPlayer });
    expect(collisionOccurred).toBe(true);

    // 3. Player in another lane (Left lane X = -2.2) -> safely avoids block!
    collisionOccurred = false;
    world.isGameOver = false;

    const sideLanePlayer = {
      getCollisionBounds: () => ({ x: -2.2, y: 0.9, z: 0, width: 0.8, height: 1.8, depth: 0.8 })
    };
    world.update(0.016, { state: 'PLAYING', character: sideLanePlayer });
    expect(collisionOccurred).toBe(false);
  });

  it('Type C (Overhead Gate): grounded player clears underneath, jumping player collides', () => {
    let collisionOccurred = false;
    world.onCollision(() => {
      collisionOccurred = true;
    });

    // Spawn Gate at Center Lane at Z = 0 (overhead box spans y = 1.8 to 2.6)
    const gate = world.obstaclePool.find((o) => o.type === OBSTACLE_TYPES.GATE);
    gate.spawn(1, 0);

    // 1. Grounded player (bounds: y from 0 to 1.78, so center y = 0.89, height = 1.78)
    const groundedPlayer = {
      getCollisionBounds: () => ({ x: 0, y: 0.89, z: 0, width: 0.8, height: 1.78, depth: 0.8 })
    };
    world.update(0.016, { state: 'PLAYING', character: groundedPlayer });
    expect(collisionOccurred).toBe(false); // Runs cleanly underneath!

    // 2. Jumping player (head jumps up into overhead bar: y from 0.8 to 2.58)
    const jumpingPlayer = {
      getCollisionBounds: () => ({ x: 0, y: 1.69, z: 0, width: 0.8, height: 1.78, depth: 0.8 })
    };
    world.update(0.016, { state: 'PLAYING', character: jumpingPlayer });
    expect(collisionOccurred).toBe(true); // Jump hits overhead bar!
  });
});
