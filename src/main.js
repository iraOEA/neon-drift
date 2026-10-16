import { GameScene } from './scene.js';
import { PlayerCharacter } from './character.js';
import { GameWorld } from './world.js';
import { UIManager } from './ui.js';
import {
  createPlatformAdapter,
  resolveStyle,
  readCentralStyleTokens,
  DEFAULT_STYLE
} from './startngBridge.js';

/**
 * State definitions per ARCHITECTURE.md §9.1
 */
export const GameState = Object.freeze({
  BOOT: 'BOOT',
  AUTHENTICATING: 'AUTHENTICATING',
  LOADING_PROFILE: 'LOADING_PROFILE',
  APPLYING_STYLE: 'APPLYING_STYLE',
  READY: 'READY',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
  SUBMITTING_SCORE: 'SUBMITTING_SCORE',
  SCORE_SAVED: 'SCORE_SAVED',
  ERROR: 'ERROR'
});

/**
 * Explicit allowed state transitions matrix per ARCHITECTURE.md §9.1
 */
export const ALLOWED_TRANSITIONS = Object.freeze({
  [GameState.BOOT]: [GameState.AUTHENTICATING, GameState.ERROR],
  [GameState.AUTHENTICATING]: [GameState.LOADING_PROFILE, GameState.READY, GameState.ERROR],
  [GameState.LOADING_PROFILE]: [GameState.APPLYING_STYLE, GameState.READY, GameState.ERROR],
  [GameState.APPLYING_STYLE]: [GameState.READY, GameState.ERROR],
  [GameState.READY]: [GameState.PLAYING, GameState.LOADING_PROFILE, GameState.APPLYING_STYLE, GameState.ERROR],
  [GameState.PLAYING]: [GameState.PAUSED, GameState.GAME_OVER, GameState.READY, GameState.ERROR],
  [GameState.PAUSED]: [GameState.PLAYING, GameState.READY, GameState.GAME_OVER, GameState.ERROR],
  [GameState.GAME_OVER]: [GameState.SUBMITTING_SCORE, GameState.READY, GameState.ERROR],
  [GameState.SUBMITTING_SCORE]: [GameState.SCORE_SAVED, GameState.READY, GameState.ERROR],
  [GameState.SCORE_SAVED]: [GameState.READY, GameState.PLAYING, GameState.ERROR],
  [GameState.ERROR]: [GameState.BOOT, GameState.AUTHENTICATING, GameState.READY]
});

/**
 * Maximum simulation delta time (50ms) to prevent large physics jumps after stalls
 */
const MAX_FRAME_DELTA = 0.05;

/**
 * Neon Drift Application Controller
 */
export class NeonDriftApp {
  constructor() {
    this.state = GameState.BOOT;
    this.rafId = 0;
    this.previousTime = 0;
    this._isRunning = false;

    // Platform & Styling State
    this.platformAdapter = null;
    this.currentUser = null;
    this.currentProfileStyle = {};
    this.currentHighScore = 0;
    this.resolvedStyle = { ...DEFAULT_STYLE };
    this.devOverrides = {};
    this._unsubscribers = [];

    // Touch gesture state
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchStartTime = 0;

    // DOM Elements
    this.appElement = document.getElementById('game-app');
    this.stageElement = document.getElementById('game-stage');
    this.canvasElement = document.getElementById('game-canvas');

    if (!this.canvasElement) {
      throw new Error('[Neon Drift] #game-canvas element not found in DOM.');
    }

    // Bind methods
    this._frame = this._frame.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
  }

