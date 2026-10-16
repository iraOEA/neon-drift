# TASKS.md — Neon Drift Implementation Roadmap

> **Product:** Neon Drift (3D Cyber-Runner for start.ng)  
> **Architecture:** Vite + Vanilla JS (ES Modules) + Three.js + HTML5/CSS3  
> **Status:** Planning & Execution Checklist — 5 Testable Build Phases

---

## Overview of Implementation Phases

| Phase | Focus Area | Key Deliverables | Verification Milestone |
|---|---|---|---|
| **Phase 1** | Vite + Three.js Scene Setup | Project shell, Vite setup, stable Scene, Camera, Lights, Fog, Floor Grid, master RAF loop | Render basic road & grid, responsive resizing, 60 FPS loop, zero console errors |
| **Phase 2** | 3D Character & Central Styling | Procedural `PlayerCharacter` hierarchy, finish presets (`matte`, `metallic`, `neon`), `applyCentralStyling()`, 3-lane lerp & jump physics | Idle animation, lane switching & jumping, in-place material updates without allocations |
| **Phase 3** | start.ng Auth & Central Styling Bridge | `startngBridge.js`, token reader & resolver (4-tier precedence), root `MutationObserver`, local mock adapter & score persistence | Mock user loads, token/profile updates propagate to character & scene within 100ms |
| **Phase 4** | World, Obstacles & Gameplay Loop | `world.js`, object pools (obstacles A/B/C, energy nodes, particles), conveyor recycling, collisions, score system, input routing | Fully playable run, collision triggers Game Over, collectibles award score, pause/resume |
| **Phase 5** | HUD, Live Style Simulator & Build | Glassmorphic DOM HUD, top-left user pill, top-right score card, dev Style Simulator, production build & teardown | Complete game loop, live styling simulator functional during play, clean build & tests |

---

## Phase 1: Vite + Three.js Scene Setup

- [x] **1.1 Project Structure & Build Configuration**
  - [x] Initialize `package.json` with pinned dependencies: `three` (latest stable), `vite`, and a lightweight test runner (`vitest` for fast ESM unit testing).
  - [x] Configure `vite.config.js` with proper `base` path support, build optimization, and environment flag handling.
  - [x] Create `.env.example` with public configuration variables:
    - `VITE_STARTNG_INTEGRATION_MODE=mock`
    - `VITE_ENABLE_MOCK_USER=true`
    - `VITE_ENABLE_STYLE_SIMULATOR=true`
    - `VITE_STARTNG_PARENT_ORIGIN=`
  - [x] Create `.gitignore` for `node_modules`, `dist`, `.env.local`, and test artifacts.
  - [x] Create semantic `index.html` structure with container `#game-app`, `#game-stage`, `#game-canvas`, and `#game-ui` overlay slots per `@architecture.md §3.1`.

- [x] **1.2 Visual System & CSS Foundation**
  - [x] Implement `src/style.css` defining local fallback variables under `#game-app`:
    - `--nd-default-primary: #7c3aed`
    - `--nd-default-accent: #22d3ee`
    - `--nd-default-surface: #101522`
    - `--nd-default-theme-mode: dark`
    - Normalized current variables (`--nd-current-*`).
  - [x] Implement responsive canvas layout, `dvh` fallback, mobile safe-area insets, and glassmorphic card foundations.
  - [x] Ensure `:root` does **not** declare default `--startng-*` variables so platform presence remains detectable.

- [x] **1.3 Core Three.js Scene System (`src/scene.js`)**
  - [x] Instantiate single `THREE.Scene`.
  - [x] Instantiate `THREE.PerspectiveCamera` with exact `@design.md` specifications:
    - FOV: `52°`, near: `0.1`, far: `150`.
    - Initial offset: Y `4.3`, Z `8.2` behind origin.
    - Look target: Y `1.1`, Z `-5.0`.
  - [x] Configure `THREE.WebGLRenderer` bound to `#game-canvas`:
    - Antialias enabled, pixel ratio capped at `Math.min(window.devicePixelRatio || 1, 2)`.
    - Tone mapping and color space configured explicitly according to pinned Three.js release.
    - Shadow map enabled with `THREE.PCFSoftShadowMap` (`1024x1024`).
  - [x] Construct stable, reusable light instances:
    - `THREE.HemisphereLight` (dark: sky `#A8B9FF`, ground `#141827`, intensity `1.1`).
    - `THREE.DirectionalLight` (key light at `(-4, 8, 6)`, intensity `2.0`, castShadow enabled).
    - `THREE.DirectionalLight` (accent rim light at `(4, 3, -6)`, color matching accent, intensity `1.6`, no shadow).
  - [x] Configure linear `THREE.Fog` (near `28`, far `95`, color matching surface background).
  - [x] Build reusable grid floor using `THREE.PlaneGeometry` and road lane dividers.
  - [x] Expose public methods: `add(object3D)`, `updateTheme({ themeMode, surfaceColor, accentColor })`, `updateCamera(deltaTime, followState)`, `resize(w, h, pr)`, `render()`, `dispose()`.

