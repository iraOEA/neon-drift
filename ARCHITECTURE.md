# ARCHITECTURE.md — Neon Drift

> **Product:** Neon Drift  
> **Platform:** start.ng  
> **Purpose:** Developer-ready architecture specification for Google Antigravity  
> **Runtime:** Modern desktop and mobile browsers  
> **Architecture version:** 1.0.0

---

## 1. Architecture Goals and Decisions

Neon Drift is a browser-based Three.js endless runner. The application must be lightweight enough to embed in start.ng, keep game simulation independent from platform services, and allow platform styling to update the player and scene without rebuilding the WebGL scene.

The architecture is organized around five boundaries:

1. **Application and state:** Owns startup, explicit game states, event routing, and the master animation loop.
2. **Three.js scene:** Owns renderer, camera, lighting, fog, grid floor, environment, and scene-level theme updates.
3. **Gameplay:** Owns the player, input, world objects, collisions, score calculation, and difficulty.
4. **Platform integration:** Owns user-session discovery, profile data, theme updates, high-score reads, and score submissions.
5. **DOM UI and styling:** Owns the HUD, game-state overlays, accessible controls, theme-aware interface styles, and the development-only style simulator.

### 1.1 Binding implementation decision

The PRD initially mentions TypeScript as a possible stack. This architecture follows the implementation requirement for **Vite + Vanilla JavaScript (ES6 modules) + Three.js + HTML5/CSS3**, with no heavy UI framework. JavaScript is the source language for this implementation. Use JSDoc annotations for public contracts and editor assistance; do not add TypeScript compilation unless the project owner explicitly changes this decision.

### 1.2 Non-negotiable rules

- Use Three.js for all real-time 3D rendering.
- Use procedural geometry and standard Three.js materials for the core player and environment.
- Do not introduce React, Vue, Angular, or another large UI framework for the MVP.
- Do not create a separate player-account system.
- Production identity and scores must use verified start.ng integration capabilities.
- Never fabricate production API URLs, cookie names, event names, or host globals.
- Only allow mock identity in an explicitly configured local development environment.
- Keep the Three.js `Scene`, `WebGLRenderer`, character geometry, and reusable materials alive through normal state changes and style updates.
- Any central-style update must flow through one resolver and then update existing objects in place.
- Use one master `requestAnimationFrame` loop per game instance.
- Dispose listeners, observers, geometries, materials, and renderers when the application is torn down.

---

## 2. Technology Stack and Build Tooling

### 2.1 Required stack

| Concern | Technology | Responsibility |
|---|---|---|
| Build tool and dev server | Vite | Local server, ES module bundling, environment flags, optimized production build |
| Application language | Vanilla JavaScript, ES modules | Application lifecycle, gameplay systems, platform adapter, styling resolution |
| 3D rendering | Three.js | Scene, camera, renderer, procedural meshes, materials, lighting, fog |
| Interface | HTML5 and CSS3 | HUD, menus, ready/game-over screens, buttons, simulator panel |
| Browser animation | `requestAnimationFrame` | One coordinated simulation/render loop |
| Responsive sizing | `ResizeObserver` and resize events | Canvas and camera updates |
| Root theme observation | `MutationObserver` plus explicit host events/messages | React to central theme/style updates |
| Local development persistence | `localStorage`, mock mode only | Mock user's high score and optional local simulator preferences |
| Testing | Lightweight unit/integration test runner selected during setup | Pure logic, adapters, styling rules, and state transitions |

Use a Vite-compatible stable Three.js release and pin it in `package.json`/lockfile. Do not depend on unpinned CDN imports for production.

### 2.2 Dependency constraints

Runtime dependencies should remain minimal. Three.js is the primary runtime dependency. Prefer native browser APIs for DOM, events, input, storage, and resizing.

Do not add a physics engine for the MVP. Three-lane movement, simple jump physics, and AABB/sphere collision tests are sufficient. Do not add a state-management library; `main.js` owns a small explicit state machine. Do not add an animation framework; use a small number of delta-time-aware functions.

### 2.3 Vite configuration

Use `vite.config.js` and `package.json` scripts for:

- `npm run dev` — local development server.
- `npm run build` — production build.
- `npm run preview` — serve the production build locally.
- `npm run test` — automated tests.

Configure the Vite `base` path to match the actual start.ng deployment path. Do not assume the app is hosted at `/` if the platform embeds it under a subpath. Public `VITE_*` variables are configuration, not secrets; never place privileged API keys in them.

Suggested public configuration variables:

- `VITE_STARTNG_INTEGRATION_MODE` — an explicit integration selection where needed.
- `VITE_STARTNG_PARENT_ORIGIN` — approved host origin for an iframe message contract; this value is public, not a secret.
- `VITE_ENABLE_MOCK_USER` — enables the local mock adapter only when combined with the local-host and development-build checks.
- `VITE_ENABLE_STYLE_SIMULATOR` — controls compilation/availability of development simulator UI.

If the actual start.ng integration does not require one of these variables, do not keep unused configuration in the project.

---

## 3. Strict Directory and File Structure

Create this structure unless an existing repository already has a coherent equivalent. Inspect the repo before adding or moving files; preserve working conventions where possible.

```text
neon-drift/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── .env.example
├── .gitignore
├── README.md
├── src/
│   ├── main.js
│   ├── style.css
│   ├── scene.js
│   ├── character.js
│   ├── world.js
│   ├── startngBridge.js
│   └── ui.js
└── tests/
    ├── state.test.js
    ├── characterStyle.test.js
    ├── startngBridge.test.js
    ├── world.test.js
    └── score.test.js
```

Small pure helpers may remain in the named modules for this MVP. Split files further only when it materially improves clarity; do not create empty placeholder modules just to match a tree.

### 3.1 `index.html` — document shell and mounts

Responsibilities:

- Provide standard metadata, viewport configuration, and the page title.
- Mount the game canvas container.
- Include semantic DOM markup for the user pill, score card, ready screen, pause overlay, game-over screen, error/loading states, and simulator shell.
- Load `src/main.js` as a module.
- Avoid inline application JavaScript.
- Avoid embedding secrets or identity data into static HTML.

Required conceptual markup and IDs:

```html
<div id="game-app" data-theme="dark">
  <div id="game-stage" aria-label="Neon Drift game">
    <canvas id="game-canvas" aria-label="3D game scene"></canvas>

    <div id="game-ui">
      <header id="hud-top" aria-label="Game status">
        <section id="user-pill" aria-label="Signed-in start.ng user"></section>
        <section id="score-card" aria-label="Score">
          <span id="score-value">0</span>
          <span id="collectible-value">0</span>
          <span id="high-score-value">—</span>
          <button id="pause-button" type="button">Pause</button>
        </section>
      </header>

      <section id="loading-screen" aria-live="polite"></section>
      <section id="ready-screen" aria-labelledby="game-title"></section>
      <section id="pause-screen" aria-labelledby="pause-title" hidden></section>
      <section id="game-over-screen" aria-labelledby="game-over-title" hidden></section>
      <section id="error-screen" role="alert" hidden></section>
    </div>
  </div>

  <aside id="style-simulator" aria-label="Central Style Simulator" hidden></aside>
</div>
```

This is the required structural contract, not a mandate to leave every section empty. Build complete semantic content in the HTML or construct it from `ui.js` consistently. Avoid duplicate IDs and ensure hidden state is reflected with the `hidden` attribute or equivalent accessible behavior.

