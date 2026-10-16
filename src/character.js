import * as THREE from 'three';

/**
 * @typedef {'matte'|'metallic'|'neon'} FinishType
 * @typedef {'none'|'halo'|'wings'|'visor-crown'} AccessoryType
 * @typedef {'dark'|'light'} ThemeMode
 *
 * @typedef {Object} StyleConfig
 * @property {string} [primaryColor] Valid CSS color string
 * @property {string} [accentColor] Valid CSS color string
 * @property {string} [surfaceColor] Valid CSS color string
 * @property {FinishType} [finishType]
 * @property {AccessoryType} [accessory]
 * @property {ThemeMode} [themeMode]
 */

/**
 * Bounded PBR Finish Presets from DESIGN.md §4.6 & ARCHITECTURE.md §5.4
 */
export const FINISH_PRESETS = Object.freeze({
  matte: {
    primary: { metalness: 0.05, roughness: 0.82, emissiveIntensity: 0.03 },
    accent: { metalness: 0.10, roughness: 0.58, emissiveIntensity: 0.20 },
    surface: { metalness: 0.05, roughness: 0.82, emissiveIntensity: 0.02 }
  },
  metallic: {
    primary: { metalness: 0.78, roughness: 0.28, emissiveIntensity: 0.08 },
    accent: { metalness: 0.65, roughness: 0.24, emissiveIntensity: 0.35 },
    surface: { metalness: 0.60, roughness: 0.35, emissiveIntensity: 0.06 }
  },
  neon: {
    primary: { metalness: 0.22, roughness: 0.32, emissiveIntensity: 0.65 },
    accent: { metalness: 0.18, roughness: 0.24, emissiveIntensity: 1.65 },
    surface: { metalness: 0.20, roughness: 0.40, emissiveIntensity: 0.15 }
  }
});

/**
 * Lane centers along X axis (Left, Center, Right)
 */
export const LANE_COORDINATES = Object.freeze([-2.2, 0, 2.2]);

/**
 * PlayerCharacter — Procedural 3D humanoid cyber-runner.
 * Conforms to node hierarchy and in-place material styling rules in ARCHITECTURE.md.
 */
export class PlayerCharacter {
  /**
   * @param {Object} [options]
   * @param {Object} [options.config]
   */
  constructor({ config = {} } = {}) {
    this.config = config;

    // Root Group
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'PlayerCharacter';

    // Gameplay Motion & Physics State
    this.currentLane = 1; // Center lane
    this.targetX = LANE_COORDINATES[this.currentLane];
    this.laneLerpSpeed = 15.0;

    this.jumpVelocity = 11.0;
    this.gravity = -28.0;
    this.verticalVelocity = 0;
    this.isGrounded = true;

    // Animation state
    this.animTime = 0;
    this.cachedStyle = null;

    // Collision dimensions (stable, unaffected by accessories)
    this.collisionBounds = {
      width: 0.8,
      height: 1.8,
      depth: 0.8
    };

    // Pre-allocated vectors for math & transforms
    this._followState = { x: 0, y: 0, z: 0 };
    this._tempColor = new THREE.Color();

    // 1. Initialize Materials (reusable instances created ONCE)
    this._initMaterials();

    // 2. Build Named Mesh Hierarchy
    this._buildMeshHierarchy();

    // 3. Apply default styling
    this.applyCentralStyling({
      primaryColor: '#7c3aed',
      accentColor: '#22d3ee',
      surfaceColor: '#101522',
      finishType: 'metallic',
      accessory: 'none',
      themeMode: 'dark'
    });
  }

  /**
   * Initialize standard PBR materials created once.
   * @private
   */
  _initMaterials() {
    this.primaryMaterial = new THREE.MeshStandardMaterial({
      color: '#7c3aed',
      emissive: '#7c3aed',
      emissiveIntensity: 0.08,
      metalness: 0.78,
      roughness: 0.28
    });

    this.accentMaterial = new THREE.MeshStandardMaterial({
      color: '#22d3ee',
      emissive: '#22d3ee',
      emissiveIntensity: 0.35,
      metalness: 0.65,
      roughness: 0.24
    });

    this.surfaceMaterial = new THREE.MeshStandardMaterial({
      color: '#101522',
      emissive: '#101522',
      emissiveIntensity: 0.06,
      metalness: 0.60,
      roughness: 0.35
    });

    this.trailMaterial = new THREE.MeshStandardMaterial({
      color: '#22d3ee',
      emissive: '#22d3ee',
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.65,
      metalness: 0.1,
      roughness: 0.4
    });
  }

