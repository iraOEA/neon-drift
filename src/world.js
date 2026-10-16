/**
 * @file world.js
 * @description Dynamic Endless Road Conveyor, Object-Pooled Obstacles & Collectibles,
 * Collision Detection, Progressive Difficulty, and Scoring System.
 * Strictly adheres to ARCHITECTURE.md §3.6, §6.4-6.5, §8.2, §10 and PRD.md §8, §9.
 */

import * as THREE from 'three';
import { LANE_COORDINATES } from './character.js';

// ============================================================================
// 1. Constants & Configuration
// ============================================================================

export const OBSTACLE_TYPES = Object.freeze({
  BARRIER: 'BARRIER', // Ground barrier: requires jump
  BLOCK: 'BLOCK',     // Solid monolith: requires lane switch
  GATE: 'GATE'        // Overhead gate: run underneath, jump collides!
});

export const WORLD_CONFIG = Object.freeze({
  START_SPEED: 18.0,
  MAX_SPEED: 32.0,
  SPEED_PROGRESSION_DURATION: 120.0,
  INITIAL_SPAWN_INTERVAL: 1.8,
  MIN_SPAWN_INTERVAL: 0.8,
  SPAWN_Z: -100,
  DESPAWN_Z: 15,
  COLLECTIBLE_POINTS: 100,
  DISTANCE_POINTS_PER_SEC: 10,
  CONVEYOR_CHUNK_LENGTH: 20,
  CONVEYOR_CHUNK_COUNT: 8
});

/**
 * High-quality seeded pseudo-random number generator (Mulberry32) for deterministic tests
 * @param {number} seed
 * @returns {() => number}
 */
export function createRng(seed = Date.now()) {
  let s = seed >>> 0;
  return function next() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// 2. Obstacle Pool Element
// ============================================================================

class PooledObstacle {
  constructor(type, materials) {
    this.type = type;
    this.active = false;
    this.laneIndex = 1;
    this.box3 = new THREE.Box3();
    this.mesh = new THREE.Group();
    this.mesh.visible = false;

    this._halfWidth = 0.8;
    this._height = 1.0;
    this._halfDepth = 0.4;
    this._yOffset = 0;

    this._buildMesh(materials);
  }

  _buildMesh(materials) {
    const { hazardMaterial, casingMaterial } = materials;

    if (this.type === OBSTACLE_TYPES.BARRIER) {
      // Type A: Ground Hurdle (low beam across lane)
      this._halfWidth = 0.85;
      this._height = 0.55;
      this._halfDepth = 0.25;
      this._yOffset = 0.275;

      const beamGeo = new THREE.BoxGeometry(1.7, 0.45, 0.35);
      const beam = new THREE.Mesh(beamGeo, hazardMaterial);
      beam.position.set(0, 0.275, 0);
      this.mesh.add(beam);

      const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.55, 8);
      const postL = new THREE.Mesh(postGeo, casingMaterial);
      postL.position.set(-0.85, 0.275, 0);
      this.mesh.add(postL);

      const postR = new THREE.Mesh(postGeo, casingMaterial);
      postR.position.set(0.85, 0.275, 0);
      this.mesh.add(postR);

    } else if (this.type === OBSTACLE_TYPES.BLOCK) {
      // Type B: Solid Monolith (tall barrier blocking lane)
      this._halfWidth = 0.75;
      this._height = 2.6;
      this._halfDepth = 0.45;
      this._yOffset = 1.3;

      const blockGeo = new THREE.BoxGeometry(1.5, 2.5, 0.85);
      const block = new THREE.Mesh(blockGeo, casingMaterial);
      block.position.set(0, 1.3, 0);
      this.mesh.add(block);

      const chevronGeo = new THREE.BoxGeometry(1.35, 0.3, 0.9);
      const chevron1 = new THREE.Mesh(chevronGeo, hazardMaterial);
      chevron1.position.set(0, 0.8, 0);
      this.mesh.add(chevron1);

      const chevron2 = new THREE.Mesh(chevronGeo, hazardMaterial);
      chevron2.position.set(0, 1.8, 0);
      this.mesh.add(chevron2);

    } else if (this.type === OBSTACLE_TYPES.GATE) {
      // Type C: Overhead Gate (run underneath at y=0..1.8, jump collides into overhead beam at y=1.8..2.6)
      this._halfWidth = 0.85;
      this._height = 0.8;
      this._halfDepth = 0.35;
      this._yOffset = 2.2; // Overhead box centered at 2.2 -> spans 1.8 to 2.6

      const postGeo = new THREE.BoxGeometry(0.12, 2.7, 0.3);
      const postL = new THREE.Mesh(postGeo, casingMaterial);
      postL.position.set(-0.85, 1.35, 0);
      this.mesh.add(postL);

      const postR = new THREE.Mesh(postGeo, casingMaterial);
      postR.position.set(0.85, 1.35, 0);
      this.mesh.add(postR);

      const topBarGeo = new THREE.BoxGeometry(1.8, 0.75, 0.4);
      const topBar = new THREE.Mesh(topBarGeo, hazardMaterial);
      topBar.position.set(0, 2.2, 0);
      this.mesh.add(topBar);
    }
  }

  spawn(laneIndex, zPosition) {
    this.laneIndex = laneIndex;
    const laneX = LANE_COORDINATES[laneIndex];
    this.mesh.position.set(laneX, 0, zPosition);
    this.active = true;
    this.mesh.visible = true;
    this.updateBox();
  }

  updateBox() {
    const x = this.mesh.position.x;
    const y = this._yOffset;
    const z = this.mesh.position.z;

    this.box3.min.set(
      x - this._halfWidth,
      y - this._height / 2,
      z - this._halfDepth
    );
    this.box3.max.set(
      x + this._halfWidth,
      y + this._height / 2,
      z + this._halfDepth
    );
  }

  deactivate() {
    this.active = false;
    this.mesh.visible = false;
  }
}

