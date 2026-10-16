# DESIGN.md — Neon Drift

> **Product:** Neon Drift  
> **Document:** Visual Design and Rendering Specification  
> **Version:** 1.0.0  
> **Status:** Implementation specification  
> **Related document:** `PRD.md`

## 1. Purpose and Design Principles

This document defines the visual system for Neon Drift: its visual direction, adaptive themes, central styling contract, procedural character anatomy, Three.js materials, scene lighting, camera behavior, HUD, and development styling tools.

The design must be implemented with procedural Three.js geometry, standard materials, CSS, and platform-provided user/style data. External 3D asset packs are not required.

### 1.1 Design principles

1. **Minimal, not empty.** Use a small number of clear geometric forms, deliberate negative space, and a strong silhouette for the player and each gameplay object.
2. **Platform styling is visible.** The central start.ng style tokens must produce an observable, consistent change in the character and supporting environment.
3. **Adaptive by design.** Both dark and light themes must feel intentional; light mode is not simply a white page behind dark-mode graphics.
4. **Gameplay readability beats decoration.** Obstacles must remain distinguishable from collectibles, the player, and the track at all supported speeds.
5. **One shared styling pipeline.** Platform CSS, user profile styling JSON, and simulator changes must resolve through the same validator and style resolver.
6. **No expensive visual dependencies.** Favor geometry, material response, fog, and studio lighting over asset downloads, complex shaders, or heavy post-processing.
7. **Responsive and predictable.** The visual system must adapt to viewport size and device performance without changing gameplay semantics.

---

## 2. Visual Direction and Atmosphere

### 2.1 Overall direction

Neon Drift uses a minimalist, modern cyber-runner aesthetic with the precision of a product interface and the depth of a small stylized 3D studio scene. The world is futuristic, but not cluttered or photorealistic.

Use:

- Clean silhouettes and beveled-looking geometric forms built from standard geometry.
- A restrained palette derived from start.ng's primary, accent, surface, and theme tokens.
- Broad studio highlights on the character's armor.
- Thin luminous lines on the track and selected character details.
- Subtle depth fog to soften the far environment and reinforce forward motion.
- Limited particle effects used for collection, impact, and the character trail.
- Controlled highlights instead of large bloom halos that obscure gameplay.

Avoid noisy textures, excessive surface detail, large amounts of floating decoration, fast camera shake, and indiscriminate emissive lighting.

### 2.2 Theme modes

The active theme is controlled centrally by `--startng-theme-mode`, with valid values `dark` and `light`. The game must also have safe default values when the token is absent or invalid.

#### Dark mode

- Background: deep navy or near-black, not absolute black everywhere.
- Track: charcoal with visible but restrained grid lines.
- Character: clearly separated from the background through key and rim lighting.
- Surfaces: translucent dark glass for interface cards.
- Grid: low-contrast lines; accent-colored markers may become brighter near the player.
- Fog: blends the distant track into the dark background.
- Emissive materials: used selectively for the visor, trim, trail, and collectibles.

Suggested fallback palette:

| Role | Fallback value | Usage |
|---|---|---|
| Primary | `#7C3AED` | Character base and primary UI emphasis |
| Accent | `#22D3EE` | Visor, highlights, trail, selected grid details |
| Surface | `#111827` | Secondary armor, panels, track-adjacent surfaces |
| Background | `#080C18` | Scene background and fog color |
| Text | `#F3F6FF` | Main interface text |
| Muted text | `#A7B0C4` | Supporting interface text |
| Obstacle warning | `#FF6B6B` | Hazard readability independent of player styling |

#### Light mode

- Background: cool near-white or very pale blue-gray.
- Track: medium-light neutral with clearly visible lane boundaries.
- Character: retains the selected colors, but uses darker structural contrast and stronger contact shadows where available.
- Surfaces: translucent white glass with a subtle border.
- Grid: neutral gray lines with a restrained accent marker.
- Fog: blends the far track into the light scene background.
- Emissive materials: remain identifiable but are moderated so they do not wash out the character.

Suggested fallback palette:

| Role | Fallback value | Usage |
|---|---|---|
| Primary | `#7C3AED` | Character base and primary UI emphasis |
| Accent | `#0891B2` | Visor, highlights, trail, selected grid details |
| Surface | `#E7EBF3` | Secondary armor and light surfaces |
| Background | `#F4F6FB` | Scene background and fog color |
| Text | `#172033` | Main interface text |
| Muted text | `#596579` | Supporting interface text |
| Obstacle warning | `#C2414B` | Hazard readability independent of player styling |

These fallback palettes are design defaults only. Valid central token values take precedence according to Section 3.

### 2.3 Geometry and visual language

Use geometry primitives with consistent proportions and subtle edge treatments:

- Player armor: low-complexity boxes, capsules, spheres, cylinders, and custom beveled-looking buffer geometry where beneficial.
- Obstacles: recognizable blocks, barriers, and gates with distinct silhouettes.
- Collectibles: octahedrons, spheres, or ring-like forms with a small rotating animation.
- Track: one or more reusable road sections with lane dividers and grid lines.
- Environment: repeating pillars or abstract panels kept outside the critical running corridor.

Avoid relying on color alone to communicate an object's function. Obstacles use solid, angular silhouettes and hazard markings. Collectibles use floating, rotational, faceted or ring-like silhouettes with a clear inner or outer highlight.

### 2.4 Depth fog and world scale

Use subtle scene fog rather than dense fog. The purpose is to create depth and fade repetitive objects into the distance without hiding hazards.

Recommended initial configuration:

- `THREE.Fog` or `THREE.FogExp2` may be used; prefer `THREE.Fog` when predictable start/end distances are useful.
- Fog color must match the current theme's scene background.
- Initial linear fog range: near `28` world units, far `95` world units.
- Adjust these distances after the final lane spacing, player scale, camera angle, and spawn distance are established.
- Never fog out an obstacle before the player has a fair reaction window.