- [x] **1.4 Camera Follow & Responsive Resizing**
  - [x] Implement exponential delta-time camera follow in `updateCamera`:
    - `alpha = 1 - Math.exp(-6.0 * deltaTime)`.
    - Camera X follows `playerLaneX * 0.22`.
  - [x] Attach `ResizeObserver` to canvas container; update renderer dimensions and camera aspect without recreating renderer.
  - [x] Add `webglcontextlost` and `webglcontextrestored` event listeners.

- [x] **1.5 Application Composition Root & Master Loop (`src/main.js`)**
  - [x] Establish initial state machine states: `BOOT`, `AUTHENTICATING`, `LOADING_PROFILE`, `APPLYING_STYLE`, `READY`, `PLAYING`, `PAUSED`, `GAME_OVER`, `SUBMITTING_SCORE`, `SCORE_SAVED`, `ERROR`.
  - [x] Implement single master `requestAnimationFrame` loop with clamped delta:
    - `deltaTime = Math.min(Math.max(rawDelta, 0), 0.05)`.
  - [x] Implement `visibilitychange` handler to pause simulation on background tab.
  - [x] Implement lifecycle cleanup in `destroy()`.

- [x] **Phase 1 Verification Milestone:**
  - [x] Run `npm run dev` and confirm canvas renders dark cyber-runner scene with grid floor and lighting.
  - [x] Resizing window updates aspect ratio smoothly with zero scene reallocations.
  - [x] Verify zero console errors, warnings, or unhandled promises.

---

## Phase 2: 3D Character & Central Styling Methods

- [x] **2.1 Procedural Character Mesh Assembly (`src/character.js`)**
  - [x] Construct root `PlayerCharacter` (`THREE.Group`) positioned at local origin facing `-Z`.
  - [x] Build exact required named node hierarchy using geometric primitives:
    - `Body` (`THREE.Mesh`, capsule/beveled box geometry, primary armor material).
    - `Head` (`THREE.Mesh`, sphere/rounded box, primary armor material).
    - `Visor` (`THREE.Mesh`, curved panel, accent emissive material).
    - `Limbs` (`THREE.Group` containing `Arm_L`, `Arm_R`, `Leg_L`, `Leg_R`, `Joint_L`, `Joint_R`).
    - `Accessory_Halo` (`THREE.Mesh` or `THREE.Group`, torus geometry, accent material).
    - `Accessory_Wings` (`THREE.Group` containing `Wing_L`, `Wing_R`, mirrored polygonal geometry).
    - `Accessory_Crown` (`THREE.Group` containing `Crown_Frame`, `Crown_Visor`).
    - `Trail` (`THREE.Group` containing pooled segment meshes).
  - [x] Ensure all geometry and materials are instantiated exactly once during class initialization.

- [x] **2.2 Finish Presets & PBR Material Specification**
  - [x] Implement finish preset constants for `THREE.MeshStandardMaterial`:
    - **`matte`**: metalness `0.05`, roughness `0.82`, primary emissive `0.03`, accent emissive `0.20`.
    - **`metallic`**: metalness `0.78`, roughness `0.28`, primary emissive `0.08`, accent emissive `0.35`.
    - **`neon`**: metalness `0.22`, roughness `0.32`, primary emissive `0.65`, accent emissive `1.65`.
  - [x] Implement theme mode modifier: multiply base emissive intensity by `0.85` in light mode, `1.0` in dark mode.