// ============================================================================
// 3. Collectible Pool Element
// ============================================================================

class PooledCollectible {
  constructor(material) {
    this.active = false;
    this.laneIndex = 1;
    this.box3 = new THREE.Box3();
    this.mesh = new THREE.Group();
    this.mesh.visible = false;

    // Outer rotating energy diamond
    const coreGeo = new THREE.OctahedronGeometry(0.32, 0);
    this.coreMesh = new THREE.Mesh(coreGeo, material);
    this.mesh.add(this.coreMesh);

    // Orbiting halo ring
    const ringGeo = new THREE.TorusGeometry(0.5, 0.025, 8, 24);
    this.ringMesh = new THREE.Mesh(ringGeo, material);
    this.mesh.add(this.ringMesh);

    this._rotY = 0;
    this._rotZ = 0;
    this._baseY = 1.0;
  }

  spawn(laneIndex, zPosition, yHeight = 1.0) {
    this.laneIndex = laneIndex;
    this._baseY = yHeight;
    const laneX = LANE_COORDINATES[laneIndex];
    this.mesh.position.set(laneX, yHeight, zPosition);
    this.active = true;
    this.mesh.visible = true;
    this.updateBox();
  }

  update(deltaTime) {
    this._rotY += deltaTime * 2.8;
    this._rotZ += deltaTime * 1.4;

    this.coreMesh.rotation.set(0, this._rotY, this._rotZ);
    this.ringMesh.rotation.set(Math.PI / 3, this._rotY * 0.5, 0);

    // Subtle floating bob
    this.mesh.position.y = this._baseY + Math.sin(this._rotY * 1.5) * 0.08;

    this.updateBox();
  }

