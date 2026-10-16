import * as THREE from 'three';

/**
 * @typedef {Object} ThemeConfig
 * @property {'dark'|'light'} themeMode
 * @property {string} surfaceColor
 * @property {string} accentColor
 */

/**
 * GameScene — Three.js rendering foundation for Neon Drift.
 * Manages Scene, Camera, Renderer, stable Lights, Fog, and Grid Floor.
 * 
 * Performance rule: Materials and geometries are created once and updated in-place.
 */
export class GameScene {
  /**
   * @param {Object} options
   * @param {HTMLCanvasElement} options.canvas
   * @param {HTMLElement} [options.container]
   * @param {Object} [options.config]
   */
  constructor({ canvas, container = null, config = {} }) {
    this.canvas = canvas;
    this.container = container || canvas.parentElement || document.body;
    this.config = config;

    // 1. Scene & Environment
    this.scene = new THREE.Scene();

    // Default theme colors (will be updated via updateTheme)
    const initialSurface = config.surfaceColor || '#080c18';
    const initialAccent = config.accentColor || '#22d3ee';

    this.scene.background = new THREE.Color(initialSurface);
    this.fog = new THREE.Fog(initialSurface, 28, 95);
    this.scene.fog = this.fog;

    // 2. Camera Setup (matching DESIGN.md §5.2 specifications)
    const initialWidth = this.canvas.clientWidth || window.innerWidth;
    const initialHeight = this.canvas.clientHeight || window.innerHeight;
    const aspect = initialWidth / (initialHeight || 1);

    this.camera = new THREE.PerspectiveCamera(52, aspect, 0.1, 150);
    this.cameraFollowSmoothing = 6.0;

    // Pre-allocated vectors for zero-allocation camera lerping
    this._cameraOffset = new THREE.Vector3(0, 4.3, 8.2);
    if (aspect < 0.75) {
      this.camera.fov = 70;
      this._cameraOffset.set(0, 5.0, 10.6);
    } else if (aspect < 1.1) {
      this.camera.fov = 60;
      this._cameraOffset.set(0, 4.6, 9.2);
    }
    this.camera.updateProjectionMatrix();

    this._desiredCameraPos = this._cameraOffset.clone();
    this._desiredLookTarget = new THREE.Vector3(0, 1.1, -5.0);
    this._currentLookTarget = new THREE.Vector3(0, 1.1, -5.0);

    this.camera.position.copy(this._desiredCameraPos);
    this.camera.lookAt(this._currentLookTarget);

    // 3. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });

    const pixelRatioCap = config.pixelRatioCap || 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    this.renderer.setSize(initialWidth, initialHeight, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Stable Lights (Constructed once, updated in place)
    // Ambient / Hemisphere light
    this.hemisphereLight = new THREE.HemisphereLight('#a8b9ff', '#141827', 1.1);
    this.scene.add(this.hemisphereLight);

    // Key directional light with shadow mapping
    this.keyLight = new THREE.DirectionalLight('#ffffff', 2.0);
    this.keyLight.position.set(-4, 8, 6);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 30;
    this.keyLight.shadow.camera.left = -6;
    this.keyLight.shadow.camera.right = 6;
    this.keyLight.shadow.camera.top = 10;
    this.keyLight.shadow.camera.bottom = -4;
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight);

    // Accent rim light (separates player silhouette from scene)
    this.rimLight = new THREE.DirectionalLight(initialAccent, 1.6);
    this.rimLight.position.set(4, 3, -6);
    this.rimLight.castShadow = false;
    this.scene.add(this.rimLight);

    // 5. Grid Floor & Road Foundation
    this.roadGroup = new THREE.Group();
    this.scene.add(this.roadGroup);
    this._buildInitialFloorGrid(initialAccent);

    // 6. Context Loss Listeners
    this._onContextLost = this._onContextLost.bind(this);
    this._onContextRestored = this._onContextRestored.bind(this);
    this.canvas.addEventListener('webglcontextlost', this._onContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this._onContextRestored, false);
  }