Fog parameters must be updated when the theme changes. Do not recreate the renderer or scene just to change fog color.

### 2.5 Motion and animation language

Animation should feel fast and controlled, with little ornamental movement.

- Ready state: slow body bob, small torso/head rotation, and restrained emissive pulsing.
- Lane movement: smooth horizontal easing toward the target lane; movement remains responsive and must not obscure collision bounds.
- Jump: clear takeoff, readable airborne pose, and visible landing response.
- Collectible: steady rotation with a small vertical bob.
- Collection: a short, lightweight burst or ring flash using pooled objects.
- Collision: a quick impact cue and a short, restrained character reaction; never obscure the game-over UI.
- Trail: a short, low-particle accent ribbon or a few pooled emissive segments, not a dense smoke plume.

Honor `prefers-reduced-motion` for nonessential interface animation and decorative effects. Core game movement still follows gameplay rules.

---

## 3. Central Styling Token System

### 3.1 Canonical central tokens

The following four CSS custom properties are the canonical root-level styling contract for this design. Use these names exactly; do not substitute older, game-specific token names for these properties.

```css
:root {
  --startng-primary: #7C3AED;
  --startng-accent: #22D3EE;
  --startng-surface: #111827;
  --startng-theme-mode: dark;
}
```

The values above are illustrative defaults. In production, the platform supplies the effective values. The application may supply equivalent defaults locally when a token is missing.

| CSS custom property | Valid format | Primary responsibilities | Affects character? |
|---|---|---|---|
| `--startng-primary` | Valid CSS color; hex is recommended | Primary armor, body/head base color, primary interface emphasis | Yes |
| `--startng-accent` | Valid CSS color; hex is recommended | Visor, accent details, emissive highlights, trail, accent grid markings, rim-light color | Yes |
| `--startng-surface` | Valid CSS color; hex is recommended | Secondary armor, joint covers, track and UI surfaces | Yes, for secondary structural surfaces |
| `--startng-theme-mode` | `dark` or `light` | Scene background, fog, floor/grid contrast, UI foregrounds and glass surfaces | Indirectly; adjusts material response and contrast to preserve legibility |

CSS custom properties are read from the platform document root where the page is same-origin and access is permitted. If the game is hosted in a cross-origin iframe, it must receive centrally managed values through an approved start.ng host-to-game messaging contract. Do not attempt to bypass same-origin restrictions.

### 3.2 User profile styling JSON

The platform's user profile styling data must normalize to this schema:

```json
{
  "version": 1,
  "primaryColor": "#7C3AED",
  "accentColor": "#22D3EE",
  "finishType": "metallic",
  "accessory": "halo"
}
```

The object may be nested under the platform's profile field; the platform adapter is responsible for mapping the real platform response to these normalized attributes.

| Attribute | Type | Allowed values | Purpose |
|---|---|---|---|
| `primaryColor` | CSS color string | Any supported and validated CSS color | User-preferred base color for body and head armor when not overridden centrally |
| `accentColor` | CSS color string | Any supported and validated CSS color | User-preferred accent for visor, highlights, and trail when not overridden centrally |
| `finishType` | String enum | `matte`, `metallic`, `neon` | Controls PBR material properties and emissive intensity |
| `accessory` | String enum | `none`, `halo`, `wings`, `visor-crown` | Controls optional procedural accessory visibility |

Unknown properties must be ignored. Unknown enum values must fall back to safe defaults. Malformed JSON must not interrupt gameplay.

### 3.3 Resolution precedence

Resolve the effective design inputs in this order, from lowest to highest priority:

1. Built-in design defaults.
2. Valid user profile styling JSON.
3. Valid central CSS tokens.
4. Development-only Style Simulator overrides, when enabled.

Central tokens `--startng-primary` and `--startng-accent` override the corresponding profile `primaryColor` and `accentColor` values. `--startng-surface` controls structural/environmental surfaces. `--startng-theme-mode` controls theme behavior. `finishType` and `accessory` remain profile-defined in production unless the platform adds documented tokens for these attributes; the simulator may override them locally during development.

Missing or invalid higher-priority values do not erase valid lower-priority values. Each property is resolved independently, so an invalid accent value does not invalidate a valid primary color or accessory.

### 3.4 Validation and updates

Implement a single styling pipeline:

1. Read platform CSS custom properties and normalized profile JSON.
2. Validate each input and normalize colors and enums.
3. Resolve precedence independently for each property.
4. Produce one immutable `ResolvedStyle` value.
5. Compare it with the previous resolved value.
6. Update only the affected materials, lights, fog, floor, UI variables, and accessory visibility.

Use a `MutationObserver` to detect changes to relevant root attributes or inline styles where applicable, but do not assume it detects every change to externally loaded stylesheets. Where changes originate outside the observed DOM attributes, use a documented platform theme event or a validated host-to-game message. The Style Simulator must update the same shared style store directly.

For color parsing, validate accepted CSS colors before converting them to `THREE.Color`. For predictable cross-browser support, platform-managed token values should preferably use 3-, 4-, 6-, or 8-digit hex values, though the implementation may support other validated CSS color formats.

On a valid update, material and lighting changes should be visible within 100 ms under normal conditions. Do not recreate the scene, renderer, camera, or gameplay managers for ordinary style updates. Avoid allocating new materials on every update; update existing material properties and set `needsUpdate` only when a material feature requiring recompilation actually changes.

### 3.5 Normalized style model

The style resolver should output a typed model similar to:

```ts
export type ThemeMode = "dark" | "light";
export type FinishType = "matte" | "metallic" | "neon";
export type AccessoryType = "none" | "halo" | "wings" | "visor-crown";

export interface ResolvedStyle {
  primaryColor: THREE.Color;
  accentColor: THREE.Color;
  surfaceColor: THREE.Color;
  themeMode: ThemeMode;
  finishType: FinishType;
  accessory: AccessoryType;
}
```

Use the project's actual TypeScript conventions if they differ, but retain these semantic values and explicit enum constraints.

---

## 4. 3D Character Anatomy and Material Mapping

### 4.1 Character silhouette

The player is a stylized humanoid runner assembled from simple geometric shapes. It should have a readable head, torso, limbs, and facial visor, with optional accessories clearly separated from the base body.

Use a single root `THREE.Group` named `PlayerCharacter`. All character parts must be parented beneath it so the character can be moved, animated, restyled, and disposed as one logical unit.

The character must face the direction of travel. Define the project's forward direction once and use it consistently for the player, camera, obstacles, and trail. The recommended convention is local negative Z (`-Z`) as forward.

### 4.2 Required hierarchy and node names

Required node names must be stable because the style updater and tests use them to find the correct objects.

```text
PlayerCharacter (THREE.Group)
├── Body (THREE.Mesh)
├── Head (THREE.Mesh)
├── Visor (THREE.Mesh)
├── Limbs (THREE.Group)
│   ├── Arm_Left (THREE.Mesh)
│   ├── Arm_Right (THREE.Mesh)
│   ├── Leg_Left (THREE.Mesh)
│   ├── Leg_Right (THREE.Mesh)
│   ├── Joint_Left (THREE.Mesh)
│   └── Joint_Right (THREE.Mesh)
├── Accessory_Halo (THREE.Group or THREE.Mesh)
├── Accessory_Crown (THREE.Group)
│   ├── Crown_Frame (THREE.Mesh)
│   └── Crown_Visor (THREE.Mesh)
├── Accessory_Wings (THREE.Group)
│   ├── Wing_Left (THREE.Mesh)
│   └── Wing_Right (THREE.Mesh)
└── Trail (THREE.Group)
    └── Trail_Segment_* (pooled meshes or a dynamic buffer)
```

`Limbs`, `Accessory_Crown`, `Accessory_Wings`, and `Trail` are groups because they contain multiple independently shaped primitives. The required named parts `Body`, `Head`, `Visor`, `Accessory_Halo`, `Accessory_Crown`, and `Trail` must exist and be discoverable by exact name. `Accessory_Halo` may be a single torus mesh or a group containing a torus and small accent segments.

The base `Visor` is the character's ordinary face/eye panel and is distinct from `Accessory_Crown`, which is the optional combined visor-crown accessory selected by the `visor-crown` profile value.

### 4.3 Anatomy and geometry guidance

| Node | Suggested geometry | Form and position | Style role |
|---|---|---|---|
| `Body` | `CapsuleGeometry` or beveled custom box | Compact torso, centered above hips | Primary color and finish |
| `Head` | `SphereGeometry` or low-segment rounded box | Slightly oversized geometric head | Primary color and finish |
| `Visor` | Shallow `SphereGeometry`, rounded box, or custom panel | Across the front of the head | Accent color and emissive detail |
| `Limbs` | Capsule/cylinder/box meshes | Paired arms and legs, with visible separation | Primary armor with surface-colored joints |
| `Accessory_Halo` | `TorusGeometry` | Floating ring above/rear of the head | Accent color and optional emissive edge |
| `Accessory_Crown` | Custom low-poly frame plus a visor panel | Compact crown integrated with upper face/head silhouette | Accent/surface contrast; enabled for `visor-crown` |
| `Accessory_Wings` | Thin mirrored polygonal panels | Small rear-facing fins; must not widen the collision body materially | Accent/primary color contrast |
| `Trail` | Pooled narrow meshes or dynamic `BufferGeometry` | Short effect behind the runner | Accent color with finish-dependent emission |

Keep the model lightweight. Do not add detailed fingers, complex skeletal rigs, or numerous independent high-polygon parts for the MVP. A procedural pose system with pivot groups is sufficient for idle, running, jumping, and impact animations.

### 4.4 Material roles

Create reusable material instances for material roles rather than a new material per mesh or frame.

- **Primary armor material:** used by `Body`, `Head`, and the main exterior portions of `Limbs`.
- **Surface armor material:** used by limb joints and selected underside/structural panels.
- **Accent material:** used by `Visor`, accessory highlights, and trim.
- **Trail material:** used by trail segments; typically accent-colored and more emissive.
- **Environment material(s):** floor, lane markers, obstacles, and collectibles are not recolored indiscriminately with the player materials.

Meshes in the same material role may share a material only when their styling should always change together. Do not share a mutable player material with an environment object that must retain an independent color.

### 4.5 Exact CSS token to material mapping

Use the following mapping as the source of truth for how central tokens affect the character. `P` means the resolved primary color, `A` means the resolved accent color, and `S` means the resolved surface color. Values in the finish table in Section 4.6 determine material finish properties.

