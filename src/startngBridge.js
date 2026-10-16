/**
 * @file startngBridge.js
 * @description start.ng Platform Integration, Authentication, Central Styling Bridge, and Persistence Adapter.
 * Strictly adheres to ARCHITECTURE.md §4, §7, §8 and DESIGN.md §3.
 */

// ============================================================================
// 1. Constants, Enums & Schemas
// ============================================================================

export const FINISH_TYPES = Object.freeze(['matte', 'metallic', 'neon']);
export const ACCESSORY_TYPES = Object.freeze(['none', 'halo', 'wings', 'visor-crown']);
export const THEME_MODES = Object.freeze(['dark', 'light']);

/**
 * Built-in local default styling per ARCHITECTURE.md §4.2 & DESIGN.md §2.2
 */
export const DEFAULT_STYLE = Object.freeze({
  primaryColor: '#7c3aed',
  accentColor: '#22d3ee',
  surfaceColor: '#111827',
  themeMode: 'dark',
  finishType: 'metallic',
  accessory: 'none'
});

/**
 * Local development deterministic mock user per ARCHITECTURE.md §7.2
 */
export const MOCK_USER = Object.freeze({
  id: 'local-dev-user-001',
  username: 'neon_tester',
  displayName: 'Neon Tester',
  avatarUrl: null,
  badge: Object.freeze({
    label: 'DEV'
  }),
  styling: Object.freeze({
    primaryColor: '#7c3aed',
    accentColor: '#22d3ee',
    surfaceColor: '#111827',
    finishType: 'neon',
    accessory: 'halo',
    themeMode: 'dark'
  })
});

const MOCK_STORAGE_KEY_PREFIX = 'neon-drift:dev';

// ============================================================================
// 2. Validation & Normalization Utilities
// ============================================================================

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FUNCTIONAL_COLOR_REGEX = /^(rgb|hsl)a?\(\s*[\d.%\s,/+-]+\s*\)$/i;

/**
 * Validates whether a value is a legitimate CSS color string.
 * @param {*} val
 * @returns {boolean}
 */
