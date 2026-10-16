import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getInitials, sanitizeImageUrl, UIManager } from '../src/ui.js';

// ============================================================================
// Lightweight Mock DOM for Node testing environment
// ============================================================================

class MockDOMElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = '';
    this.children = [];
    this.parentElement = null;
    this._textContent = '';
    this._innerHTML = '';
    this.hidden = false;
    this.style = {
      setProperty: (k, v) => { this.style[k] = v; },
      removeProperty: (k) => { delete this.style[k]; }
    };
    this.classList = {
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList._classes.has(c)) this.classList._classes.delete(c);
          else this.classList._classes.add(c);
        } else if (force) {
          this.classList._classes.add(c);
        } else {
          this.classList._classes.delete(c);
        }
      },
      contains: (c) => this.classList._classes.has(c)
    };
    this.listeners = {};
    this.attributes = {};
  }

  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }

  addEventListener(ev, fn) {
    if (!this.listeners[ev]) this.listeners[ev] = [];
    this.listeners[ev].push(fn);
  }

  removeEventListener(ev, fn) {
    if (this.listeners[ev]) {
      this.listeners[ev] = this.listeners[ev].filter(f => f !== fn);
    }
  }

  dispatchEvent(ev) {
    if (this.listeners[ev.type]) {
      this.listeners[ev.type].forEach(fn => fn(ev));
    }
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (this.parentElement) {
      const idx = this.parentElement.children.indexOf(this);
      if (idx !== -1) this.parentElement.children.splice(idx, 1);
    }
  }

  querySelector(selector) {
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      return this._findChild(c => c.className.split(' ').includes(cls) || c.classList.contains(cls));
    }
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return this._findChild(c => c.id === id);
    }
    return this._findChild(c => c.tagName.toLowerCase() === selector.toLowerCase());
  }

  _findChild(predicate) {
    for (const child of this.children) {
      if (predicate(child)) return child;
      const found = child._findChild(predicate);
      if (found) return found;
    }
    return null;
  }

  get textContent() {
    if (this.children.length > 0) {
      return this.children.map(c => c.textContent).join('');
    }
    return this._textContent;
  }

  set textContent(val) {
    this.children = [];
    this._textContent = String(val);
    this._innerHTML = String(val);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(html) {
    this._innerHTML = html;
    this.children = [];
    this._textContent = html.replace(/<[^>]*>/g, '');
  }
}

// Global DOM registry
const elementsMap = new Map();

function registerElement(id, tag = 'div') {
  const el = new MockDOMElement(tag, id);
  elementsMap.set(id, el);
  return el;
}

