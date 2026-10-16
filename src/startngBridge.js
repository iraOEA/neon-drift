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

// ============================================================================
// 6. Production Platform Adapter (start.ng Connect Frame Handshake & API)
// ============================================================================

export const START_NG = 'https://start.ng';
let framePromise = null;

/**
 * Returns or creates the hidden connect iframe to talk to start.ng per official docs.
 * @returns {Promise<HTMLIFrameElement|null>}
 */
export function connectFrame() {
  if (typeof document === 'undefined') return Promise.resolve(null);
  framePromise ??= new Promise((resolve) => {
    let el = document.getElementById('startng-connect-frame');
    if (el) {
      resolve(el);
      return;
    }
    el = document.createElement('iframe');
    el.id = 'startng-connect-frame';
    el.src = `${START_NG}/connect`;
    el.hidden = true;
    el.style.display = 'none';
    el.onload = () => resolve(el);
    el.onerror = (err) => {
      console.warn('[startngBridge] Failed to load start.ng connect frame:', err);
      resolve(null);
    };
    document.body.append(el);
  });
  return framePromise;
}

/**
 * Sends a message to start.ng connect iframe and resolves to reply per official docs.
 * @param {Object} message
 * @param {string} replyType
 * @param {number} [timeoutMs=4000]
 * @returns {Promise<Object|null>}
 */
export async function askStartNg(message, replyType, timeoutMs = 4000) {
  try {
    const el = await connectFrame();
    if (!el || !el.contentWindow) return null;

    return new Promise((resolve) => {
      const requestId = Math.random().toString(36).slice(2);
      let timer = null;

      function onMessage(e) {
        if (e.origin !== START_NG || e.source !== el.contentWindow) return;
        if (e.data?.type === replyType && e.data.requestId === requestId) {
          cleanup();
          resolve(e.data);
        }
      }

      function cleanup() {
        if (timer) clearTimeout(timer);
        if (typeof window !== 'undefined') {
          window.removeEventListener('message', onMessage);
        }
      }

      timer = setTimeout(() => {
        cleanup();
        resolve(null);
      }, timeoutMs);

      if (typeof window !== 'undefined') {
        window.addEventListener('message', onMessage);
      }

      el.contentWindow.postMessage({ ...message, requestId }, START_NG);
    });
  } catch (err) {
    console.warn('[startngBridge] askStartNg exception:', err);
    return null;
  }
}

/**
 * Extracts game slug from subdomain (e.g. neondrift on neondrift.start.ng).
 * @returns {string}
 */
export function getGameSlug() {
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    const part = host.split('.')[0];
    if (part && part !== 'localhost' && part !== '127') {
      return part;
    }
  }
  return 'neondrift';
}

/**
 * Extracts start.ng session token from hash and moves to sessionStorage per docs.
 * @returns {string|null}
 */
export function extractStartNgSession() {
  if (typeof window === 'undefined' || !window.location) return null;
  const hash = window.location.hash.slice(1);
  if (hash) {
    const params = new URLSearchParams(hash);
    const sessionToken = params.get('startng_session');
    if (sessionToken && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('startng_session', sessionToken);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return sessionToken;
    }
  }
  return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('startng_session') : null;
}

/**
 * Normalizes start.ng character style fields into game styling.
 * @param {Object} rawStyle
 * @returns {Object|null}
 */
export function normalizeStartNgStyle(rawStyle) {
  if (!rawStyle || typeof rawStyle !== 'object') return null;

  let accessory = 'none';
  if (rawStyle.hat === 'crown' || rawStyle.accessory === 'glasses') {
    accessory = 'visor-crown';
  } else if (rawStyle.accessory === 'backpack') {
    accessory = 'wings';
  } else if (rawStyle.accessory === 'halo') {
    accessory = 'halo';
  } else if (rawStyle.accessory && rawStyle.accessory !== 'none') {
    accessory = 'wings';
  }

  return {
    primaryColor: isValidColor(rawStyle.primaryColor) ? rawStyle.primaryColor : '#7c3aed',
    accentColor: isValidColor(rawStyle.skinColor || rawStyle.secondaryColor) ? (rawStyle.skinColor || rawStyle.secondaryColor) : '#22d3ee',
    surfaceColor: isValidColor(rawStyle.secondaryColor) ? rawStyle.secondaryColor : '#111827',
    finishType: 'metallic',
    accessory,
    themeMode: 'dark',
    raw: rawStyle
  };
}