  /**
   * Initialize and start the application.
   */
  async init() {
    // 1. Initialize Three.js Scene
    this.scene = new GameScene({
      canvas: this.canvasElement,
      container: this.stageElement,
      config: {
        pixelRatioCap: 2,
        surfaceColor: '#080c18',
        accentColor: '#22d3ee'
      }
    });

    // 2. Mount Procedural Player Character
    this.character = new PlayerCharacter();
    this.scene.add(this.character.rootGroup);

    // 3. Initialize Dynamic World & Object Pools per ARCHITECTURE.md §3.6
    this.world = new GameWorld({ scene: this.scene.scene });

    // Connect World Event Callbacks
    this.world.onCollision(async (stats, obstacle) => {
      console.info('[Neon Drift] Fatal collision with obstacle:', obstacle.type);
      await this._handleGameOver(stats);
    });

    this.world.onCollect((stats) => {
      this._updateScoreHUD(stats);
    });

    // 4. Setup Controls (Keyboard & Touch)
    window.addEventListener('keydown', this._onKeyDown);
    this._initTouchControls();

    // 5. Setup UI Bindings
    this._initUIElements();

    // 6. Setup ResizeObserver for responsive layout
    if (window.ResizeObserver && this.stageElement) {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          this.scene.resize(width, height);
        }
      });
      this.resizeObserver.observe(this.stageElement);
    } else {
      window.addEventListener('resize', this._onResize, { passive: true });
    }

    // 7. Tab visibility listener
    document.addEventListener('visibilitychange', this._onVisibilityChange);

    // Initial resize
    this._onResize();

    // 8. Connect Platform Adapter & Execute Auth Handshake per ARCHITECTURE.md §8.1
    this.transitionTo(GameState.AUTHENTICATING);
    this.platformAdapter = createPlatformAdapter();

    try {
      this.currentUser = await this.platformAdapter.getCurrentUser();

      this.transitionTo(GameState.LOADING_PROFILE);
      if (this.currentUser) {
        this.currentProfileStyle = (await this.platformAdapter.getProfileStyling(this.currentUser)) || {};
        const scoreData = await this.platformAdapter.getHighScore(this.currentUser);
        this.currentHighScore = scoreData.highScore || 0;
        this._updateUserPill();
      }

      this.transitionTo(GameState.APPLYING_STYLE);

      // Support development preview query params (e.g. ?lane=0&accessory=wings&finish=neon)
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('lane')) {
        this.character.setLane(parseInt(urlParams.get('lane'), 10));
      }
      if (urlParams.has('accessory')) this.devOverrides.accessory = urlParams.get('accessory');
      if (urlParams.has('finish')) this.devOverrides.finishType = urlParams.get('finish');
      if (urlParams.has('primary')) this.devOverrides.primaryColor = urlParams.get('primary');
      if (urlParams.has('accent')) this.devOverrides.accentColor = urlParams.get('accent');
      if (urlParams.has('surface')) this.devOverrides.surfaceColor = urlParams.get('surface');
      if (urlParams.has('theme')) this.devOverrides.themeMode = urlParams.get('theme');

      // Resolve style and apply to character, scene, and world in place
      this.applyCurrentStyle();

      // Subscribe to central style changes from platform observer
      const unsubStyle = this.platformAdapter.subscribeCentralStyleChanges((tokens) => {
        console.debug('[Neon Drift] Central style update received from platform:', tokens);
        this.applyCurrentStyle();
      });
      this._unsubscribers.push(unsubStyle);

      // Subscribe to user account changes per ARCHITECTURE.md §8.4
      const unsubUser = this.platformAdapter.subscribeUserChanges(async (newUser) => {
        console.info('[Neon Drift] User account changed:', newUser?.username);
        await this._handleAccountChange(newUser);
      });
      this._unsubscribers.push(unsubUser);

      // 9. Transition to READY
      this.transitionTo(GameState.READY);
      this._renderScreens();
    } catch (err) {
      console.error('[Neon Drift] Initialization error during auth/profile lifecycle:', err);
      this.transitionTo(GameState.ERROR, { error: err.message });
      throw err;
    }

    // 10. Start single master requestAnimationFrame loop
    this.startLoop();

    console.info(
      `[Neon Drift] Phase 4 initialized successfully with world & gameplay in state: ${this.state}`
    );
  }

  // --------------------------------------------------------------------------
  // UI & HUD Management (Delegated to UIManager per ARCHITECTURE.md §3.8)
  // --------------------------------------------------------------------------
  _initUIElements() {
    this.ui = new UIManager({
      app: this,
      appElement: this.appElement,
      stageElement: this.stageElement
    });
    this.ui.init();
    this.ui.updateScore({ score: 0, collectibles: 0, highScore: this.currentHighScore });
  }

  _updateUserPill() {
    if (this.ui) {
      this.ui.updateUser(this.currentUser);
    }
  }

  _updateScoreHUD(stats = {}) {
    if (this.ui) {
      this.ui.updateScore({
        score: stats.score !== undefined ? stats.score : (this.world?.score || 0),
        collectibles: stats.collectibles !== undefined ? stats.collectibles : (this.world?.collectiblesCount || 0),
        highScore: this.currentHighScore
      });
    }
  }

  _renderScreens(stats = {}, statusMsg = '', isNewHighScore = false) {
    if (this.ui) {
      this.ui.showScreen(this.state, {
        stats,
        statusMsg,
        isNewHighScore,
        error: stats?.error
      });
    }
  }

  // --------------------------------------------------------------------------
  // Gameplay State Actions
  // --------------------------------------------------------------------------

  startGame() {
    if (this.state !== GameState.READY) return;

    if (this.character) {
      this.character.resetForRun();
    }
    if (this.world) {
      this.world.resetRun();
    }

    this.transitionTo(GameState.PLAYING);
    this._renderScreens();
    this._updateScoreHUD({ score: 0, collectibles: 0 });
  }

  pauseGame() {
    if (this.state !== GameState.PLAYING) return;
    this.transitionTo(GameState.PAUSED);
    this._renderScreens();
  }

  resumeGame() {
    if (this.state !== GameState.PAUSED) return;
    this.transitionTo(GameState.PLAYING);
    this._renderScreens();
  }

  async _handleGameOver(stats) {
    this.transitionTo(GameState.GAME_OVER, stats);
    this._renderScreens(stats, 'Recording collision...');

    // Progress to SUBMITTING_SCORE
    this.transitionTo(GameState.SUBMITTING_SCORE, stats);
    this._renderScreens(stats, 'Saving run to start.ng...');

    try {
      const response = await this.platformAdapter.submitScore({
        runId: stats.runId,
        score: stats.score,
        duration: stats.duration,
        distance: stats.distance,
        collectibles: stats.collectibles
      });

      const isNewHighScore = response?.isNewHighScore || stats.score > this.currentHighScore;
      if (response?.highScore) {
        this.currentHighScore = response.highScore;
      } else if (stats.score > this.currentHighScore) {
        this.currentHighScore = stats.score;
      }

      this.transitionTo(GameState.SCORE_SAVED, { ...stats, isNewHighScore });
      this._renderScreens(stats, 'Score confirmed & saved to start.ng!', isNewHighScore);
      this._updateScoreHUD(stats);
    } catch (err) {
      console.warn('[Neon Drift] Score save failed:', err);
      this.transitionTo(GameState.SCORE_SAVED, { ...stats, saveFailed: true });
      this._renderScreens(stats, 'Saved locally (offline mode)');
    }
  }

  // --------------------------------------------------------------------------
  // Styling Application
  // --------------------------------------------------------------------------

  /**
   * Resolves current styling and applies it to character, scene, and world in place.
   * @returns {Object} Resolved style
   */
  applyCurrentStyle() {
    const centralTokens = this.platformAdapter
      ? this.platformAdapter.readCentralStyleTokens()
      : readCentralStyleTokens();

    const resolved = resolveStyle({
      defaults: DEFAULT_STYLE,
      profileStyle: this.currentProfileStyle,
      centralTokens,
      devOverrides: this.devOverrides
    });

    this.resolvedStyle = resolved;

    // Apply to 3D character in place
    if (this.character) {
      this.character.applyCentralStyling(resolved);
    }

    // Apply to 3D scene in place
    if (this.scene) {
      this.scene.updateTheme({
        themeMode: resolved.themeMode,
        surfaceColor: resolved.surfaceColor,
        accentColor: resolved.accentColor
      });
    }

    // Apply to 3D world in place
    if (this.world) {
      this.world.updateTheme({
        themeMode: resolved.themeMode,
        surfaceColor: resolved.surfaceColor,
        accentColor: resolved.accentColor
      });
    }

    // Update document attribute for theme-aware CSS styling
    if (this.appElement) {
      this.appElement.setAttribute('data-theme', resolved.themeMode);
      this.appElement.style.setProperty('--nd-current-primary', resolved.primaryColor);
      this.appElement.style.setProperty('--nd-current-accent', resolved.accentColor);
      this.appElement.style.setProperty('--nd-current-surface', resolved.surfaceColor);
    }

    // Update diagnostics in style simulator if active
    if (this.ui) {
      this.ui.updateSimulatorDiagnostics(resolved);
    }

    return resolved;
  }

  /**
   * Account change handler per ARCHITECTURE.md §8.4
   * @param {Object|null} newUser
   * @private
   */
  async _handleAccountChange(newUser) {
    if (this.state === GameState.PLAYING) {
      this.transitionTo(GameState.PAUSED, { reason: 'account_switch' });
    }

    this.currentUser = newUser;
    this.transitionTo(GameState.LOADING_PROFILE);

    if (newUser) {
      this.currentProfileStyle = (await this.platformAdapter.getProfileStyling(newUser)) || {};
      const scoreData = await this.platformAdapter.getHighScore(newUser);
      this.currentHighScore = scoreData.highScore || 0;
      this._updateUserPill();
    } else {
      this.currentProfileStyle = {};
      this.currentHighScore = 0;
      this._updateUserPill();
    }

    this.transitionTo(GameState.APPLYING_STYLE);
    this.applyCurrentStyle();
    this.transitionTo(GameState.READY);
    this._renderScreens();
  }

  /**
   * Legal state transition handler enforcing ALLOWED_TRANSITIONS
   * @param {string} nextState
   * @param {Object} [metadata]
   */
  transitionTo(nextState, metadata = {}) {
    if (this.state === nextState) return;

    const allowed = ALLOWED_TRANSITIONS[this.state];
    if (!allowed || !allowed.includes(nextState)) {
      const errorMsg = `[Neon Drift] Illegal state transition from ${this.state} to ${nextState}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const prevState = this.state;
    this.state = nextState;

    if (this.appElement) {
      this.appElement.setAttribute('data-game-state', nextState);
    }

    console.debug(`[Neon Drift] State: ${prevState} -> ${nextState}`, metadata);
  }

  // --------------------------------------------------------------------------
  // Animation Loop & Simulation
  // --------------------------------------------------------------------------

  startLoop() {
    if (this._isRunning) return;
    this._isRunning = true;
    this.previousTime = performance.now();
    this.rafId = requestAnimationFrame(this._frame);
  }

  stopLoop() {
    this._isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  /**
   * Master frame coordinator
   * @param {DOMHighResTimeStamp} nowMs
   * @private
   */
  _frame(nowMs) {
    if (!this._isRunning) return;

    this.rafId = requestAnimationFrame(this._frame);

    // Clamped delta-time calculation
    const rawDelta = this.previousTime === 0 ? 0 : (nowMs - this.previousTime) / 1000;
    const deltaTime = Math.min(Math.max(rawDelta, 0), MAX_FRAME_DELTA);
    this.previousTime = nowMs;

    // Update gameplay world & scoring
    if (this.world) {
      this.world.update(deltaTime, {
        state: this.state,
        character: this.character
      });

      if (this.state === GameState.PLAYING) {
        this._updateScoreHUD(this.world.getScoreStats());
      }
    }

    // Update character simulation & Camera Follow
    if (this.character) {
      this.character.update(deltaTime, this.state);
      this.scene.updateCamera(deltaTime, this.character.getCameraFollowState());
    } else {
      this.scene.updateCamera(deltaTime, { x: 0, y: 0, z: 0 });
    }

    // Render frame
    this.scene.render();
  }

  // --------------------------------------------------------------------------
  // Input Routing (Desktop & Mobile)
  // --------------------------------------------------------------------------

  _onKeyDown(event) {
    // Do not steal focus from form elements
    if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
      return;
    }

    switch (event.code) {
      case 'KeyA':
      case 'ArrowLeft':
        if (this.state === GameState.PLAYING && this.character) {
          event.preventDefault();
          this.character.moveLeft();
        } else if (this.state === GameState.READY && this.ui) {
          event.preventDefault();
          this.ui.selectPreviousCharacter();
        }
        break;

      case 'KeyD':
      case 'ArrowRight':
        if (this.state === GameState.PLAYING && this.character) {
          event.preventDefault();
          this.character.moveRight();
        } else if (this.state === GameState.READY && this.ui) {
          event.preventDefault();
          this.ui.selectNextCharacter();
        }
        break;

      case 'Space':
      case 'ArrowUp':
        event.preventDefault();
        if (this.state === GameState.PLAYING && this.character) {
          this.character.jump();
        } else if (this.state === GameState.READY) {
          this.startGame();
        } else if (this.state === GameState.GAME_OVER || this.state === GameState.SCORE_SAVED) {
          this.transitionTo(GameState.READY);
          this.startGame();
        }
        break;

      case 'Enter':
        event.preventDefault();
        if (this.state === GameState.READY) {
          this.startGame();
        } else if (this.state === GameState.PAUSED) {
          this.resumeGame();
        } else if (this.state === GameState.GAME_OVER || this.state === GameState.SCORE_SAVED) {
          this.transitionTo(GameState.READY);
          this.startGame();
        }
        break;

      case 'Escape':
        event.preventDefault();
        if (this.state === GameState.PLAYING) {
          this.pauseGame();
        } else if (this.state === GameState.PAUSED) {
          this.resumeGame();
        }
        break;
    }
  }

  _initTouchControls() {
    if (!this.stageElement) return;

    this.stageElement.addEventListener('touchstart', this._onTouchStart, { passive: true });
    this.stageElement.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.stageElement.addEventListener('touchend', this._onTouchEnd, { passive: true });
  }

  _onTouchStart(e) {
    if (e.touches && e.touches.length > 0) {
      this._touchStartX = e.touches[0].clientX;
      this._touchStartY = e.touches[0].clientY;
      this._touchStartTime = performance.now();
    }
  }

  _onTouchMove(e) {
    // Prevent accidental page scrolling during active gameplay per PRD.md §8.3
    if (this.state === GameState.PLAYING) {
      e.preventDefault();
    }
  }

  _onTouchEnd(e) {
    if (!e.changedTouches || e.changedTouches.length === 0) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - this._touchStartX;
    const dy = endY - this._touchStartY;
    const dist = Math.hypot(dx, dy);

    // Tap detection (< 20px)
    if (dist < 20) {
      if (this.state === GameState.READY) {
        this.startGame();
      } else if (this.state === GameState.GAME_OVER || this.state === GameState.SCORE_SAVED) {
        this.transitionTo(GameState.READY);
        this.startGame();
      }
      return;
    }

    // Swipe detection (>= 35px threshold per PRD.md §8.3)
    if (dist >= 35 && this.state === GameState.PLAYING && this.character) {
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (dx < 0) {
          this.character.moveLeft();
        } else {
          this.character.moveRight();
        }
      } else {
        // Vertical swipe up -> Jump
        if (dy < 0) {
          this.character.jump();
        }
      }
    }
  }

  _onResize() {
    if (!this.scene) return;
    const width = this.stageElement ? this.stageElement.clientWidth : window.innerWidth;
    const height = this.stageElement ? this.stageElement.clientHeight : window.innerHeight;
    this.scene.resize(width, height);
  }

  _onVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      if (this.state === GameState.PLAYING) {
        this.pauseGame();
      }
    }
  }

  destroy() {
    this.stopLoop();

    for (const unsub of this._unsubscribers) {
      try {
        unsub();
      } catch {
        // Safe unsubscribe ignore
      }
    }
    this._unsubscribers = [];

    if (this.platformAdapter) {
      this.platformAdapter.dispose();
      this.platformAdapter = null;
    }

    window.removeEventListener('keydown', this._onKeyDown);
    if (this.stageElement) {
      this.stageElement.removeEventListener('touchstart', this._onTouchStart);
      this.stageElement.removeEventListener('touchmove', this._onTouchMove);
      this.stageElement.removeEventListener('touchend', this._onTouchEnd);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);

    if (this.world) {
      this.world.dispose();
      this.world = null;
    }

    if (this.character) {
      this.character.dispose();
      this.character = null;
    }

    if (this.ui) {
      this.ui.dispose();
      this.ui = null;
    }

    if (this.scene) {
      this.scene.dispose();
      this.scene = null;
    }

    console.info('[Neon Drift] App destroyed and GPU resources disposed.');
  }
}

// Console message tracking for automated diagnostics and testing
const capturedLogs = [];
const originalLog = console.log;
const originalInfo = console.info;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => {
  capturedLogs.push({ type: 'log', text: args.map(String).join(' ') });
  originalLog(...args);
};
console.info = (...args) => {
  capturedLogs.push({ type: 'info', text: args.map(String).join(' ') });
  originalInfo(...args);
};
console.warn = (...args) => {
  capturedLogs.push({ type: 'warn', text: args.map(String).join(' ') });
  originalWarn(...args);
};
console.error = (...args) => {
  capturedLogs.push({ type: 'error', text: args.map(String).join(' ') });
  originalError(...args);
};

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    capturedLogs.push({ type: 'error', text: event.message || String(event) });
  });
  window.__neonCapturedLogs = capturedLogs;
}

// Update diagnostic DOM dump
function updateLogDump() {
  let dumpEl = document.getElementById('console-log-dump');
  if (!dumpEl) {
    dumpEl = document.createElement('script');
    dumpEl.id = 'console-log-dump';
    dumpEl.type = 'application/json';
    document.body.appendChild(dumpEl);
  }
  dumpEl.textContent = JSON.stringify(capturedLogs);
}

// Instantiate and boot on DOM ready
let app = null;
if (typeof document !== 'undefined') {
  app = new NeonDriftApp();
  window.app = app;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      app.init().then(updateLogDump).catch(updateLogDump);
    });
  } else {
    app.init().then(updateLogDump).catch(updateLogDump);
  }
}

export default app;