- [x] **2.3 In-Place Styling Mutation Method (`applyCentralStyling`)**
  - [x] Implement `applyCentralStyling(resolvedStyle)` on `PlayerCharacter`:
    - Mutate existing `material.color` via `color.set(resolvedStyle.primaryColor)`.
    - Mutate existing `material.emissive` via `emissive.set(resolvedStyle.accentColor)`.
    - Mutate `material.metalness`, `material.roughness`, and `material.emissiveIntensity` based on `finishType`.
    - Apply exclusive accessory visibility table:
      - `none`: Halo `false`, Wings `false`, Crown `false`.
      - `halo`: Halo `true`, Wings `false`, Crown `false`.
      - `wings`: Halo `false`, Wings `true`, Crown `false`.
      - `visor-crown`: Halo `false`, Wings `false`, Crown `true`.
  - [x] Cache last applied style to ensure idempotent no-op returns.
  - [x] Verify zero geometry or material allocations during style changes.

- [x] **2.4 Character Movement, Jump Physics & Animation**
  - [x] Configure lane centers: `[-2.2, 0, 2.2]`.
  - [x] Implement target lane clamping: `setLane(targetIndex)` clamped to `[0, 1, 2]`.
  - [x] Smooth horizontal movement using delta-time exponential lerp: `x += (targetX - x) * (1 - Math.exp(-15.0 * deltaTime))`.
  - [x] Implement jump physics: initial upward velocity `11.0`, gravity `-28.0`, grounded check on `Y = 0`.
  - [x] Implement idle bobbing animation (`Math.sin(time * 3.0) * 0.08`) and leg/arm swing in running state.
  - [x] Expose `getCollisionBounds()` returning stable bounding dimensions invariant to visual accessories.

- [x] **2.5 Automated Character Unit Tests (`tests/characterStyle.test.js`)**
  - [x] Test node hierarchy: verify all required named nodes exist.
  - [x] Test accessory visibility table: verify mutually exclusive visibility for each enum value.
  - [x] Test material preset mapping: verify metalness, roughness, and emissive values match `@design.md §4.6`.
  - [x] Test in-place updates: verify material object references do not change after `applyCentralStyling()`.

- [x] **Phase 2 Verification Milestone:**
  - [x] Character renders in the scene on center lane with idle animation.
  - [x] Calling `applyCentralStyling` with different colors, finishes, and accessories updates character instantly.
  - [x] Unit tests pass: `npm run test tests/characterStyle.test.js`.

---

## Phase 3: start.ng Auth & Central Styling Bridge

- [x] **3.1 Normalized Models & Style Resolver (`src/startngBridge.js`)**
  - [x] Define normalization schemas for `GameUser` and `ResolvedStyle`.
  - [x] Implement CSS color validator and enum normalizers (`ThemeMode`, `FinishType`, `AccessoryType`).
  - [x] Implement `resolveStyle({ defaults, profileStyle, centralTokens, devOverrides })` strictly following 4-tier precedence:
    1. Built-in local defaults.
    2. Valid user profile styling JSON.
    3. Valid central root CSS custom property tokens.
    4. Development-only simulator overrides (when enabled).
  - [x] Retain source provenance for diagnostics (`sources` map).

- [x] **3.2 CSS Custom Property Reader & Root MutationObserver**
  - [x] Implement `readCentralStyleTokens()` querying `document.documentElement`:
    - `--startng-primary`
    - `--startng-accent`
    - `--startng-surface`
    - `--startng-theme-mode`
    - Empty string treated as "no override" (allows profile JSON to shine through).
  - [x] Set up `MutationObserver` on `document.documentElement` watching `style` and `class` attributes.
  - [x] Debounce/coalesce mutation batches to one update per frame.

- [x] **3.3 Platform Adapter & Local Mock Implementation**
  - [x] Implement `createPlatformAdapter()` selecting between `StartNgAdapter` and `MockPlatformAdapter`:
    - Enforce mock mode only when `isLocalhost()` and `VITE_ENABLE_MOCK_USER=true`.
  - [x] Implement `MockPlatformAdapter`:
    - Returns deterministic user `local-dev-user-001` (`neon_tester`, display name `Neon Tester`, badge `DEV`).
    - Provides default profile styling JSON.
    - Manages personal high score via `localStorage` key `neon-drift:dev:local-dev-user-001:high-score`.
    - Simulates platform style update events.
  - [x] Implement production `StartNgAdapter` shell:
    - Prepares verified postMessage / session handlers.
    - Emits clear error if deployed in production without verified integration contracts.

