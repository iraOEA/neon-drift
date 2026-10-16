/**
 * @file ui.js
 * @description Glassmorphic HUD, Accessible State Screens, and Central Style Simulator.
 * Strictly adheres to ARCHITECTURE.md §3.8, §7.1-7.3, §9.1 and DESIGN.md §6, §7.
 */

import {
  DEFAULT_STYLE,
  isValidColor,
  normalizeFinish,
  normalizeAccessory,
  normalizeTheme,
  ACCESSORY_TYPES,
  FINISH_TYPES
} from './startngBridge.js';

/**
 * Generate 2-letter uppercase initials from username or display name
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') return '??';
  const clean = name.trim();
  if (!clean) return '??';
  const parts = clean.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/**
 * Sanitize image URLs to ensure safe protocols
 * @param {string} url
 * @returns {string|null}
 */
export function sanitizeImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  return null;
}

/**
 * Detect touch devices or mobile viewports
 * @returns {boolean}
 */
export function isMobileOrTouch() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    ('ontouchstart' in window) ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    (window.innerWidth && window.innerWidth <= 640)
  );
}

/**
 * Curated Roster of Distinct Running Character Avatars
 */
export const CHARACTER_ROSTER = Object.freeze([
  {
    id: 'cyber-scout',
    name: 'CYBER SCOUT',
    badge: 'CLASSIC • METALLIC',
    accessory: 'none',
    finishType: 'metallic',
    primaryColor: '#7c3aed',
    accentColor: '#22d3ee'
  },
  {
    id: 'valkyrie-a1',
    name: 'VALKYRIE A-1',
    badge: 'AERO WINGS • NEON',
    accessory: 'wings',
    finishType: 'neon',
    primaryColor: '#8b5cf6',
    accentColor: '#00ffcc'
  },
  {
    id: 'neon-seraph',
    name: 'NEON SERAPH',
    badge: 'PHOTON HALO • NEON',
    accessory: 'halo',
    finishType: 'neon',
    primaryColor: '#06b6d4',
    accentColor: '#facc15'
  },
  {
    id: 'quantum-apex',
    name: 'QUANTUM APEX',
    badge: 'VISOR CROWN • METALLIC',
    accessory: 'visor-crown',
    finishType: 'metallic',
    primaryColor: '#ec4899',
    accentColor: '#38bdf8'
  },
  {
    id: 'shadow-spectre',
    name: 'SHADOW SPECTRE',
    badge: 'STEALTH WINGS • MATTE',
    accessory: 'wings',
    finishType: 'matte',
    primaryColor: '#1e293b',
    accentColor: '#ef4444'
  },
  {
    id: 'solar-titan',
    name: 'SOLAR TITAN',
    badge: 'SOLAR HALO • METALLIC',
    accessory: 'halo',
    finishType: 'metallic',
    primaryColor: '#ea580c',
    accentColor: '#fde047'
  }
]);

/**
 * UIManager orchestrates DOM HUD elements, screen overlays, character avatar selection, and the Central Style Simulator.
 */