  /**
   * Construct the procedural humanoid runner with exact required named nodes.
   * @private
   */
  _buildMeshHierarchy() {
    // -------------------------------------------------------------------------
    // Torso / Body (Capsule / Beveled geometry)
    // -------------------------------------------------------------------------
    this.bodyGeometry = new THREE.CapsuleGeometry(0.32, 0.55, 8, 16);
    this.bodyMesh = new THREE.Mesh(this.bodyGeometry, this.primaryMaterial);
    this.bodyMesh.name = 'Body';
    this.bodyMesh.position.set(0, 0.95, 0);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.rootGroup.add(this.bodyMesh);

    // Torso armor plate / chest core accent
    this.chestCoreGeo = new THREE.BoxGeometry(0.24, 0.28, 0.1);
    this.chestCoreMesh = new THREE.Mesh(this.chestCoreGeo, this.accentMaterial);
    this.chestCoreMesh.position.set(0, 0.08, 0.3);
    this.bodyMesh.add(this.chestCoreMesh);

    // -------------------------------------------------------------------------
    // Head & Visor
    // -------------------------------------------------------------------------
    this.headGroup = new THREE.Group();
    this.headGroup.name = 'Head';
    this.headGroup.position.set(0, 1.55, 0);
    this.rootGroup.add(this.headGroup);

    this.headGeometry = new THREE.SphereGeometry(0.24, 16, 16);
    this.headMesh = new THREE.Mesh(this.headGeometry, this.primaryMaterial);
    this.headMesh.castShadow = true;
    this.headGroup.add(this.headMesh);

    // Visor across the face
    this.visorGeometry = new THREE.BoxGeometry(0.32, 0.12, 0.18);
    this.visorMesh = new THREE.Mesh(this.visorGeometry, this.accentMaterial);
    this.visorMesh.name = 'Visor';
    this.visorMesh.position.set(0, 0.02, 0.16);
    this.headGroup.add(this.visorMesh);

    // -------------------------------------------------------------------------
    // Limbs Group (Arms and Legs with pivot groups for animation)
    // -------------------------------------------------------------------------
    this.limbsGroup = new THREE.Group();
    this.limbsGroup.name = 'Limbs';
    this.rootGroup.add(this.limbsGroup);

    // Reusable limb geometries
    this.armGeometry = new THREE.CapsuleGeometry(0.1, 0.42, 6, 10);
    this.legGeometry = new THREE.CapsuleGeometry(0.12, 0.5, 6, 10);
    this.jointGeometry = new THREE.SphereGeometry(0.11, 8, 8);

    // Left Arm Pivot
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.46, 1.25, 0);
    this.limbsGroup.add(this.leftArmPivot);

    this.armLMesh = new THREE.Mesh(this.armGeometry, this.primaryMaterial);
    this.armLMesh.name = 'Arm_L';
    this.armLMesh.position.set(0, -0.24, 0);
    this.armLMesh.castShadow = true;
    this.leftArmPivot.add(this.armLMesh);

    this.jointL = new THREE.Mesh(this.jointGeometry, this.surfaceMaterial);
    this.leftArmPivot.add(this.jointL);