  updateBox() {
    const pos = this.mesh.position;
    this.box3.min.set(pos.x - 0.45, pos.y - 0.45, pos.z - 0.45);
    this.box3.max.set(pos.x + 0.45, pos.y + 0.45, pos.z + 0.45);
  }

  deactivate() {
    this.active = false;
    this.mesh.visible = false;
  }
}

// ============================================================================
// 4. Particle Pool Element
// ============================================================================

class PooledParticle {
  constructor(material) {
    this.active = false;
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), material);
    this.mesh.visible = false;
    this.velocity = new THREE.Vector3();
    this.life = 0;
    this.maxLife = 0.5;
  }

  spawn(origin, velocity, maxLife = 0.45) {
    this.mesh.position.copy(origin);
    this.velocity.copy(velocity);
    this.life = maxLife;
    this.maxLife = maxLife;
    this.active = true;
    this.mesh.visible = true;
    this.mesh.scale.set(1, 1, 1);
  }

  update(deltaTime) {
    if (!this.active) return;
    this.life -= deltaTime;
    if (this.life <= 0) {
      this.active = false;
      this.mesh.visible = false;
      return;
    }

    this.mesh.position.addScaledVector(this.velocity, deltaTime);
    const progress = this.life / this.maxLife;
    this.mesh.scale.set(progress, progress, progress);
  }
}

// ============================================================================
// 5. GameWorld Main Controller
// ============================================================================

export class GameWorld {
  /**
   * @param {Object} options
   * @param {THREE.Scene} options.scene Parent Three.js scene
   * @param {Object} [options.config] Gameplay & tuning overrides
   * @param {number} [options.rngSeed] Optional seed for deterministic testing
   */
  constructor({ scene, config = {}, rngSeed = undefined }) {
    this.scene = scene;
    this.config = { ...WORLD_CONFIG, ...config };
    this.rng = rngSeed !== undefined ? createRng(rngSeed) : Math.random;

    // Simulation & Scoring State
    this.runTime = 0;
    this.distance = 0;
    this.collectiblesCount = 0;
    this.score = 0;
    this.currentSpeed = this.config.START_SPEED;
    this.isGameOver = false;
    this.timeSinceLastSpawn = 0;
    this.runId = null;

    // Event callbacks
    this.onCollisionCallback = null;
    this.onCollectCallback = null;

    // Reusable Vector & Box objects for zero-allocation per frame
    this._playerBox = new THREE.Box3();
    this._tempCenter = new THREE.Vector3();

    // Scene Graph Groups
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'World_Root';

    this.conveyorGroup = new THREE.Group();
    this.conveyorGroup.name = 'World_Conveyor';
    this.rootGroup.add(this.conveyorGroup);

    this.obstacleGroup = new THREE.Group();
    this.obstacleGroup.name = 'World_Obstacles';
    this.rootGroup.add(this.obstacleGroup);

    this.collectibleGroup = new THREE.Group();
    this.collectibleGroup.name = 'World_Collectibles';
    this.rootGroup.add(this.collectibleGroup);

    this.particleGroup = new THREE.Group();
    this.particleGroup.name = 'World_Particles';
    this.rootGroup.add(this.particleGroup);

    if (this.scene) {
      this.scene.add(this.rootGroup);
    }

    // Initialize systems
    this._initMaterials();
    this._initConveyor();
    this._initObstaclePool();
    this._initCollectiblePool();
    this._initParticlePool();
  }