The canvas is for 3D content only. Render interface text and buttons in DOM/CSS for accessibility, responsiveness, and performance.

### 3.2 `src/style.css` — visual system and responsive UI

Responsibilities:

- Declare local fallback design variables and base typography.
- Implement dark/light UI themes.
- Implement the glassmorphic cards, top-left user pill, top-right score card, ready/pause/game-over overlays, focus states, and simulator panel.
- Apply responsive sizing, mobile safe-area padding, `dvh` fallbacks, touch-friendly controls, and reduced-motion rules.
- Keep the game canvas and DOM overlay correctly stacked.

The canonical central tokens read from the platform root are:

- `--startng-primary`
- `--startng-accent`
- `--startng-surface`
- `--startng-theme-mode`

**Important:** Do not define default values for those four platform input tokens on the application's `:root` stylesheet, because that makes an absent host token indistinguishable from a supplied host token and can incorrectly override the profile JSON. Define separate local fallbacks such as `--nd-default-primary`, `--nd-default-accent`, `--nd-default-surface`, and `--nd-default-theme-mode` under `#game-app`. The host may set canonical variables on its own root. After resolution, `main.js`/`ui.js` may write normalized `--nd-current-*` values to `#game-app` for use by the UI; do not write them onto `document.documentElement`, which would cause unnecessary feedback to the root `MutationObserver`.

`getComputedStyle(document.documentElement).getPropertyValue('--startng-primary').trim()` must be empty when the host has not supplied the token. Empty means “no override,” not a color. This allows `StyleResolver` to apply profile JSON and then the local fallback correctly.

Suggested local fallback variables:

```css
#game-app {
  --nd-default-primary: #7c3aed;
  --nd-default-accent: #22d3ee;
  --nd-default-surface: #101522;
  --nd-default-theme-mode: dark;
  --nd-current-primary: var(--nd-default-primary);
  --nd-current-accent: var(--nd-default-accent);
  --nd-current-surface: var(--nd-default-surface);
  color: #f4f7ff;
  background: var(--nd-current-surface);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system,
    BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

Use the current resolved variables in buttons and HUD cards. The examples above are starter values; central values and profile styling must be validated before they reach CSS or Three.js.

### 3.3 `src/main.js` — application composition root

Responsibilities:

- Construct the application dependencies in a deterministic order.
- Select and initialize the platform adapter.
- Initialize UI, scene, character, world, and inputs.
- Own the explicit state machine.
- Own the single `requestAnimationFrame` loop.
- Coordinate the simulation and rendering phases.
- Route platform identity/style notifications into the style resolver.
- Call orderly cleanup on application destruction.

`main.js` is the composition root. It should wire components together, not contain individual Three.js geometry builders or raw authentication API details.

It must expose or internally implement an idempotent `start()`, a `destroy()` cleanup path, and a state-transition function with legal transitions. Avoid global mutable state except for a narrowly scoped development debug hook, which must be disabled in production.

### 3.4 `src/scene.js` — Three.js rendering foundation

Responsibilities:

- Create one `THREE.Scene`.
- Create one `THREE.PerspectiveCamera` using the DESIGN.md specification.
- Create one `THREE.WebGLRenderer` bound to `#game-canvas`.
- Configure tone mapping/color management consistently with the pinned Three.js release.
- Build and retain the ambient/hemisphere light, key light, accent rim light, fog, road/grid floor, and environment group.
- Provide `resize()`, `updateTheme(themeConfig)`, `render()`, and `dispose()` methods.
- Follow the player camera target with delta-time-aware smoothing.
- Handle WebGL context loss/recovery where supported.

Do not recreate the renderer or scene when the game changes state, a style changes, or the canvas resizes.

### 3.5 `src/character.js` — `PlayerCharacter`

Responsibilities:

- Build a procedural humanoid from reusable geometries and named Three.js nodes.
- Provide predictable node names required by `DESIGN.md`.
- Own lane target state, smooth horizontal lane movement, jump velocity/gravity, landing, idle animation, and simple run/jump animation.
- Expose `applyCentralStyling(styleConfig)` to update existing materials and optional accessory visibility in place.
- Provide `update(deltaTime, gameState)` and `dispose()` methods.
- Keep collision-relevant dimensions stable when appearance styling changes.

`applyCentralStyling()` must be idempotent. Calling it repeatedly with the same normalized style must not allocate more geometries or materials, add duplicate meshes, or introduce additional animation callbacks.

### 3.6 `src/world.js` — environment, objects, collisions, and scoring inputs

Responsibilities:

- Build the moving grid/road treatment and recycle the floor sections.
- Maintain obstacle and collectible pools.
- Spawn obstacles/collectibles ahead of the player.
- Advance world objects from frame delta time and configured difficulty.
- Perform bounding-box and/or simple sphere collision tests.
- Emit one collision event per run-ending collision and one collection event per collectible.
- Ensure obstacles remain avoidable and object counts stay bounded.
- Expose `resetRun()`, `update(deltaTime, runState)`, `getScoreStats()`, and `dispose()` methods.

Keep scoring calculations deterministic and separate enough to test. The world should report events and stats; `main.js` coordinates state transitions and score submission.

### 3.7 `src/startngBridge.js` — platform/session boundary

Responsibilities:

- Retrieve the current start.ng user using a **verified** integration mechanism.
- Normalize actual profile fields into the app's internal user model.
- Retrieve profile styling JSON and personal high score when supported.
- Subscribe to documented user, theme, and style changes.
- Read canonical CSS custom properties from `document.documentElement`.
- Observe relevant root attribute changes with `MutationObserver`.
- Receive and validate approved `window` `message` events when embedded.
- Provide score submission through the real platform-approved service.
- Supply a mock adapter only in approved local development conditions.
- Clean up observers, event listeners, and subscriptions.

The module must not leak raw API details to the game systems. The rest of the app calls a normalized interface.

### 3.8 `src/ui.js` — DOM presentation and simulator

Responsibilities:

- Render the authenticated user's display name, username, avatar fallback, and optional badge.
- Update current score, collectible count, and personal best.
- Show/hide loading, ready, pause, game-over, error, and save-status UI.
- Wire accessible buttons and display state changes.
- Create and manage the development-only Central Style Simulator controls.
- Apply resolved theme data to `#game-app` CSS custom properties and `data-theme`.
- Display validation errors and integration diagnostics without exposing credentials.

Use `textContent` for plain user-controlled strings. Sanitize/validate avatar and badge URLs according to the platform's allowed origins. Never concatenate profile data into arbitrary HTML. UI updates must not rebuild the entire DOM every frame; update only values that changed.

---

## 4. Runtime Object and Data Contracts

### 4.1 Application user model

The bridge should normalize the actual platform object to this logical shape:

```js
/** @typedef {Object} GameUser
 * @property {string} id Stable platform user identifier.
 * @property {string} username Platform username.
 * @property {string=} displayName Optional display name.
 * @property {string=} avatarUrl Optional approved avatar URL.
 * @property {{label?: string, imageUrl?: string}=} badge Optional badge metadata.
 * @property {Object=} styling Raw or normalized profile styling data.
 */
```

These are application field names, not assumptions about the native start.ng response. Mapping belongs in `startngBridge.js`.

### 4.2 Normalized central style

All inputs are resolved into one normalized style object before any Three.js objects are changed:

```js
/** @typedef {'matte'|'metallic'|'neon'} FinishType
 * @typedef {'none'|'halo'|'wings'|'visor-crown'} AccessoryType
 * @typedef {'dark'|'light'} ThemeMode
 *
 * @typedef {Object} ResolvedStyle
 * @property {string} primaryColor Valid CSS color.
 * @property {string} accentColor Valid CSS color.
 * @property {string} surfaceColor Valid CSS color.
 * @property {ThemeMode} themeMode.
 * @property {FinishType} finishType.
 * @property {AccessoryType} accessory.
 * @property {Object=} sources Optional development-only source/provenance map.
 */
```

Canonical external inputs:

| Source | Key | Meaning |
|---|---|---|
| Root CSS custom property | `--startng-primary` | Central primary color |
| Root CSS custom property | `--startng-accent` | Central accent color |
| Root CSS custom property | `--startng-surface` | Central surface/environment color |
| Root CSS custom property | `--startng-theme-mode` | `dark` or `light` |
| User profile JSON | `primaryColor` | User-specific primary color fallback |
| User profile JSON | `accentColor` | User-specific accent color fallback |
| User profile JSON | `finishType` | `matte`, `metallic`, or `neon` |
| User profile JSON | `accessory` | `none`, `halo`, `wings`, or `visor-crown` |

### 4.3 Style precedence

Resolve every property independently using this order:

1. Built-in local fallback.
2. Valid user profile styling JSON.
3. Valid central root CSS token for the corresponding property.
4. Development-only simulator override.

The simulator is highest priority only when compiled/enabled in a trusted development environment. A missing/empty/invalid root token is not an override and must not erase a valid profile value. An invalid JSON field must fall back per field instead of invalidating the whole profile.

Central token mapping:

- `--startng-primary` overrides resolved `primaryColor`.
- `--startng-accent` overrides resolved `accentColor`.
- `--startng-surface` overrides resolved `surfaceColor`.
- `--startng-theme-mode` overrides resolved `themeMode` when it is exactly `dark` or `light` after normalization.

Profile attributes `finishType` and `accessory` remain profile-controlled unless the platform adds a formally approved central token for them. Do not infer these settings from a CSS color.

### 4.4 Style resolver pseudocode

```js
function resolveStyle({ defaults, profileStyle, centralTokens, devOverrides }) {
  const result = {
    primaryColor: isValidColor(profileStyle?.primaryColor)
      ? profileStyle.primaryColor : defaults.primaryColor,
    accentColor: isValidColor(profileStyle?.accentColor)
      ? profileStyle.accentColor : defaults.accentColor,
    surfaceColor: defaults.surfaceColor,
    themeMode: normalizeTheme(profileStyle?.themeMode) ?? defaults.themeMode,
    finishType: normalizeFinish(profileStyle?.finishType) ?? defaults.finishType,
    accessory: normalizeAccessory(profileStyle?.accessory) ?? defaults.accessory,
  };

  if (isValidColor(centralTokens.primary)) result.primaryColor = centralTokens.primary;
  if (isValidColor(centralTokens.accent)) result.accentColor = centralTokens.accent;
  if (isValidColor(centralTokens.surface)) result.surfaceColor = centralTokens.surface;
  if (normalizeTheme(centralTokens.themeMode)) {
    result.themeMode = normalizeTheme(centralTokens.themeMode);
  }

  return applyValidOverrides(result, devOverrides);
}
```

The real implementation must validate every property, clamp numeric values if any are added, and preserve the last valid style when an update is malformed. The snippet describes precedence, not a complete production utility.

---

## 5. Three.js Scene and Character Contracts

### 5.1 Scene ownership

`scene.js` owns one stable scene/rendering bundle:

- `scene`
- `camera`
- `renderer`
- ambient/hemisphere light
- directional key light
- accent rim light
- scene fog
- environment/grid group

`world.js` owns gameplay objects placed into scene-owned groups. `character.js` owns a single `THREE.Group` for the player. `main.js` coordinates updates but does not own individual meshes.

### 5.2 Character node hierarchy

The `PlayerCharacter` root group must contain discoverable nodes with the exact names below:

```text
PlayerCharacter (THREE.Group)
├── Body (THREE.Mesh)
├── Head (THREE.Mesh or THREE.Group)
├── Visor (THREE.Mesh)
├── Limbs (THREE.Group)
│   ├── Arm_L (THREE.Mesh)
│   ├── Arm_R (THREE.Mesh)
│   ├── Leg_L (THREE.Mesh)
│   └── Leg_R (THREE.Mesh)
├── Accessory_Halo (THREE.Mesh or THREE.Group)
├── Accessory_Wings (THREE.Group; required for wings option)
│   ├── Wing_L (THREE.Mesh)
│   └── Wing_R (THREE.Mesh)
├── Accessory_Crown (THREE.Mesh or THREE.Group)
└── Trail (THREE.Group)
```

The required names `Body`, `Head`, `Visor`, `Limbs`, `Accessory_Halo`, `Accessory_Crown`, and `Trail` must exist. Add `Accessory_Wings` to fulfill the supported `wings` profile value. Grouped nodes may contain multiple procedural meshes, but the named nodes themselves must remain stable for style application and tests.

Use geometric primitives only: capsule/box/sphere/cylinder/torus/cone/octahedron geometry as appropriate. Construct each part once. The optional nodes exist even when hidden, so switching accessories changes visibility rather than creating an ever-growing set of meshes.

### 5.3 Character accessory visibility

Exactly one accessory mode is applied at a time:

| `accessory` value | `Accessory_Halo.visible` | `Accessory_Wings.visible` | `Accessory_Crown.visible` | `Visor.visible` |
|---|---:|---:|---:|---:|
| `none` | `false` | `false` | `false` | `false` |
| `halo` | `true` | `false` | `false` | `false` |
| `wings` | `false` | `true` | `false` | `false` |
| `visor-crown` | `false` | `false` | `true` | `true` |

If design iteration makes a visor an intrinsic face feature instead of an accessory, keep the node name and revise this table and tests in one coordinated change. The table above is the initial contract for the profile selector.

### 5.4 Finish presets and exact material mapping

Use `THREE.MeshStandardMaterial` for the character's body parts, visor, accessory surfaces, and trail core where physically based finish behavior is useful. `MeshBasicMaterial` may be used for lightweight grid/line accents that should not depend on scene lighting; it is not the primary character material.

The finish preset sets baseline properties for all eligible character materials:

| `finishType` | `metalness` | `roughness` | Base body `emissiveIntensity` | Intended look |
|---|---:|---:|---:|---|
| `matte` | `0.05` | `0.82` | `0.04` | Soft, clean polymer/paint |
| `metallic` | `0.82` | `0.28` | `0.12` | Reflective armor with controlled highlights |
| `neon` | `0.35` | `0.22` | `0.85` on accent parts; `0.18` on body | Energy-lit surfaces without washing out the silhouette |

These are deterministic starting values and should be centralized in one constant object. Do not scatter finish numbers throughout animation code. Keep `emissive` black or very restrained on large body surfaces for matte/metallic finishes; use `accentColor` for visor, seams, core, halo, wings, crown, and trail emissive details. Avoid an expensive bloom pipeline as a requirement.

Exact first-pass material mapping:

| Central/style input | Target mesh/material | `color` | `emissive` | `emissiveIntensity` | `metalness` | `roughness` | `visible` behavior |
|---|---|---|---|---:|---:|---:|---|
| `--startng-primary` / `primaryColor` | `Body.material` | Resolved primary | Black in matte/metallic; muted primary in neon | Finish baseline above | From `finishType` | From `finishType` | Always visible |
| `--startng-primary` / `primaryColor` | `Head.material` | Resolved primary, optionally adjusted slightly lighter than Body | Black in matte/metallic; muted primary in neon | Body baseline | From `finishType` | From `finishType` | Always visible |
| `--startng-primary` / `primaryColor` | `Limbs` child materials | Resolved primary, with selected joint subparts using a darker shade | Black or restrained primary | Body baseline | From `finishType` | From `finishType` | Always visible |
| `--startng-accent` / `accentColor` | `Visor.material` | Resolved accent | Resolved accent | `0.05` matte, `0.15` metallic, `1.0` neon | `0.10` matte, `0.65` metallic, `0.35` neon | `0.65` matte, `0.30` metallic, `0.22` neon | Visible only for `visor-crown` according to the initial accessory contract |
| `--startng-accent` / `accentColor` | Body accent strips/core | Resolved accent | Resolved accent | `0.05` matte, `0.15` metallic, `0.9` neon | Finish baseline | `0.45` matte, `0.25` metallic, `0.22` neon | Always visible; never recolor environment accidentally |
| `--startng-accent` / `accentColor` | `Accessory_Halo` | Resolved accent | Resolved accent | `0.3` matte, `0.5` metallic, `1.1` neon | `0.15` matte, `0.75` metallic, `0.35` neon | `0.55` matte, `0.25` metallic, `0.20` neon | Visible only for `halo` |
| `--startng-accent` / `accentColor` | `Accessory_Wings` child materials | Resolved accent with primary-color inner plates | Accent on edge strips | `0.1` matte, `0.35` metallic, `0.85` neon | `0.08` matte, `0.78` metallic, `0.35` neon | `0.72` matte, `0.28` metallic, `0.24` neon | Visible only for `wings` |
| `--startng-accent` / `accentColor` | `Accessory_Crown` | Resolved accent; inset plates may use primary | Resolved accent | `0.15` matte, `0.45` metallic, `0.95` neon | `0.15` matte, `0.8` metallic, `0.35` neon | `0.60` matte, `0.25` metallic, `0.22` neon | Visible only for `visor-crown` |
| `--startng-accent` / `accentColor` | `Trail` emissive core/particles | Resolved accent | Resolved accent | `0.2` matte, `0.55` metallic, `1.2` neon | `0.0` for lightweight particles | `0.35` when using `MeshStandardMaterial` | Active while running; reduced or hidden while idle/paused/game over |
| `--startng-surface` | Character secondary armor/underside material | Resolved surface, clamped only by valid color input | Black | Body baseline | From `finishType` | From `finishType` | Visible when its parent part is visible |
| `--startng-theme-mode` | Character materials and visibility | No forced replacement of user primary/accent; adjust only contrast-safe secondary tones if required | Accent emissive remains accent-derived | Do not modify finish preset solely because of theme | Unchanged | Unchanged | Does not toggle accessories; theme controls scene/UI only |

When the JavaScript updates a `THREE.Color`, use the pinned Three.js version's supported color-space handling. Do not apply manual gamma conversion on top of Three.js color management. `color.set(cssColor)` is preferred for validated CSS colors. Clamp or sanitize values before material assignment.

**Shared material caution:** Character materials must not be shared with environment objects whose colors are controlled by the theme. If a mesh shares a material and one styling update would change an unrelated object, split the material instance once at construction time rather than cloning a new one on every update.

### 5.5 Required `PlayerCharacter` API

```js
class PlayerCharacter {
  constructor({ scene, config }) { /* build root group and named meshes once */ }
  applyCentralStyling(styleConfig) { /* patch existing material values/visibility */ }
  setLane(targetLaneIndex) { /* clamp target to [0, 1, 2] */ }
  jump() { /* start jump only when grounded */ }
  update(deltaTime, gameState) { /* lane lerp, jump physics, animation */ }
  getCollisionBounds() { /* stable gameplay collision dimensions */ }
  resetForRun() { /* reset transform/velocity/animation state */ }
  dispose() { /* dispose unique resources owned by character */ }
}
```

Use a shared configuration for lane centers `[-2.2, 0, 2.2]`, move smoothing, jump velocity, and gravity. Do not duplicate the lane coordinates in keyboard/touch code or collision code.

`applyCentralStyling()` should update `material.color`, `material.emissive`, `emissiveIntensity`, `metalness`, `roughness`, and supported `visible` flags. It must set `material.needsUpdate = true` only when a change actually affects a shader-defining property; simple color/intensity assignments generally do not need a new material instance. Cache the last applied normalized style so no-op updates can return immediately.

---

## 6. Scene, Camera, Lighting, Fog, and Theme Updates

### 6.1 Exact camera specification

Use a single `THREE.PerspectiveCamera`:

| Parameter | Exact starting value |
|---|---:|
| Field of view | `52` degrees |
| Aspect ratio | `canvasWidth / canvasHeight` |
| Near plane | `0.1` |
| Far plane | `150` |
| Follow offset X | `playerLaneX * 0.22` |
| Follow offset Y | `4.3` world units |
| Follow offset Z | `8.2` world units behind the player |
| Look target Y | Player root Y plus `1.1` |
| Look target Z | Player Z minus `5.0` |
| Follow interpolation constant | `6.0` |

The player faces local `-Z`. Calculate the follow smoothing factor per frame:

```js
const alpha = 1 - Math.exp(-6.0 * deltaTime);
camera.position.lerp(desiredCameraPosition, alpha);
currentLookTarget.lerp(desiredLookTarget, alpha);
camera.lookAt(currentLookTarget);
```

The camera may follow the player's vertical position enough to keep jumps framed, but must not bob vertically in a way that makes obstacle reading difficult. Never use a fixed interpolation fraction independent of delta time.

### 6.2 Lighting

Retain stable light instances and update their color/intensity values during theme changes.

**Hemisphere light**

- Type: `THREE.HemisphereLight`.
- Dark sky: `#A8B9FF`; ground: `#141827`; intensity `1.1`.
- Light sky: `#F8FAFF`; ground: `#AEB8CA`; intensity `0.85`.
- Purpose: broad base illumination and fill.

**Directional key light**

- Type: `THREE.DirectionalLight`.
- Position: `(-4, 8, 6)`.
- Color: neutral/cool white.
- Dark intensity: `2.0`.
- Light intensity: `1.25`.
- Shadow map starting size: `1024 × 1024`; increase only after performance profiling.
- Use a tightly fitted shadow camera and a supported soft shadow mode such as `THREE.PCFSoftShadowMap`.
- Disable real-time shadows on low-quality/mobile profiles if needed, but retain illumination and use a simple contact shadow.

**Accent rim light**

- Type: `THREE.PointLight` or `THREE.DirectionalLight`, selected once at scene creation.
- Color: resolved `accentColor`.
- Suggested intensity: `1.0` dark theme, `0.65` light theme.
- Position should create a back/side rim that separates the character from the scene.
- Update only the light color and intensity when the resolved accent/theme changes; do not reconstruct the light.

### 6.3 Background and fog

Use `THREE.Fog` or `THREE.FogExp2`, selected once. Update the existing fog color/density when `themeMode` changes. Fog must soften distant geometry without hiding obstacles before the player has adequate reaction time.

