# Neon Drift ⚡

> **High-Octane 3D Endless Cyber-Runner built for start.ng**  
> Powered by Three.js and Vite. Zero external 3D asset dependencies. Pure procedural geometry with central platform styling.

![Neon Drift Screenshot](./docs/preview.png)

---

## 🚀 Overview

**Neon Drift** is an endless 3D web runner designed specifically for the **start.ng** application ecosystem. Players pilot a customizable cyber-runner through an infinite neon-lit highway, dodging ground barriers, monolithic hazard blocks, and overhead laser gates while collecting energy nodes for high scores.

### Key Highlights
- **100% Procedural 3D Graphics**: Built completely with Three.js primitive geometries—no external `.gltf` or `.obj` models to download. Lightning-fast startup (< 1.5s).
- **start.ng Central Styling Bridge**: Listens in real time to platform-level CSS custom properties (`--startng-primary`, `--startng-accent`, `--startng-surface`, `--startng-theme-mode`) via a dedicated `MutationObserver`.
- **In-Place Material Mutation**: Adapts armor colors, emissive visors, and PBR finishes (`metallic`, `matte`, `neon`) dynamically without recreating geometries or materials inside the render loop.
- **Deterministic Object Pooling**: Zero object allocations per frame for obstacles, collectibles, particles, and conveyor road chunks.
- **Glassmorphic DOM HUD**: Modern accessible UI with live authenticated user pill, score card with tabular numerals, pause overlay, and game over screen with personal best tracking.
- **Central Style Simulator**: Interactive in-game developer drawer to test token changes, profile configurations, and live styling provenance.

---

## 🎮 Controls

### Desktop Controls
| Key | Action |
|---|---|
| `A` / `Left Arrow` | Switch Lane Left |
| `D` / `Right Arrow` | Switch Lane Right |
| `Space` / `Up Arrow` | Jump (clear low ground barriers & collect high nodes) |
| `Escape` | Pause / Resume Run |
| `Enter` | Resume / Replay from Game Over |
| `Alt + S` / `Option + S` | Toggle Central Style Simulator |

### Mobile Touch Gestures
- **Swipe Left / Right**: Smooth lane transition (35px gesture threshold)
- **Swipe Up**: Jump
- **Tap**: Start game / Replay

---

## 🎨 Central Styling Contract

Neon Drift adheres strictly to the start.ng 4-tier style resolution pipeline:

1. **Tier 1 — Built-in Fallbacks**: `#7c3aed` (primary), `#22d3ee` (accent), `#111827` (surface), `dark` (theme), `metallic` (finish), `none` (accessory).
2. **Tier 2 — User Profile JSON**: Per-user preferences fetched via `/api/user/me` or mock platform adapter (`primaryColor`, `accentColor`, `finishType`, `accessory`).
3. **Tier 3 — Platform CSS Tokens**: Read directly from `document.documentElement` (`--startng-primary`, `--startng-accent`, `--startng-surface`, `--startng-theme-mode`).
4. **Tier 4 — Development Simulator Overrides**: Real-time overrides configured via the collapsible simulator drawer.

### Canonical Tokens
```css
:root {
  --startng-primary: #7c3aed;
  --startng-accent: #22d3ee;
  --startng-surface: #111827;
  --startng-theme-mode: dark; /* 'dark' | 'light' */
}
```

---

## 🛠️ Project Structure

```
neon-drift/
├── index.html              # Clean semantic entrypoint with glassmorphic DOM overlays
├── vite.config.js          # Base './' configuration for platform embedding
├── package.json            # Scripts & pinned dependencies (three, vite, vitest)
├── src/
│   ├── main.js             # Application composition root & state machine
│   ├── scene.js            # Three.js WebGLRenderer, PerspectiveCamera, lights & fog
│   ├── character.js        # Procedural humanoid mesh, movement lerp & jump physics
│   ├── world.js            # Moving conveyor road, object pools & collision detection
│   ├── ui.js               # UIManager: DOM HUD, overlays & Central Style Simulator
│   ├── startngBridge.js    # Platform adapter, 4-tier StyleResolver & MutationObserver
│   └── style.css           # Glassmorphic visual system & responsive mobile drawer
└── tests/
    ├── characterStyle.test.js  # PBR finishes & accessory visibility tests (5 tests)
    ├── score.test.js           # Scoring formula & speed scaling tests (3 tests)
    ├── startngBridge.test.js    # Style resolver, validators & observers (13 tests)
    ├── state.test.js           # State machine legal transition tests (5 tests)
    ├── ui.test.js              # HUD, initials, avatar sanitization & simulator (8 tests)
    └── world.test.js           # Object pools & collision detection tests (6 tests)
```

---

## 🧪 Development & Testing

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Local Server
```bash
# Install dependencies
npm install

# Start Vite development server (port 3000)
npm run dev
```

### Running Automated Tests
The project features 40 comprehensive unit tests covering all components:
```bash
# Run test suite
npm run test
```

### Building for Production
```bash
# Generate optimized production bundle in dist/
npm run build
```
The output in `dist/` uses relative paths (`./assets/...`) to guarantee flawless hosting inside iframe wrappers or subpaths on `start.ng`.

---

## ⚙️ Style Simulator

When running locally (or with `?simulator=1` in the URL), a floating trigger button (`🎨 Style Simulator`) appears in the bottom right corner.

Opening the simulator lets you:
- Adjust `--startng-primary`, `--startng-accent`, and `--startng-surface` with live color pickers.
- Toggle between `dark` and `light` themes in real time.
- Switch PBR finishes (`metallic`, `matte`, `neon`).
- Equip accessories (`halo`, `wings`, `visor-crown`).
- View the **Diagnostics & Style Provenance** table to inspect which source won for each property.
- Copy the current configuration JSON with a single click.