  // --------------------------------------------------------------------------
  // Materials Setup
  // --------------------------------------------------------------------------
  _initMaterials() {
    // Road conveyor materials
    this.roadFloorMaterial = new THREE.MeshStandardMaterial({
      color: '#0e1424',
      roughness: 0.85,
      metalness: 0.1
    });

    this.roadLineMaterial = new THREE.MeshBasicMaterial({
      color: '#22d3ee',
      transparent: true,
      opacity: 0.65
    });

    this.roadMarkerMaterial = new THREE.MeshBasicMaterial({
      color: '#1a233a',
      transparent: true,
      opacity: 0.5
    });

    // Obstacle hazard materials (high contrast independent of player styling)
    this.hazardMaterial = new THREE.MeshStandardMaterial({
      color: '#FF6B6B',
      emissive: '#FF3333',
      emissiveIntensity: 0.85,
      roughness: 0.35,
      metalness: 0.4
    });

    this.casingMaterial = new THREE.MeshStandardMaterial({
      color: '#1c202c',
      roughness: 0.65,
      metalness: 0.7
    });

    // Collectible energy materials
    this.collectibleMaterial = new THREE.MeshStandardMaterial({
      color: '#22d3ee',
      emissive: '#22d3ee',
      emissiveIntensity: 1.1,
      roughness: 0.25,
      metalness: 0.3
    });

    // Particle material
    this.particleMaterial = new THREE.MeshBasicMaterial({
      color: '#22d3ee',
      transparent: true,
      opacity: 0.95
    });
  }

