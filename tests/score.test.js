import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { GameWorld, WORLD_CONFIG } from '../src/world.js';

describe('GameWorld — Scoring & Difficulty Progression', () => {
  let scene;
  let world;

  beforeEach(() => {
    scene = new THREE.Scene();
    world = new GameWorld({ scene });
    world.resetRun();
  });

  it('calculates score according to distance and energy nodes formula per PRD.md §9.1', () => {
    // Formula: Final Score = Distance Points (10/sec) + Collectible Points (100/node)
    world.runTime = 12.0;
    world.collectiblesCount = 4;

    // Trigger update calculation
    world.update(0, {
      state: 'PLAYING',
      character: { getCollisionBounds: () => ({ x: 0, y: 0.9, z: 0, width: 0.8, height: 1.8, depth: 0.8 }) }
    });

    const stats = world.getScoreStats();
    // 12s * 10 = 120 pts; 4 * 100 = 400 pts -> Total = 520 pts
    expect(stats.score).toBe(520);
    expect(stats.collectibles).toBe(4);
    expect(stats.duration).toBe(12.0);
  });

  it('prevents collecting the same energy node more than once', () => {
    let collectEventCount = 0;
    world.onCollect(() => {
      collectEventCount++;
    });

    // Spawn 1 collectible at (0, 1.0, 0)
    const collectible = world.collectiblePool[0];
    collectible.spawn(1, 0, 1.0);

    const player = {
      getCollisionBounds: () => ({ x: 0, y: 0.9, z: 0, width: 0.8, height: 1.8, depth: 0.8 })
    };

    // First frame overlap: collectible gathered
    world.update(0.016, { state: 'PLAYING', character: player });
    expect(collectEventCount).toBe(1);
    expect(world.collectiblesCount).toBe(1);
    expect(collectible.active).toBe(false);

    // Second frame: same location, collectible must not be collected again
    world.update(0.016, { state: 'PLAYING', character: player });
    expect(collectEventCount).toBe(1);
    expect(world.collectiblesCount).toBe(1);
  });

  it('accurately scales speed and clamps at maximum speed', () => {
    const player = {
      getCollisionBounds: () => ({ x: 0, y: 0.9, z: 0, width: 0.8, height: 1.8, depth: 0.8 })
    };

    // At t = 0: speed is start speed (18.0)
    expect(world.currentSpeed).toBe(18.0);

    // At t = 60s (halfway): speed is 25.0
    world.runTime = 60.0;
    world.update(0.016, { state: 'PLAYING', character: player });
    expect(world.currentSpeed).toBeCloseTo(25.0, 1);

    // At t = 120s (progression limit): speed reaches max speed (32.0)
    world.runTime = 120.0;
    world.update(0.016, { state: 'PLAYING', character: player });
    expect(world.currentSpeed).toBeCloseTo(32.0, 1);

    // At t = 200s: speed remains strictly clamped at 32.0
    world.runTime = 200.0;
    world.update(0.016, { state: 'PLAYING', character: player });
    expect(world.currentSpeed).toBe(32.0);
  });
});