    // Right Arm Pivot
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.46, 1.25, 0);
    this.limbsGroup.add(this.rightArmPivot);

    this.armRMesh = new THREE.Mesh(this.armGeometry, this.primaryMaterial);
    this.armRMesh.name = 'Arm_R';
    this.armRMesh.position.set(0, -0.24, 0);
    this.armRMesh.castShadow = true;
    this.rightArmPivot.add(this.armRMesh);

    this.jointR = new THREE.Mesh(this.jointGeometry, this.surfaceMaterial);
    this.rightArmPivot.add(this.jointR);

    // Left Leg Pivot
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.2, 0.62, 0);
    this.limbsGroup.add(this.leftLegPivot);

    this.legLMesh = new THREE.Mesh(this.legGeometry, this.primaryMaterial);
    this.legLMesh.name = 'Leg_L';
    this.legLMesh.position.set(0, -0.28, 0);
    this.legLMesh.castShadow = true;
    this.leftLegPivot.add(this.legLMesh);

    // Right Leg Pivot
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.2, 0.62, 0);
    this.limbsGroup.add(this.rightLegPivot);

    this.legRMesh = new THREE.Mesh(this.legGeometry, this.primaryMaterial);
    this.legRMesh.name = 'Leg_R';
    this.legRMesh.position.set(0, -0.28, 0);
    this.legRMesh.castShadow = true;
    this.rightLegPivot.add(this.legRMesh);

    // -------------------------------------------------------------------------
    // Accessory: Halo (Torus hovering above head)
    // -------------------------------------------------------------------------
    this.haloGeometry = new THREE.TorusGeometry(0.28, 0.035, 8, 24);
    this.haloMesh = new THREE.Mesh(this.haloGeometry, this.accentMaterial);
    this.haloMesh.name = 'Accessory_Halo';
    this.haloMesh.rotation.x = Math.PI / 2;
    this.haloMesh.position.set(0, 0.38, -0.05);
    this.haloMesh.visible = false;
    this.headGroup.add(this.haloMesh);

    // -------------------------------------------------------------------------
    // Accessory: Wings (Left and Right aerodynamic back fins)
    // -------------------------------------------------------------------------
    this.wingsGroup = new THREE.Group();
    this.wingsGroup.name = 'Accessory_Wings';
    this.wingsGroup.position.set(0, 1.05, -0.22);
    this.wingsGroup.visible = false;
    this.rootGroup.add(this.wingsGroup);

    // Custom polygonal wing fin
    this.wingGeometry = new THREE.ConeGeometry(0.22, 0.7, 4);
    this.wingGeometry.rotateZ(Math.PI / 2);

    this.wingLMesh = new THREE.Mesh(this.wingGeometry, this.accentMaterial);
    this.wingLMesh.name = 'Wing_L';
    this.wingLMesh.position.set(-0.35, 0.15, -0.1);
    this.wingLMesh.rotation.set(0.2, 0.4, 0.6);
    this.wingLMesh.scale.set(0.6, 1.4, 0.15);
    this.wingsGroup.add(this.wingLMesh);

    this.wingRMesh = new THREE.Mesh(this.wingGeometry, this.accentMaterial);
    this.wingRMesh.name = 'Wing_R';
    this.wingRMesh.position.set(0.35, 0.15, -0.1);
    this.wingRMesh.rotation.set(0.2, -0.4, -0.6);
    this.wingRMesh.scale.set(0.6, 1.4, 0.15);
    this.wingsGroup.add(this.wingRMesh);

    // -------------------------------------------------------------------------
    // Accessory: Visor-Crown (Crown frame above visor)
    // -------------------------------------------------------------------------
    this.crownGroup = new THREE.Group();
    this.crownGroup.name = 'Accessory_Crown';
    this.crownGroup.position.set(0, 0.22, 0.08);
    this.crownGroup.visible = false;
    this.headGroup.add(this.crownGroup);

    this.crownGeometry = new THREE.CylinderGeometry(0.25, 0.22, 0.1, 5, 1, true);
    this.crownFrame = new THREE.Mesh(this.crownGeometry, this.accentMaterial);
    this.crownFrame.name = 'Crown_Frame';
    this.crownGroup.add(this.crownFrame);

    // -------------------------------------------------------------------------
    // Trail Group (Short pooled energy ribbon behind runner)
    // -------------------------------------------------------------------------
    this.trailGroup = new THREE.Group();
    this.trailGroup.name = 'Trail';
    this.trailGroup.position.set(0, 0.6, 0.35);
    this.rootGroup.add(this.trailGroup);

    this.trailSegGeo = new THREE.PlaneGeometry(0.35, 0.6);
    for (let i = 0; i < 3; i++) {
      const seg = new THREE.Mesh(this.trailSegGeo, this.trailMaterial);
      seg.rotation.x = Math.PI / 2;
      seg.position.set(0, 0, i * 0.45);
      seg.scale.set(1 - i * 0.25, 1, 1);
      this.trailGroup.add(seg);
    }
  }

  /**
   * Apply central styling in place without reallocating geometries or materials.
   * @param {StyleConfig} style
   */
  applyCentralStyling(style = {}) {
    const primary = style.primaryColor || '#7c3aed';
    const accent = style.accentColor || '#22d3ee';
    const surface = style.surfaceColor || '#101522';
    const finish = style.finishType || 'metallic';
    const accessory = style.accessory || 'none';
    const themeMode = style.themeMode || 'dark';

    // 1. Update Material Colors in place
    this.primaryMaterial.color.set(primary);
    this.primaryMaterial.emissive.set(primary);

    this.accentMaterial.color.set(accent);
    this.accentMaterial.emissive.set(accent);

    this.surfaceMaterial.color.set(surface);
    this.surfaceMaterial.emissive.set(surface);

    this.trailMaterial.color.set(accent);
    this.trailMaterial.emissive.set(accent);

    // 2. Apply PBR Finish Presets
    const preset = FINISH_PRESETS[finish] || FINISH_PRESETS.metallic;
    const emissiveMultiplier = themeMode === 'light' ? 0.85 : 1.0;

    // Primary armor
    this.primaryMaterial.metalness = preset.primary.metalness;
    this.primaryMaterial.roughness = preset.primary.roughness;
    this.primaryMaterial.emissiveIntensity = preset.primary.emissiveIntensity * emissiveMultiplier;

    // Accent parts & visor
    this.accentMaterial.metalness = preset.accent.metalness;
    this.accentMaterial.roughness = preset.accent.roughness;
    this.accentMaterial.emissiveIntensity = preset.accent.emissiveIntensity * emissiveMultiplier;

    // Surface / structural joints
    this.surfaceMaterial.metalness = preset.surface.metalness;
    this.surfaceMaterial.roughness = preset.surface.roughness;
    this.surfaceMaterial.emissiveIntensity = preset.surface.emissiveIntensity * emissiveMultiplier;

    // 3. Update Accessory Visibility (Exclusive contract per ARCHITECTURE.md §5.3)
    this.haloMesh.visible = (accessory === 'halo');
    this.wingsGroup.visible = (accessory === 'wings');
    this.crownGroup.visible = (accessory === 'visor-crown');

    // Visor remains visible for face identity
    this.visorMesh.visible = true;

    // Cache applied configuration
    this.cachedStyle = { primary, accent, surface, finish, accessory, themeMode };
  }

  /**
   * Set target lane clamped between 0 (Left), 1 (Center), 2 (Right).
   * @param {number} laneIndex
   */
  setLane(laneIndex) {
    this.currentLane = Math.max(0, Math.min(2, Math.round(laneIndex)));
    this.targetX = LANE_COORDINATES[this.currentLane];
  }

  /**
   * Shift left one lane
   */
  moveLeft() {
    this.setLane(this.currentLane - 1);
  }

  /**
   * Shift right one lane
   */
  moveRight() {
    this.setLane(this.currentLane + 1);
  }

  /**
   * Initiate jump if grounded
   */
  jump() {
    if (this.isGrounded) {
      this.verticalVelocity = this.jumpVelocity;
      this.isGrounded = false;
    }
  }

  /**
   * Update character simulation, physics, and animation.
   * @param {number} deltaTime Clamped frame delta in seconds
   * @param {string} [gameState] Current application state
   */
  update(deltaTime, gameState = 'READY') {
    this.animTime += deltaTime;

    // 1. Smooth horizontal lane movement (exponential lerp)
    const alphaX = 1 - Math.exp(-this.laneLerpSpeed * deltaTime);
    this.rootGroup.position.x += (this.targetX - this.rootGroup.position.x) * alphaX;

    // 2. Jump physics simulation
    if (!this.isGrounded) {
      this.verticalVelocity += this.gravity * deltaTime;
      this.rootGroup.position.y += this.verticalVelocity * deltaTime;

      if (this.rootGroup.position.y <= 0) {
        this.rootGroup.position.y = 0;
        this.verticalVelocity = 0;
        this.isGrounded = true;
      }
    }

    // 3. Animation State Handling
    const isPlaying = (gameState === 'PLAYING');

    if (!this.isGrounded) {
      // Airborne pose
      this.leftArmPivot.rotation.x = -0.7;
      this.rightArmPivot.rotation.x = -0.7;
      this.leftLegPivot.rotation.x = 0.5;
      this.rightLegPivot.rotation.x = -0.2;
    } else if (isPlaying) {
      // Fast running leg & arm swing
      const runCycle = Math.sin(this.animTime * 14.0);
      this.leftArmPivot.rotation.x = runCycle * 0.55;
      this.rightArmPivot.rotation.x = -runCycle * 0.55;
      this.leftLegPivot.rotation.x = -runCycle * 0.65;
      this.rightLegPivot.rotation.x = runCycle * 0.65;
      this.bodyMesh.position.y = 0.95 + Math.abs(Math.sin(this.animTime * 14.0)) * 0.05;
    } else {
      // Idle breathing / floating animation (READY, PAUSED, etc.)
      const idleBob = Math.sin(this.animTime * 3.0) * 0.04;
      this.bodyMesh.position.y = 0.95 + idleBob;
      this.headGroup.position.y = 1.55 + idleBob * 1.2;

      this.leftArmPivot.rotation.x = Math.sin(this.animTime * 2.0) * 0.08;
      this.rightArmPivot.rotation.x = -Math.sin(this.animTime * 2.0) * 0.08;
      this.leftLegPivot.rotation.x = 0;
      this.rightLegPivot.rotation.x = 0;

      if (this.haloMesh.visible) {
        this.haloMesh.position.y = 0.38 + Math.sin(this.animTime * 2.5) * 0.03;
      }
    }

    // Update follow state for camera
    this._followState.x = this.rootGroup.position.x;
    this._followState.y = this.rootGroup.position.y;
    this._followState.z = this.rootGroup.position.z;
  }

  /**
   * Return camera follow coordinates.
   * @returns {{x: number, y: number, z: number}}
   */
  getCameraFollowState() {
    return this._followState;
  }

  /**
   * Return stable collision bounding box.
   * @returns {{x: number, y: number, z: number, width: number, height: number, depth: number}}
   */
  getCollisionBounds() {
    return {
      x: this.rootGroup.position.x,
      y: this.rootGroup.position.y + this.collisionBounds.height / 2,
      z: this.rootGroup.position.z,
      width: this.collisionBounds.width,
      height: this.collisionBounds.height,
      depth: this.collisionBounds.depth
    };
  }

  /**
   * Reset character to starting run position and zero velocity.
   */
  resetForRun() {
    this.currentLane = 1;
    this.targetX = LANE_COORDINATES[1];
    this.rootGroup.position.set(0, 0, 0);
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.animTime = 0;
  }

  /**
   * Cleanly dispose character-owned geometries and materials.
   */
  dispose() {
    if (this.bodyGeometry) this.bodyGeometry.dispose();
    if (this.chestCoreGeo) this.chestCoreGeo.dispose();
    if (this.headGeometry) this.headGeometry.dispose();
    if (this.visorGeometry) this.visorGeometry.dispose();
    if (this.armGeometry) this.armGeometry.dispose();
    if (this.legGeometry) this.legGeometry.dispose();
    if (this.jointGeometry) this.jointGeometry.dispose();
    if (this.haloGeometry) this.haloGeometry.dispose();
    if (this.wingGeometry) this.wingGeometry.dispose();
    if (this.crownGeometry) this.crownGeometry.dispose();
    if (this.trailSegGeo) this.trailSegGeo.dispose();

    if (this.primaryMaterial) this.primaryMaterial.dispose();
    if (this.accentMaterial) this.accentMaterial.dispose();
    if (this.surfaceMaterial) this.surfaceMaterial.dispose();
    if (this.trailMaterial) this.trailMaterial.dispose();
  }
}
