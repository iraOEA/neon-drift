import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isValidColor,
  normalizeTheme,
  normalizeFinish,
  normalizeAccessory,
  resolveStyle,
  readCentralStyleTokens,
  CentralStyleObserver,
  MockPlatformAdapter,
  DEFAULT_STYLE,
  MOCK_USER
} from '../src/startngBridge.js';

describe('startngBridge — Validators and Normalizers', () => {
  it('validates CSS color strings correctly', () => {
    // Valid colors
    expect(isValidColor('#fff')).toBe(true);
    expect(isValidColor('#123456')).toBe(true);
    expect(isValidColor('#12345678')).toBe(true);
    expect(isValidColor('rgb(255, 0, 128)')).toBe(true);
    expect(isValidColor('rgba(255, 0, 128, 0.5)')).toBe(true);
    expect(isValidColor('hsl(200, 100%, 50%)')).toBe(true);

    // Invalid colors
    expect(isValidColor('')).toBe(false);
    expect(isValidColor('not-a-color-string-xyz')).toBe(false);
    expect(isValidColor('#gggggg')).toBe(false);
    expect(isValidColor('#12345')).toBe(false);
    expect(isValidColor(null)).toBe(false);
    expect(isValidColor(undefined)).toBe(false);
    expect(isValidColor(12345)).toBe(false);
  });

  it('normalizes theme modes per ARCHITECTURE.md §4.2', () => {
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeTheme('light')).toBe('light');
    expect(normalizeTheme('DARK')).toBe('dark');
    expect(normalizeTheme(' Light ')).toBe('light');
    expect(normalizeTheme('neon')).toBe(null);
    expect(normalizeTheme('')).toBe(null);
    expect(normalizeTheme(null)).toBe(null);
  });

  it('normalizes finish types per ARCHITECTURE.md §4.2', () => {
    expect(normalizeFinish('matte')).toBe('matte');
    expect(normalizeFinish('metallic')).toBe('metallic');
    expect(normalizeFinish('neon')).toBe('neon');
    expect(normalizeFinish('METALLIC')).toBe('metallic');
    expect(normalizeFinish('glossy')).toBe(null);
    expect(normalizeFinish('')).toBe(null);
  });

  it('normalizes accessories per ARCHITECTURE.md §4.2', () => {
    expect(normalizeAccessory('none')).toBe('none');
    expect(normalizeAccessory('halo')).toBe('halo');
    expect(normalizeAccessory('wings')).toBe('wings');
    expect(normalizeAccessory('visor-crown')).toBe('visor-crown');
    expect(normalizeAccessory('HAT')).toBe(null);
    expect(normalizeAccessory('')).toBe(null);
  });
});

describe('startngBridge — 4-Tier Style Precedence Resolver', () => {
  it('falls back to local defaults when no profile or central tokens are present', () => {
    const resolved = resolveStyle({
      defaults: DEFAULT_STYLE,
      profileStyle: {},
      centralTokens: {},
      devOverrides: {}
    });

    expect(resolved.primaryColor).toBe(DEFAULT_STYLE.primaryColor);
    expect(resolved.accentColor).toBe(DEFAULT_STYLE.accentColor);
    expect(resolved.surfaceColor).toBe(DEFAULT_STYLE.surfaceColor);
    expect(resolved.themeMode).toBe('dark');
    expect(resolved.finishType).toBe('metallic');
    expect(resolved.accessory).toBe('none');

    expect(resolved.sources.primaryColor).toBe('default');
    expect(resolved.sources.accentColor).toBe('default');
    expect(resolved.sources.themeMode).toBe('default');
  });

  it('profile styling JSON overrides local defaults', () => {
    const resolved = resolveStyle({
      defaults: DEFAULT_STYLE,
      profileStyle: {
        primaryColor: '#ff0055',
        accentColor: '#00ffff',
        finishType: 'neon',
        accessory: 'wings',
        themeMode: 'light'
      },
      centralTokens: {},
      devOverrides: {}
    });

    expect(resolved.primaryColor).toBe('#ff0055');
    expect(resolved.accentColor).toBe('#00ffff');
    expect(resolved.finishType).toBe('neon');
    expect(resolved.accessory).toBe('wings');
    expect(resolved.themeMode).toBe('light');

    expect(resolved.sources.primaryColor).toBe('profile');
    expect(resolved.sources.accentColor).toBe('profile');
    expect(resolved.sources.finishType).toBe('profile');
    expect(resolved.sources.accessory).toBe('profile');
    expect(resolved.sources.themeMode).toBe('profile');
  });

  it('central root CSS tokens override profile colors and theme', () => {
    const resolved = resolveStyle({
      defaults: DEFAULT_STYLE,
      profileStyle: {
        primaryColor: '#ff0055',
        accentColor: '#00ffff',
        finishType: 'neon',
        accessory: 'halo',
        themeMode: 'light'
      },
      centralTokens: {
        primary: '#3b82f6',
        accent: '#10b981',
        surface: '#0f172a',
        themeMode: 'dark'
      },
      devOverrides: {}
    });

    // Overridden by central tokens
    expect(resolved.primaryColor).toBe('#3b82f6');
    expect(resolved.accentColor).toBe('#10b981');
    expect(resolved.surfaceColor).toBe('#0f172a');
    expect(resolved.themeMode).toBe('dark');

    // finishType and accessory remain profile-controlled!
    expect(resolved.finishType).toBe('neon');
    expect(resolved.accessory).toBe('halo');

    expect(resolved.sources.primaryColor).toBe('central');
    expect(resolved.sources.accentColor).toBe('central');
    expect(resolved.sources.themeMode).toBe('central');
    expect(resolved.sources.finishType).toBe('profile');
    expect(resolved.sources.accessory).toBe('profile');
  });

  it('empty or invalid central tokens DO NOT erase valid profile values', () => {
    const resolved = resolveStyle({
      defaults: DEFAULT_STYLE,
      profileStyle: {
        primaryColor: '#e11d48',
        accentColor: '#a855f7',
        finishType: 'matte',
        accessory: 'visor-crown'
      },
      centralTokens: {
        primary: '', // Empty: not an override!
        accent: 'invalid-css-color', // Invalid: not an override!
        surface: '',
        themeMode: ''
      },
      devOverrides: {}
    });

    // Profile colors must shine through safely
    expect(resolved.primaryColor).toBe('#e11d48');
    expect(resolved.accentColor).toBe('#a855f7');
    expect(resolved.sources.primaryColor).toBe('profile');
    expect(resolved.sources.accentColor).toBe('profile');
  });

  it('development simulator overrides win over all lower tiers', () => {
    const resolved = resolveStyle({
      defaults: DEFAULT_STYLE,
      profileStyle: {
        primaryColor: '#111111',
        accentColor: '#222222'
      },
      centralTokens: {
        primary: '#333333',
        accent: '#444444'
      },
      devOverrides: {
        primaryColor: '#990000',
        accentColor: '#009900',
        finishType: 'neon',
        accessory: 'wings'
      }
    });

    expect(resolved.primaryColor).toBe('#990000');
    expect(resolved.accentColor).toBe('#009900');
    expect(resolved.finishType).toBe('neon');
    expect(resolved.accessory).toBe('wings');

    expect(resolved.sources.primaryColor).toBe('devOverride');
    expect(resolved.sources.accentColor).toBe('devOverride');
    expect(resolved.sources.finishType).toBe('devOverride');
    expect(resolved.sources.accessory).toBe('devOverride');
  });
});