globalThis.document = {
  readyState: 'complete',
  documentElement: new MockDOMElement('html'),
  body: new MockDOMElement('body'),
  getElementById(id) {
    return elementsMap.get(id) || null;
  },
  createElement(tag) {
    return new MockDOMElement(tag);
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

globalThis.window = {
  location: { hostname: 'localhost' },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// ============================================================================
// Test Suites
// ============================================================================

describe('UI Helper Utilities', () => {
  it('correctly extracts uppercase initials from various name formats', () => {
    expect(getInitials('Neon Tester')).toBe('NT');
    expect(getInitials('runner')).toBe('RU');
    expect(getInitials('cyber_drift')).toBe('CD');
    expect(getInitials('start-ng-player')).toBe('SN');
    expect(getInitials('')).toBe('??');
    expect(getInitials(null)).toBe('??');
  });

  it('sanitizes avatar URLs and rejects unsafe schemes', () => {
    expect(sanitizeImageUrl('https://start.ng/avatar.png')).toBe('https://start.ng/avatar.png');
    expect(sanitizeImageUrl('http://localhost:3000/avatar.jpg')).toBe('http://localhost:3000/avatar.jpg');
    expect(sanitizeImageUrl('data:image/png;base64,1234')).toBe('data:image/png;base64,1234');
    expect(sanitizeImageUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeImageUrl('')).toBeNull();
    expect(sanitizeImageUrl(null)).toBeNull();
  });
});

describe('UIManager HUD & Screen Overlays', () => {
  let mockApp;
  let ui;

  beforeEach(() => {
    elementsMap.clear();

    // Register all required HUD & Screen elements
    registerElement('game-app');
    registerElement('game-stage');
    registerElement('user-pill');
    registerElement('score-card');
    registerElement('score-value');
    registerElement('collectible-value');
    registerElement('high-score-value');
    registerElement('pause-button', 'button');

    registerElement('loading-screen');
    registerElement('ready-screen');
    registerElement('pause-screen');
    registerElement('game-over-screen');
    registerElement('error-screen');
    registerElement('style-simulator', 'aside');

    mockApp = {
      state: 'READY',
      currentHighScore: 500,
      resolvedStyle: {
        primaryColor: '#7c3aed',
        accentColor: '#22d3ee',
        surfaceColor: '#111827',
        themeMode: 'dark',
        finishType: 'metallic',
        accessory: 'none',
        sources: {
          primaryColor: 'token',
          accentColor: 'token',
          surfaceColor: 'token',
          themeMode: 'token',
          finishType: 'default',
          accessory: 'default'
        }
      },
      devOverrides: {},
      startGame: vi.fn(),
      pauseGame: vi.fn(),
      resumeGame: vi.fn(),
      transitionTo: vi.fn(),
      applyCurrentStyle: vi.fn(() => mockApp.resolvedStyle)
    };

    ui = new UIManager({
      app: mockApp,
      appElement: elementsMap.get('game-app'),
      stageElement: elementsMap.get('game-stage')
    });
    ui.init();
  });

  afterEach(() => {
    ui.dispose();
  });

  it('renders guest user pill when user is null', () => {
    ui.updateUser(null);
    const pill = elementsMap.get('user-pill');
    expect(pill.textContent).toContain('Guest Runner');
  });

  it('renders authenticated user pill with initials and badge safely', () => {
    ui.updateUser({
      id: 'usr_123',
      username: 'neontester',
      displayName: 'Neon Tester',
      badge: { label: 'PRO' }
    });
    const pill = elementsMap.get('user-pill');
    expect(pill.querySelector('.user-avatar')?.textContent).toBe('NT');
    expect(pill.querySelector('.user-name')?.textContent).toBe('Neon Tester');
    expect(pill.querySelector('.user-badge')?.textContent).toBe('PRO');
  });

  it('updates HUD score numbers and formatted values', () => {
    ui.updateScore({ score: 1420, collectibles: 5, highScore: 2500 });
    expect(elementsMap.get('score-value')?.textContent).toBe('1,420');
    expect(elementsMap.get('collectible-value')?.textContent).toBe('⚡ 5');
    expect(elementsMap.get('high-score-value')?.textContent).toBe('BEST: 2,500');
  });

  it('manages mutually exclusive screen overlay visibility', () => {
    // READY screen
    ui.showScreen('READY');
    expect(elementsMap.get('ready-screen')?.hidden).toBe(false);
    expect(elementsMap.get('pause-screen')?.hidden).toBe(true);
    expect(elementsMap.get('game-over-screen')?.hidden).toBe(true);

    // PAUSED screen
    ui.showScreen('PAUSED');
    expect(elementsMap.get('ready-screen')?.hidden).toBe(true);
    expect(elementsMap.get('pause-screen')?.hidden).toBe(false);
    expect(elementsMap.get('game-over-screen')?.hidden).toBe(true);

    // GAME_OVER screen with high score banner
    ui.showScreen('GAME_OVER', {
      stats: { score: 3200, distance: 450, collectibles: 12 },
      isNewHighScore: true,
      statusMsg: 'Score confirmed & saved to start.ng!'
    });
    expect(elementsMap.get('pause-screen')?.hidden).toBe(true);
    expect(elementsMap.get('game-over-screen')?.hidden).toBe(false);
    expect(elementsMap.get('game-over-screen')?.innerHTML).toContain('NEW PERSONAL BEST');
    expect(elementsMap.get('game-over-screen')?.innerHTML).toContain('3,200');
    expect(elementsMap.get('game-over-screen')?.innerHTML).toContain('450m');
  });

  it('supports toggling the Central Style Simulator', () => {
    expect(ui.isSimulatorOpen).toBe(false);
    ui.toggleSimulator(true);
    expect(ui.isSimulatorOpen).toBe(true);
    expect(elementsMap.get('style-simulator')?.hidden).toBe(false);

    ui.toggleSimulator(false);
    expect(ui.isSimulatorOpen).toBe(false);
    expect(elementsMap.get('style-simulator')?.hidden).toBe(true);
  });

  it('populates diagnostics table with property sources in simulator', () => {
    const tableBody = registerElement('sim-diag-table-body', 'tbody');
    ui.updateSimulatorDiagnostics({
      primaryColor: '#7c3aed',
      accentColor: '#22d3ee',
      surfaceColor: '#111827',
      themeMode: 'dark',
      finishType: 'metallic',
      accessory: 'halo',
      sources: {
        primaryColor: 'token',
        accentColor: 'token',
        surfaceColor: 'token',
        themeMode: 'token',
        finishType: 'profile',
        accessory: 'simulator'
      }
    });

    expect(tableBody.innerHTML).toContain('primaryColor');
    expect(tableBody.innerHTML).toContain('token');
    expect(tableBody.innerHTML).toContain('simulator');
    expect(tableBody.innerHTML).toContain('profile');
  });

  it('renders character selector arrow buttons on READY screen and omits simulator button', () => {
    ui.showScreen('READY');
    const readyScreen = elementsMap.get('ready-screen');
    expect(readyScreen.innerHTML).toContain('char-prev-btn');
    expect(readyScreen.innerHTML).toContain('char-next-btn');
    expect(readyScreen.innerHTML).toContain('character-selector-card');
    expect(readyScreen.innerHTML).toContain('SELECT RUNNER AVATAR');
    // Ensure "Open Style Simulator" button is NOT on the ready screen
    expect(readyScreen.innerHTML).not.toContain('ready-sim-btn');
    expect(readyScreen.innerHTML).not.toContain('Open Style Simulator');
  });

  it('cycles through character avatar roster with selectNextCharacter and selectPreviousCharacter', () => {
    const initialChar = ui.getCurrentCharacter();
    expect(initialChar.name).toBe('CYBER SCOUT');

    // Step next
    ui.selectNextCharacter();
    const nextChar = ui.getCurrentCharacter();
    expect(nextChar.name).toBe('VALKYRIE A-1');
    expect(mockApp.applyCurrentStyle).toHaveBeenCalled();
    expect(mockApp.devOverrides.accessory).toBe('wings');

    // Step next again
    ui.selectNextCharacter();
    expect(ui.getCurrentCharacter().name).toBe('NEON SERAPH');
    expect(mockApp.devOverrides.accessory).toBe('halo');

    // Step previous
    ui.selectPreviousCharacter();
    expect(ui.getCurrentCharacter().name).toBe('VALKYRIE A-1');

    // Wrap around to the end with previous from index 0
    ui.selectCharacter(0);
    expect(ui.getCurrentCharacter().name).toBe('CYBER SCOUT');
    ui.selectPreviousCharacter();
    expect(ui.selectedCharacterIndex).toBe(5);
    expect(ui.getCurrentCharacter().name).toBe('SOLAR TITAN');
  });
});