  /**
   * Build baseline procedural road and lane dividers.
   * @param {string} accentColor
   * @private
   */
  _buildInitialFloorGrid(accentColor) {
    // Road plane (reusable)
    this.floorGeometry = new THREE.PlaneGeometry(9, 160, 1, 1);
    this.floorMaterial = new THREE.MeshStandardMaterial({
      color: '#0e1424',
      roughness: 0.85,
      metalness: 0.1
    });

    this.floorMesh = new THREE.Mesh(this.floorGeometry, this.floorMaterial);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.set(0, -0.02, -50);
    this.floorMesh.receiveShadow = true;
    this.roadGroup.add(this.floorMesh);

    // Lane divider lines (Lanes at X = -2.2, 0, 2.2)
    // Left border (-3.4), Divider 1 (-1.1), Divider 2 (1.1), Right border (3.4)
    const laneLinePositions = [-3.4, -1.1, 1.1, 3.4];
    this.laneLineMaterial = new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.55
    });

    this.laneLineGeometry = new THREE.PlaneGeometry(0.06, 160);

    laneLinePositions.forEach((xPos, idx) => {
      const lineMesh = new THREE.Mesh(this.laneLineGeometry, this.laneLineMaterial);
      lineMesh.rotation.x = -Math.PI / 2;
      lineMesh.position.set(xPos, 0, -50);
      // Give outer borders slightly lower opacity
      if (idx === 0 || idx === 3) {
        lineMesh.scale.set(1.5, 1, 1);
      }
      this.roadGroup.add(lineMesh);
    });

    // Cross-track grid accents (repeating horizontal markers)
    this.gridMarkerMaterial = new THREE.MeshBasicMaterial({
      color: '#1a233a',
      transparent: true,
      opacity: 0.4
    });
    this.gridMarkerGeometry = new THREE.PlaneGeometry(6.8, 0.04);

    for (let z = -120; z <= 20; z += 6) {
      const marker = new THREE.Mesh(this.gridMarkerGeometry, this.gridMarkerMaterial);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(0, 0.002, z);
      this.roadGroup.add(marker);
    }
  }

  /**
   * Add 3D object to scene.
   * @param {THREE.Object3D} object3D
   */
  add(object3D) {
    this.scene.add(object3D);
  }

  /**
   * Remove 3D object from scene.
   * @param {THREE.Object3D} object3D
   */
  remove(object3D) {
    this.scene.remove(object3D);
  }

  /**
   * Update theme styling in place without recreating the scene or renderer.
   * @param {ThemeConfig} themeConfig
   */
  updateTheme({ themeMode = 'dark', surfaceColor = '#101522', accentColor = '#22d3ee' }) {
    const isDark = themeMode === 'dark';

    // 1. Background & Fog
    this.scene.background.set(surfaceColor);
    this.fog.color.set(surfaceColor);

    // 2. Lights
    if (isDark) {
      this.hemisphereLight.color.set('#a8b9ff');
      this.hemisphereLight.groundColor.set('#141827');
      this.hemisphereLight.intensity = 1.1;
      this.keyLight.intensity = 2.0;
      this.rimLight.intensity = 1.6;
    } else {
      this.hemisphereLight.color.set('#f8faff');
      this.hemisphereLight.groundColor.set('#aeb8ca');
      this.hemisphereLight.intensity = 0.85;
      this.keyLight.intensity = 1.25;
      this.rimLight.intensity = 0.8;
    }

    this.rimLight.color.set(accentColor);

    // 3. Road & Grid lines
    if (isDark) {
      this.floorMaterial.color.set('#0e1424');
      this.laneLineMaterial.color.set(accentColor);
      this.laneLineMaterial.opacity = 0.55;
      this.gridMarkerMaterial.color.set('#1a233a');
    } else {
      this.floorMaterial.color.set('#d8dee9');
      this.laneLineMaterial.color.set(accentColor);
      this.laneLineMaterial.opacity = 0.75;
      this.gridMarkerMaterial.color.set('#c5cdd9');
    }
  }

  /**
   * Update camera position with delta-time-aware exponential smoothing.
   * @param {number} deltaTime Clamped frame delta in seconds
   * @param {{x: number, y: number, z: number}} [followState] Player position to follow
   */
  updateCamera(deltaTime, followState = { x: 0, y: 0, z: 0 }) {
    const playerX = followState.x || 0;
    const playerY = followState.y || 0;
    const playerZ = followState.z || 0;

    // Camera follow offset with subtle horizontal lane-follow (playerX * 0.22)
    this._desiredCameraPos.set(
      playerX * 0.22,
      playerY + this._cameraOffset.y,
      playerZ + this._cameraOffset.z
    );

    // Look target slightly ahead of player
    this._desiredLookTarget.set(
      playerX * 0.1,
      playerY + 1.1,
      playerZ - 5.0
    );

    // Exponential smoothing: alpha = 1 - exp(-k * dt)
    const alpha = 1 - Math.exp(-this.cameraFollowSmoothing * deltaTime);

    this.camera.position.lerp(this._desiredCameraPos, alpha);
    this._currentLookTarget.lerp(this._desiredLookTarget, alpha);
    this.camera.lookAt(this._currentLookTarget);
  }

  /**
   * Handle responsive resize.
   * @param {number} width
   * @param {number} height
   * @param {number} [pixelRatio]
   */
  resize(width, height, pixelRatio) {
    if (!width || !height) return;

    const aspect = width / height;
    this.camera.aspect = aspect;

    // Adapt FOV and camera offset for portrait / mobile screens so all 3 lanes are clearly visible and not zoomed in
    if (aspect < 0.75) {
      // Narrow mobile portrait: widen FOV & move camera back for a clear, un-zoomed view of the track
      this.camera.fov = 70;
      this._cameraOffset.set(0, 5.0, 10.6);
    } else if (aspect < 1.1) {
      // Square-ish / tablet
      this.camera.fov = 60;
      this._cameraOffset.set(0, 4.6, 9.2);
    } else {
      // Standard landscape / desktop
      this.camera.fov = 52;
      this._cameraOffset.set(0, 4.3, 8.2);
    }

    this.camera.updateProjectionMatrix();

    const pr = Math.min(pixelRatio || window.devicePixelRatio || 1, this.config.pixelRatioCap || 2);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(width, height, false);
  }

  /**
   * Render single frame.
   */
  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * WebGL Context Lost handler
   * @private
   */
  _onContextLost(event) {
    event.preventDefault();
    console.warn('[Neon Drift] WebGL context lost. Pausing rendering.');
    if (this.config.onContextLost) {
      this.config.onContextLost();
    }
  }

  /**
   * WebGL Context Restored handler
   * @private
   */
  _onContextRestored() {
    console.info('[Neon Drift] WebGL context restored. Re-initializing GPU resources.');
    if (this.config.onContextRestored) {
      this.config.onContextRestored();
    }
  }

  /**
   * Full cleanup and disposal of owned GPU resources and listeners.
   */
  dispose() {
    this.canvas.removeEventListener('webglcontextlost', this._onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this._onContextRestored);

    if (this.floorGeometry) this.floorGeometry.dispose();
    if (this.floorMaterial) this.floorMaterial.dispose();
    if (this.laneLineGeometry) this.laneLineGeometry.dispose();
    if (this.laneLineMaterial) this.laneLineMaterial.dispose();
    if (this.gridMarkerGeometry) this.gridMarkerGeometry.dispose();
    if (this.gridMarkerMaterial) this.gridMarkerMaterial.dispose();

    if (this.keyLight && this.keyLight.shadow && this.keyLight.shadow.map) {
      this.keyLight.shadow.map.dispose();
    }

    this.renderer.dispose();
  }
}