/**
 * Redirects user to start.ng sign-in with return_to parameter per official docs.
 */
export function redirectToStartNgSignIn() {
  if (typeof window !== 'undefined' && window.location) {
    const returnTo = encodeURIComponent(window.location.origin + window.location.pathname);
    window.location.href = `https://start.ng/?return_to=${returnTo}`;
  }
}

export class StartNgAdapter {
  constructor(options = {}) {
    this.allowedOrigins = options.allowedOrigins || [
      'https://start.ng',
      'https://app.start.ng',
      'https://staging.start.ng'
    ];
    this.styleObserver = options.styleObserver || new CentralStyleObserver();
    this.userSubscribers = new Set();
    this.cachedUser = null;
    this._onMessage = this._onMessage.bind(this);
    this.refreshUser = this.refreshUser.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('message', this._onMessage);
      window.addEventListener('focus', this.refreshUser);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.refreshUser();
        }
      });
    }
  }

  getMode() {
    return 'start.ng';
  }

  _onMessage(event) {
    const origin = event.origin || '';
    if (!this.allowedOrigins.includes(origin) && !origin.endsWith('.start.ng')) {
      return;
    }

    const data = event.data;
    if (!data) return;

    if (data.type === 'USER_CONTEXT' && data.payload?.user) {
      this._notifyUser(data.payload.user);
    } else if (data.type === 'THEME_CHANGE') {
      this.styleObserver.notifyChange();
    }
  }

  _notifyUser(user) {
    this.cachedUser = user;
    for (const cb of this.userSubscribers) {
      try {
        cb(user);
      } catch (err) {
        console.error('[StartNgAdapter] Error in user callback:', err);
      }
    }
  }

  async refreshUser() {
    const user = await this.getCurrentUser();
    if (user && (!this.cachedUser || user.id !== this.cachedUser.id || user.username !== this.cachedUser.username)) {
      this._notifyUser(user);
    }
  }

  async getCurrentUser() {
    extractStartNgSession();

    // 1. Official Connect Frame Handshake (startng:whoami)
    try {
      const reply = await askStartNg({ type: 'startng:whoami' }, 'startng:user', 4000);
      if (reply?.user) {
        const u = reply.user;
        const normalized = {
          id: String(u.id),
          username: u.name || 'Runner',
          displayName: u.name || 'Runner',
          account: u.account || null,
          avatarUrl: u.face || null,
          badge: { label: u.account ? `@${u.account}` : 'START.NG' },
          isGuest: false,
          styling: normalizeStartNgStyle(u.style)
        };
        this.cachedUser = normalized;
        return normalized;
      } else if (reply?.guest) {
        const g = reply.guest;
        const normalizedGuest = {
          id: 'guest',
          username: g.name || 'Guest',
          displayName: 'Guest Runner',
          account: null,
          avatarUrl: g.face || null,
          badge: { label: 'GUEST' },
          isGuest: true,
          styling: normalizeStartNgStyle(g.style)
        };
        this.cachedUser = normalizedGuest;
        return normalizedGuest;
      }
    } catch (e) {
      console.warn('[StartNgAdapter] Connect frame whoami failed:', e);
    }

    // 2. Official HTTP API Player Fallback
    const session = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('startng_session') : null;
    if (session) {
      try {
        const gameName = getGameSlug();
        const res = await fetch(`https://api.start.ng/games/${gameName}/player`, {
          headers: { Authorization: `Bearer ${session}` }
        });
        if (res.ok) {
          const p = await res.json();
          const normalized = {
            id: String(p.id),
            username: p.name || 'Runner',
            displayName: p.name || 'Runner',
            account: null,
            avatarUrl: null,
            badge: { label: 'START.NG' },
            isGuest: false,
            styling: normalizeStartNgStyle(p.style)
          };
          this.cachedUser = normalized;
          return normalized;
        }
      } catch (e) {
        console.warn('[StartNgAdapter] HTTP session player fetch failed:', e);
      }
    }

    // 3. Graceful guest look fallback
    const fallbackGuest = {
      id: 'guest',
      username: 'Guest',
      displayName: 'Guest Runner',
      account: null,
      avatarUrl: null,
      badge: { label: 'GUEST' },
      isGuest: true,
      styling: {
        primaryColor: '#7c3aed',
        accentColor: '#22d3ee',
        surfaceColor: '#111827',
        finishType: 'metallic',
        accessory: 'none',
        themeMode: 'dark'
      }
    };
    this.cachedUser = fallbackGuest;
    return fallbackGuest;
  }

  async getProfileStyling(user) {
    if (user?.styling) return user.styling;
    return null;
  }

  async getHighScore(user) {
    // 1. Try connect frame leaderboard
    try {
      const reply = await askStartNg({ type: 'startng:leaderboard', limit: 20 }, 'startng:leaderboardData', 3000);
      if (reply?.ok && Array.isArray(reply.entries)) {
        const currentId = user?.id;
        const myEntry = reply.entries.find(e => String(e.player_id) === String(currentId));
        if (myEntry) {
          return {
            highScore: myEntry.score || myEntry.stats?.score || 0,
            updatedAt: null
          };
        }
      }
    } catch {
      // Fallback
    }

    // 2. Try HTTP API leaderboard
    const gameName = getGameSlug();
    try {
      const res = await fetch(`https://api.start.ng/games/${gameName}/leaderboard?limit=20`);
      if (res.ok) {
        const entries = await res.json();
        if (Array.isArray(entries)) {
          const myEntry = entries.find(e => String(e.player_id) === String(user?.id));
          if (myEntry) {
            return {
              highScore: myEntry.score || myEntry.stats?.score || 0,
              updatedAt: null
            };
          }
        }
      }
    } catch {
      // Ignore
    }

    // 3. Local storage fallback for guests/offline
    if (typeof localStorage !== 'undefined') {
      try {
        const key = `startng:${user?.id || 'guest'}:high-score`;
        const val = localStorage.getItem(key);
        if (val) return { highScore: parseInt(val, 10) || 0, updatedAt: null };
      } catch {}
    }

    return { highScore: 0, updatedAt: null };
  }

  async submitScore(runResult) {
    const score = Math.max(0, Math.floor(runResult.score || 0));
    const distance = Math.max(0, Math.floor(runResult.distance || 0));

    // 1. Connect frame score submission
    const saved = await askStartNg(
      { type: 'startng:score', stats: { score, distance } },
      'startng:scoreSaved',
      4000
    );

    if (saved?.ok) {
      return {
        success: true,
        isNewHighScore: Boolean(saved.result?.improved),
        highScore: saved.result?.best || score,
        rank: saved.result?.rank,
        submittedScore: score
      };
    }

    // Try plain score
    const savedPlain = await askStartNg(
      { type: 'startng:score', score },
      'startng:scoreSaved',
      4000
    );

    if (savedPlain?.ok) {
      return {
        success: true,
        isNewHighScore: Boolean(savedPlain.result?.improved),
        highScore: savedPlain.result?.best || score,
        rank: savedPlain.result?.rank,
        submittedScore: score
      };
    }

    // 2. HTTP API score submission with session
    const session = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('startng_session') : null;
    if (session) {
      try {
        const gameName = getGameSlug();
        const res = await fetch(`https://api.start.ng/games/${gameName}/scores`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session}`
          },
          body: JSON.stringify({ stats: { score, distance } })
        });
        if (res.ok) {
          const data = await res.json();
          return {
            success: true,
            isNewHighScore: Boolean(data.improved),
            highScore: data.best || score,
            rank: data.rank,
            submittedScore: score
          };
        }
      } catch (err) {
        console.warn('[StartNgAdapter] HTTP submitScore failed:', err);
      }
    }

    // Local storage backup
    if (typeof localStorage !== 'undefined') {
      try {
        const key = `startng:${this.cachedUser?.id || 'guest'}:high-score`;
        const prev = parseInt(localStorage.getItem(key) || '0', 10);
        if (score > prev) localStorage.setItem(key, String(score));
      } catch {}
    }

    return {
      success: true,
      isNewHighScore: false,
      highScore: score,
      submittedScore: score
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
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this._onMessage);
      window.removeEventListener('focus', this.refreshUser);
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