export function isValidColor(val) {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return false;

  if (HEX_COLOR_REGEX.test(trimmed)) return true;
  if (FUNCTIONAL_COLOR_REGEX.test(trimmed)) return true;

  // Browser environment fallback check via Option().style
  if (typeof Option !== 'undefined') {
    try {
      const opt = new Option();
      opt.style.color = trimmed;
      return Boolean(opt.style.color);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Normalizes theme mode to 'dark' | 'light' | null.
 * @param {*} val
 * @returns {'dark'|'light'|null}
 */
export function normalizeTheme(val) {
  if (typeof val !== 'string') return null;
  const lower = val.trim().toLowerCase();
  return THEME_MODES.includes(lower) ? lower : null;
}

/**
 * Normalizes material finish type to 'matte' | 'metallic' | 'neon' | null.
 * @param {*} val
 * @returns {'matte'|'metallic'|'neon'|null}
 */
export function normalizeFinish(val) {
  if (typeof val !== 'string') return null;
  const lower = val.trim().toLowerCase();
  return FINISH_TYPES.includes(lower) ? lower : null;
}

/**
 * Normalizes character accessory to 'none' | 'halo' | 'wings' | 'visor-crown' | null.
 * @param {*} val
 * @returns {'none'|'halo'|'wings'|'visor-crown'|null}
 */
export function normalizeAccessory(val) {
  if (typeof val !== 'string') return null;
  const lower = val.trim().toLowerCase();
  return ACCESSORY_TYPES.includes(lower) ? lower : null;
}

// ============================================================================
// 3. 4-Tier Style Resolver
// ============================================================================

/**
 * Resolves effective styling using 4-tier precedence per ARCHITECTURE.md §4.3:
 * 1. Built-in local fallback defaults
 * 2. Valid user profile styling JSON
 * 3. Valid central root CSS custom property tokens
 * 4. Development-only simulator overrides
 *
 * @param {Object} options
 * @param {Object} [options.defaults=DEFAULT_STYLE]
 * @param {Object} [options.profileStyle={}]
 * @param {Object} [options.centralTokens={}]
 * @param {Object} [options.devOverrides={}]
 * @returns {ResolvedStyle}
 */
export function resolveStyle({
  defaults = DEFAULT_STYLE,
  profileStyle = {},
  centralTokens = {},
  devOverrides = {}
} = {}) {
  const sources = {
    primaryColor: 'default',
    accentColor: 'default',
    surfaceColor: 'default',
    themeMode: 'default',
    finishType: 'default',
    accessory: 'default'
  };

  // Base: defaults
  let primaryColor = isValidColor(defaults.primaryColor) ? defaults.primaryColor : '#7c3aed';
  let accentColor = isValidColor(defaults.accentColor) ? defaults.accentColor : '#22d3ee';
  let surfaceColor = isValidColor(defaults.surfaceColor) ? defaults.surfaceColor : '#111827';
  let themeMode = normalizeTheme(defaults.themeMode) || 'dark';
  let finishType = normalizeFinish(defaults.finishType) || 'metallic';
  let accessory = normalizeAccessory(defaults.accessory) || 'none';

  // Tier 2: Profile JSON
  if (isValidColor(profileStyle?.primaryColor)) {
    primaryColor = profileStyle.primaryColor;
    sources.primaryColor = 'profile';
  }
  if (isValidColor(profileStyle?.accentColor)) {
    accentColor = profileStyle.accentColor;
    sources.accentColor = 'profile';
  }
  if (isValidColor(profileStyle?.surfaceColor)) {
    surfaceColor = profileStyle.surfaceColor;
    sources.surfaceColor = 'profile';
  }
  if (normalizeTheme(profileStyle?.themeMode)) {
    themeMode = normalizeTheme(profileStyle.themeMode);
    sources.themeMode = 'profile';
  }
  if (normalizeFinish(profileStyle?.finishType)) {
    finishType = normalizeFinish(profileStyle.finishType);
    sources.finishType = 'profile';
  }
  if (normalizeAccessory(profileStyle?.accessory)) {
    accessory = normalizeAccessory(profileStyle.accessory);
    sources.accessory = 'profile';
  }

  // Tier 3: Central Root CSS Tokens (--startng-*)
  // Note: finishType and accessory remain profile-controlled unless centrally approved (ARCHITECTURE.md §4.3)
  if (isValidColor(centralTokens?.primary)) {
    primaryColor = centralTokens.primary;
    sources.primaryColor = 'central';
  }
  if (isValidColor(centralTokens?.accent)) {
    accentColor = centralTokens.accent;
    sources.accentColor = 'central';
  }
  if (isValidColor(centralTokens?.surface)) {
    surfaceColor = centralTokens.surface;
    sources.surfaceColor = 'central';
  }
  if (normalizeTheme(centralTokens?.themeMode)) {
    themeMode = normalizeTheme(centralTokens.themeMode);
    sources.themeMode = 'central';
  }

  // Tier 4: Development-only Simulator Overrides
  if (isValidColor(devOverrides?.primaryColor)) {
    primaryColor = devOverrides.primaryColor;
    sources.primaryColor = 'devOverride';
  }
  if (isValidColor(devOverrides?.accentColor)) {
    accentColor = devOverrides.accentColor;
    sources.accentColor = 'devOverride';
  }
  if (isValidColor(devOverrides?.surfaceColor)) {
    surfaceColor = devOverrides.surfaceColor;
    sources.surfaceColor = 'devOverride';
  }
  if (normalizeTheme(devOverrides?.themeMode)) {
    themeMode = normalizeTheme(devOverrides.themeMode);
    sources.themeMode = 'devOverride';
  }
  if (normalizeFinish(devOverrides?.finishType)) {
    finishType = normalizeFinish(devOverrides.finishType);
    sources.finishType = 'devOverride';
  }
  if (normalizeAccessory(devOverrides?.accessory)) {
    accessory = normalizeAccessory(devOverrides.accessory);
    sources.accessory = 'devOverride';
  }

  return {
    primaryColor,
    accentColor,
    surfaceColor,
    themeMode,
    finishType,
    accessory,
    sources
  };
}

// ============================================================================
// 4. CSS Custom Property Reader & Root MutationObserver
// ============================================================================

/**
 * Reads canonical central styling values from document.documentElement per ARCHITECTURE.md §7.4.
 * Missing/empty values are returned as empty strings, which means "no override".
 *
 * @param {Element} [rootElement]
 * @returns {{ primary: string, accent: string, surface: string, themeMode: string }}
 */
export function readCentralStyleTokens(rootElement = (typeof document !== 'undefined' ? document.documentElement : null)) {
  if (!rootElement || typeof getComputedStyle === 'undefined') {
    return { primary: '', accent: '', surface: '', themeMode: '' };
  }

  const styles = getComputedStyle(rootElement);
  return {
    primary: (styles.getPropertyValue('--startng-primary') || '').trim(),
    accent: (styles.getPropertyValue('--startng-accent') || '').trim(),
    surface: (styles.getPropertyValue('--startng-surface') || '').trim(),
    themeMode: (styles.getPropertyValue('--startng-theme-mode') || '').trim().toLowerCase()
  };
}

/**
 * Watches document.documentElement for attribute changes and debounces reads to one per frame.
 */
export class CentralStyleObserver {
  constructor(rootElement = (typeof document !== 'undefined' ? document.documentElement : null)) {
    this.rootElement = rootElement;
    this.subscribers = new Set();
    this.mutationObserver = null;
    this.rafId = 0;
    this._lastTokens = this.readTokens();

    this._onMutation = this._onMutation.bind(this);
    this._dispatchIfChanged = this._dispatchIfChanged.bind(this);

    this._initObserver();
  }

  readTokens() {
    return readCentralStyleTokens(this.rootElement);
  }

  _initObserver() {
    if (!this.rootElement || typeof MutationObserver === 'undefined') return;

    this.mutationObserver = new MutationObserver(this._onMutation);
    this.mutationObserver.observe(this.rootElement, {
      attributes: true,
      attributeFilter: ['style', 'class', 'data-theme', 'data-theme-mode']
    });
  }

  _onMutation() {
    // Coalesce / debounce per microtask per ARCHITECTURE.md §7.5
    if (this._microtaskQueued) return;
    this._microtaskQueued = true;

    const runner = typeof queueMicrotask === 'function'
      ? queueMicrotask
      : (cb) => Promise.resolve().then(cb);

    runner(() => {
      this._microtaskQueued = false;
      this._dispatchIfChanged();
    });
  }

  _dispatchIfChanged() {
    const currentTokens = this.readTokens();
    const hasChanged =
      currentTokens.primary !== this._lastTokens.primary ||
      currentTokens.accent !== this._lastTokens.accent ||
      currentTokens.surface !== this._lastTokens.surface ||
      currentTokens.themeMode !== this._lastTokens.themeMode;

    if (hasChanged) {
      this._lastTokens = currentTokens;
      for (const callback of this.subscribers) {
        try {
          callback(currentTokens);
        } catch (err) {
          console.error('[CentralStyleObserver] Error in subscriber callback:', err);
        }
      }
    }
  }

  /**
   * Subscribe to central style changes.
   * @param {(tokens: Object) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Manually trigger re-read and notify if tokens changed.
   */
  notifyChange() {
    this._dispatchIfChanged();
  }

  dispose() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    if (this.rafId) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.rafId);
      } else {
        clearTimeout(this.rafId);
      }
      this.rafId = 0;
    }
    this.subscribers.clear();
  }
}