- Dark mode: background/fog uses a deep navy/charcoal family derived from `--startng-surface`, with a subtle cool tint.
- Light mode: background/fog uses a light neutral/cool family derived from `--startng-surface`, with slightly darker horizon/grid contrast.
- Use the resolved `surfaceColor` as the main surface/environment input, then adjust contrast for the fog and background through deterministic theme rules.
- Do not let user primary/accent colors control hazard visibility.

### 6.4 Grid floor

Use one reusable `PlaneGeometry`, reusable road segments, and one compact line/buffer representation for the floor grid. Do not create one mesh for every individual grid line.

Dark mode: deep surface base, low-contrast blue-gray grid, clear accent lane markings. Light mode: cool light-gray surface, neutral low-contrast grid, accent lane markings with reduced emission or darker accent treatment as necessary. Fade the far grid using fog and keep the near-player lane markings clear.

When theme changes, update existing floor/grid material colors and line material colors. Do not regenerate the road or grid geometry to change the theme.

### 6.5 Environment, obstacles, and collectibles

- Road/environment uses reusable procedural geometry and pooled repeated sections.
- Obstacles use angular, high-contrast silhouettes and a hazard color family independent of the character palette.
- Collectibles use a rotating energy-node geometry and resolved `accentColor`, plus an outline/shape cue.
- A collectible must remain distinguishable from a hazard even if the user's accent color overlaps the hazard hue. Use different silhouettes, animation, outline, and surface treatment, not color alone.
- Keep spawn distance, speed, obstacle count, and particle count bounded.

### 6.6 Required `scene.js` API

```js
class GameScene {
  constructor({ canvas, container, config }) { /* create scene once */ }
  add(object3D) { /* add to correct stable group */ }
  updateTheme({ themeMode, surfaceColor, accentColor }) { /* in-place update */ }
  updateCamera(deltaTime, playerState) { /* exponential lerp */ }
  resize(width, height, pixelRatio) { /* renderer size/camera aspect */ }
  render() { /* renderer.render(scene, camera) */ }
  dispose() { /* stop listeners and dispose owned resources */ }
}
```

`updateTheme()` must update `scene.background`, existing fog values, floor/grid material colors, hemisphere light colors/intensity, rim light color/intensity, and app theme variables via `ui.js` or a passed callback. It must not allocate a new renderer or rebuild the scene.

---

## 7. `startngBridge.js`: Authentication, Host Messaging, Central Style, and Persistence

### 7.1 Platform integration principle

The exact start.ng SDK/API, profile schema, session mechanism, and score endpoint must be discovered from actual platform documentation or existing integration code. The architecture defines the app-side contract; it does not claim that any particular start.ng endpoint or global exists today.

`startngBridge.js` should expose a normalized adapter with methods equivalent to:

```js
/**
 * @typedef {Object} StartNgBridge
 * @property {() => Promise<GameUser|null>} getCurrentUser
 * @property {(user: GameUser) => Promise<Object|null>} getProfileStyling
 * @property {(user: GameUser) => Promise<{highScore:number, updatedAt?:string}>} getHighScore
 * @property {(runResult: Object) => Promise<Object>} submitScore
 * @property {(callback: (user: GameUser|null) => void) => () => void} subscribeUserChanges
 * @property {(callback: (tokens: Object) => void) => () => void} subscribeCentralStyleChanges
 * @property {() => Object} readCentralStyleTokens
 * @property {() => 'start.ng'|'mock'} getMode
 * @property {() => void} dispose
 */
```

Actual methods may be adjusted to match the platform's supported mechanisms, but platform-specific response mapping must remain inside this module.

### 7.2 Session discovery and fallback policy

Use a configured, documented source rather than indiscriminately searching browser storage. The source precedence should be based on the platform integration actually available:

1. **Official platform SDK or documented API** — preferred source of truth for the active user and account state.
2. **Approved host-to-iframe `postMessage` handshake** — use when the game is embedded and the platform exposes identity/profile data through a documented message contract.
3. **Documented same-origin session/API mechanism** — use the platform's supported API with the appropriate browser-managed session/cookie behavior. Send credentials only according to the documented origin and CORS contract.
4. **Documented browser user context in storage** — only if start.ng explicitly documents this as an integration source. Treat it as display context, not independent proof of identity; never treat a client-stored user ID as authoritative for score writes.
5. **Mock adapter** — allowed only for a local development host and an enabled development build.

Security rules:

- Do not read or copy HttpOnly cookies; JavaScript cannot access them and should not attempt to circumvent that protection.
- Do not scrape undocumented cookie names or arbitrary `localStorage` keys.
- Do not store platform passwords, bearer tokens, or session secrets in local storage.
- Do not silently fall back to a mock identity in a public build when authentication fails.
- A timeout/service error is not equivalent to an authenticated or unauthenticated result; represent it as an integration error.
- The platform persistence service must verify the active server-side session when associating a score with a user.

Local mock mode must require all relevant checks, including a development build, allowed hostname (`localhost` or `127.0.0.1`), and the configured mock feature flag. Use a deterministic user such as `local-dev-user-001` / `neon_tester`. Mock high-score storage may use a namespaced local key such as `neon-drift:dev:local-dev-user-001:high-score`.

### 7.3 Proposed `postMessage` contract

If start.ng uses iframe messaging, agree the message types, payload shapes, origin, and lifecycle with the platform team before production integration. These names are a proposed application contract, not a claim that the platform already emits them.

Example envelope:

```js
{
  namespace: 'startng:neon-drift',
  type: 'USER_CONTEXT',
  requestId: 'unique-request-id',
  payload: {
    user: { id: '...', username: '...' },
    styling: { primaryColor: '#...', accentColor: '#...', finishType: 'matte', accessory: 'none' },
    centralStyle: {
      primary: '#...',
      accent: '#...',
      surface: '#...',
      themeMode: 'dark'
    }
  }
}
```

Implementation rules:

- Validate `event.origin` against the configured allowlist before accepting a host message.
- Validate the message namespace, type, request identifier, and payload schema.
- Do not use `'*'` as a production `targetOrigin`.
- Do not accept a message that purports to change the authenticated user from an untrusted origin.
- Keep messages minimal; never send session secrets into the game frame.
- Remove message listeners in `dispose()`.
- Handle late, duplicate, stale, and malformed messages without creating duplicate runs or style handlers.

### 7.4 Reading root CSS custom properties

Read canonical central styling values from the document root:

```js
function readCentralStyleTokens() {
  const styles = getComputedStyle(document.documentElement);
  return {
    primary: styles.getPropertyValue('--startng-primary').trim(),
    accent: styles.getPropertyValue('--startng-accent').trim(),
    surface: styles.getPropertyValue('--startng-surface').trim(),
    themeMode: styles.getPropertyValue('--startng-theme-mode').trim().toLowerCase(),
  };
}
```

Validate color strings and accept theme mode only if it resolves to `dark` or `light`. Empty/invalid values are absent overrides.

If the game runs in a cross-origin iframe, it cannot directly inspect the parent document's DOM or computed styles. In that case central tokens must be sent through an approved, origin-validated host messaging mechanism. Never attempt to bypass same-origin restrictions.

### 7.5 MutationObserver and dynamic theme events

A root `MutationObserver` should observe `document.documentElement` for relevant attribute changes such as `style`, `class`, and the platform's documented theme attribute. It should debounce/coalesce repeated notifications into one token read per microtask/frame and notify subscribers only when normalized token values actually change.