export class UIManager {
  /**
   * @param {Object} options
   * @param {Object} options.app Reference to main NeonDriftApp
   * @param {HTMLElement} [options.appElement] #game-app
   * @param {HTMLElement} [options.stageElement] #game-stage
   */
  constructor({ app, appElement, stageElement }) {
    this.app = app;
    this.appElement = appElement || document.getElementById('game-app');
    this.stageElement = stageElement || document.getElementById('game-stage');

    // HUD Header elements
    this.userPillEl = document.getElementById('user-pill');
    this.scoreCardEl = document.getElementById('score-card');
    this.scoreValEl = document.getElementById('score-value');
    this.collectibleValEl = document.getElementById('collectible-value');
    this.highScoreValEl = document.getElementById('high-score-value');
    this.pauseBtnEl = document.getElementById('pause-button');

    // State Screens
    this.loadingScreenEl = document.getElementById('loading-screen');
    this.readyScreenEl = document.getElementById('ready-screen');
    this.pauseScreenEl = document.getElementById('pause-screen');
    this.gameOverScreenEl = document.getElementById('game-over-screen');
    this.errorScreenEl = document.getElementById('error-screen');

    // Simulator container
    this.simulatorEl = document.getElementById('style-simulator');

    // Character Avatar Selection State
    let initialIndex = 0;
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('neon-drift:selected-character');
        if (stored !== null) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed < CHARACTER_ROSTER.length) {
            initialIndex = parsed;
          }
        }
      }
    } catch {
      initialIndex = 0;
    }
    this.selectedCharacterIndex = initialIndex;

    // State
    this.isSimulatorOpen = false;
    this._listeners = [];

    // Development environment detection per DESIGN.md §7.1 & ARCHITECTURE.md §3.8
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    this.isDevMode = Boolean(
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.local') ||
      (typeof window !== 'undefined' && window.__FORCE_SIMULATOR__)
    );
  }

  /**
   * Return the currently selected character from the roster
   * @returns {Object}
   */
  getCurrentCharacter() {
    return CHARACTER_ROSTER[this.selectedCharacterIndex] || CHARACTER_ROSTER[0];
  }

  /**
   * Apply selected character loadout to character model and app state
   */
  applySelectedCharacter() {
    const char = this.getCurrentCharacter();
    if (this.app) {
      this.app.currentProfileStyle = {
        ...this.app.currentProfileStyle,
        primaryColor: char.primaryColor,
        accentColor: char.accentColor,
        finishType: char.finishType,
        accessory: char.accessory
      };
      this.app.devOverrides = {
        ...this.app.devOverrides,
        primaryColor: char.primaryColor,
        accentColor: char.accentColor,
        finishType: char.finishType,
        accessory: char.accessory
      };
      this.app.applyCurrentStyle();
    }
  }

  /**
   * Select a character by index, immediately restyling the 3D runner in place
   * @param {number} index
   */
  selectCharacter(index) {
    const total = CHARACTER_ROSTER.length;
    this.selectedCharacterIndex = ((index % total) + total) % total;

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('neon-drift:selected-character', String(this.selectedCharacterIndex));
      }
    } catch {
      // Safe localStorage ignore
    }

    this.applySelectedCharacter();

    // Update DOM labels if present on screen
    const char = this.getCurrentCharacter();
    const nameEl = document.getElementById('char-name');
    const badgeEl = document.getElementById('char-badge');
    if (nameEl) nameEl.textContent = char.name;
    if (badgeEl) badgeEl.textContent = char.badge;

    // Visual idle hop reaction on character switch
    if (this.app?.character && this.app.character.isGrounded) {
      this.app.character.verticalVelocity = 3.5;
      this.app.character.isGrounded = false;
    }
  }

  /**
   * Advance to next character in roster
   */
  selectNextCharacter() {
    this.selectCharacter(this.selectedCharacterIndex + 1);
  }

  /**
   * Step to previous character in roster
   */
  selectPreviousCharacter() {
    this.selectCharacter(this.selectedCharacterIndex - 1);
  }

  /**
   * Initialize HUD listeners, button bindings, and Simulator
   */
  init() {
    // Apply initial saved character avatar loadout
    this.applySelectedCharacter();

    // Pause button in HUD header
    if (this.pauseBtnEl) {
      const onPauseClick = (e) => {
        e.stopPropagation();
        if (this.app.state === 'PLAYING') {
          this.app.pauseGame();
        } else if (this.app.state === 'PAUSED') {
          this.app.resumeGame();
        }
      };
      this.pauseBtnEl.addEventListener('click', onPauseClick);
      this._listeners.push(() => this.pauseBtnEl?.removeEventListener('click', onPauseClick));
    }

    // Initialize Development Style Simulator if allowed (hidden by default, no floating button)
    if (this.isDevMode && this.simulatorEl) {
      this._initSimulator();
    }
  }

  // ==========================================================================
  // 1. Logged-in User Pill (Top-Left)
  // ==========================================================================

  /**
   * Update top-left user pill safely with avatar, initials, username, and badge.
   * Uses textContent to eliminate XSS risks per ARCHITECTURE.md §3.8.
   * @param {Object|null} user
   */
  updateUser(user) {
    if (!this.userPillEl) return;
    this.userPillEl.innerHTML = ''; // Clear prior children safely

    if (!user) {
      const guestSpan = document.createElement('span');
      guestSpan.className = 'user-name';
      guestSpan.style.color = 'var(--nd-text-muted)';
      guestSpan.textContent = 'Guest Runner';
      this.userPillEl.appendChild(guestSpan);
      return;
    }

    // 1. Avatar / Initials container
    const avatarEl = document.createElement('div');
    avatarEl.className = 'user-avatar';
    avatarEl.setAttribute('aria-hidden', 'true');

    const safeAvatar = sanitizeImageUrl(user.avatarUrl);
    if (safeAvatar) {
      const img = document.createElement('img');
      img.src = safeAvatar;
      img.alt = '';
      img.loading = 'lazy';
      img.className = 'user-avatar-img';
      img.onerror = () => {
        // Fallback to initials on broken image URL
        img.remove();
        avatarEl.textContent = getInitials(user.displayName || user.username);
      };
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = getInitials(user.displayName || user.username);
    }
    this.userPillEl.appendChild(avatarEl);

    // 2. User Name
    const nameEl = document.createElement('span');
    nameEl.className = 'user-name';
    nameEl.textContent = user.displayName || user.username || 'Runner';
    this.userPillEl.appendChild(nameEl);

    // 3. Optional platform badge (e.g. DEV, PRO, VIP)
    const badgeLabel = user.badge?.label || (this.isDevMode ? 'DEV' : null);
    if (badgeLabel) {
      const badgeEl = document.createElement('span');
      badgeEl.className = 'user-badge';
      badgeEl.textContent = badgeLabel;
      this.userPillEl.appendChild(badgeEl);
    }
  }

  // ==========================================================================
  // 2. Score Card HUD (Top-Right)
  // ==========================================================================

  /**
   * Update HUD score, collectible count, and personal best.
   * @param {Object} stats
   * @param {number} [stats.score]
   * @param {number} [stats.collectibles]
   * @param {number} [stats.highScore]
   */
  updateScore(stats = {}) {
    if (this.scoreValEl && stats.score !== undefined) {
      this.scoreValEl.textContent = Math.floor(stats.score).toLocaleString();
    }
    if (this.collectibleValEl && stats.collectibles !== undefined) {
      this.collectibleValEl.textContent = `⚡ ${stats.collectibles}`;
    }
    if (this.highScoreValEl && stats.highScore !== undefined) {
      this.highScoreValEl.textContent = `BEST: ${Math.floor(stats.highScore).toLocaleString()}`;
    }
  }

  // ==========================================================================
  // 3. State Screens & Overlays
  // ==========================================================================

  /**
   * Render state-specific screen overlays.
   * @param {string} state GameState
   * @param {Object} [options] Screen metadata and score stats
   */
  showScreen(state, options = {}) {
    // Hide all overlays first
    if (this.loadingScreenEl) this.loadingScreenEl.hidden = true;
    if (this.readyScreenEl) this.readyScreenEl.hidden = true;
    if (this.pauseScreenEl) this.pauseScreenEl.hidden = true;
    if (this.gameOverScreenEl) this.gameOverScreenEl.hidden = true;
    if (this.errorScreenEl) this.errorScreenEl.hidden = true;

    switch (state) {
      case 'BOOT':
      case 'AUTHENTICATING':
      case 'LOADING_PROFILE':
      case 'APPLYING_STYLE':
        if (this.loadingScreenEl) {
          this.loadingScreenEl.hidden = false;
          this.loadingScreenEl.innerHTML = `
            <div class="glass-card loading-card" style="padding: 24px 32px; max-width: 380px;">
              <div class="loading-spinner" aria-hidden="true"></div>
              <p style="margin-top: 16px; font-weight: 600; color: var(--nd-text-main); font-size: 1rem;">
                ${this._escapeHtml(options.statusMsg || 'Connecting to start.ng...')}
              </p>
            </div>
          `;
        }
        break;

      case 'READY':
        if (this.readyScreenEl) {
          this.readyScreenEl.hidden = false;
          const bestScore = this.app.currentHighScore || 0;
          const currentChar = this.getCurrentCharacter();
          const isTouch = isMobileOrTouch();
          const startLabel = isTouch ? 'TAP TO PLAY' : 'PRESS SPACE OR TAP TO PLAY';
          const controlsGuide = isTouch
            ? `<strong>Controls:</strong> Tap ◀ / ▶ to Switch Runner • Swipe Left / Right to Drift • Swipe Up to Jump`
            : `<strong>Desktop:</strong> [A] / [D] / Left / Right = Switch Character in Lobby • [SPACE] / Up = Jump • [ESC] = Pause<br>
               <strong>Mobile:</strong> Tap ◀ / ▶ to Switch Runner • Swipe Up to Jump`;

          this.readyScreenEl.innerHTML = `
            <div class="glass-card ready-card" style="padding: 26px 34px; max-width: 440px;">
              <h1 id="game-title" class="game-logo" style="margin: 0 0 4px 0; font-size: 2.2rem; letter-spacing: 2.5px; font-weight: 800; color: var(--nd-current-accent);">
                NEON DRIFT
              </h1>
              <p style="color: var(--nd-text-muted); margin: 0 0 16px 0; font-size: 0.92rem; font-weight: 500;">
                High-Octane 3D Cyber-Runner
              </p>

              <!-- CHARACTER / AVATAR SELECTOR -->
              <div class="character-selector-card" style="margin-bottom: 18px; background: rgba(0,0,0,0.35); border: 1px solid var(--nd-card-border); border-radius: 12px; padding: 12px 14px;">
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--nd-text-muted); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">
                  SELECT RUNNER AVATAR
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                  <button id="char-prev-btn" type="button" class="char-nav-btn" aria-label="Previous Runner">
                    ◀
                  </button>
                  <div style="flex: 1; text-align: center; overflow: hidden;">
                    <div id="char-name" class="char-name" style="color: var(--nd-current-accent);">
                      ${this._escapeHtml(currentChar.name)}
                    </div>
                    <div id="char-badge" class="char-badge">
                      ${this._escapeHtml(currentChar.badge)}
                    </div>
                  </div>
                  <button id="char-next-btn" type="button" class="char-nav-btn" aria-label="Next Runner">
                    ▶
                  </button>
                </div>
              </div>

              ${bestScore > 0 ? `<div class="personal-best-pill" style="margin-bottom: 16px; font-size: 0.85rem; color: var(--nd-current-accent);">★ PERSONAL BEST: ${bestScore.toLocaleString()} pts ★</div>` : ''}

              <button id="start-btn" type="button" class="btn-primary" style="padding: 13px 28px; font-size: 1.05rem; width: 100%; margin-bottom: 16px; background: var(--nd-current-accent); color: #000; border: none; font-weight: 700; border-radius: 10px; cursor: pointer;">
                ${startLabel}
              </button>

              <div class="controls-guide" style="font-size: 0.78rem; color: var(--nd-text-muted); line-height: 1.6; border-top: 1px solid var(--nd-card-border); padding-top: 12px;">
                ${controlsGuide}
              </div>
            </div>
          `;

          const startBtn = document.getElementById('start-btn');
          if (startBtn) {
            const onStart = (e) => {
              e.stopPropagation();
              e.preventDefault();
              this.app.startGame();
            };
            startBtn.addEventListener('click', onStart);
            startBtn.addEventListener('touchend', onStart);
          }

          const prevBtn = document.getElementById('char-prev-btn');
          if (prevBtn) {
            const onPrev = (e) => {
              e.stopPropagation();
              e.preventDefault();
              this.selectPreviousCharacter();
            };
            prevBtn.addEventListener('click', onPrev);
            prevBtn.addEventListener('touchend', onPrev);
          }

          const nextBtn = document.getElementById('char-next-btn');
          if (nextBtn) {
            const onNext = (e) => {
              e.stopPropagation();
              e.preventDefault();
              this.selectNextCharacter();
            };
            nextBtn.addEventListener('click', onNext);
            nextBtn.addEventListener('touchend', onNext);
          }
        }
        break;

      case 'PAUSED':
        if (this.pauseScreenEl) {
          this.pauseScreenEl.hidden = false;
          this.pauseScreenEl.innerHTML = `
            <div class="glass-card pause-card" style="padding: 26px 34px; max-width: 380px;">
              <h2 id="pause-title" style="color: var(--nd-current-accent); margin: 0 0 18px 0; font-size: 1.6rem; letter-spacing: 1px;">
                SYSTEM PAUSED
              </h2>
              <button id="resume-btn" type="button" class="btn-primary" style="padding: 12px 24px; font-size: 1rem; width: 100%; margin-bottom: 12px; background: var(--nd-current-accent); color: #000; border: none; font-weight: 700; border-radius: 8px;">
                RESUME RUN [ENTER]
              </button>
              <button id="restart-btn" type="button" class="btn-secondary" style="padding: 10px 20px; font-size: 0.9rem; width: 100%; margin-bottom: 10px; background: var(--nd-btn-bg); border: 1px solid var(--nd-btn-border); color: var(--nd-text-main); border-radius: 8px;">
                RESTART RUN
              </button>
              <button id="menu-btn" type="button" class="btn-tertiary" style="padding: 8px 16px; font-size: 0.85rem; width: 100%; background: transparent; border: none; color: var(--nd-text-muted); cursor: pointer;">
                BACK TO READY
              </button>
            </div>
          `;

          document.getElementById('resume-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.app.resumeGame();
          });
          document.getElementById('restart-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.app.transitionTo('READY');
            this.app.startGame();
          });
          document.getElementById('menu-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.app.transitionTo('READY');
            this.showScreen('READY');
          });
        }
        break;

      case 'GAME_OVER':
      case 'SUBMITTING_SCORE':
      case 'SCORE_SAVED':
        if (this.gameOverScreenEl) {
          this.gameOverScreenEl.hidden = false;
          const stats = options.stats || this.app.world?.getScoreStats() || {};
          const score = stats.score !== undefined ? stats.score : (this.app.world?.score || 0);
          const distance = stats.distance !== undefined ? Math.floor(stats.distance) : Math.floor(this.app.world?.distance || 0);
          const collectibles = stats.collectibles !== undefined ? stats.collectibles : (this.app.world?.collectiblesCount || 0);
          const isNewHighScore = Boolean(options.isNewHighScore);
          const isTouch = isMobileOrTouch();
          const replayLabel = isTouch ? 'PLAY AGAIN' : 'PLAY AGAIN [SPACE]';

          let statusMsg = options.statusMsg || 'Score confirmed & saved to start.ng!';
          if (statusMsg.includes('locally') || statusMsg.includes('offline')) {
            statusMsg = 'Score confirmed & saved!';
          }

          this.gameOverScreenEl.innerHTML = `
            <div class="glass-card game-over-card" style="padding: 28px 36px; max-width: 440px;">
              <h2 id="game-over-title" style="color: #FF6B6B; margin: 0 0 10px 0; font-size: 1.8rem; letter-spacing: 1.5px; font-weight: 800;">
                RUN TERMINATED
              </h2>

              ${isNewHighScore ? '<div class="new-best-badge" style="color: #00ffcc; font-weight: 800; font-size: 1.15rem; margin-bottom: 16px; text-shadow: 0 0 12px rgba(0,255,204,0.4);">★ NEW PERSONAL BEST! ★</div>' : ''}

              <div class="stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; text-align: left; font-size: 0.95rem; background: rgba(0,0,0,0.25); padding: 14px 18px; border-radius: 10px; border: 1px solid var(--nd-card-border);">
                <div>Final Score: <strong style="color: var(--nd-current-accent); font-size: 1.2rem; display: block;">${score.toLocaleString()}</strong></div>
                <div>Personal Best: <strong style="display: block; font-size: 1.2rem;">${this.app.currentHighScore.toLocaleString()}</strong></div>
                <div style="margin-top: 6px;">Distance: <strong>${distance}m</strong></div>
                <div style="margin-top: 6px;">Energy Nodes: <strong>${collectibles}</strong></div>
              </div>

              <div id="save-status-msg" style="font-size: 0.85rem; color: var(--nd-text-muted); margin-bottom: 18px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                ${this._escapeHtml(statusMsg)}
              </div>

              <button id="replay-btn" type="button" class="btn-primary" style="padding: 12px 28px; font-size: 1.05rem; width: 100%; margin-bottom: 10px; background: var(--nd-current-accent); color: #000; border: none; font-weight: 700; border-radius: 8px;">
                ${replayLabel}
              </button>
              <button id="game-over-menu-btn" type="button" class="btn-secondary" style="padding: 9px 18px; font-size: 0.85rem; width: 100%; background: transparent; border: 1px solid var(--nd-card-border); color: var(--nd-text-muted); border-radius: 8px;">
                BACK TO READY
              </button>
            </div>
          `;

          const replayBtn = document.getElementById('replay-btn');
          if (replayBtn) {
            const onReplay = (e) => {
              e.stopPropagation();
              e.preventDefault();
              this.app.transitionTo('READY');
              this.app.startGame();
            };
            replayBtn.addEventListener('click', onReplay);
            replayBtn.addEventListener('touchend', onReplay);
          }

          const menuBtn = document.getElementById('game-over-menu-btn');
          if (menuBtn) {
            const onMenu = (e) => {
              e.stopPropagation();
              e.preventDefault();
              this.app.transitionTo('READY');
              this.showScreen('READY');
            };
            menuBtn.addEventListener('click', onMenu);
            menuBtn.addEventListener('touchend', onMenu);
          }
        }
        break;

      case 'ERROR':
        if (this.errorScreenEl) {
          this.errorScreenEl.hidden = false;
          this.errorScreenEl.innerHTML = `
            <div class="glass-card error-card" style="padding: 26px 34px; max-width: 400px; border-color: rgba(255, 107, 107, 0.4);">
              <h2 id="error-title" style="color: #FF6B6B; margin: 0 0 12px 0; font-size: 1.5rem;">
                SYSTEM ERROR
              </h2>
              <p id="error-desc" style="color: var(--nd-text-muted); font-size: 0.9rem; margin-bottom: 20px; line-height: 1.5;">
                ${this._escapeHtml(options.error || 'Failed to communicate with the start.ng platform.')}
              </p>
              <button id="retry-btn" type="button" class="btn-primary" style="padding: 10px 24px; font-size: 0.95rem; width: 100%; background: #FF6B6B; color: #fff; border: none; font-weight: 700; border-radius: 8px;">
                RETRY CONNECTION
              </button>
            </div>
          `;

          document.getElementById('retry-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.reload();
          });
        }
        break;
    }
  }

  // ==========================================================================
  // 4. Central Style Simulator (Development Tool per DESIGN.md §7)
  // ==========================================================================

  /**
   * Initialize collapsible Central Style Simulator panel
   * @private
   */
  _initSimulator() {
    if (!this.simulatorEl) return;

    // Build Simulator Shell DOM (hidden by default, accessible via ?simulator=1 or Alt+S)
    this.simulatorEl.innerHTML = `
      <header class="sim-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--nd-card-border); padding-bottom: 10px; margin-bottom: 14px;">
        <div style="font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 8px; color: var(--nd-current-accent);">
          ⚙️ Central Style Simulator
        </div>
        <button id="sim-close-btn" type="button" aria-label="Close Simulator" style="background: transparent; border: none; color: var(--nd-text-muted); font-size: 1.2rem; cursor: pointer; padding: 2px 6px;">✕</button>
      </header>

      <form id="sim-form" onsubmit="return false;">
        <!-- SECTION A: HOST CENTRAL TOKENS -->
        <fieldset class="sim-section" style="border: 1px solid var(--nd-card-border); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
          <legend style="padding: 0 6px; font-size: 0.75rem; font-weight: 700; color: var(--nd-text-muted); text-transform: uppercase;">
            Host Central CSS Tokens (:root)
          </legend>
          <div class="sim-field-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="sim-token-primary" style="font-size: 0.8rem;">--startng-primary</label>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="color" id="sim-token-primary-pick" value="#7c3aed" style="width: 28px; height: 26px; border: none; border-radius: 4px; cursor: pointer; background: transparent;" />
              <input type="text" id="sim-token-primary" value="#7c3aed" style="width: 78px; font-family: monospace; font-size: 0.75rem; padding: 3px 6px; border-radius: 4px; border: 1px solid var(--nd-card-border); background: rgba(0,0,0,0.2); color: inherit;" />
            </div>
          </div>

          <div class="sim-field-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="sim-token-accent" style="font-size: 0.8rem;">--startng-accent</label>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="color" id="sim-token-accent-pick" value="#22d3ee" style="width: 28px; height: 26px; border: none; border-radius: 4px; cursor: pointer; background: transparent;" />
              <input type="text" id="sim-token-accent" value="#22d3ee" style="width: 78px; font-family: monospace; font-size: 0.75rem; padding: 3px 6px; border-radius: 4px; border: 1px solid var(--nd-card-border); background: rgba(0,0,0,0.2); color: inherit;" />
            </div>
          </div>

          <div class="sim-field-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="sim-token-surface" style="font-size: 0.8rem;">--startng-surface</label>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="color" id="sim-token-surface-pick" value="#111827" style="width: 28px; height: 26px; border: none; border-radius: 4px; cursor: pointer; background: transparent;" />
              <input type="text" id="sim-token-surface" value="#111827" style="width: 78px; font-family: monospace; font-size: 0.75rem; padding: 3px 6px; border-radius: 4px; border: 1px solid var(--nd-card-border); background: rgba(0,0,0,0.2); color: inherit;" />
            </div>
          </div>

          <div class="sim-field-row" style="display: flex; align-items: center; justify-content: space-between;">
            <label for="sim-token-theme" style="font-size: 0.8rem;">--startng-theme-mode</label>
            <select id="sim-token-theme" style="width: 114px; font-size: 0.75rem; padding: 4px 6px; border-radius: 4px; border: 1px solid var(--nd-card-border); background: rgba(0,0,0,0.2); color: inherit;">
              <option value="dark" selected>dark</option>
              <option value="light">light</option>
            </select>
          </div>
        </fieldset>

        <!-- SECTION B: USER PROFILE JSON -->
        <fieldset class="sim-section" style="border: 1px solid var(--nd-card-border); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
          <legend style="padding: 0 6px; font-size: 0.75rem; font-weight: 700; color: var(--nd-text-muted); text-transform: uppercase;">
            User Profile Styling JSON
          </legend>

          <div class="sim-field-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="sim-profile-finish" style="font-size: 0.8rem;">Finish Type</label>
            <select id="sim-profile-finish" style="width: 114px; font-size: 0.75rem; padding: 4px 6px; border-radius: 4px; border: 1px solid var(--nd-card-border); background: rgba(0,0,0,0.2); color: inherit;">
              <option value="metallic" selected>metallic</option>
              <option value="matte">matte</option>
              <option value="neon">neon</option>
            </select>
          </div>

          <div class="sim-field-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="sim-profile-accessory" style="font-size: 0.8rem;">Accessory</label>
            <select id="sim-profile-accessory" style="width: 114px; font-size: 0.75rem; padding: 4px 6px; border-radius: 4px; border: 1px solid var(--nd-card-border); background: rgba(0,0,0,0.2); color: inherit;">
              <option value="none">none</option>
              <option value="halo">halo</option>
              <option value="wings">wings</option>
              <option value="visor-crown">visor-crown</option>
            </select>
          </div>

          <div class="sim-field-row" style="display: flex; align-items: center; justify-content: space-between;">
            <label for="sim-profile-primary" style="font-size: 0.8rem;">Profile Primary</label>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="color" id="sim-profile-primary-pick" value="#7c3aed" style="width: 28px; height: 26px; border: none; border-radius: 4px; cursor: pointer; background: transparent;" />
              <input type="text" id="sim-profile-primary" placeholder="inherit" style="width: 78px; font-family: monospace; font-size: 0.75rem; padding: 3px 6px; border-radius: 4px; border: 1px solid var(--nd-card-border); background: rgba(0,0,0,0.2); color: inherit;" />
            </div>
          </div>
        </fieldset>

        <!-- SECTION C: ACTIONS -->
        <div class="sim-actions-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
          <button id="sim-apply-btn" type="button" class="btn-primary" style="padding: 8px 12px; font-size: 0.8rem; background: var(--nd-current-accent); color: #000; border: none; font-weight: 700; border-radius: 6px;">
            Apply Changes
          </button>
          <button id="sim-copy-btn" type="button" class="btn-secondary" style="padding: 8px 12px; font-size: 0.8rem; background: var(--nd-btn-bg); border: 1px solid var(--nd-card-border); border-radius: 6px;">
            Copy JSON
          </button>
          <button id="sim-reset-overrides-btn" type="button" class="btn-secondary" style="padding: 6px 10px; font-size: 0.75rem; background: transparent; border: 1px solid var(--nd-card-border); border-radius: 6px;">
            Reset Overrides
          </button>
          <button id="sim-reset-all-btn" type="button" class="btn-secondary" style="padding: 6px 10px; font-size: 0.75rem; background: transparent; border: 1px solid var(--nd-card-border); border-radius: 6px; color: #FF6B6B;">
            Reset Everything
          </button>
        </div>

        <!-- SECTION D: DIAGNOSTIC PROVENANCE INSPECTOR -->
        <details class="sim-diagnostics" style="border-top: 1px solid var(--nd-card-border); padding-top: 10px; font-size: 0.75rem;">
          <summary style="cursor: pointer; font-weight: 600; color: var(--nd-text-muted); margin-bottom: 8px;">
            Diagnostics & Style Provenance
          </summary>
          <div style="margin-bottom: 6px;">Adapter: <strong id="sim-diag-adapter">mock</strong> • User: <span id="sim-diag-user">user-neon-mock-001</span></div>
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.72rem;">
            <thead>
              <tr style="border-bottom: 1px solid var(--nd-card-border); color: var(--nd-text-muted);">
                <th style="padding: 4px 2px;">Property</th>
                <th style="padding: 4px 2px;">Value</th>
                <th style="padding: 4px 2px;">Source</th>
              </tr>
            </thead>
            <tbody id="sim-diag-table-body">
              <!-- Populated dynamically via updateSimulatorDiagnostics -->
            </tbody>
          </table>
        </details>
      </form>
    `;

    // 3. Connect Inputs & Real-Time Sync
    const syncPair = (textId, pickId, onUpdate) => {
      const textEl = document.getElementById(textId);
      const pickEl = document.getElementById(pickId);
      if (!textEl || !pickEl) return;

      textEl.addEventListener('input', () => {
        if (isValidColor(textEl.value)) {
          pickEl.value = textEl.value;
        }
        onUpdate();
      });

      pickEl.addEventListener('input', () => {
        textEl.value = pickEl.value;
        onUpdate();
      });
    };

    const triggerLiveApply = () => {
      this._applySimulatorFormValues();
    };

    syncPair('sim-token-primary', 'sim-token-primary-pick', triggerLiveApply);
    syncPair('sim-token-accent', 'sim-token-accent-pick', triggerLiveApply);
    syncPair('sim-token-surface', 'sim-token-surface-pick', triggerLiveApply);
    syncPair('sim-profile-primary', 'sim-profile-primary-pick', triggerLiveApply);

    document.getElementById('sim-token-theme')?.addEventListener('change', triggerLiveApply);
    document.getElementById('sim-profile-finish')?.addEventListener('change', triggerLiveApply);
    document.getElementById('sim-profile-accessory')?.addEventListener('change', triggerLiveApply);

    // Close button
    document.getElementById('sim-close-btn')?.addEventListener('click', () => {
      this.toggleSimulator(false);
    });

    // Action buttons
    document.getElementById('sim-apply-btn')?.addEventListener('click', triggerLiveApply);

    document.getElementById('sim-reset-overrides-btn')?.addEventListener('click', () => {
      this.app.devOverrides = {};
      const tokenPrimary = document.getElementById('sim-profile-primary');
      if (tokenPrimary) tokenPrimary.value = '';
      this.app.applyCurrentStyle();
      this.updateSimulatorDiagnostics(this.app.resolvedStyle);
    });

    document.getElementById('sim-reset-all-btn')?.addEventListener('click', () => {
      document.documentElement.style.removeProperty('--startng-primary');
      document.documentElement.style.removeProperty('--startng-accent');
      document.documentElement.style.removeProperty('--startng-surface');
      document.documentElement.style.removeProperty('--startng-theme-mode');
      this.app.devOverrides = {};

      // Reset form controls to defaults
      const p = document.getElementById('sim-token-primary');
      const pPick = document.getElementById('sim-token-primary-pick');
      const a = document.getElementById('sim-token-accent');
      const aPick = document.getElementById('sim-token-accent-pick');
      const s = document.getElementById('sim-token-surface');
      const sPick = document.getElementById('sim-token-surface-pick');
      const th = document.getElementById('sim-token-theme');
      const fin = document.getElementById('sim-profile-finish');
      const acc = document.getElementById('sim-profile-accessory');

      if (p) p.value = DEFAULT_STYLE.primaryColor;
      if (pPick) pPick.value = DEFAULT_STYLE.primaryColor;
      if (a) a.value = DEFAULT_STYLE.accentColor;
      if (aPick) aPick.value = DEFAULT_STYLE.accentColor;
      if (s) s.value = DEFAULT_STYLE.surfaceColor;
      if (sPick) sPick.value = DEFAULT_STYLE.surfaceColor;
      if (th) th.value = DEFAULT_STYLE.themeMode;
      if (fin) fin.value = DEFAULT_STYLE.finishType;
      if (acc) acc.value = DEFAULT_STYLE.accessory;

      this.app.applyCurrentStyle();
      this.updateSimulatorDiagnostics(this.app.resolvedStyle);
    });

    document.getElementById('sim-copy-btn')?.addEventListener('click', async () => {
      const copyBtn = document.getElementById('sim-copy-btn');
      const payload = {
        primaryColor: this.app.resolvedStyle.primaryColor,
        accentColor: this.app.resolvedStyle.accentColor,
        surfaceColor: this.app.resolvedStyle.surfaceColor,
        finishType: this.app.resolvedStyle.finishType,
        accessory: this.app.resolvedStyle.accessory,
        themeMode: this.app.resolvedStyle.themeMode
      };
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
          if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = originalText; }, 1500);
          }
        }
      } catch (e) {
        console.warn('[Neon Drift] Clipboard write error:', e);
      }
    });

    // Keyboard shortcut (Alt + S / Option + S) to toggle simulator
    const onKey = (e) => {
      if (e.altKey && (e.code === 'KeyS' || e.key === 's')) {
        e.preventDefault();
        this.toggleSimulator();
      }
    };
    window.addEventListener('keydown', onKey);
    this._listeners.push(() => window.removeEventListener('keydown', onKey));

    // Initial diagnostic update
    if (this.app.resolvedStyle) {
      this.updateSimulatorDiagnostics(this.app.resolvedStyle);
    }

    // Auto-open if ?simulator=1 or ?sim=1 query param is present
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('simulator') || urlParams.has('sim')) {
        this.toggleSimulator(true);
      }
    } catch {
      // Safe ignore in non-browser env
    }
  }

  /**
   * Apply simulator form values to root CSS tokens and devOverrides
   * @private
   */
  _applySimulatorFormValues() {
    const tokenPrimary = document.getElementById('sim-token-primary')?.value;
    const tokenAccent = document.getElementById('sim-token-accent')?.value;
    const tokenSurface = document.getElementById('sim-token-surface')?.value;
    const tokenTheme = document.getElementById('sim-token-theme')?.value;

    const profilePrimary = document.getElementById('sim-profile-primary')?.value;
    const profileFinish = document.getElementById('sim-profile-finish')?.value;
    const profileAccessory = document.getElementById('sim-profile-accessory')?.value;

    // Set Root Tokens (triggers MutationObserver in startngBridge)
    if (isValidColor(tokenPrimary)) {
      document.documentElement.style.setProperty('--startng-primary', tokenPrimary);
    }
    if (isValidColor(tokenAccent)) {
      document.documentElement.style.setProperty('--startng-accent', tokenAccent);
    }
    if (isValidColor(tokenSurface)) {
      document.documentElement.style.setProperty('--startng-surface', tokenSurface);
    }
    if (normalizeTheme(tokenTheme)) {
      document.documentElement.style.setProperty('--startng-theme-mode', tokenTheme);
    }

    // Set Dev Overrides for profile-tier properties
    if (isValidColor(profilePrimary)) {
      this.app.devOverrides.primaryColor = profilePrimary;
    } else {
      delete this.app.devOverrides.primaryColor;
    }

    if (normalizeFinish(profileFinish)) {
      this.app.devOverrides.finishType = profileFinish;
    }
    if (normalizeAccessory(profileAccessory)) {
      this.app.devOverrides.accessory = profileAccessory;
    }

    // Reapply style in place
    const resolved = this.app.applyCurrentStyle();
    this.updateSimulatorDiagnostics(resolved);
  }

  /**
   * Toggle simulator drawer visibility
   * @param {boolean} [force]
   */
  toggleSimulator(force) {
    if (!this.simulatorEl) return;
    this.isSimulatorOpen = force !== undefined ? force : !this.isSimulatorOpen;
    this.simulatorEl.hidden = !this.isSimulatorOpen;

    const toggleBtn = document.getElementById('sim-toggle-btn');
    if (toggleBtn) {
      toggleBtn.classList.toggle('active', this.isSimulatorOpen);
    }

    if (this.isSimulatorOpen && this.app.resolvedStyle) {
      this.updateSimulatorDiagnostics(this.app.resolvedStyle);
    }
  }

  /**
   * Update diagnostics table in simulator with winning source provenance
   * @param {Object} resolvedStyle
   */
  updateSimulatorDiagnostics(resolvedStyle = {}) {
    const tableBody = document.getElementById('sim-diag-table-body');
    if (!tableBody) return;

    const sources = resolvedStyle.sources || {};
    const rows = [
      { key: 'primaryColor', val: resolvedStyle.primaryColor },
      { key: 'accentColor', val: resolvedStyle.accentColor },
      { key: 'surfaceColor', val: resolvedStyle.surfaceColor },
      { key: 'themeMode', val: resolvedStyle.themeMode },
      { key: 'finishType', val: resolvedStyle.finishType },
      { key: 'accessory', val: resolvedStyle.accessory }
    ];

    tableBody.innerHTML = rows
      .map(({ key, val }) => {
        const src = sources[key] || 'default';
        let badgeColor = '#a7b0c4';
        if (src === 'simulator') badgeColor = '#f59e0b';
        else if (src === 'token') badgeColor = '#22d3ee';
        else if (src === 'profile') badgeColor = '#a855f7';

        return `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 4px 2px; font-family: monospace;">${key}</td>
            <td style="padding: 4px 2px; font-family: monospace;">${val}</td>
            <td style="padding: 4px 2px;">
              <span style="background: ${badgeColor}; color: #000; font-size: 0.65rem; font-weight: 700; padding: 1px 4px; border-radius: 3px;">
                ${src}
              </span>
            </td>
          </tr>
        `;
      })
      .join('');

    const adapterEl = document.getElementById('sim-diag-adapter');
    if (adapterEl) adapterEl.textContent = this.app.platformAdapter?.constructor?.name?.includes('Mock') ? 'mock' : 'start.ng';

    const userEl = document.getElementById('sim-diag-user');
    if (userEl) userEl.textContent = this.app.currentUser?.id || 'guest';
  }

  /**
   * Escape HTML utility for safe string interpolation
   * @param {string} str
   * @returns {string}
   * @private
   */
  _escapeHtml(str) {
    if (typeof str !== 'string') return String(str);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Cleanup listeners
   */
  dispose() {
    for (const remove of this._listeners) {
      try {
        remove();
      } catch {
        // Safe unsubscribe ignore
      }
    }
    this._listeners = [];

    const toggleBtn = document.getElementById('sim-toggle-btn');
    if (toggleBtn) toggleBtn.remove();
  }
}