// ============================================================================
// 5. Mock Platform Adapter (Development & Local Testing)
// ============================================================================

export class MockPlatformAdapter {
  constructor(options = {}) {
    this.user = { ...MOCK_USER, ...options.user };
    this.styleObserver = options.styleObserver || new CentralStyleObserver();
    this.userSubscribers = new Set();
  }

  getMode() {
    return 'mock';
  }

  async getCurrentUser() {
    return JSON.parse(JSON.stringify(this.user));
  }

  async getProfileStyling(user = this.user) {
    return user?.styling ? JSON.parse(JSON.stringify(user.styling)) : { ...MOCK_USER.styling };
  }

  async getHighScore(user = this.user) {
    const userId = user?.id || MOCK_USER.id;
    const storageKey = `${MOCK_STORAGE_KEY_PREFIX}:${userId}:high-score`;
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            highScore: typeof parsed.highScore === 'number' ? parsed.highScore : 0,
            updatedAt: parsed.updatedAt || null
          };
        }
      }
    } catch (e) {
      console.warn('[MockPlatformAdapter] Failed to read mock high score from localStorage:', e);
    }
    return { highScore: 0, updatedAt: null };
  }

  async submitScore(runResult) {
    if (!runResult || typeof runResult.score !== 'number') {
      throw new Error('[MockPlatformAdapter] Invalid runResult provided to submitScore.');
    }

    const userId = this.user?.id || MOCK_USER.id;
    const storageKey = `${MOCK_STORAGE_KEY_PREFIX}:${userId}:high-score`;
    const previous = await this.getHighScore(this.user);
    const isNewHighScore = runResult.score > previous.highScore;
    const finalHighScore = Math.max(previous.highScore, runResult.score);

    if (isNewHighScore && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            highScore: finalHighScore,
            updatedAt: new Date().toISOString(),
            runId: runResult.runId || null
          })
        );
      } catch (e) {
        console.warn('[MockPlatformAdapter] Failed to persist mock high score:', e);
      }
    }

    return {
      success: true,
      isNewHighScore,
      highScore: finalHighScore,
      submittedScore: runResult.score,
      runId: runResult.runId
    };
  }

  subscribeUserChanges(callback) {
    this.userSubscribers.add(callback);
    return () => {
      this.userSubscribers.delete(callback);
    };
  }

  subscribeCentralStyleChanges(callback) {
    return this.styleObserver.subscribe(callback);
  }

  readCentralStyleTokens() {
    return this.styleObserver.readTokens();
  }

  dispose() {
    this.userSubscribers.clear();
    if (this.styleObserver) {
      this.styleObserver.dispose();
    }
  }
}