- [x] **3.4 Startup Lifecycle & State Transitions in `src/main.js`**
  - [x] Implement sequential boot handshake:
    `BOOT` -> `AUTHENTICATING` -> `LOADING_PROFILE` -> `APPLYING_STYLE` -> `READY`.
  - [x] Wire bridge style subscriptions to `playerCharacter.applyCentralStyling()` and `gameScene.updateTheme()`.
  - [x] Implement account switch handler: pause gameplay, reload profile/score, reset to `READY`.

- [x] **3.5 Automated Bridge Unit Tests (`tests/startngBridge.test.js`, `tests/state.test.js`)**
  - [x] Test style precedence: verify CSS token overrides profile color, but missing CSS token preserves profile color.
  - [x] Test token validation: invalid hex strings and unknown enums fall back to safe values.
  - [x] Test mock user persistence and score retrieval.
  - [x] Test state machine: verify illegal state transitions throw or are safely rejected.

- [x] **Phase 3 Verification Milestone:**
  - [x] Application starts up, initializes mock user, resolves styling tokens, and transitions to `READY`.
  - [x] Mutating root style attribute dynamically changes character and scene theme in < 100ms.
  - [x] Unit tests pass: `npm run test tests/startngBridge.test.js tests/state.test.js`.

---

## Phase 4: World, Obstacles & Gameplay Loop

- [x] **4.1 Endless Road & Conveyor Recycling (`src/world.js`)**
  - [x] Build segmented road system using reusable `PlaneGeometry` chunks.
  - [x] Move chunks toward camera along `+Z` based on `forwardSpeed * deltaTime`.
  - [x] Recycle chunks behind player (`Z > 15`) to the far spawn distance (`Z = -120`).
  - [x] Update road and grid material colors when theme changes without reallocating geometry.

- [x] **4.2 Procedural Object Pooling System**
  - [x] Implement `ObjectPool` utility with fixed upper bounds and pre-allocated meshes.
  - [x] Build obstacle template meshes:
    - **Type A (Ground Barrier)**: low hurdle across one lane, requires jump.
    - **Type B (Solid Block)**: tall obstacle blocking one lane, requires lane switch.
    - **Type C (Overhead Gate)**: structure requiring clear adjacent lane or low clearance.
  - [x] Use distinct high-contrast hazard materials (`#FF6B6B` dark, `#C2414B` light), independent of player palette.
  - [x] Build collectible template: rotating energy octahedron/ring with accent emissive material and distinct outline.
  - [x] Build lightweight particle pool for collection bursts and impact cues.

- [x] **4.3 Difficulty Progression & Spawning Logic**
  - [x] Implement speed progression curve:
    - Start speed: `18.0` units/sec.
    - Max speed: `32.0` units/sec reached at `120` seconds.
    - Spawn interval: decreases from `1.8s` to `0.8s`.
  - [x] Ensure obstacle generator guarantees at least one clear, hazard-free lane (no impossible walls).
  - [x] Implement seeded random generator support for deterministic gameplay testing.

- [x] **4.4 Collision Detection System**
  - [x] Maintain lightweight collision bounds:
    - Player: bounding box `[width: 0.8, height: 1.8, depth: 0.8]`, offset by current jump height.
    - Obstacles: distinct AABB per obstacle type.
    - Collectibles: sphere collision `[radius: 0.6]`.
  - [x] Execute collision check every simulation step.
  - [x] Emit single fatal collision event on obstacle hit -> trigger `GAME_OVER`.
  - [x] Emit collection event on energy node hit -> award points, deactivate node, spawn pickup effect.

- [x] **4.5 Scoring System & Stats Tracking**
  - [x] Calculate score: `Distance Score (10 pts/sec) + Collectible Score (100 pts/node)`.
  - [x] Track run metrics: duration in ms, distance traveled, collectibles gathered.
  - [x] Generate unique `runId` (UUID/timestamp nonce) on run completion.

- [x] **4.6 Input Controller & Gameplay Orchestration**
  - [x] Desktop input: `A` / `ArrowLeft` (lane left), `D` / `ArrowRight` (lane right), `Space` / `ArrowUp` (jump), `Escape` (pause).
  - [x] Mobile input: swipe gestures (left, right, up) with 35px threshold; prevent page scrolling during active gameplay.
  - [x] Wire inputs to `main.js`: route commands strictly to `character.setLane()` and `character.jump()`.
  - [x] Handle `PAUSED` and `RESUME` preserving exact world positions and run timers.

