# AGENTS.md — Neon Drift AI Agent Rulebook

> **Target Codebase:** `neon-drift` (Browser-based 3D Endless Runner for `start.ng`)  
> **Governing Specifications:** [@prd.md](file:///Users/zikky/.gemini/antigravity/scratch/neon-drift/prd.md), [@design.md](file:///Users/zikky/.gemini/antigravity/scratch/neon-drift/design.md), [@architecture.md](file:///Users/zikky/.gemini/antigravity/scratch/neon-drift/architecture.md)  
> **Status:** Mandatory Developer Rulebook — All AI agents and contributors must follow this document without exception.

---

## 1. Prime Directives & Binding Precedence

1. **Always Follow Specification Documents:**
   - Any implementation decision MUST strictly adhere to `@prd.md`, `@design.md`, and `@architecture.md`.
   - In any apparent conflict between documents, the binding architecture decision in `architecture.md` governs: **Vite + Vanilla JavaScript (ES6 modules) + Three.js + HTML5/CSS3**.
   - Do NOT introduce TypeScript compilation, React, Vue, Svelte, or other UI frameworks. Use JSDoc annotations for type documentation.
   - Do NOT introduce external physics engines (Cannon, Rapier, Ammo) or animation libraries (GSAP). Use custom 3-lane math, basic gravity, AABB/sphere collision, and delta-time interpolation.

2. **Verify Every Step:**
   - Every phase, component, and utility must be verified before proceeding to the next.
   - Run tests (`npm run test`), execute local builds (`npm run build`), and verify in-browser rendering with zero unhandled exceptions or console errors.

3. **No Fabricated Production APIs:**
   - Never invent imaginary platform endpoints, cookie names, host globals, or secrets for `start.ng`.
   - Isolate all platform interactions behind `startngBridge.js`.
   - Mock authentication and local storage fallbacks are permitted **only** in explicitly enabled local development environments (`localhost` / `127.0.0.1`).

---

## 2. Three.js Architecture & WebGL Guardrails

1. **Zero Allocations Inside the Render Loop:**
   - **CRITICAL:** NEVER instantiate geometries (`new THREE.*Geometry`), materials (`new THREE.*Material`), textures, meshes, `THREE.Color`, vectors, closures, or arrays inside the per-frame `requestAnimationFrame` loop or `update()` methods called every frame.
   - Pre-allocate all reusable vectors, matrices, bounds, and colors during component initialization or class construction.
   - Update existing object transforms, colors, and material properties in place.

2. **Strict Component Modularity & File Ownership:**
   Follow the strict file boundaries defined in `@architecture.md`:
   - `src/main.js`: Composition root, state machine, input orchestration, and the **single master `requestAnimationFrame` loop**.
   - `src/scene.js`: Owns the single `THREE.Scene`, `THREE.PerspectiveCamera`, `THREE.WebGLRenderer`, stable lighting, fog, and grid floor.
   - `src/character.js`: Owns the `PlayerCharacter` hierarchy, procedural geometry assembly, lane lerp, jump mechanics, and `applyCentralStyling()`.
   - `src/world.js`: Owns pooled obstacles, collectibles, road segment recycling, difficulty progression, and collision bounds.
   - `src/startngBridge.js`: Owns `start.ng` user discovery, CSS token reading, `MutationObserver`, iframe postMessage handling, and score persistence.
   - `src/ui.js`: Owns DOM HUD, glassmorphic cards, user pill, score card, menus, and the development Style Simulator.
   - `src/style.css`: Owns layout, responsive styles, dark/light themes, and UI variables.

3. **In-Place Styling & Material Updates:**
   - When platform CSS variables or profile styling changes, **NEVER recreate the Scene, WebGLRenderer, or character meshes**.
   - Character materials and lights MUST be updated in place via `PlayerCharacter.applyCentralStyling(resolvedStyle)` and `GameScene.updateTheme(resolvedTheme)`.
   - Mutate existing `MeshStandardMaterial` properties (`color`, `emissive`, `emissiveIntensity`, `metalness`, `roughness`) and toggle accessory node `.visible` properties.
   - Never share mutable character materials with environment objects that react differently to themes.

4. **Object Pooling:**
   - All dynamic world objects (obstacles, collectibles, trail segments, particles, road segments) MUST be pooled.
   - Objects transition between active and inactive states. Reset position, rotation, and flags on reuse.
   - Impose hard upper bounds on pools to prevent unbounded memory growth.

5. **Frame Pacing & Delta-Time Interpolation:**
   - Clamp delta time to `0.05` seconds (50 ms) to avoid tunneling or explosion after tab switches or frame drops.
   - Always use exponential smoothing `1 - Math.exp(-k * deltaTime)` for camera follow and lane movement. Never use fixed per-frame fractions (`alpha = 0.1`).

6. **Orderly Teardown & Disposal:**
   - Every module must provide an idempotent `dispose()` method.
   - Dispose unique geometries, materials, renderers, event listeners, resize observers, and mutation observers on application teardown.

---

## 3. Central Styling & Precedence Rules

1. **Resolution Precedence (Lowest to Highest):**
   ```text
   1. Built-in Local Defaults
   2. User Profile Styling JSON
   3. Platform Root CSS Custom Properties (--startng-*)
   4. Development-Only Style Simulator Overrides (when enabled)
   ```

2. **Canonical External Tokens:**
   - `--startng-primary` -> Overrides primary color (body, head armor).
   - `--startng-accent` -> Overrides accent color (visor, trim, trail, rim light).
   - `--startng-surface` -> Overrides surface color (joints, structural panels, scene fog/background basis).
   - `--startng-theme-mode` -> `dark` or `light` (controls scene background, fog contrast, grid lines, and UI theme).
   - `finishType` (`matte`, `metallic`, `neon`) & `accessory` (`none`, `halo`, `wings`, `visor-crown`) are controlled by Profile JSON unless explicit tokens are formally added.

3. **CSS Variable Scope Guard:**
   - Do NOT declare default values for `--startng-*` on `:root` in `style.css`.
   - Declare local defaults under `#game-app` (e.g., `--nd-default-primary`).
   - Read canonical tokens from `document.documentElement`. An empty string means "no override".
   - Write resolved UI values to `#game-app` (e.g., `--nd-current-primary`) — NEVER write to `document.documentElement` to prevent recursive `MutationObserver` loops.

4. **Named Character Node Hierarchy:**
   `PlayerCharacter` MUST expose exact discoverable node names:
   ```text
   PlayerCharacter (THREE.Group)
   ├── Body (THREE.Mesh)
   ├── Head (THREE.Mesh)
   ├── Visor (THREE.Mesh)
   ├── Limbs (THREE.Group)
   │   ├── Arm_L (THREE.Mesh)
   │   ├── Arm_R (THREE.Mesh)
   │   ├── Leg_L (THREE.Mesh)
   │   └── Leg_R (THREE.Mesh)
   ├── Accessory_Halo (THREE.Mesh or THREE.Group)
   ├── Accessory_Wings (THREE.Group: Wing_L, Wing_R)
   ├── Accessory_Crown (THREE.Mesh or THREE.Group)
   └── Trail (THREE.Group)
   ```

5. **Exclusive Accessory Visibility:**
   - Exactly one accessory active at a time (`halo`, `wings`, or `visor-crown`).
   - If `none`, all accessory nodes have `visible = false`.
   - Visor is visible as the default face panel, and also active in `visor-crown`.

---

## 4. Platform Security & DOM UI Rules

1. **Identity & Score Integrity:**
   - Never trust client-supplied user IDs as authentication proof for score writes.
   - The platform adapter associates scores with the authenticated session.
   - In production, display "Saved" only after authoritative persistence confirmation.

2. **DOM Text & URLs:**
   - Always assign user-controlled text via `textContent` (never `innerHTML`).
   - Sanitize and validate avatar and badge URLs against approved platform origins.

3. **Style Simulator Isolation:**
   - The Central Style Simulator is development-only (`VITE_ENABLE_STYLE_SIMULATOR=true` + local host check).
   - In production builds, the simulator must be completely omitted or deactivated, not just hidden with CSS.

---

## 5. Development Checklist Before Marking Tasks Complete

- [ ] All code adheres strictly to the modular boundaries in `@architecture.md`.
- [ ] No `new THREE.*` inside any per-frame loop or animation step.
- [ ] In-place material updates verified when changing CSS variables or profile styling.
- [ ] Character hierarchy matches exact node names and accessory visibility table.
- [ ] Unit and integration tests pass without errors.
- [ ] Production build (`npm run build`) completes cleanly.
- [ ] Zero unhandled errors or console warnings during normal gameplay workflows.