| Central token / attribute | Target meshes or systems | `MeshStandardMaterial.color` | `emissive` | `emissiveIntensity` | `metalness` / `roughness` | `visible` behavior |
|---|---|---|---|---|---|---|
| `--startng-primary` (overrides profile `primaryColor`) | `Body`, `Head`, `Arm_Left`, `Arm_Right`, `Leg_Left`, `Leg_Right`, primary sections of accessories | Set to `P` exactly | Set to `P` for primary armor; emission level comes from finish profile | Use the **primary armor** value in Section 4.6 | Use the primary armor values in Section 4.6 | No visibility change |
| `--startng-accent` (overrides profile `accentColor`) | `Visor`, accent trim, `Accessory_Halo`, accent details in `Accessory_Crown`, `Accessory_Wings`, and `Trail` | Set to `A` exactly | Set to `A` exactly | Use the **accent/trail** value in Section 4.6; cap runtime value to the documented finish preset | Use the accent/trail values in Section 4.6 | No visibility change by itself |
| `--startng-surface` | Joint covers, structural plates, selected accessory frames, track/floor surfaces, UI surfaces | Set structural character surfaces to `S`; environment surfaces use a theme-adjusted surface derived from `S` | Character structural surfaces use `S` at low intensity; floor/grid may use separate neutral materials | Structural character intensity is `0.02` for matte, `0.06` for metallic, and `0.15` for neon | Structural pieces use the finish values in Section 4.6; floor materials use fixed environment finish values | No visibility change |
| `--startng-theme-mode` | Scene background, fog, floor and grid materials, interface theme variables; contrast adjustment for all character materials | Does not replace `P`, `A`, or `S`; maintain those exact resolved colors | Does not replace emission color; adjust emission intensity for light-theme legibility as defined below | Multiply base finish intensity by `0.85` in light mode; use `1.0` in dark mode | Primary/accent PBR values remain as set by `finishType` | No character mesh visibility change |
| Profile `finishType: matte` | All character material roles | Preserve the resolved `P`, `A`, or `S` color | Primary/surface material uses its associated color at low intensity; accent uses `A` | Primary `0.03`; accent/trail `0.20`; structural surfaces `0.02` | Matte values in Section 4.6 | No visibility change |
| Profile `finishType: metallic` | All character material roles | Preserve the resolved `P`, `A`, or `S` color | Primary/surface material uses its associated color; accent uses `A` | Primary `0.08`; accent/trail `0.35`; structural surfaces `0.06` | Metallic values in Section 4.6 | No visibility change |
| Profile `finishType: neon` | All character material roles | Preserve the resolved `P`, `A`, or `S` color | Primary uses `P`; accent uses `A`; structural surfaces use `S` | Primary `0.65`; accent/trail `1.65`; structural surfaces `0.15` | Neon values in Section 4.6 | No visibility change |
| Profile `accessory: none` | `Accessory_Halo`, `Accessory_Crown`, `Accessory_Wings` | Materials may retain the resolved colors | No special emission change | Unchanged | Unchanged | Set all optional accessory roots to `visible = false` |
| Profile `accessory: halo` | `Accessory_Halo`, `Accessory_Crown`, `Accessory_Wings` | Halo uses `A`; inactive accessory materials are unchanged | Halo uses `A` | Accent/trail value from finish profile | Accent/trail finish values | Halo `true`; Crown `false`; Wings `false` |
| Profile `accessory: wings` | `Accessory_Halo`, `Accessory_Crown`, `Accessory_Wings` | Wings use `A` for outer surfaces and `P` for base/root surfaces | Wing accent surfaces use `A` | Accent/trail value from finish profile | Accent/trail finish values | Halo `false`; Crown `false`; Wings `true` |
| Profile `accessory: visor-crown` | `Accessory_Halo`, `Accessory_Crown`, `Accessory_Wings` | Crown frame uses `S` or `P` according to its submesh role; crown visor uses `A` | Crown visor uses `A` | Accent/trail value from finish profile | Finish values from the material role | Halo `false`; Crown `true`; Wings `false` |

Color conversion must preserve the intended CSS color. Three.js color-management behavior should be configured consistently for the renderer; do not manually apply gamma conversion on top of the renderer's color management.

### 4.6 Exact PBR finish presets

Use these bounded presets for every character finish. Do not permit user-supplied numeric material values because `finishType` is the supported profile control for material finish.

| Finish | Material role | `metalness` | `roughness` | Base `emissiveIntensity` | Visual result |
|---|---|---:|---:|---:|---|
| `matte` | Primary armor | `0.05` | `0.82` | `0.03` | Diffuse, softly lit body with restrained highlights |
| `matte` | Accent / trail | `0.10` | `0.58` | `0.20` | Satin accents; trail remains visible but not overpowering |
| `matte` | Structural surface | `0.05` | `0.82` | `0.02` | Quiet joints and panels |
| `metallic` | Primary armor | `0.78` | `0.28` | `0.08` | Polished futuristic armor with clear studio reflections from lights |
| `metallic` | Accent / trail | `0.65` | `0.24` | `0.35` | Bright metallic visor and trim with controlled glow |
| `metallic` | Structural surface | `0.60` | `0.35` | `0.06` | Darker metallic joints and frames |
| `neon` | Primary armor | `0.22` | `0.32` | `0.65` | Saturated armor with visibly self-lit edges and panels |
| `neon` | Accent / trail | `0.18` | `0.24` | `1.65` | Strong luminous visor, trail, and accent details |
| `neon` | Structural surface | `0.20` | `0.40` | `0.15` | Glowing structural accents without turning all surfaces into light sources |

Assign `material.color`, `material.emissive`, `material.emissiveIntensity`, `material.metalness`, and `material.roughness` explicitly whenever a style is resolved. For primary and accent roles, emissive color equals the corresponding resolved role color. For structural surfaces, emissive color equals `S`.

In light mode, multiply the preset emissive intensity by `0.85`. In dark mode, use the preset intensity unchanged. This modifier is a visual legibility adjustment only; it must not alter the selected `finishType` or base PBR values.

Do not interpret `metalness` as a light source. Metallic materials require useful lighting and environmental contrast; keep the directional and rim lights active in both themes.

### 4.7 Accessory visibility contract

The accessory setting is exclusive: only one optional accessory type can be visible at a time.

```ts
Accessory_Halo.visible = style.accessory === "halo";
Accessory_Wings.visible = style.accessory === "wings";
Accessory_Crown.visible = style.accessory === "visor-crown";
```