- [x] **4.7 Automated World & Scoring Tests (`tests/world.test.js`, `tests/score.test.js`)**
  - [x] Test object pooling: verify no new meshes created after pool initialization.
  - [x] Test collision accuracy: ground barrier collides when grounded, clears when jumped.
  - [x] Test score calculation and duplicate collectible prevention.
  - [x] Test speed progression clamping.

- [x] **Phase 4 Verification Milestone:**
  - [x] Full gameplay loop playable: Ready -> Play -> Dodge obstacles / collect nodes -> Game Over.
  - [x] Smooth lane changes and jumps at 60 FPS.
  - [x] Unit tests pass: `npm run test tests/world.test.js tests/score.test.js`.

---

## Phase 5: HUD, Live Style Simulator & Build

- [x] **5.1 DOM HUD & State Overlays (`src/ui.js`)**
  - [x] Implement top-left logged-in user pill: avatar image/initials fallback, username/display name, platform badge (`DEV`).
  - [x] Implement top-right score card: tabular numerals for score, collectible count, personal best, and accessible pause button.
  - [x] Implement state screens:
    - `#loading-screen`: accessible loading spinner and status text.
    - `#ready-screen`: game title, character preview, personal best, primary `PLAY` button, controls hint.
    - `#pause-screen`: `RESUME`, `RESTART`, `BACK TO MENU` buttons.
    - `#game-over-screen`: final score, nodes collected, personal best comparison ("NEW BEST!"), persistence status indicator, `PLAY AGAIN` and `BACK TO MENU` buttons.
    - `#error-screen`: clear error description and retry action.
  - [x] Safe text handling: all user strings injected via `textContent`.

- [x] **5.2 Central Style Simulator (`src/ui.js` / `#style-simulator`)**
  - [x] Build collapsible floating development panel (collapsed by default).
  - [x] Central token inputs: color pickers for `--startng-primary`, `--startng-accent`, `--startng-surface`, and theme selector (`dark`/`light`).
  - [x] Profile styling inputs: `primaryColor`, `accentColor`, `finishType` (`matte`, `metallic`, `neon`), `accessory` (`none`, `halo`, `wings`, `visor-crown`).
  - [x] Interactive controls: `Apply Changes`, `Reset Overrides`, `Reset Everything`, `Copy Styling JSON`.
  - [x] Diagnostic inspector: active mode (`mock`/`start.ng`), user ID, resolved colors, and winning source provenance per field.
  - [x] Ensure simulator feeds changes into `StyleResolver` and updates live character without pausing gameplay.
  - [x] Condition simulator availability on development build and localhost host check.

- [x] **5.3 Score Submission & Persistence Flow**
  - [x] On game over, assemble run payload with `runId`, `userId`, `score`, `durationMs`, `distance`, `collectibles`.
  - [x] Submit payload via `platformAdapter.submitScore(runResult)`.
  - [x] Display submission status: `Submitting...` -> `Score Saved!` or `Retry Submission`.
  - [x] Update displayed personal best upon authoritative confirmation.

- [x] **5.4 Responsive Polish, Accessibility & Theme Adaptation**
  - [x] Test mobile layout in portrait and landscape orientations.
  - [x] Ensure touch targets meet 44x44px minimum hit area.
  - [x] Verify contrast ratios for HUD text and glass cards in both dark and light modes.
  - [x] Support `prefers-reduced-motion` for non-essential UI transitions.

- [x] **5.5 Performance Validation, Teardown & Production Build**
  - [x] Verify 60 FPS performance on desktop and mobile viewports.
  - [x] Run long simulation stress test (5+ minutes continuous running) verifying zero memory leaks or unbounded pool growth.
  - [x] Verify complete teardown: calling `destroy()` cancels RAF, disconnects observers, removes event listeners, and disposes GPU resources.
  - [x] Run production build: `npm run build` generates optimized bundle in `dist/`.
  - [x] Create comprehensive `README.md` documenting setup, architecture, styling system, simulator, and start.ng integration notes.

- [x] **Phase 5 Verification Milestone:**
  - [x] Full end-to-end user journey verified: Boot -> Ready screen -> Active run with HUD -> Collision -> Game Over with Score Persistence -> Replay.
  - [x] Style Simulator allows real-time tuning during gameplay.
  - [x] `npm run build` succeeds cleanly with zero errors.
  - [x] All test suites pass: `npm run test`.