  // --------------------------------------------------------------------------
  // Conveyor System (Endless Segmented Chunks)
  // --------------------------------------------------------------------------
  _initConveyor() {
    this.conveyorChunks = [];
    const chunkLength = this.config.CONVEYOR_CHUNK_LENGTH;
    const chunkCount = this.config.CONVEYOR_CHUNK_COUNT;
    const laneDivPositions = [-3.4, -1.1, 1.1, 3.4];

    // Shared chunk geometries instantiated once
    this.chunkFloorGeo = new THREE.PlaneGeometry(6.8, chunkLength);
    this.chunkLineGeo = new THREE.PlaneGeometry(0.06, chunkLength);
    this.chunkMarkerGeo = new THREE.PlaneGeometry(6.8, 0.05);

    for (let i = 0; i < chunkCount; i++) {
      const chunk = new THREE.Group();
      chunk.name = `RoadChunk_${i}`;

      // 1. Chunk Floor
      const floor = new THREE.Mesh(this.chunkFloorGeo, this.roadFloorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -0.01, 0);
      floor.receiveShadow = true;
      chunk.add(floor);

      // 2. Longitudinal Lane Lines
      laneDivPositions.forEach((xPos, idx) => {
        const line = new THREE.Mesh(this.chunkLineGeo, this.roadLineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.set(xPos, 0, 0);
        if (idx === 0 || idx === 3) line.scale.set(1.5, 1, 1);
        chunk.add(line);
      });

      // 3. Cross Markers (every 6 units)
      [-6, 0, 6].forEach((zOff) => {
        const marker = new THREE.Mesh(this.chunkMarkerGeo, this.roadMarkerMaterial);
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(0, 0.002, zOff);
        chunk.add(marker);
      });

      // Position along Z: start at Z = 20, going backwards to Z = -120
      chunk.position.set(0, 0, 20 - i * chunkLength);
      this.conveyorGroup.add(chunk);
      this.conveyorChunks.push(chunk);
    }
  }

  // --------------------------------------------------------------------------
  // Object Pools Initialization
  // --------------------------------------------------------------------------
  _initObstaclePool() {
    this.obstaclePool = [];
    const materials = {
      hazardMaterial: this.hazardMaterial,
      casingMaterial: this.casingMaterial
    };

    // Pre-allocate 6 of each obstacle type (total 18 pooled obstacles)
    const types = [OBSTACLE_TYPES.BARRIER, OBSTACLE_TYPES.BLOCK, OBSTACLE_TYPES.GATE];
    for (const type of types) {
      for (let i = 0; i < 6; i++) {
        const obs = new PooledObstacle(type, materials);
        this.obstacleGroup.add(obs.mesh);
        this.obstaclePool.push(obs);
      }
    }
  }

  _initCollectiblePool() {
    this.collectiblePool = [];
    // Pre-allocate 20 collectible energy nodes
    for (let i = 0; i < 20; i++) {
      const node = new PooledCollectible(this.collectibleMaterial);
      this.collectibleGroup.add(node.mesh);
      this.collectiblePool.push(node);
    }
  }

  _initParticlePool() {
    this.particlePool = [];
    // Pre-allocate 36 particles
    for (let i = 0; i < 36; i++) {
      const p = new PooledParticle(this.particleMaterial);
      this.particleGroup.add(p.mesh);
      this.particlePool.push(p);
    }
  }

  // --------------------------------------------------------------------------
  // Run Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Reset the world state for a new run per PRD.md §10.4
   */
  resetRun() {
    this.runTime = 0;
    this.distance = 0;
    this.collectiblesCount = 0;
    this.score = 0;
    this.currentSpeed = this.config.START_SPEED;
    this.isGameOver = false;
    this.timeSinceLastSpawn = 0;
    this.runId = `run-${Date.now()}-${Math.floor(this.rng() * 1000000)}`;

    // Reset conveyor chunk positions
    const chunkLength = this.config.CONVEYOR_CHUNK_LENGTH;
    for (let i = 0; i < this.conveyorChunks.length; i++) {
      this.conveyorChunks[i].position.set(0, 0, 20 - i * chunkLength);
    }

    // Deactivate all obstacles
    for (const obs of this.obstaclePool) {
      obs.deactivate();
    }

    // Deactivate all collectibles
    for (const item of this.collectiblePool) {
      item.deactivate();
    }

    // Deactivate all particles
    for (const p of this.particlePool) {
      p.active = false;
      p.mesh.visible = false;
    }
  }

  /**
   * Spawn particle burst on collectible pickup
   */
  _spawnCollectionBurst(pos) {
    let spawned = 0;
    for (const p of this.particlePool) {
      if (!p.active) {
        const vx = (this.rng() - 0.5) * 7.0;
        const vy = this.rng() * 5.0 + 1.5;
        const vz = (this.rng() - 0.5) * 7.0;
        p.spawn(pos, new THREE.Vector3(vx, vy, vz), 0.4);
        spawned++;
        if (spawned >= 8) break;
      }
    }
  }

  /**
   * Spawn particle burst on fatal impact
   */
  _spawnImpactBurst(pos) {
    let spawned = 0;
    for (const p of this.particlePool) {
      if (!p.active) {
        const vx = (this.rng() - 0.5) * 11.0;
        const vy = this.rng() * 8.0 + 2.0;
        const vz = (this.rng() - 0.5) * 11.0;
        p.spawn(pos, new THREE.Vector3(vx, vy, vz), 0.65);
        spawned++;
        if (spawned >= 16) break;
      }
    }
  }

  // --------------------------------------------------------------------------
  // Spawning & Difficulty Progression
  // --------------------------------------------------------------------------
  _spawnWave() {
    const obstacleTypes = [OBSTACLE_TYPES.BARRIER, OBSTACLE_TYPES.BLOCK, OBSTACLE_TYPES.GATE];
    const availableLanes = [0, 1, 2];

    // Shuffle available lanes deterministically
    for (let i = availableLanes.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [availableLanes[i], availableLanes[j]] = [availableLanes[j], availableLanes[i]];
    }

    // 60% chance 1 obstacle, 40% chance 2 obstacles (NEVER 3: guarantees at least 1 open lane!)
    const numObstacles = this.rng() < 0.6 ? 1 : 2;
    const obstacleLanes = availableLanes.slice(0, numObstacles);
    const openLanes = availableLanes.slice(numObstacles);

    // Spawn obstacles in designated lanes
    for (const lane of obstacleLanes) {
      const type = obstacleTypes[Math.floor(this.rng() * obstacleTypes.length)];
      // Find idle pooled obstacle of matching type
      const obs = this.obstaclePool.find((o) => !o.active && o.type === type);
      if (obs) {
        obs.spawn(lane, this.config.SPAWN_Z);
      }
    }

    // 60% chance to spawn a collectible in this wave
    if (this.rng() < 0.6) {
      const item = this.collectiblePool.find((c) => !c.active);
      if (item) {
        // If an obstacle is a BARRIER, 50% chance to place collectible above it (rewarding jump)
        const barrierInWave = this.obstaclePool.find(
          (o) => o.active && o.type === OBSTACLE_TYPES.BARRIER && o.mesh.position.z === this.config.SPAWN_Z
        );

        if (barrierInWave && this.rng() < 0.5) {
          item.spawn(barrierInWave.laneIndex, this.config.SPAWN_Z, 2.0);
        } else if (openLanes.length > 0) {
          // Otherwise place in a guaranteed open lane
          const targetLane = openLanes[Math.floor(this.rng() * openLanes.length)];
          item.spawn(targetLane, this.config.SPAWN_Z, 1.0);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Frame Update Loop
  // --------------------------------------------------------------------------

  /**
   * Master simulation update step called every frame
   * @param {number} deltaTime Frame delta in seconds (clamped to <= 0.05)
   * @param {Object} runContext Context object containing player and gameState
   */
  update(deltaTime, runContext = {}) {
    const isPlaying = runContext.state === 'PLAYING' && !this.isGameOver;

    // Update particles whether playing or game over (to finish impact animation)
    for (const p of this.particlePool) {
      if (p.active) p.update(deltaTime);
    }

    if (!isPlaying) return;

    // 1. Difficulty Progression per PRD.md §8.6
    this.runTime += deltaTime;
    const progress = Math.min(this.runTime / this.config.SPEED_PROGRESSION_DURATION, 1.0);
    this.currentSpeed = this.config.START_SPEED + (this.config.MAX_SPEED - this.config.START_SPEED) * progress;
    this.distance += this.currentSpeed * deltaTime;

    const currentInterval =
      this.config.INITIAL_SPAWN_INTERVAL -
      (this.config.INITIAL_SPAWN_INTERVAL - this.config.MIN_SPAWN_INTERVAL) * progress;

    // 2. Score Calculation per PRD.md §9.1
    const distancePoints = Math.floor(this.runTime * this.config.DISTANCE_POINTS_PER_SEC);
    const collectiblePoints = this.collectiblesCount * this.config.COLLECTIBLE_POINTS;
    this.score = distancePoints + collectiblePoints;

    // 3. Move Endless Conveyor Chunks
    const totalConveyorSpan = this.config.CONVEYOR_CHUNK_LENGTH * this.config.CONVEYOR_CHUNK_COUNT;
    for (const chunk of this.conveyorChunks) {
      chunk.position.z += this.currentSpeed * deltaTime;
      if (chunk.position.z > 20) {
        chunk.position.z -= totalConveyorSpan;
      }
    }

    // 4. Procedural Wave Spawning
    this.timeSinceLastSpawn += deltaTime;
    if (this.timeSinceLastSpawn >= currentInterval) {
      this.timeSinceLastSpawn = 0;
      this._spawnWave();
    }

    // 5. Update & Move Obstacles
    for (const obs of this.obstaclePool) {
      if (obs.active) {
        obs.mesh.position.z += this.currentSpeed * deltaTime;
        obs.updateBox();

        // Recycle obstacles that have passed out of view
        if (obs.mesh.position.z > this.config.DESPAWN_Z) {
          obs.deactivate();
        }
      }
    }

    // 6. Update & Move Collectibles
    for (const item of this.collectiblePool) {
      if (item.active) {
        item.mesh.position.z += this.currentSpeed * deltaTime;
        item.update(deltaTime);

        // Recycle collectibles that passed out of view
        if (item.mesh.position.z > this.config.DESPAWN_Z) {
          item.deactivate();
        }
      }
    }

    // 7. Collision Detection per ARCHITECTURE.md §3.6 & PRD.md §8.10
    if (runContext.character && typeof runContext.character.getCollisionBounds === 'function') {
      const bounds = runContext.character.getCollisionBounds();
      this._playerBox.min.set(
        bounds.x - bounds.width / 2,
        bounds.y - bounds.height / 2,
        bounds.z - bounds.depth / 2
      );
      this._playerBox.max.set(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
        bounds.z + bounds.depth / 2
      );

      // Check Collectible collisions
      for (const item of this.collectiblePool) {
        if (item.active && this._playerBox.intersectsBox(item.box3)) {
          item.deactivate();
          this.collectiblesCount++;
          this._spawnCollectionBurst(item.mesh.position);

          if (this.onCollectCallback) {
            this.onCollectCallback(this.getScoreStats());
          }
        }
      }

      // Check Fatal Obstacle collisions
      for (const obs of this.obstaclePool) {
        if (obs.active && this._playerBox.intersectsBox(obs.box3)) {
          this.isGameOver = true;
          this._playerBox.getCenter(this._tempCenter);
          this._spawnImpactBurst(this._tempCenter);

          if (this.onCollisionCallback) {
            this.onCollisionCallback(this.getScoreStats(), obs);
          }
          break;
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // In-Place Theme Updating
  // --------------------------------------------------------------------------
  updateTheme({ themeMode = 'dark', surfaceColor = '#101522', accentColor = '#22d3ee' }) {
    const isDark = themeMode === 'dark';

    // Update conveyor road colors
    if (isDark) {
      this.roadFloorMaterial.color.set('#0e1424');
      this.roadLineMaterial.color.set(accentColor);
      this.roadLineMaterial.opacity = 0.65;
      this.roadMarkerMaterial.color.set('#1a233a');
      this.hazardMaterial.color.set('#FF6B6B');
      this.hazardMaterial.emissive.set('#FF3333');
    } else {
      this.roadFloorMaterial.color.set('#d8dee9');
      this.roadLineMaterial.color.set(accentColor);
      this.roadLineMaterial.opacity = 0.85;
      this.roadMarkerMaterial.color.set('#c5cdd9');
      this.hazardMaterial.color.set('#C2414B');
      this.hazardMaterial.emissive.set('#A02028');
    }

    // Update collectible and particle colors to match accent
    this.collectibleMaterial.color.set(accentColor);
    this.collectibleMaterial.emissive.set(accentColor);
    this.particleMaterial.color.set(accentColor);
  }

  // --------------------------------------------------------------------------
  // Public API & Listeners
  // --------------------------------------------------------------------------
  onCollision(callback) {
    this.onCollisionCallback = callback;
  }

  onCollect(callback) {
    this.onCollectCallback = callback;
  }

  getScoreStats() {
    return {
      runId: this.runId,
      score: this.score,
      duration: Number(this.runTime.toFixed(2)),
      distance: Math.floor(this.distance),
      collectibles: this.collectiblesCount,
      speed: Number(this.currentSpeed.toFixed(1))
    };
  }

  dispose() {
    if (this.chunkFloorGeo) this.chunkFloorGeo.dispose();
    if (this.chunkLineGeo) this.chunkLineGeo.dispose();
    if (this.chunkMarkerGeo) this.chunkMarkerGeo.dispose();

    if (this.roadFloorMaterial) this.roadFloorMaterial.dispose();
    if (this.roadLineMaterial) this.roadLineMaterial.dispose();
    if (this.roadMarkerMaterial) this.roadMarkerMaterial.dispose();
    if (this.hazardMaterial) this.hazardMaterial.dispose();
    if (this.casingMaterial) this.casingMaterial.dispose();
    if (this.collectibleMaterial) this.collectibleMaterial.dispose();
    if (this.particleMaterial) this.particleMaterial.dispose();

    if (this.scene && this.rootGroup) {
      this.scene.remove(this.rootGroup);
    }
  }
}