When `style.accessory === "none"`, all three roots are hidden. The base `Visor` stays visible for every accessory state. Hide/show accessories by toggling their existing roots; do not rebuild the character on every change. If accessory-specific geometry is lazily created, cache it and dispose of it only when the character itself is disposed.

Accessories must not affect the collision capsule or lane occupancy. Decorative wings and halo geometry may extend beyond the torso silhouette but must not make safe passages appear blocked.

### 4.8 Trail rendering

`Trail` is a reusable group or dynamic buffer that renders a short effect behind the character. Its color uses `A`; its roughness and metalness use the accent/trail finish values. Keep the effect short, bounded, and low-cost. Pool segments or update a dynamic buffer instead of creating and disposing meshes each frame.

The trail should be less prominent while idle and more visible during active running, jumping, and high-speed moments. Hide or reduce it in menus if it competes with character silhouette clarity. Trail visibility is controlled by game state and performance settings, not by accessory selection.

---

## 5. 3D Scene, Lighting, and Camera Specifications

### 5.1 Coordinate conventions and scale

Use one world-coordinate convention throughout the scene:

- X: horizontal movement across three lanes.
- Y: vertical height.
- Z: forward/backward travel.
- Player forward direction: local negative Z (`-Z`).
- Track surface: approximately `Y = 0`.
- Player root: near the center of the track at the starting point.

The exact character height can be tuned during implementation, but keep lane spacing, collision bounds, obstacle size, camera target, and spawn distances consistent with the selected scale.

Recommended lane center coordinates: `-2.2`, `0`, and `2.2` on X. These are gameplay configuration values and must not be duplicated as scattered literals.

### 5.2 Camera specification

Use a single `THREE.PerspectiveCamera` for the MVP.

| Parameter | Exact starting value | Notes |
|---|---:|---|
| Field of view | `52` degrees | Wide enough to anticipate obstacles without excessive edge distortion |
| Aspect ratio | `canvasWidth / canvasHeight` | Recompute on resize |
| Near plane | `0.1` | Avoid clipping the character |
| Far plane | `150` | Covers environment and spawn distance |
| Follow offset X | `0` plus subtle lane-follow contribution | Camera should not swing aggressively across lanes |
| Follow offset Y | `4.3` world units | Elevated chase angle |
| Follow offset Z | `8.2` world units behind the player | Assumes the player faces local `-Z` |
| Look target Y | Player root Y plus `1.1` | Keeps attention near the torso/head |
| Look target Z | Player Z minus `5.0` | Directs view toward upcoming track |
| Follow interpolation constant | `6.0` | Used in exponential delta-time-aware interpolation |

Compute the smoothing factor as:

```ts
const alpha = 1 - Math.exp(-6.0 * deltaTime);
camera.position.lerp(desiredCameraPosition, alpha);
currentLookTarget.lerp(desiredLookTarget, alpha);
camera.lookAt(currentLookTarget);
```

The desired camera position should follow the player's vertical position enough to keep the character framed during a jump, while avoiding large vertical camera bob. Apply a mild horizontal follow contribution of `playerLaneX * 0.22` to the desired camera X position so that lane changes remain visible without causing a distracting camera sweep.

Use the configured delta time in the follow calculation. Do not use a fixed per-frame interpolation coefficient because that produces different smoothing at different frame rates.

### 5.3 Lighting setup

Use stylized studio lighting with a small number of lights. Lighting must show the character's geometry and selected material finish in both themes.

#### Ambient / hemisphere light

- Type: `THREE.HemisphereLight`.
- Dark mode sky color: cool blue-gray, such as `#A8B9FF`.
- Dark mode ground color: deep blue-gray, such as `#141827`.
- Dark mode intensity: `1.1`.
- Light mode sky color: near-white, such as `#F8FAFF`.
- Light mode ground color: cool gray, such as `#AEB8CA`.
- Light mode intensity: `0.85`.
- Purpose: broad base illumination and fill without flattening forms.

#### Directional key light

- Type: `THREE.DirectionalLight`.
- Position: `(-4, 8, 6)` relative to the scene origin or an equivalent stable world-space position.
- Color: neutral, slightly cool white.
- Dark mode intensity: `2.0`.
- Light mode intensity: `1.25`.
- Cast shadows: enabled where supported and within the performance budget.
- Shadow map starting size: `1024 × 1024`; use `2048 × 2048` only when profiling shows the target devices can sustain it.
- Shadow camera bounds: tight around the playable area; avoid an unnecessarily large shadow frustum.
- Shadow filtering: use a soft supported shadow-map mode such as `THREE.PCFSoftShadowMap`.
- Purpose: define the character volume and produce a soft ground contact shadow.

If real-time shadows are too expensive on mobile hardware, disable dynamic shadow rendering on lower-quality settings and use a simple procedural contact shadow. Do not disable the key light itself.

#### Accent rim light

- Type: `THREE.DirectionalLight` or a similarly low-cost directional rim light.
- Position: `(4, 3, -6)` relative to the player/world.
- Color: resolved `--startng-accent` / effective accent color.
- Dark mode intensity: `1.6`.
- Light mode intensity: `0.8`.
- Cast shadows: disabled.
- Update: change the light's color when the central accent token or resolved profile accent changes.
- Purpose: separate the player silhouette from the environment and make central accent styling visible on armor edges.

The rim light must be updated in place; do not destroy and recreate it on style changes. Clamp or normalize the resulting light intensity if future token-driven controls are introduced.

### 5.4 Renderer and color management