class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = new MockLocalStorage();
}

function createMockElement(initialProps = {}) {
  const props = { ...initialProps };
  return {
    style: {
      setProperty(name, val) {
        props[name] = val;
      },
      getPropertyValue(name) {
        return props[name] || '';
      }
    }
  };
}

describe('startngBridge — CSS Token Reader', () => {
  let mockEl;
  let originalGetComputedStyle;

  beforeEach(() => {
    mockEl = createMockElement();
    originalGetComputedStyle = globalThis.getComputedStyle;
    globalThis.getComputedStyle = (el) => el.style;
  });

  afterEach(() => {
    globalThis.getComputedStyle = originalGetComputedStyle;
  });

  it('reads CSS tokens from document root element', () => {
    mockEl.style.setProperty('--startng-primary', '#123456');
    mockEl.style.setProperty('--startng-accent', '#654321');
    mockEl.style.setProperty('--startng-surface', '#090a0f');
    mockEl.style.setProperty('--startng-theme-mode', 'dark');

    const tokens = readCentralStyleTokens(mockEl);
    expect(tokens.primary).toBe('#123456');
    expect(tokens.accent).toBe('#654321');
    expect(tokens.surface).toBe('#090a0f');
    expect(tokens.themeMode).toBe('dark');
  });

  it('returns empty strings for unset properties without throwing', () => {
    const tokens = readCentralStyleTokens(mockEl);
    expect(tokens.primary).toBe('');
    expect(tokens.accent).toBe('');
    expect(tokens.surface).toBe('');
    expect(tokens.themeMode).toBe('');
  });
});

describe('startngBridge — MockPlatformAdapter', () => {
  let adapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new MockPlatformAdapter();
  });

  afterEach(() => {
    adapter.dispose();
    localStorage.clear();
  });

  it('returns the deterministic mock user', async () => {
    const user = await adapter.getCurrentUser();
    expect(user.id).toBe(MOCK_USER.id);
    expect(user.username).toBe(MOCK_USER.username);
    expect(user.badge.label).toBe('DEV');
    expect(user.styling.finishType).toBe('neon');
  });

  it('manages personal high score via localStorage persistence', async () => {
    const initialHighScore = await adapter.getHighScore();
    expect(initialHighScore.highScore).toBe(0);

    // Submit a run score of 1500
    const res1 = await adapter.submitScore({
      runId: 'test-run-1',
      score: 1500,
      duration: 45.2,
      distance: 350
    });

    expect(res1.success).toBe(true);
    expect(res1.isNewHighScore).toBe(true);
    expect(res1.highScore).toBe(1500);

    // Verify persisted score
    const updated = await adapter.getHighScore();
    expect(updated.highScore).toBe(1500);

    // Submit lower score: should not override high score
    const res2 = await adapter.submitScore({
      runId: 'test-run-2',
      score: 800,
      duration: 20.0,
      distance: 120
    });

    expect(res2.success).toBe(true);
    expect(res2.isNewHighScore).toBe(false);
    expect(res2.highScore).toBe(1500);
  });
});