// ============================================================================
// 6. Production Platform Adapter (start.ng Host Handshake & API)
// ============================================================================

export class StartNgAdapter {
  constructor(options = {}) {
    this.allowedOrigins = options.allowedOrigins || [
      'https://start.ng',
      'https://app.start.ng',
      'https://staging.start.ng'
    ];
    this.styleObserver = options.styleObserver || new CentralStyleObserver();
    this.userSubscribers = new Set();
    this._onMessage = this._onMessage.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('message', this._onMessage);
    }
  }

  getMode() {
    return 'start.ng';
  }

  _onMessage(event) {
    // Origin security check per ARCHITECTURE.md §7.3
    if (!this.allowedOrigins.includes(event.origin)) {
      return;
    }

    const data = event.data;
    if (!data || data.namespace !== 'startng:neon-drift') {
      return;
    }

    if (data.type === 'USER_CONTEXT' && data.payload?.user) {
      for (const cb of this.userSubscribers) {
        try {
          cb(data.payload.user);
        } catch (err) {
          console.error('[StartNgAdapter] Error in user callback:', err);
        }
      }
    } else if (data.type === 'THEME_CHANGE' && data.payload?.centralStyle) {
      this.styleObserver.notifyChange();
    }
  }

  async getCurrentUser() {
    // Attempt verified same-origin session lookup if supported
    try {
      if (typeof fetch !== 'undefined') {
        const response = await fetch('/api/user/me', { credentials: 'same-origin' });
        if (response.ok) {
          const user = await response.json();
          return {
            id: String(user.id),
            username: user.username || 'runner',
            displayName: user.displayName || user.username || 'Runner',
            avatarUrl: user.avatarUrl || null,
            badge: user.badge || null,
            styling: user.styling || null
          };
        }
      }
    } catch {
      // Platform session lookup unreached or not hosted on same origin
    }

    // In production without verified session, report unauthenticated state
    return null;
  }

  async getProfileStyling(user) {
    if (user?.styling) return user.styling;
    return null;
  }

  async getHighScore(_user) {
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/game/neon-drift/high-score', { credentials: 'same-origin' });
        if (res.ok) {
          const data = await res.json();
          return {
            highScore: typeof data.highScore === 'number' ? data.highScore : 0,
            updatedAt: data.updatedAt || null
          };
        }
      }
    } catch {
      // Network/platform error
    }
    return { highScore: 0, updatedAt: null };
  }

  async submitScore(runResult) {
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/game/neon-drift/submit-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(runResult)
        });
        if (res.ok) {
          return await res.json();
        }
      }
    } catch (e) {
      throw new Error(`[StartNgAdapter] Score persistence failed: ${e.message}`);
    }
    throw new Error('[StartNgAdapter] Score persistence service unavailable.');
  }

  subscribeUserChanges(callback) {
    this.userSubscribers.add(callback);
    return () => {
      this.userSubscribers.delete(callback);
    };
  }

  subscribeCentralStyleChanges(callback) {
    return this.styleObserver.subscribe(callback);
  }

  readCentralStyleTokens() {
    return this.styleObserver.readTokens();
  }

  dispose() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this._onMessage);
    }
    this.userSubscribers.clear();
    if (this.styleObserver) {
      this.styleObserver.dispose();
    }
  }
}

// ============================================================================
// 7. Adapter Factory
// ============================================================================

/**
 * Checks if current host is a local development host.
 * @returns {boolean}
 */
export function isLocalhost() {
  if (typeof window === 'undefined' || !window.location) return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '';
}

/**
 * Creates the appropriate platform adapter based on runtime environment.
 * @param {Object} [options]
 * @returns {MockPlatformAdapter|StartNgAdapter}
 */
export function createPlatformAdapter(options = {}) {
  const isDev = Boolean(import.meta.env?.DEV);
  const enableMock = import.meta.env?.VITE_ENABLE_MOCK_USER !== 'false';
  const shouldMock = (isDev || isLocalhost()) && enableMock;

  if (shouldMock && !options.forceProduction) {
    return new MockPlatformAdapter(options);
  }

  return new StartNgAdapter(options);
}