- Use one `THREE.WebGLRenderer` instance for the active game view.
- Set the pixel ratio to `Math.min(window.devicePixelRatio || 1, 2)` unless device profiling requires a lower cap.
- Enable antialiasing when its performance cost is acceptable.
- Configure output color space and tone mapping explicitly and consistently with the installed Three.js version.
- Do not apply custom gamma conversion to CSS colors after Three.js has performed its normal color management.
- Keep shadows, particles, lights, and active object counts bounded.
- Reuse geometry and materials wherever possible.
- Do not create a renderer per game state or on theme changes.

### 5.5 Environment and grid floor

The environment should suggest speed and depth without requiring a large world model.

#### Floor

- Use a large `THREE.PlaneGeometry` or reusable road segments.
- Orient the floor horizontally and place it slightly below the player's ground-contact point.
- Use the current theme to determine base floor and grid contrast.
- Keep lane markings visually stronger than far-field grid lines.
- Recycle road segments behind the player to create an endless track illusion.

#### Grid behavior

| Element | Dark mode | Light mode |
|---|---|---|
| Floor base | Deep charcoal/navy | Cool light gray |
| Fine grid | Very low-contrast blue-gray | Low-contrast neutral gray |
| Lane markers | Accent with restrained glow | Darker accent or accent with reduced emission |
| Near-player highlights | Accent, clearly visible | Accent, darkened if needed for contrast |
| Far grid | Fades into dark fog | Fades into light fog |

Build grid lines from reusable `THREE.LineSegments`, thin meshes, or a lightweight procedural buffer. Do not generate one separate mesh per line. Update existing grid material colors when `themeMode` changes.

The grid must remain a supporting surface, not a source of visual noise. Reduce its brightness and density on small displays or lower-performance settings if it interferes with obstacle reading.

### 5.6 Obstacle and collectible contrast

Obstacles and collectibles must remain distinguishable through both color and shape, independent of the player's chosen palette.

**Obstacles**

- Use solid, angular shapes such as boxes, bars, and overhead gates.
- Use a stable hazard color family independent of `--startng-primary` and `--startng-accent`.
- Dark mode hazard fallback: `#FF6B6B` with a dark outline or contrasting side face.
- Light mode hazard fallback: `#C2414B` with a lighter face or clear outline.
- Include non-color cues such as diagonal warning strips, a hazard frame, or a distinctive silhouette.
- Use collision dimensions that correspond to the gameplay hazard, not decorative protrusions.

**Collectibles**

- Use a rotating sphere, octahedron, ring, or faceted energy-node shape.
- Use the resolved accent color, plus a bright inner highlight or thin neutral outline.
- Make them float or rotate slowly enough to remain readable at game speed.
- Use a short pickup flash and a score increment animation without obstructing the view.

If the platform accent color is close to the hazard color, preserve distinguishability through silhouette, surface pattern, outline, and animation. Do not rely solely on a fixed hue difference.

---

## 6. 2D HUD and UI Overlay

### 6.1 Layout principles

The DOM-based HUD sits above the WebGL canvas in a dedicated overlay layer. Use semantic HTML and CSS for text, buttons, profile information, menus, and the style simulator. Do not render interface text into the Three.js scene unless a particular in-world effect is explicitly justified.

The overlay must:

- Preserve the center running corridor as much as possible.
- Use a clear type hierarchy and restrained borders.
- Keep critical gameplay information readable at a glance.
- Adapt colors to dark and light theme modes.
- Respect the device safe areas.
- Avoid stealing pointer or touch input except where a control is actually interactive.

### 6.2 Typography

Use `Inter` when it is already available through the platform's approved font stack. Do not require an external font download solely for the game. Use a system geometric sans-serif fallback.

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system,
  BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Typography guidance:

- Game title: bold, compact, strong letter spacing without excessive sci-fi styling.
- Score: large, tabular numerals; use `font-variant-numeric: tabular-nums` to prevent width jitter.
- Username: medium weight, never larger than the primary game action.
- Supporting instructions: short, high contrast, and easy to scan.
- Diagnostic information: smaller text, but never below comfortable reading size on mobile.

Avoid thin ultra-light text, excessively wide tracking, and all-caps blocks for long instructions.

### 6.3 Glassmorphic cards

Use glassmorphism sparingly for the user pill, score card, ready card, pause menu, game-over panel, and simulator.

Design characteristics:

- Semi-transparent background derived from the active theme.
- `backdrop-filter: blur(16px)` with a solid/translucent fallback where backdrop filtering is unavailable.
- Subtle one-pixel border.
- Soft shadow used conservatively.
- Rounded corners in a consistent range, typically `12px` to `18px`.
- Adequate contrast between text and the card background.

Example design variables:

```css
:root {
  --nd-radius-card: 16px;
  --nd-blur-card: 16px;
  --nd-card-border-dark: rgba(255, 255, 255, 0.12);
  --nd-card-border-light: rgba(23, 32, 51, 0.12);
}

[data-theme="dark"] .glass-card {
  background: rgba(12, 18, 34, 0.74);
  border: 1px solid var(--nd-card-border-dark);
  color: #F3F6FF;
  backdrop-filter: blur(var(--nd-blur-card));
  -webkit-backdrop-filter: blur(var(--nd-blur-card));
}

[data-theme="light"] .glass-card {
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid var(--nd-card-border-light);
  color: #172033;
  backdrop-filter: blur(var(--nd-blur-card));
  -webkit-backdrop-filter: blur(var(--nd-blur-card));
}
```

Set `data-theme` from the resolved theme mode on the game UI root. The platform tokens remain the source of truth for the main colors; the CSS examples above define translucent presentation treatment, not a replacement platform palette.

### 6.4 Logged-in start.ng user pill — top-left

Place a compact logged-in user pill in the top-left region of the game viewport, clear of browser safe areas.

Contents, in order:

1. User avatar or generated initials placeholder.
2. Username or display name.
3. Optional platform badge when available.
4. Optional subtle authenticated indicator, if it fits the platform's visual conventions.

Requirements:

- Avatar should be cropped circularly and have a stable fallback.
- The pill must not occupy more than the space required by its contents.
- Truncate long usernames rather than allowing the pill to cover the running corridor.
- Use safe-area-aware offsets.
- Never display session tokens or other private authentication information.
- The pill must reflect the currently authenticated start.ng user, not a cached previous identity.

On small screens, reduce the display name or badge before allowing the user pill to obscure gameplay.

### 6.5 Score card — top-right

Place the current score in the top-right region, aligned opposite the user pill.

During active gameplay, show:

- Current score as the most prominent element.
- Collected energy-node count as a secondary statistic.
- Personal best as a smaller secondary line where space permits.
- Pause control as a separate accessible button, positioned so it cannot be confused with the score.

Use tabular numerals to avoid layout movement as the score changes. Update score text at a measured UI cadence or when the displayed integer changes; do not force unnecessary DOM updates every render frame.

On narrow screens, collapse secondary information before shrinking the score to an unreadable size. Maintain a clear touch target for pause.

### 6.6 Ready screen

The ready screen should feel like a compact game lobby rather than a full-page marketing website.

Include:

- Game title and one-line instruction.
- Styled 3D character idle preview in the center visual area.
- Logged-in user identity and personal best.
- Primary `PLAY` action.
- Brief controls hint that adapts to keyboard or touch context where practical.
- Access to the simulator only when it is enabled in a trusted development build.

The main action should be visually dominant. Keep other actions secondary. The initial screen must not hide the character behind an oversized card.

### 6.7 Active gameplay UI

During a run:

- Keep only the user pill, score card, and pause control persistently visible.
- Keep tutorial hints brief and dismiss or remove them once the player has started.
- Avoid large gradients, full-screen cards, and decorative animations in the central play area.
- Show style changes on the character without a modal or forced pause.

Pause and game-over states may introduce centered cards with clear headings, score details, and prominent actions.

### 6.8 Pause and game-over cards

**Pause card**

- Title: `PAUSED` or `Game paused`.
- Clear `RESUME` primary action.
- Secondary `RESTART` and `BACK TO MENU` actions.
- Preserve the game scene behind the card, optionally dimmed with a low-opacity overlay.

**Game-over card**

- Clear game-over heading.
- Final score in large tabular numerals.
- Energy nodes collected and duration/distance as supporting details.
- Personal-best result, including a distinct but restrained new-best treatment.
- Explicit persistence status: saving, saved, failed, or retry available.
- Primary `PLAY AGAIN` action.
- Secondary `BACK TO MENU` action.

Do not show a confirmed saved state until the platform's persistence response confirms success.

### 6.9 Buttons and interaction states

Buttons must have distinct default, hover, active, keyboard-focus, disabled, and loading states.

- Primary action: filled with the resolved primary color and contrast-checked text.
- Secondary action: transparent or surface-colored with a visible border.
- Destructive or retry/error actions: use a distinct treatment that does not rely on color alone.
- Keyboard focus: visible outline with adequate offset.
- Touch controls: generous hit targets, ideally around `44 × 44` CSS pixels or larger.

Honor reduced-motion preferences. Use fast, low-amplitude transitions for hover and focus rather than large elastic animations.

---

## 7. Central Style Simulator

### 7.1 Purpose and availability

The collapsible development panel is named **Central Style Simulator**. It is required for local verification of central styling changes and must use the same style resolver and character material updater as the production integration.

- Enabled only in a trusted local development configuration by default.
- Collapsed by default.
- Not made available in production by CSS hiding alone.
- Never writes changes to real platform profile data.
- Must not expose authentication secrets or session state.

### 7.2 Panel contents

Include the following controls:

**Central tokens**

- `--startng-primary` color control.
- `--startng-accent` color control.
- `--startng-surface` color control.
- `--startng-theme-mode` selector with `dark` and `light`.

**Profile styling**

- `primaryColor` color control.
- `accentColor` color control.
- `finishType` selector with `matte`, `metallic`, and `neon`.
- `accessory` selector with `none`, `halo`, `wings`, and `visor-crown`.
- Optional JSON view/edit area showing the normalized profile style object.

**Actions**

- `Apply Changes`
- `Reset Overrides`
- `Reset Everything`
- `Copy Styling JSON`

**Diagnostics**

- Current adapter mode (`start.ng` or `mock`).
- Current username and nonsecret user ID.
- Current resolved primary, accent, and surface colors.
- Active theme mode, finish type, and accessory selection.
- Which source currently wins for each resolved property.
- Validation errors, if any.

### 7.3 Panel layout and behavior

On desktop, use a compact fixed panel near the lower-right or lower-left edge, ensuring it does not cover the score card, ready-screen primary action, or central obstacle path. A suggested width is `320px` to `380px`, with a maximum height of `60vh` and internal scrolling for longer diagnostics.

On mobile, render the simulator as a bottom drawer with a maximum height of approximately `70dvh`, safe-area padding, and clear close/collapse controls. The simulator is a development tool; gameplay controls must remain accessible when it is open.

When a valid input changes and is applied:

1. Update simulator override state.
2. Resolve the complete style through the shared style resolver.
3. Update character material properties, accessory visibility, rim-light color, fog, grid, and UI theme variables as appropriate.
4. Preserve the active game state, score, lane, jump state, and camera behavior.
5. Update diagnostics to show the winning source for each property.

`Reset Overrides` removes simulator overrides and reveals the current profile and central platform values again. `Reset Everything` restores known local simulation defaults and must not update the actual platform account.

### 7.4 Simulator failure handling