Important browser limitation: a `MutationObserver` on the document root does **not** reliably detect every change made directly to a stylesheet rule, including all CSSOM changes or updates to an external stylesheet. Therefore also support, when documented, an explicit platform theme-change event or validated host `postMessage` update. Do not implement a permanent high-frequency polling loop to compensate for missing host integration.

The bridge must also listen for `window` `message` events only when needed for the configured embedding contract. It must validate origins/payloads and remove all listeners on cleanup.

### 7.6 Theme/style event payload and propagation

The bridge emits a normalized event such as:

```js
{
  centralTokens: {
    primary: '#7c3aed',
    accent: '#22d3ee',
    surface: '#101522',
    themeMode: 'dark'
  },
  profileStyle: {
    primaryColor: '#7c3aed',
    accentColor: '#22d3ee',
    finishType: 'metallic',
    accessory: 'halo'
  }
}
```

These sample values illustrate app-side shape only. The bridge should provide the latest values and a `subscribeCentralStyleChanges(callback)` unsubscribe function.

On a change, `main.js` asks the style resolver to merge profile data, current root tokens, and authorized development overrides. It then calls:

- `playerCharacter.applyCentralStyling(resolvedStyle)`
- `gameScene.updateTheme({ themeMode: resolvedStyle.themeMode, surfaceColor: resolvedStyle.surfaceColor, accentColor: resolvedStyle.accentColor })`
- `ui.applyTheme(resolvedStyle)`

Call these methods only when the resolved values changed. A style update must not reset the player's lane, jump, score, difficulty, active objects, or camera.

### 7.7 High-score retrieval and score submission

The bridge handles profile/high-score requests and score writes through the verified platform integration. The client can generate a unique `runId`, but the platform's persistence service must associate the submission with the authenticated session rather than trusting only a user ID in the payload.

The submission object should include the run ID, score, duration, distance, collectibles, and game version. The bridge reports a structured success/failure result to `main.js`/`ui.js`. The interface must not display “saved” until the platform confirms persistence. On network failure, retain the end-of-run summary and offer a controlled retry without accidentally submitting the same run twice.

For mock mode only, use local storage to persist the mock score behind the same adapter interface. Do not use browser storage as production score authority.

---

## 8. Data Flow and Event Lifecycle

### 8.1 Startup lifecycle

1. `index.html` parses the document and mounts `#game-app`, `#game-canvas`, UI overlays, and the simulator shell.
2. Vite loads `src/main.js` as an ES module.
3. `main.js` creates `ui.js` bindings and selects the platform adapter according to verified configuration.
4. `scene.js` creates the renderer, scene, camera, stable light objects, fog, grid/road groups, and resize handler.
5. `character.js` constructs the named procedural character hierarchy once and adds its root group to the scene.
6. `world.js` initializes pooled obstacles/collectibles and gameplay managers.
7. `startngBridge.js` begins the verified identity handshake. The application remains in `AUTHENTICATING` / `LOADING_PROFILE` until a real result or an explicit error is known.
8. Once a user is confirmed, the bridge retrieves mapped profile data and the high score through the supported integration.
9. The bridge reads canonical CSS central tokens and begins subscribing to supported changes.
10. `main.js` resolves defaults + profile JSON + valid root tokens + local simulator overrides (if enabled).
11. `character.applyCentralStyling(resolvedStyle)` applies colors, finish values, and accessory visibility to existing nodes/materials.
12. `scene.updateTheme(...)` applies theme, surface, accent rim light, fog, grid and scene background values in place.
13. `ui.js` displays profile identity, personal best, current theme and the `READY` screen.
14. `main.js` starts the single master animation loop.

If auth is explicitly missing, production displays the sign-in path and does not create a fake identity. If auth status cannot be established, show a recoverable integration error. Only eligible localhost development mode may use the mock user.

### 8.2 Active run lifecycle

1. User activates `PLAY`.
2. `main.js` transitions `READY -> PLAYING` and resets run state, score counters, character transform/velocity, active pooled objects, and difficulty.
3. Input handlers request player actions; they do not mutate scene internals directly.
4. Each master-loop iteration calculates a clamped frame delta, updates player motion, world movement/spawns, collisions, difficulty and score state, then updates the camera and renders.
5. `world.js` emits a collectible event at most once for a collected object; `main.js` updates score/collectible UI only when values change.
6. `world.js` emits one fatal collision event; `main.js` transitions to `GAME_OVER`, halts gameplay simulation/spawning, computes the run result and creates a unique `runId`.
7. `startngBridge.js` submits the score through the verified platform adapter.
8. `ui.js` reports saving/saved/failed status, and the displayed personal best updates only after an authoritative success response (or a clearly labelled provisional result while pending).

### 8.3 Central styling change lifecycle

1. start.ng changes one or more root central style custom properties, emits an agreed theme-change event, or sends an approved message to an embedded game.
2. `startngBridge.js` receives the supported signal. A root `MutationObserver` is a best-effort mechanism for relevant root attribute changes, not a universal CSS stylesheet-change detector.
3. The bridge reads computed `--startng-primary`, `--startng-accent`, `--startng-surface`, and `--startng-theme-mode` values, validates them, and compares them with the previous normalized token snapshot.
4. If no effective values changed, the bridge emits nothing.
5. If values changed, the bridge notifies `main.js`/the style resolver once, coalescing multiple mutations.
6. `StyleResolver` resolves the complete current style using the documented precedence and keeps field-level provenance for simulator diagnostics.
7. `playerCharacter.applyCentralStyling(resolvedStyle)` patches existing `MeshStandardMaterial` values (`color`, `emissive`, `emissiveIntensity`, `metalness`, `roughness`) and toggles existing accessory nodes' `visible` flags.
8. `gameScene.updateTheme(resolvedTheme)` updates existing `scene.background`, fog values, grid/floor materials, hemisphere colors/intensity and rim light color/intensity.
9. `ui.applyTheme(resolvedStyle)` updates `#game-app` variables and `data-theme` for theme-aware UI.
10. The current state, score, active objects, lane index, jump velocity, renderer, geometries, and camera smoothing state remain unchanged.

The target for an effective style change is a visible update within 100 ms under normal runtime conditions. No full scene reconstruction is permitted.

### 8.4 Profile update or account switch lifecycle

1. The verified platform integration signals that the active user changed.
2. `main.js` immediately pauses gameplay and prevents any pending score submission from being assigned to the new user by accident.
3. The bridge loads the new user/profile/high score using the verified platform contract.
4. The style resolver computes the new resolved style.
5. Character, scene, and UI are updated in place.
6. The application returns to `READY` by default; do not continue a live run across accounts unless a product owner explicitly specifies a safe policy.
7. All future score writes use the new authenticated session and are verified by the persistence service.

### 8.5 Event cleanup and lifecycle ownership

- `main.js` owns global app start/destroy and master-loop cancellation.
- `scene.js` owns its canvas sizing/visibility/context event handlers.
- `startngBridge.js` owns root observers and platform/window message listeners.
- `ui.js` owns DOM event handlers and simulator handlers.
- `world.js` owns pool state and world-specific event subscriptions.
- `character.js` owns only character resources and animation state.

Every `subscribe...()` method returns an unsubscribe function. Store those functions and call them in `destroy()`. Reinitializing the app must not create duplicate subscriptions.

---

## 9. Master Loop, State Machine, and Input Routing

### 9.1 Game-state machine

Required states:

- `BOOT`
- `AUTHENTICATING`
- `LOADING_PROFILE`
- `APPLYING_STYLE`
- `READY`
- `PLAYING`
- `PAUSED`
- `GAME_OVER`
- `SUBMITTING_SCORE` (may be represented as a `GAME_OVER` substate)
- `SCORE_SAVED`
- `ERROR`

Implement a central `transitionTo(nextState, metadata)` function and an explicit allowed-transition table. State transitions should enable/disable input and simulation deterministically. Avoid scattered booleans like `isPlaying`, `isPaused`, and `isGameOver` that can contradict one another.

### 9.2 Master loop

One `requestAnimationFrame` loop coordinates gameplay and rendering. Use a clamped delta and, if necessary, an accumulator for stable simulation steps.

```js
const MAX_FRAME_DELTA = 0.05; // 50 ms
let rafId = 0;
let previousTime = 0;

function frame(nowMs) {
  rafId = requestAnimationFrame(frame);
  const rawDelta = previousTime === 0 ? 0 : (nowMs - previousTime) / 1000;
  const deltaTime = Math.min(Math.max(rawDelta, 0), MAX_FRAME_DELTA);
  previousTime = nowMs;

  if (state === 'PLAYING') {
    character.update(deltaTime, state);
    world.update(deltaTime, getRunContext());
    updateScoreAndDifficulty(deltaTime);
  } else {
    character.update(deltaTime, state); // idle-only animation; no gameplay advancement
  }

  scene.updateCamera(deltaTime, character.getCameraFollowState());
  scene.render();
}
```

The snippet illustrates ordering. The implementation must not call `requestAnimationFrame` a second time from a scene, character, or UI component. Pausing stops simulation advancement but can keep rendering alive for a pause overlay or reduced idle animation. On `destroy()`, cancel the stored RAF ID and reset loop timestamps.

When `document.visibilityState === 'hidden'`, transition from `PLAYING` to `PAUSED` and require explicit resume. Do not catch up missed gameplay time when the tab becomes visible again.

### 9.3 Input routing

Keyboard/touch input should call high-level methods such as `character.setLane(...)`, `character.jump()`, or `main` actions like `pause()` and `resume()`. It must not directly mutate Three.js mesh coordinates from UI listeners.

- A/Left Arrow: target lane -1.
- D/Right Arrow: target lane +1.
- Space/Up Arrow: jump.
- Escape or pause button: pause/resume according to current state.
- Mobile swipe left/right/up: corresponding lane/jump action.

Prevent browser scrolling for movement keys only during `PLAYING` and only when the game has focus. Do not steal keyboard input from simulator form controls or ordinary page navigation. Filter pointer gestures that start on interactive HUD elements. Remove all key/touch listeners when the app is destroyed.

---

## 10. Performance and WebGL Guardrails

### 10.1 Object pooling

Use pools for frequently created/destroyed gameplay objects:

- Obstacle meshes, grouped by type.
- Collectible meshes.
- Simple impact/collection particles.
- Repeated road/environment sections where useful.

A pooled object transitions between inactive and active states. Reset position, rotation, visibility, collision state, and any per-run data before reusing it. It must not create a fresh geometry or material each time it respawns.

Set explicit upper bounds for active obstacles, collectibles, and particles. If a pool is exhausted, use a controlled spawn policy (skip or reuse an eligible inactive object); do not grow the pool indefinitely. Never pool a resource whose ownership/lifetime is ambiguous.

### 10.2 Geometry and material reuse

- Create character geometry only during `PlayerCharacter` initialization.
- Create the renderer once.
- Create stable lights once.
- Reuse road/grid geometries and materials across repeated segments.
- Reuse obstacle geometry/material templates by obstacle type.
- Reuse collectible geometry/material templates.
- Keep character materials independent from unrelated environment materials if their colors need to change separately.
- Do not construct `THREE.Color`, materials, geometries, arrays, or closures in a hot per-frame loop unless profiling shows the allocation is necessary.
- Cache resolved styles; do not re-apply the same style each frame.

### 10.3 Frame pacing and simulation

- Use one `requestAnimationFrame` loop.
- Convert milliseconds to seconds explicitly.
- Clamp delta to `0.05` seconds (50 ms) for ordinary simulation; if using a fixed-step accumulator, bound the number of catch-up steps.
- Use delta-time-based movement and camera interpolation.
- Do not use `setInterval` for game simulation.
- Do not advance collision/spawn state on a hidden tab.
- Ensure collision checks operate on the same state used for object updates and do not depend on a particular frame rate.
- Measure performance in representative browsers/devices; 60 FPS is the target on supported hardware, not a universal promise.

### 10.4 Renderer and pixel ratio

Initialize `WebGLRenderer` with a performance-conscious configuration. Cap `renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, configuredPixelRatioCap))`; start at a cap of `2` for high-quality mode, and allow `1.5` or `1` for lower-quality mobile settings. Do not blindly use full device pixel ratio on very dense screens.

Avoid expensive bloom/SSAO or large post-processing stacks for the MVP. Prefer emissive materials and restrained lighting. Keep shadow maps around `1024 × 1024` by default and disable real-time shadows in low-quality mode where necessary.

### 10.5 Responsive resize

- Use `ResizeObserver` on the game container where supported.
- Also handle window resize/orientation where useful.
- Debounce/coalesce resize bursts with `requestAnimationFrame` if necessary.
- Update renderer dimensions and camera aspect/projection matrix.
- Do not recreate the scene, renderer, character, world, or object pools.
- Remove resize observer/listeners during teardown.

### 10.6 Resource disposal

Provide explicit ownership and disposal rules:

- `GameScene.dispose()` removes scene-specific handlers, disposes renderer resources it owns, calls `renderer.dispose()`, and handles context listeners.
- `PlayerCharacter.dispose()` disposes only its unique geometry/material resources. If any resource is deliberately shared, document ownership and dispose it once in the owner.
- `World.dispose()` deactivates pooled objects and disposes pool-owned unique resources once.
- `StartNgBridge.dispose()` disconnects `MutationObserver` and removes event/message listeners.
- `UI.dispose()` removes DOM event listeners and simulator subscriptions.
- `main.js` cancels the RAF loop and invokes each subsystem's `dispose()` exactly once.

Do not dispose shared geometries/materials from every mesh that references them. Track owned resources or maintain a resource registry to prevent duplicate disposal and leaks.

### 10.7 WebGL context loss

Listen for `webglcontextlost` on the renderer canvas. Prevent default only where the app intends to attempt restoration, pause gameplay immediately, and communicate that rendering was interrupted. Listen for `webglcontextrestored` and recreate only GPU resources that truly need restoration, following Three.js-supported behavior. If recovery fails, move to a clear `ERROR` state with a restart/reload instruction. Do not continue simulation invisibly while no frame is being rendered.

### 10.8 Performance validation

- Measure frame time and FPS in representative desktop and modern mobile browsers.
- Test at least one long run to check for unbounded pool growth and memory leaks.
- Repeatedly restart runs and verify that object count, event listeners, and RAF count do not increase.
- Change central styling repeatedly and verify that geometry/material counts remain stable.
- Verify that simulator interactions remain responsive during gameplay.
- Do not treat a local development machine result as proof of all-device 60 FPS performance.

---

## 11. UI and Central Style Simulator Integration

### 11.1 UI responsibilities

`ui.js` must expose high-level methods similar to:

```js
const ui = {
  showState(state, data) {},
  setUser(user) {},
  setScore(score) {},
  setCollectibleCount(count) {},
  setHighScore(record) {},
  setScoreSubmissionStatus(status, details) {},
  applyTheme(resolvedStyle) {},
  setSimulatorVisible(visible) {},
  setSimulatorModel(model, callbacks) {},
  dispose() {},
};
```

Prefer explicit functions over having `main.js` reach into arbitrary DOM nodes. Cache relevant DOM elements once during UI initialization.

### 11.2 Central Style Simulator behavior

The simulator is development-only and must be compiled out or disabled by an explicit build/runtime check in production. Hiding the panel via CSS alone is not sufficient. A query string alone must not enable it in production.

Controls:

- Root token inputs: `--startng-primary`, `--startng-accent`, `--startng-surface`, `--startng-theme-mode`.
- Profile style inputs: `primaryColor`, `accentColor`, `finishType`, `accessory`.
- Actions: Apply Changes, Reset Overrides, Reset Everything, Copy Styling JSON.
- Diagnostics: mode, username/user ID (nonsecret), resolved values, winning source per field, style validation status.

Simulator inputs should write to an internal development override object, not silently change the platform's actual `document.documentElement` styles and not mutate the real user's profile JSON. Feed the overrides through the same `StyleResolver` used by real root/profile inputs. For UI parity, an optional “simulate root tokens” mode may use a simulator-owned token object; avoid setting actual root inline styles in a way that triggers recursive observer loops.

`Reset Overrides` removes simulator state and reveals the current real central/profile values. `Reset Everything` returns simulator controls to known local defaults. JSON editor errors must preserve the last valid style and keep gameplay running.

### 11.3 DOM and frame performance

Do not update textual DOM values on every rendered frame unless the value changed. Score text changes only when the displayed integer changes. Keep user/avatar rendering separate from the render loop. Use `requestAnimationFrame` only for coordinated visual simulation, not for repeated style token polling or rebuilding HUD markup.

---

## 12. Error Handling and Security Boundaries

### 12.1 Authentication and profile errors

- Distinguish signed-out from integration-unavailable states.
- Do not create a mock user when production authentication fails.
- Allow a controlled retry for recoverable service errors.
- If optional avatar/badge fields fail, use a safe fallback without blocking the game.
- If profile styling fails, apply valid central/default styling and report the nonfatal issue in development diagnostics.

### 12.2 Styling validation

- Validate all CSS color inputs before applying them to Three.js or CSS.
- `themeMode` accepts only `dark` or `light`.
- `finishType` accepts only `matte`, `metallic`, `neon`.
- `accessory` accepts only `none`, `halo`, `wings`, `visor-crown`.
- Reject malformed JSON and ignore unknown properties.
- Apply safe defaults per property when missing/invalid.
- Never execute or interpolate profile data as JavaScript or arbitrary HTML.

### 12.3 Platform message and score trust

- Validate origins and message schemas.
- Do not accept authentication claims from arbitrary `postMessage` senders.
- Do not trust client-provided user IDs as identity proof for score submissions.
- Do not keep session secrets in localStorage or simulator diagnostics.
- Score storage must validate session, ranges, duplicate run IDs, and other appropriate sanity rules server-side/platform-side.
- Report the score as saved only after a successful authoritative response.

### 12.4 Console and failure policy

Unexpected errors should be visible during development and handled with a user-facing state where appropriate. Avoid repeated warning/error spam from expected transient failures. The normal validated workflow must have no uncaught runtime errors or unhandled promise rejections. Do not silently swallow errors that leave the game permanently stuck.

---

## 13. Testing Strategy and Acceptance Gates

### 13.1 Unit tests

Test pure logic and stable contracts:

- Style resolver precedence (defaults → profile → central CSS → simulator).
- Color/theme/finish/accessory validators.
- Material preset mapping values.
- Accessory visibility table.
- Lane clamp and target positions.
- Jump/landing simulation.
- Score calculations and duplicate collectible protection.
- State transition validation.
- Mock high-score persistence.
- Message origin/schema validation.

### 13.2 Integration tests

- Local mock startup and deterministic user display.
- Initial profile loading and style application.
- Root token update propagation into `applyCentralStyling()` and `scene.updateTheme()`.
- Profile style update propagation.
- Simulator override and reset.
- Identity switch pauses/resets safely.
- Score submission success, failure, and retry handling.
- Repeated start/destroy does not duplicate listeners or animation loops.
- Resize updates canvas and camera without recreating renderer.

### 13.3 Browser/gameplay acceptance

- A/D and arrow keys move between lanes; Space/up arrow jumps.
- Mobile swipes move/jump reliably and do not hijack HUD interactions.
- Obstacles collide correctly; collected items award points exactly once.
- Pause stops simulation advancement; resume preserves the run.
- Theme updates do not reset gameplay.
- Dark/light themes both maintain obstacle/collectible contrast.
- User profile styling updates the intended character parts.
- `applyCentralStyling()` does not increase geometry count after repeated application.
- Ready, playing, paused, game-over, loading, and error states work without page reloads.

### 13.4 Release gate

Do not label the build production-integrated until it has been tested in the actual start.ng hosting/embedding context with a real authenticated user. Mock tests are necessary but not proof of production authentication, central styling delivery, or persistent high scores.

---

## 14. Implementation Order for the Coding Agent

Implement in small, verifiable increments:

1. Inspect existing repository and identify established conventions.
2. Set up Vite, `index.html`, `style.css`, and `main.js`.
3. Build the renderer/scene/camera/light/fog/resize system in `scene.js`.
4. Build the named procedural character and in-place style mapping in `character.js`.
5. Build world movement, pools, obstacles, collectibles, collisions, and score data in `world.js`.
6. Build the style resolver and mock platform path inside `startngBridge.js` (or a small pure helper inside existing modules, avoiding unnecessary files).
7. Build the UI state screens and simulator in `ui.js`.
8. Wire startup/auth/style/state/master-loop lifecycle in `main.js`.
9. Verify styling changes during active gameplay.
10. Connect the verified production start.ng session/profile/score contracts.
11. Add automated tests for state, styling, bridge, world, and score behavior.
12. Profile frame time and verify cleanup after repeated restarts and theme updates.
13. Build and test the actual deployed/embedded artifact.

At every step, run the app and targeted tests before moving forward. Do not generate the entire codebase in one unverified operation.

---

## 15. Definition of Done

The architecture is correctly implemented when:

- The app runs through Vite as a Vanilla JavaScript ES-module application with Three.js and no heavy UI framework.
- The project matches the prescribed directory structure closely and has documented exceptions for any existing conventions.
- The game uses one stable renderer, scene, camera and master RAF loop.
- The player has the required named procedural nodes and supported accessory variants.
- Root central tokens and profile JSON flow through a single resolver into `PlayerCharacter.applyCentralStyling()`.
- Central styling changes invoke `scene.updateTheme()` and update materials in place, without recreating geometries, materials, renderer, scene, or pools.
- `startngBridge.js` uses verified start.ng integration mechanisms and secure origin/session rules.
- The mock-user fallback is restricted to explicitly enabled local development.
- User identity and score persistence are tied to the actual platform session in production.
- The HUD, state overlays, and Central Style Simulator function and are responsive.
- Object pooling, delta-time clamping, cleanup, and WebGL failure handling are implemented.
- Unit/integration/browser tests cover the important behavior.
- The production build succeeds, normal workflows have no unexpected console errors, and performance has been evaluated on representative devices.
- Any missing start.ng integration contract is documented honestly rather than simulated as a completed production feature.