- Invalid JSON must show a validation message and preserve the last valid appearance.
- Invalid colors or enum values must be rejected or normalized to safe defaults.
- The simulator must never crash the render loop.
- Changes should become visible within 100 ms under normal runtime conditions.
- Closing the panel must not stop the game unless the game itself is paused.

---

## 8. Responsive Layout and Accessibility

### 8.1 Responsive layout

The game canvas fills its designated container. Use `ResizeObserver` for container resizing and update the renderer size and camera aspect ratio without recreating the scene.

- Desktop: full canvas with user pill top-left and score card top-right.
- Tablet: tighten card padding and reduce secondary details before moving primary controls.
- Mobile: respect safe-area insets, use compact cards, and preserve the center path.
- Portrait: maintain a valid camera framing and ensure the player and an adequate length of track remain visible.
- Landscape: take advantage of wider lane visibility while retaining touch affordances where needed.

Do not depend only on `100vh` for mobile layouts where browser chrome changes viewport size; use dynamic viewport units where supported with sensible fallbacks.

### 8.2 Accessibility and legibility

- Maintain sufficient text contrast in dark and light themes.
- Do not communicate obstacles, collectibles, errors, or save states through color alone.
- Use semantic buttons and labels for icon-only controls.
- Support keyboard focus and a visible focus indicator.
- Provide meaningful alt text for profile images when they convey identity; decorative avatars may use empty alternative text when adjacent text supplies the identity.
- Ensure text is readable when the UI is scaled.
- Honor reduced-motion preferences for nonessential visual effects.
- Avoid flashing effects that could create accessibility concerns.

### 8.3 Performance quality settings

Visual quality may adapt to performance, but central style values must remain semantically correct.

Suggested levels:

- **High:** soft real-time shadows, capped pixel ratio of 2, standard particle effects.
- **Balanced:** smaller shadow map or contact shadow, fewer particles, capped pixel ratio of 1.5 where needed.
- **Low:** no real-time shadows, minimal particles, capped pixel ratio of 1, simpler environment repetition.

All levels must preserve material colors, accessory visibility, readable obstacles, responsive controls, and score presentation.

---

## 9. Implementation and Verification Checklist

### Visual direction

- [ ] The world uses clean procedural geometric forms and a restrained cyber-runner aesthetic.
- [ ] Dark and light themes are intentionally designed and readable.
- [ ] Fog adds depth without hiding obstacles.
- [ ] Lighting defines the player silhouette and preserves material contrast.
- [ ] No external 3D asset pack is required for the core character or environment.

### Central styling

- [ ] The implementation reads `--startng-primary`.
- [ ] The implementation reads `--startng-accent`.
- [ ] The implementation reads `--startng-surface`.
- [ ] The implementation reads `--startng-theme-mode`.
- [ ] Profile JSON supports `primaryColor`, `accentColor`, `finishType`, and `accessory` exactly as defined.
- [ ] CSS primary/accent tokens override the corresponding profile colors.
- [ ] Invalid and missing values fall back safely per property.
- [ ] Central changes update materials, theme, fog, grid, rim light, and UI where applicable without rebuilding the scene.
- [ ] Cross-origin deployments use an approved messaging contract instead of attempting direct parent DOM access.

### Character

- [ ] A root `PlayerCharacter` group exists.
- [ ] Required nodes `Body`, `Head`, `Visor`, `Limbs`, `Accessory_Halo`, `Accessory_Crown`, and `Trail` exist and are discoverable by name.
- [ ] `Accessory_Wings` exists for the supported `wings` profile value.
- [ ] The exact material mapping table and three finish presets are implemented.
- [ ] Only the selected optional accessory is visible.
- [ ] Styling changes do not alter gameplay collision bounds.
- [ ] Material instances and accessory geometry are reused efficiently.

### Scene and HUD

- [ ] Camera FOV is `52` degrees, with the documented offset, clipping planes, and delta-time-aware follow behavior.
- [ ] Ambient/hemisphere, key, and accent-adaptive rim lighting are implemented.
- [ ] The grid floor changes appropriately between dark and light modes.
- [ ] Obstacles remain distinct from collectibles even when user colors change.
- [ ] The logged-in start.ng user pill is at the top-left.
- [ ] The score card is at the top-right.
- [ ] Typography uses Inter or the defined system fallback.
- [ ] Glassmorphic cards retain sufficient text contrast and degrade gracefully when backdrop blur is unsupported.
- [ ] The Central Style Simulator is collapsed by default and restricted to a trusted development build.

### Responsive behavior and quality

- [ ] The canvas resizes without reinitializing the renderer.
- [ ] Desktop and mobile HUD layouts do not obstruct critical gameplay.
- [ ] Safe areas and mobile dynamic viewport changes are handled.
- [ ] Reduced-motion preferences are honored for nonessential motion.
- [ ] Performance quality settings maintain gameplay readability and styling semantics.
- [ ] Normal style changes do not produce console errors, duplicate render loops, or unbounded allocations.

---

## 10. Final Design Contract

The rendered character must always be the visual result of a single resolved style model built from platform CSS tokens, user profile styling JSON, and—only in an enabled development environment—simulator overrides.

The canonical root tokens are `--startng-primary`, `--startng-accent`, `--startng-surface`, and `--startng-theme-mode`. The canonical normalized profile attributes are `primaryColor`, `accentColor`, `finishType`, and `accessory`.

A valid central color change must visibly update the appropriate character materials, the accent rim light, and relevant environmental/UI accents. A theme change must update the scene background, fog, grid, and UI theme. A finish change must update the specified `MeshStandardMaterial` properties. An accessory change must update the documented `visible` flags without recreating the character.

The design is complete only when these behaviors are implemented, tested, and working in the actual start.ng hosting context—not merely demonstrated with hard-coded local values.
