# PRD.md — Neon Drift: A 3D Cyber-Runner Game for start.ng

> **Document Type:** Product Requirements Document (PRD)  
> **Product:** Neon Drift  
> **Platform:** start.ng  
> **Target Runtime:** Modern desktop and mobile browsers  
> **Primary Technology:** Three.js, TypeScript, HTML, and CSS  
> **Development Environment:** VS Code with Google Antigravity  
> **Document Status:** Implementation Specification  
> **Version:** 1.0.0

---

## 1. Product Overview

### 1.1 Product Vision

Neon Drift is a fast-paced, browser-based 3D endless-runner game built with Three.js and integrated into the start.ng platform.

Players control a futuristic cyber-runner moving through a procedurally generated neon environment. They must dodge obstacles, jump over barriers, collect energy nodes, and survive for as long as possible while their speed steadily increases.

The game must use the authenticated users of start.ng rather than introducing a separate account system. Each player should see their platform profile information, a character styled using centrally managed platform design properties and profile styling data, and their persistent personal high score.

The experience should feel like a polished, lightweight arcade game rather than a conventional website with a 3D animation attached.

### 1.2 Product Goals

The product must achieve the following goals:

1. Deliver an immediately playable 3D game that runs directly in a browser without requiring installation.
2. Integrate with start.ng authentication so that a player's in-game identity corresponds to their existing platform account.
3. Dynamically style the 3D player character using root CSS custom properties supplied by the platform and styling JSON supplied through the user's profile.
4. Provide an intuitive experience on desktop and mobile devices.
5. Persist each authenticated player's high score using the platform's supported persistence mechanism.
6. Maintain responsive, smooth gameplay with a target of 60 FPS on supported devices.
7. Provide a local development environment that works without a start.ng login while preserving the same integration interfaces used in production.
8. Make the codebase easy for an AI coding agent to implement, test, and extend without introducing unnecessary architectural complexity.

### 1.3 Product Principles

**Playability first:** The controls, obstacle readability, collision handling, and feedback must be reliable before visual effects are expanded.

**Platform-native identity:** The game uses the existing start.ng identity. It must not create a second account system.

**Reactive character styling:** Changes to applicable platform CSS properties or user profile styling data must update the character without reloading the game.

**Procedural graphics:** The core game must not depend on purchased models, external character assets, or downloadable environment asset packs.

**Graceful degradation:** If WebGL, authentication, or score persistence is unavailable, the game must communicate the problem clearly rather than failing silently.

**Separation of concerns:** Platform integration, game simulation, rendering, styling, input, and score persistence must remain separate modules.

---

## 2. Core Game Concept

### 2.1 Game Title

**Neon Drift**

Tagline: *Stay in motion. Chase the energy. Beat your best.*

### 2.2 Game Description

The player controls a stylized humanoid energy runner traveling forward along a futuristic three-lane track.

The world consists of an illuminated road, neon lane markers, glowing architectural structures, distant grid patterns, and a dark atmospheric environment.

Obstacles appear ahead of the player. The player must move between lanes or jump to avoid them. Energy nodes placed along the track can be collected to increase the score.

As the run progresses:

- Forward speed increases.
- Obstacles appear more frequently.
- Collectible placements become more challenging.
- The visual environment subtly intensifies.
- The score continuously increases.

The player character should look like a small, futuristic humanoid robot constructed from simple geometric forms. Its identity is defined primarily by the platform's styling tokens and the user's profile styling data.

### 2.3 Core Gameplay Loop

1. The player opens Neon Drift on start.ng.
2. The game identifies the authenticated start.ng user.
3. The game retrieves the user's profile information and applicable styling configuration.
4. The character appears on the ready screen with the appropriate appearance and idle animation.
5. The player starts a run.
6. The player dodges obstacles, collects energy nodes, and earns points.
7. The game gradually increases its difficulty.
8. A collision ends the run and presents the final score alongside the player's personal best.
9. The final score is submitted through the supported start.ng integration.
10. The player's personal best updates if the new score exceeds the saved record.
11. The player can immediately begin another run.

### 2.4 Visual Direction

The game should have a premium cyberpunk-inspired aesthetic without becoming visually cluttered.

**Environment**
- Dark navy or near-black background.
- Three-lane futuristic road.
- Cyan or purple lane markers.
- Repeating floor-grid geometry.
- Abstract neon pillars or panels along the road.
- Subtle fog, distance fade, and atmospheric depth.
- Minimal particles used for speed and collision feedback.

**Player**
- Stylized humanoid robot.
- Geometric torso, head, arms, and legs.
- Standard materials with metallic or roughness variations.
- Emissive accents and a controlled glow.
- A small platform-derived avatar or badge displayed separately in the profile HUD.
- Optional geometric accessories, such as a halo, visor, or shoulder lights.

**Collectibles**
- Glowing energy spheres, octahedrons, or torus-like rings.
- Rotating idle animation.
- A brief flash or particle burst on collection.

**Obstacles**
- Solid geometric barriers.
- Raised blocks.
- Overhead obstacle structures.
- Procedurally constructed obstacle combinations that remain readable at increasing speeds.

**Interface**
- Clean, high-contrast HUD.
- Large readable score counter.
- Minimal profile card.
- Clear start, pause, resume, and restart actions.
- Responsive layouts for landscape and portrait screens.

Avoid excessive bloom, expensive post-processing, dense particles, or visual effects that obscure obstacles.

### 2.5 Procedural Geometry Requirements

The game must construct its core visuals using Three.js geometry primitives and standard materials.

Suitable geometries include:

- `BoxGeometry`
- `SphereGeometry`
- `CapsuleGeometry`
- `CylinderGeometry`
- `ConeGeometry`
- `TorusGeometry`
- `OctahedronGeometry`
- `PlaneGeometry`
- `BufferGeometry` where appropriate for optimized procedural effects

Use `MeshStandardMaterial` and `MeshBasicMaterial` where appropriate, with restrained use of emissive material properties.

The player character and obstacles must be assembled from reusable meshes. Materials, geometry, and meshes should be reused wherever possible.

External textures, downloaded models, and commercial asset packs must not be required for the core experience.

---

## 3. Target Audience

### 3.1 Primary Audience

Authenticated start.ng users who want a fast, entertaining browser-based game with a recognizable platform identity.

### 3.2 Secondary Audience

Developers, platform administrators, and internal reviewers who need to test how centrally managed styling affects the game character.

### 3.3 Supported Devices

**Desktop**
- Windows, macOS, and Linux.
- Modern versions of Chrome, Edge, Firefox, and Safari.
- Keyboard input.
- Mouse interaction with interface controls.

**Mobile**
- Modern Android and iOS browsers.
- Touch and swipe input.
- Responsive canvas.
- Interface elements sized for finger interaction.

The initial release does not require native mobile applications, gamepad support, or multiplayer gameplay.

---

## 4. Scope

### 4.1 MVP Features

The minimum viable product must include:

- Three.js 3D rendering.
- Procedural player character and environment.
- Three-lane forward-running gameplay.
- Keyboard movement and jumping.
- Mobile swipe controls.
- Obstacles and collision detection.
- Collectible energy nodes.
- Progressive difficulty and scoring.
- Ready screen with authenticated user identity.
- Platform-derived character styling.
- Dynamic updates to character appearance.
- Personal high-score retrieval and persistence.
- Game-over screen and score submission.
- Local mock user fallback for localhost development.
- Collapsible live style simulator.
- Responsive interface.
- Basic pause and resume functionality.
- Error handling for authentication, rendering, and score persistence.

### 4.2 Out of Scope

Unless explicitly required in a later version, do not implement:

- Multiplayer races.
- Live leaderboards or global rankings.
- In-game purchases.
- Ads or monetization.
- Accounts independent of start.ng.
- Character inventory or an unlockable cosmetics economy.
- Narrative missions or campaign progression.
- Online chat.
- User-generated 3D models.
- External model or environment asset packs.
- Cloud saves unrelated to the platform's persistence system.
- Administrative dashboards outside the game.
- A separate backend solely to duplicate capabilities already provided by start.ng.

Keep the architecture extensible enough to accommodate later additions without building these features now.

---

# 5. Mandatory Platform Requirements: start.ng

## 5.1 Platform Integration Strategy

The production game must use start.ng as its identity and profile authority.

The game must not ask users to register, create a password, or log into a separate game account.

Because the exact start.ng authentication SDK, embedding contract, profile schema, and score-persistence API have not been supplied in this specification, the implementation must not invent endpoint URLs, global JavaScript objects, authentication cookies, or undocumented platform APIs.

Before implementing production integration, the coding agent must:

1. Inspect the available repository, supplied platform documentation, and any existing start.ng integration code.
2. Identify the actual mechanism by which start.ng exposes the active authenticated user.
3. Identify how user profile styling JSON is provided.
4. Identify how platform-level design tokens are exposed to the game.
5. Identify the supported score-persistence mechanism.
6. Implement the platform adapter against those verified interfaces.
7. Document any missing integration contract that requires confirmation from the platform team.

The game architecture must support these integrations through a clearly defined adapter rather than scattering platform-specific logic throughout the application.

If no verified production integration is available, complete the local mock integration and game implementation, but do not represent the production authentication or persistence requirements as successfully implemented.

## 5.2 Authenticated User Requirements

### 5.2.1 Required Identity Information

The game should consume an authenticated user object equivalent to the following logical model:

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Stable, unique start.ng user identifier |
| `username` | Yes | User's platform username |
| `displayName` | No | Preferred display name |
| `avatarUrl` | No | Platform profile image URL |
| `badge` | No | Platform badge or achievement information |
| `styling` | No | User profile styling JSON |
| `highScore` | No | Retrieved personal best, defaulting to zero if no record exists |

These are the game's normalized internal field names, not a claim about the actual start.ng API response format.

The platform adapter must map the real platform response into this model.

If the platform uses different field names, implement the mapping inside the adapter.

### 5.2.2 Authentication Behavior

On initialization, the game must request the current authenticated user through the verified platform integration.

The following rules apply:

- A valid authenticated user proceeds to profile and style initialization.
- An explicitly unauthenticated production session displays a clear message directing the user to sign in through start.ng.
- A user whose authentication status cannot be determined sees an appropriate loading or error state.
- The game must not interpret an authentication timeout or API error as permission to use a mock user.
- A user's platform identity must remain associated with their run and high-score record.
- If the platform provides a supported account-switch or authentication-change event, the game must respond to it.
- The game must not store platform passwords, session secrets, or access tokens in ordinary browser storage.
- The game must not independently issue authentication requests to undocumented platform endpoints.

The interface should distinguish between a user who is genuinely signed out and a platform service that is temporarily unavailable.

### 5.2.3 Profile Display

The ready screen and HUD should include:

- Profile avatar, when available.
- Username or display name.
- Platform badge, if available.
- Personal high score.
- Current run score.

If no usable avatar exists, display a geometric avatar or initials-based placeholder.

If no badge exists, omit the badge without leaving a broken image or empty placeholder.

If the high-score service is unavailable, show an appropriate unavailable state rather than silently claiming that zero is the user's verified record.

### 5.2.4 Identity Changes

If start.ng signals that the current user has changed:

1. Stop score submission for the previous user's active session until identity handling is resolved.
2. Pause the game if necessary to avoid associating a run with the wrong account.
3. Retrieve the new user's profile, styling, and high score.
4. Apply the new user's styling to the character.
5. Resume or reset the experience according to a clearly documented session policy.
6. Ensure that subsequent runs and score submissions use the new identity.

The application must never mix the high scores or profile styling of two different platform users.

---

## 5.3 Local Mock User Fallback

Development must remain possible without a live start.ng account.

### 5.3.1 Mock User Conditions

Mock mode may be enabled automatically only when running on approved local development hosts, such as:

- `localhost`
- `127.0.0.1`

The implementation should use an explicit development flag where appropriate.

A publicly deployed build must not silently fall back to a mock user merely because platform authentication fails.

Preview deployments must also use an explicitly configured test integration or authenticated platform environment.

### 5.3.2 Mock User Model

Provide a deterministic mock user equivalent to:

| Field | Mock value |
|---|---|
| `id` | `local-dev-user-001` |
| `username` | `neon_tester` |
| `displayName` | `Neon Tester` |
| `avatarUrl` | Local generated avatar or initials placeholder |
| `badge` | `DEV` |
| `styling` | Local default styling JSON |
| `highScore` | Retrieved from development-only local persistence |

These values exist exclusively for local development and automated tests.

### 5.3.3 Mock Score Persistence

For local development:

- Use `localStorage` or an equivalent development-only storage mechanism.
- Persist the mock user's personal best between browser sessions.
- Namespace the key to avoid collisions with other applications.
- Do not use production user identifiers as storage keys for unrelated local data.
- Keep mock score persistence behind the same logical adapter interface as production persistence.

Example logical storage key:

`neon-drift:dev:local-dev-user-001:high-score`

Production score persistence must use the verified platform-supported mechanism and must not silently substitute `localStorage` as the source of truth.

---

# 6. Centralized Character Styling

## 6.1 Objective

The 3D character's appearance must respond dynamically to centrally configured start.ng styles and to styling data supplied through the authenticated user's profile.

This is a mandatory feature, not an optional visual enhancement.

The implementation must support both:

1. Root CSS custom properties on the platform page.
2. User profile styling JSON supplied by the platform integration.

A style change must be visible immediately in the rendered character without refreshing the page, recreating the entire Three.js scene, or requiring a new game session.

The styling pipeline must work on both the ready screen and during active gameplay.

## 6.2 Character Construction

Build the player as a reusable `PlayerCharacter` component containing a group of procedural Three.js meshes.

Suggested components:

- Head.
- Torso.
- Left and right arms.
- Left and right legs.
- Feet or boots.
- Eye or visor elements.
- Emissive body accents.
- Optional accessory meshes.
- Optional local particle or trail effects.

Organize these meshes into named groups so that styling can be applied to individual character parts without traversing unrelated environment meshes.

Suggested logical groups:

- `bodyGroup`
- `headGroup`
- `limbsGroup`
- `accentGroup`
- `accessoryGroup`
- `trailGroup`

The exact shape and proportions are implementation decisions, but the character must be identifiable as a humanoid runner rather than a collection of unrelated floating primitives.

## 6.3 Root CSS Custom Properties

The styling system must read CSS custom properties from the root element of the platform page.

For example, start.ng may provide the following properties:

```css
:root {
  --startng-game-player-primary: #9300ff;
  --startng-game-player-secondary: #161626;
  --startng-game-player-accent: #00e5ff;
  --startng-game-player-emissive: #9300ff;
  --startng-game-player-emissive-intensity: 1.2;
  --startng-game-player-glow: 0.65;
  --startng-game-player-trail: #00e5ff;
  --startng-game-player-pattern: circuit;
  --startng-game-player-accessory: visor;
}
```

These values are illustrative defaults for the integration contract. They must not be assumed to exist on the real platform until confirmed.

### 6.3.1 Supported CSS Tokens

Implement support for the following logical tokens:

| CSS custom property | Character effect | Expected value |
|---|---|---|
| `--startng-game-player-primary` | Main body color | Valid CSS color |
| `--startng-game-player-secondary` | Secondary armor color | Valid CSS color |
| `--startng-game-player-accent` | Accent details | Valid CSS color |
| `--startng-game-player-emissive` | Self-illuminated details | Valid CSS color |
| `--startng-game-player-emissive-intensity` | Emissive material intensity | Bounded numeric value |
| `--startng-game-player-glow` | Visual glow or bloom contribution | Normalized numeric value |
| `--startng-game-player-trail` | Movement trail color | Valid CSS color |
| `--startng-game-player-pattern` | Armor pattern | Supported preset identifier |
| `--startng-game-player-accessory` | Optional geometry accessory | Supported preset identifier |

The implementation may support additional tokens if they provide meaningful customization without compromising performance.

### 6.3.2 Token Resolution

Read computed values using the browser's computed-style APIs.

For a same-origin game page, the platform's root element is the document root.

If the game is embedded inside an iframe, the implementation must verify whether the parent page's styles are accessible. A cross-origin iframe cannot directly inspect its parent's DOM or computed styles.

Where direct access is unavailable, use a platform-approved `postMessage` integration or equivalent supported host-to-game communication mechanism.

Do not attempt to bypass browser origin restrictions.

### 6.3.3 Dynamic Style Changes

The game must support changes that happen after initialization.

Use an appropriate combination of:

- `MutationObserver` for relevant root attributes and supported local style changes.
- A documented platform theme-change event, if available.
- A validated host-to-game message contract for embedded deployments.
- Direct updates from the development simulator.

Do not assume that a `MutationObserver` on the document root detects every change made to an external stylesheet. Changes originating from stylesheets must be propagated through a supported event or messaging mechanism where necessary.

The style adapter should expose a subscription interface that notifies the character system when effective style inputs change.

### 6.3.4 Style Update Behavior

When a style update occurs:

1. Read the current effective styling inputs.
2. Validate the values.
3. Normalize supported formats.
4. Resolve the final character style.
5. Update the relevant Three.js materials and effect parameters.
6. Add or remove optional accessory meshes only when necessary.
7. Reuse existing materials and geometry wherever possible.
8. Continue gameplay without resetting the score or player position.

Target a visible update within 100 milliseconds of receiving a valid style change under normal runtime conditions.

Do not rebuild the entire scene or dispose of and recreate the renderer for ordinary styling changes.

---

## 6.4 User Profile Styling JSON

The platform adapter must also accept styling data from the authenticated user's profile.

Normalize the platform-provided structure into an application-owned schema.

Example:

```json
{
  "version": 1,
  "character": {
    "primaryColor": "#9300ff",
    "secondaryColor": "#161626",
    "accentColor": "#00e5ff",
    "emissiveColor": "#9300ff",
    "emissiveIntensity": 1.2,
    "glowIntensity": 0.65,
    "trailColor": "#00e5ff",
    "pattern": "circuit",
    "accessory": "visor"
  }
}
```

This JSON represents the normalized internal schema, not an asserted native start.ng profile format.

The platform adapter must map the actual profile data into this structure.

### 6.4.1 Supported Properties

| Property | Type | Description |
|---|---|---|
| `version` | Number | Styling schema version |
| `character.primaryColor` | String | Main body color |
| `character.secondaryColor` | String | Secondary body color |
| `character.accentColor` | String | Decorative accent color |
| `character.emissiveColor` | String | Emissive detail color |
| `character.emissiveIntensity` | Number | Emissive intensity |
| `character.glowIntensity` | Number | Glow effect intensity |
| `character.trailColor` | String | Movement trail color |
| `character.pattern` | String | Armor decoration preset |
| `character.accessory` | String | Character accessory preset |

Additional optional properties may be introduced through versioned schema changes.

### 6.4.2 Validation Rules

The styling system must:

- Reject malformed JSON.
- Validate supported schema versions.
- Validate color values.
- Clamp numeric properties to documented bounds.
- Ignore unknown properties.
- Ignore unsupported pattern and accessory identifiers.
- Apply safe defaults to missing fields.
- Prevent invalid values from breaking rendering.
- Avoid interpreting arbitrary profile strings as HTML or executable code.

Suggested numeric bounds:

| Property | Minimum | Maximum |
|---|---:|---:|
| `emissiveIntensity` | 0 | 3 |
| `glowIntensity` | 0 | 1 |

These bounds are application-level constraints and may be adjusted during visual tuning.

Supported pattern presets:

- `solid`
- `stripes`
- `circuit`

Supported accessory presets:

- `none`
- `visor`
- `halo`
- `shoulder-lights`

Unsupported values must fall back to safe defaults.

---

## 6.5 Styling Precedence

The styling system must have deterministic precedence so that developers can predict the final appearance.

Use the following resolution order, from lowest to highest priority:

1. Built-in character defaults.
2. User profile styling JSON.
3. Explicitly configured root CSS custom properties.
4. Active development simulator overrides.

Root CSS custom properties override the corresponding profile JSON properties when they are defined and valid.

Profile JSON supplies properties that are not overridden by the platform's corresponding CSS tokens.

For example:

- If the profile specifies a purple body but the platform explicitly supplies a green primary-color token, the character body becomes green.
- If the profile specifies a halo accessory and the platform supplies no accessory token, the character retains the halo.
- If neither the profile nor the platform provides an accent color, the character uses its built-in default.
- When the simulator overrides the primary color, the override remains active until reset or until its development session ends.

Only valid, explicitly configured tokens override lower-priority values.

An empty, missing, or invalid CSS token must not erase a valid profile value.

The final resolved style should be represented as a single normalized object consumed by the character renderer.

## 6.6 Character Material Mapping

Apply resolved style values to the character's materials consistently.

Suggested mapping:

| Character element | Applied styling |
|---|---|
| Torso and major armor | Primary color |
| Limbs and secondary armor | Secondary color |
| Joints and armor lines | Accent color |
| Eyes and energy core | Emissive color |
| Decorative details | Accent color |
| Trail particles | Trail color |
| Optional halo or visor | Accent and emissive colors |
| Emissive materials | Emissive intensity |
| Optional post-processing effect | Glow intensity |

Do not make every surface equally bright. Preserve contrast between the character's primary body, secondary armor, and emissive details.

Prefer material reuse over creating duplicate materials on every update.

If multiple meshes share a material, ensure that a style update does not unintentionally recolor unrelated environment objects.

## 6.7 Styling During Animation and Gameplay

Styling must remain active across all relevant game states.

The character should retain its appearance when:

- The ready screen opens.
- The player starts a run.
- The character changes lanes.
- The character jumps.
- The character lands.
- The game pauses and resumes.
- The game ends.
- The player restarts the game.

A valid central styling update during an active run must immediately change the character's appearance without resetting gameplay state.

An identity or profile-styling change associated with a different authenticated user must follow the user-change handling policy defined in Section 5.2.4.

---

# 7. Live Style Simulator — Development Tool

## 7.1 Objective

Provide a collapsible development-only panel that allows developers to simulate platform styling changes and see the resulting character appearance immediately.

This tool is mandatory because character customization must be tested without relying on a live platform administrator changing production styles for every iteration.

## 7.2 Availability

The simulator must:

- Be available on localhost development environments.
- Be collapsed by default.
- Be accessible through a small, clearly labeled `Style Simulator` control.
- Remain hidden in normal production builds.
- Never be enabled in production solely by adding a URL query parameter.
- Require an explicit, trusted configuration and appropriate authorization if enabled in a non-local environment.

Example development-only configuration:

`VITE_ENABLE_STYLE_SIMULATOR=true`

The application must enforce the development restriction in its build/runtime configuration. Merely hiding the control with CSS is insufficient.

## 7.3 Panel Layout

The panel should use a fixed, compact overlay that does not obstruct the main gameplay controls.

Suggested sections:

### A. Platform CSS Variables

Include controls for:

- Primary color.
- Secondary color.
- Accent color.
- Emissive color.
- Emissive intensity.
- Glow intensity.
- Trail color.
- Pattern.
- Accessory.

### B. User Profile JSON

Provide an editor or structured form that allows developers to:

- View the current normalized styling JSON.
- Edit supported properties.
- Apply valid JSON changes.
- See validation errors for malformed input.
- Reset the profile styling to defaults.

### C. Simulation Controls

Include:

- `Apply Changes`
- `Reset Overrides`
- `Reset Everything`
- `Copy Styling JSON`

Color inputs should support color-picker interaction and display the current hex value.

Numeric inputs should enforce the same bounds as the production styling validator.

### D. Integration Diagnostics

Display:

- Current identity mode: `start.ng` or `Mock`.
- Current username and user ID.
- Resolved primary, secondary, and accent colors.
- Whether root CSS tokens are available.
- Whether profile styling JSON has been loaded.
- Whether the active style source is profile JSON, platform CSS, or simulator override.

Avoid exposing authentication secrets or private session data.

## 7.4 Simulator Behavior

When the developer changes a control and applies the change:

1. Update the development style override state.
2. Recompute the final resolved character style.
3. Apply the change to existing character materials.
4. Update optional effects and accessories where needed.
5. Show the result immediately.
6. Keep the current game state, score, and camera state unchanged.

The simulator must use the same resolution and character-update pipeline as real platform styling events.

It must not maintain a separate, inconsistent character-rendering implementation.

## 7.5 Reset Behavior

`Reset Overrides` removes simulator-specific overrides and restores the values derived from the platform CSS variables, profile styling JSON, and built-in defaults.

`Reset Everything` resets the development styling inputs to their known local defaults. It must not modify real platform user profile data or production configuration.

All simulator changes are temporary unless a separate, explicitly approved development persistence feature is implemented.

## 7.6 Acceptance Criteria

- The panel opens and closes.
- The panel starts collapsed.
- Changing the primary color updates the character immediately.
- Changing secondary and accent colors updates the corresponding character parts.
- Changing emissive intensity changes the visual intensity of emissive details.
- Changing the pattern updates the character's decoration.
- Changing the accessory adds, removes, or replaces the appropriate procedural mesh.
- Applying valid JSON updates the character.
- Applying invalid JSON displays an error without crashing the game.
- Resetting overrides restores the correct underlying style.
- The simulator remains functional during a running session.
- Production builds do not expose unauthorized simulator controls.

---

# 8. Gameplay Mechanics

## 8.1 Game World

Neon Drift uses a continuous forward-running illusion.

The player remains near a stable position in the scene while the road, obstacles, collectibles, and environmental structures move toward and past the player.

This approach simplifies collision detection and allows the environment to be reused efficiently.

### Lane Layout

Use three discrete lanes:

- Left lane.
- Center lane.
- Right lane.

Define lane positions using a configurable constant rather than scattering numeric coordinates throughout the code.

Suggested initial spacing:

- Left: `-2.2`
- Center: `0`
- Right: `2.2`

The lane spacing may be adjusted to suit the final character scale and camera position.

Lane changes must be smooth rather than instant teleports, but they must respond quickly enough for precise obstacle avoidance.

## 8.2 Desktop Controls

| Action | Keyboard input |
|---|---|
| Move left | `A` or `ArrowLeft` |
| Move right | `D` or `ArrowRight` |
| Jump | `Space` or `ArrowUp` |
| Pause | `Escape` or the on-screen pause control |
| Resume | `Enter` or the on-screen resume control |
| Restart | On-screen restart control |

Additional requirements:

- Prevent browser scrolling when gameplay keys are used during an active run.
- Do not block normal keyboard navigation when the game is not active.
- Ignore repeated key events that would cause uncontrolled lane changes.
- Support standard key release behavior.
- Prevent the jump action from triggering multiple simultaneous jumps unless a later gameplay mechanic explicitly permits it.

## 8.3 Mobile Controls

Mobile users must be able to play using touch gestures without a keyboard.

Required swipe mappings:

| Gesture | Action |
|---|---|
| Swipe left | Move left |
| Swipe right | Move right |
| Swipe up | Jump |
| Tap pause button | Pause |
| Tap resume button | Resume |

Implementation requirements:

- Measure the gesture relative to its starting touch position.
- Use a configurable minimum swipe distance.
- Ignore accidental micro-movements.
- Distinguish between horizontal and vertical swipes.
- Avoid treating HUD interactions as gameplay gestures.
- Use pointer/touch handling that does not accidentally trigger page scrolling during gameplay.
- Restore ordinary page interaction when the game is not active.
- Use touch-friendly hit targets for interface buttons.

Suggested minimum swipe threshold: 35 CSS pixels, adjustable after testing.

Optional on-screen directional or jump buttons may be added if they improve accessibility without cluttering the main interface.

## 8.4 Lane Movement

The player has an integer lane index representing the current target lane.

A left or right input changes the target lane by one position.

The index must remain between the leftmost and rightmost lanes.

Movement must interpolate the player's horizontal position toward the target lane.

Requirements:

- No movement beyond the outer lanes.
- No uncontrolled acceleration from repeated key events.
- Smooth but responsive transitions.
- Collision checks must use the player's actual current position and appropriate collision bounds.
- Lane transitions must remain functional at maximum game speed.

## 8.5 Jumping

Jumping must use a simple physics model appropriate for an arcade game.

Suggested model:

- Apply an initial upward velocity when the player jumps.
- Apply gravity each simulation step.
- Update the character's vertical position.
- Detect the landing condition.
- Reset vertical velocity when the character lands.
- Prevent another jump until the character has landed.

Jump parameters should be centralized in game configuration.

Tune the jump duration and height so that players can clear low obstacles while maintaining a meaningful timing challenge.

The camera and character animation should communicate takeoff and landing clearly.

## 8.6 Speed Progression

The game begins at a manageable speed and gradually becomes more demanding.

Suggested tuning values:

| Parameter | Initial value |
|---|---:|
| Starting forward speed | 18 world units/second |
| Maximum forward speed | 32 world units/second |
| Time to reach maximum speed | Approximately 120 seconds |
| Initial obstacle spawn interval | 1.8 seconds |
| Minimum obstacle spawn interval | 0.8 seconds |

These are initial balancing targets, not immutable constants.

The implementation must centralize all difficulty values in a configuration object.

Difficulty should increase through a combination of:

- Forward speed.
- Obstacle spawn frequency.
- Obstacle combinations.
- Collectible placement complexity.

Do not make the game impossible through random spawning.

The obstacle generator must avoid unavoidable collisions and preserve a viable route through the track.

## 8.7 Obstacle Types

The MVP should support at least three distinguishable obstacle types.

### Type A: Ground Barrier

A low barrier that requires a jump.

### Type B: Solid Block

A lane-blocking obstacle that requires moving to another lane.

### Type C: Overhead Gate

A structure that requires the player to use a clear alternative lane or, if designed and collision-tested accordingly, remain below its safe clearance area.

Each type must have:

- A procedural mesh.
- A defined collision shape.
- A consistent lane footprint.
- A readable visual appearance.
- A configurable spawn weight.
- A safe cleanup mechanism after it leaves the playable area.

Obstacle meshes should be reused or pooled where possible.

## 8.8 Procedural Spawning

The world generator must create obstacles and collectibles ahead of the player and recycle them after they pass out of view.

Requirements:

- Generate obstacles within the three-lane system.
- Avoid guaranteed-death combinations.
- Maintain a minimum reaction distance.
- Prevent unintended overlaps between obstacles and collectibles.
- Support progressive difficulty.
- Reuse objects instead of allocating new geometry for every spawn.
- Remove objects safely from the active scene when no longer needed.
- Keep random-generation logic independent from rendering code.

Use a seeded random generator in automated gameplay tests where deterministic scenarios are needed.

The initial release does not require procedural terrain or an infinite collection of unique environments. Repeated modular environment sections are sufficient.

## 8.9 Collectibles

Collectible energy nodes are placed on the road, usually within individual lanes.

Requirements:

- Render collectibles using procedural geometry.
- Use a distinct color or glow relative to obstacles.
- Animate rotation or vertical bobbing.
- Detect collection reliably.
- Remove or deactivate collected objects.
- Update the score.
- Play a brief collection effect.
- Prevent the same collectible from awarding points more than once.

Suggested value: 100 points per energy node.

## 8.10 Collision Detection

Use a lightweight collision system appropriate for the small number of active objects.

Axis-aligned bounding boxes, sphere tests, and simple custom collision volumes are acceptable.

The collision system must account for:

- Player horizontal position.
- Player vertical position during jumping.
- Obstacle lane and dimensions.
- Collectible dimensions.
- The current state of the player and world objects.

The visual mesh must not be used as the sole source of collision truth.

Collision volumes should be configurable independently of decorative geometry.

Requirements:

- A solid obstacle collision ends the active run.
- A successfully cleared obstacle must not register a collision.
- A collected node must not be collected again.
- Collision calculations must remain stable at different frame rates.
- Collision detection must not be skipped because a frame took longer than expected.

## 8.11 Game Over

When the player collides with an obstacle:

1. Register the collision once.
2. Transition to the game-over state.
3. Stop active movement and spawning.
4. Record the final run statistics.
5. Display a brief, readable collision effect.
6. Calculate the final score.
7. Attempt score submission through the platform adapter.
8. Update the displayed personal best when the authoritative result is available.
9. Present replay and return-to-ready actions.

Prevent repeated collision events from repeatedly submitting the same run.

---

# 9. Scoring System

## 9.1 Score Components

The initial scoring system must reward both survival and collectible gathering.

Suggested formula:

`Final Score = Distance Points + Energy Node Points`

Where:

- Distance points measure how long and how far the player survives.
- Energy node points reward successful collection.
- The score is an integer greater than or equal to zero.

Example implementation:

- Distance points: 10 points per whole second survived.
- Energy node points: 100 points per collected node.

These values should be configurable for future balancing.

If fractional elapsed time is used internally, only apply rounding when calculating or displaying the score.

## 9.2 HUD Requirements

During active gameplay, display:

- Current score.
- Collected energy nodes.
- Current speed or difficulty indicator, if it can be shown without clutter.
- Pause control.

The score must remain readable across different screen sizes.

HUD updates should not require excessive DOM re-rendering or interfere with the Three.js render loop.

## 9.3 Personal Best

The game must retrieve and display the current authenticated user's personal best.

On completion of a run:

- Compare the new score with the existing personal best.
- Submit the run through the platform adapter.
- Treat the server or platform persistence service as the authoritative source in production.
- Display whether a new personal best has been achieved.
- Update the visible personal best when a successful authoritative response is received.

The client may calculate a provisional score immediately, but it must not claim that a production score has been permanently saved until the persistence service confirms success.

## 9.4 Score Submission Requirements

Each completed run must be identifiable by a unique run ID.

Submit a normalized payload equivalent to:

```json
{
  "runId": "unique-run-identifier",
  "userId": "authenticated-startng-user-id",
  "score": 4250,
  "durationMs": 95000,
  "distance": 1710,
  "collectibles": 12,
  "gameVersion": "1.0.0"
}
```

This is the game's internal payload contract, not a claim about the actual start.ng API format.

The adapter must transform the payload into the platform's verified request format.

Requirements:

- Associate the score with the authenticated platform identity.
- Ensure the server derives or verifies identity from the authenticated session.
- Never trust a client-supplied user ID as proof of identity.
- Validate score payloads on the server or platform persistence service.
- Prevent duplicate submissions for the same run ID where supported.
- Handle network failures.
- Preserve a clear pending, saved, or failed submission state.
- Avoid submitting zero-score results unless the platform's scoring rules require them.

If score submission fails, keep the final result visible and provide a retry action where appropriate. Do not silently discard the result or falsely indicate persistence.

---

# 10. Game States and User Flow

## 10.1 State Machine

The game must use an explicit state machine.

Required states:

1. `BOOT`
2. `AUTHENTICATING`
3. `LOADING_PROFILE`
4. `APPLYING_STYLE`
5. `READY`
6. `PLAYING`
7. `PAUSED`
8. `GAME_OVER`
9. `SUBMITTING_SCORE`
10. `SCORE_SAVED`
11. `ERROR`

The implementation may represent score submission as a substate of `GAME_OVER` instead, provided that the same behavior is observable and testable.

State changes must be controlled by an explicit state-management mechanism rather than unrelated booleans scattered throughout the application.

## 10.2 Loading and Authentication Handshake

On initial page load:

1. Initialize the application shell.
2. Create the minimum necessary Three.js rendering resources.
3. Initialize the configured platform adapter.
4. Request the current authenticated identity.
5. Use a local mock identity only when the localhost development conditions are met.
6. Retrieve profile information and styling data.
7. Retrieve the personal high score.
8. Resolve root CSS custom properties and profile styling.
9. Apply the initial style to the procedural player character.
10. Transition to `READY`.

The loading interface should explain what is happening without exposing internal implementation details.

The ready screen must not appear before the character's initial style has been resolved.

If the renderer fails to initialize because WebGL is unavailable, display a clear compatibility message instead of an endless loading animation.

If the platform integration fails, show an appropriate retry or sign-in action.

## 10.3 Ready Screen

The ready screen serves as the primary game entry point.

It should include:

- Game title.
- Short instruction text.
- Styled 3D character preview.
- Character idle animation.
- Authenticated user's avatar or placeholder.
- Username or display name.
- Optional platform badge.
- Personal best.
- A prominent `PLAY` button.
- A pause or settings control only where appropriate.
- A development-only access point to the style simulator.

### Idle Animation

The character must animate gently while waiting for the player.

Possible animation elements include:

- Subtle up-and-down movement.
- Small body rotation.
- Head movement.
- Slowly pulsing emissive details.
- A restrained floating animation for optional accessories.

The idle animation must not interfere with material updates or the start transition.

Pressing `PLAY` transitions the game to `PLAYING` after the necessary gameplay initialization is complete.

## 10.4 Active Gameplay

When the run starts:

- Initialize the run score to zero.
- Reset the collectible count.
- Reset the run timer and distance.
- Reset the player lane and jump state.
- Reset obstacles and collectibles to the intended initial configuration.
- Start the difficulty progression.
- Enable movement input.
- Begin obstacle spawning.
- Display the gameplay HUD.
- Start the game simulation loop.

The player's personal best must remain available throughout the run.

## 10.5 Pause and Resume

The game should pause when the user activates the pause control.

It should also pause automatically when the document becomes hidden, such as when the user switches tabs, to prevent unexpected gameplay progression while the game is not visible.

When paused:

- Stop simulation advancement.
- Stop obstacle movement.
- Stop spawning new gameplay objects.
- Preserve score and player state.
- Keep the UI responsive.
- Continue only the minimal rendering or UI updates required by the pause presentation.

On resume:

- Continue from the preserved game state.
- Do not create a second animation loop.
- Do not reset the score or speed progression.
- Restore appropriate input handling.

If the browser loses WebGL context, suspend the game and restore rendering if possible. Show an appropriate error if recovery is unsuccessful.

## 10.6 Game Over and Score Submission

After a collision:

- Stop gameplay simulation.
- Display the final score.
- Display collected energy nodes.
- Display distance or survival duration.
- Display the personal best.
- Highlight a new personal best when confirmed.
- Submit the score through the platform adapter.
- Show score persistence status.

The game-over screen should provide:

- `PLAY AGAIN`
- `BACK TO MENU`

The replay action starts a clean run while retaining the authenticated identity, current styling, and authoritative high score.

The back-to-menu action returns to the ready screen.

---

# 11. Technical Architecture

## 11.1 Recommended Technology Stack

Use:

- Three.js for 3D rendering.
- TypeScript for gameplay and platform integration.
- Vite for local development and production bundling.
- HTML and CSS for interface elements.
- Native browser APIs where sufficient.
- A lightweight, explicit application state machine.
- The official or platform-approved start.ng integration mechanism once verified.

A framework such as React is optional, not mandatory.

Do not introduce a large framework or physics engine unless it solves a demonstrated implementation problem.

The initial collision model can be implemented with basic geometry and custom collision tests.

Use a compatible stable Three.js release selected and pinned during implementation. Avoid relying on undocumented APIs or experimental features.

## 11.2 Logical Module Structure

Organize the implementation into modules with clearly defined responsibilities.

Suggested project structure:

```text
neon-drift/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.ts
│   ├── app/
│   │   ├── App.ts
│   │   ├── GameState.ts
│   │   └── config.ts
│   ├── game/
│   │   ├── Game.ts
│   │   ├── GameLoop.ts
│   │   ├── GameWorld.ts
│   │   ├── PlayerController.ts
│   │   ├── PlayerCharacter.ts
│   │   ├── ObstacleManager.ts
│   │   ├── CollectibleManager.ts
│   │   ├── CollisionSystem.ts
│   │   ├── ScoreSystem.ts
│   │   ├── DifficultySystem.ts
│   │   ├── EnvironmentManager.ts
│   │   └── ObjectPool.ts
│   ├── platform/
│   │   ├── PlatformAdapter.ts
│   │   ├── StartNgAdapter.ts
│   │   ├── MockPlatformAdapter.ts
│   │   ├── PlatformTypes.ts
│   │   └── ScoreRepository.ts
│   ├── styling/
│   │   ├── StyleManager.ts
│   │   ├── CssTokenReader.ts
│   │   ├── ProfileStyleParser.ts
│   │   ├── StyleResolver.ts
│   │   ├── CharacterMaterialUpdater.ts
│   │   └── StyleTypes.ts
│   ├── input/
│   │   ├── InputManager.ts
│   │   ├── KeyboardController.ts
│   │   └── TouchController.ts
│   ├── ui/
│   │   ├── LoadingScreen.ts
│   │   ├── ReadyScreen.ts
│   │   ├── GameHUD.ts
│   │   ├── PauseScreen.ts
│   │   ├── GameOverScreen.ts
│   │   ├── ErrorScreen.ts
│   │   └── StyleSimulator.ts
│   ├── utils/
│   │   ├── Random.ts
│   │   ├── MathUtils.ts
│   │   └── PerformanceMonitor.ts
│   └── styles/
│       ├── base.css
│       ├── game.css
│       ├── hud.css
│       └── simulator.css
├── tests/
│   ├── unit/
│   ├── integration/
│   └── gameplay/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
├── .gitignore
└── README.md
```

This is the recommended logical organization, not a requirement to create empty files for every module immediately.

A coding agent may consolidate small modules where appropriate, but it must preserve the architectural boundaries and keep platform integration and styling logic independently testable.

## 11.3 Responsibilities

### `Game`

Owns gameplay lifecycle, initialization, start, pause, resume, restart, and disposal.

### `GameLoop`

Owns simulation timing and rendering coordination.

### `GameWorld`

Owns the Three.js scene, camera, renderer, lighting, and environmental objects.

### `PlayerCharacter`

Creates and manages the procedural character mesh hierarchy, materials, and character animations.

### `PlayerController`

Owns lane movement, jump state, movement interpolation, and gameplay-related player behavior.

### `ObstacleManager`

Owns obstacle spawning, object reuse, active obstacle tracking, and cleanup.

### `CollectibleManager`

Owns collectible generation, collection state, and cleanup.

### `CollisionSystem`

Calculates player-object collisions and reports gameplay events.

### `ScoreSystem`

Calculates the current score, distance, survival duration, collectible count, and final run result.

### `DifficultySystem`

Controls speed and obstacle-spawning progression.

### `PlatformAdapter`

Defines the contract for authenticated identity, profile data, theme notifications, and score persistence.

### `StartNgAdapter`

Connects the application to the real, verified start.ng integration.

It must not contain fake production API URLs or undocumented authentication assumptions.

### `MockPlatformAdapter`

Supplies deterministic local identity, profile styling, simulated platform styling changes, and development-only score persistence.

### `StyleManager`

Owns the current styling inputs, subscriptions, validation coordination, and application of resolved styles.

### `StyleResolver`

Combines defaults, user profile styling, platform CSS tokens, and permitted development overrides according to the precedence rules.

### `StyleSimulator`

Provides development-only controls and feeds changes through the shared styling pipeline.

---

# 12. Platform Adapter Contract

## 12.1 Purpose

The game must not depend directly on the response format of start.ng API calls.

Define an application-level interface that the verified production integration and the local mock implementation both satisfy.

The following is a conceptual TypeScript contract. Adjust signatures where actual platform capabilities require it, while preserving equivalent behavior.

```typescript
export interface PlatformUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  badge?: {
    label?: string;
    imageUrl?: string;
  };
  styling?: unknown;
}

export interface RunResult {
  runId: string;
  userId: string;
  score: number;
  durationMs: number;
  distance: number;
  collectibles: number;
  gameVersion: string;
}

export interface ScoreRecord {
  highScore: number;
  updatedAt?: string;
}

export interface ScoreSubmissionResult {
  saved: boolean;
  highScore: number;
  isNewBest: boolean;
}

export interface PlatformAdapter {
  getCurrentUser(): Promise<PlatformUser | null>;

  getUserStyling(
    user: PlatformUser
  ): Promise<unknown>;

  getHighScore(
    user: PlatformUser
  ): Promise<ScoreRecord>;

  submitScore(
    result: RunResult
  ): Promise<ScoreSubmissionResult>;

  subscribeUserChanges(
    callback: (user: PlatformUser | null) => void
  ): () => void;

  subscribePlatformStyleChanges(
    callback: () => void
  ): () => void;

  getMode(): "start.ng" | "mock";

  dispose(): void;
}
```

The signature is illustrative and may be adapted to the real platform integration.

Where a platform does not provide a dedicated method or event, implement the documented equivalent or explicitly report the limitation.

Do not silently replace unsupported production behavior with browser storage.

## 12.2 Initialization

The application should choose the adapter using an explicit runtime configuration.

Conceptually:

```typescript
const platformAdapter =
  isApprovedLocalDevelopmentEnvironment()
    ? createConfiguredDevelopmentAdapter()
    : createStartNgAdapter();
```

The adapter selection logic must ensure that a public production deployment cannot enter mock mode because the live platform service is unavailable.

For production, `StartNgAdapter` must be connected to the verified start.ng identity and persistence mechanism.

If the necessary integration details are unavailable, keep the adapter contract testable and isolate the missing dependency.

## 12.3 Cross-Origin Embedding

If start.ng hosts the game in an iframe, the integration must account for browser origin restrictions.

Requirements:

- Confirm whether the deployment is same-origin or cross-origin.
- Prefer the officially supported platform embedding and messaging mechanism.
- Validate message origins against an explicit allowlist.
- Validate message schemas before processing messages.
- Reject unexpected message types and malformed payloads.
- Do not accept authentication identity from arbitrary websites.
- Do not expose session tokens through unnecessary messages.
- Clean up event listeners during teardown.

Define namespaced message types only as part of the agreed host-game contract. Do not assume that such messages already exist on start.ng.

If the game is served through a different origin and score submission needs authenticated server communication, the integration must comply with the platform's actual session, CORS, and request-signing requirements.

---

# 13. Rendering and Performance Requirements

## 13.1 Rendering Loop

Use `requestAnimationFrame` for rendering and simulation coordination.

The implementation must have exactly one active main animation loop per game instance.

Use delta time for movement, animation, speed progression, and simulation calculations.

To avoid unstable large movements after a long frame:

- Clamp simulation delta time to a documented maximum.
- Use a fixed or semi-fixed simulation step if necessary.
- Limit catch-up updates after browser stalls.
- Ensure that collisions and gameplay timing remain consistent across frame rates.

Rendering and gameplay simulation must not assume that every device can maintain precisely 60 FPS.

## 13.2 Frame-Rate Target

Target performance:

- 60 FPS on supported desktop hardware and representative modern mobile devices.
- Approximately 16.7 milliseconds per frame at the 60 FPS target.
- Graceful degradation on weaker devices.

The test team must record the devices and browsers used to evaluate performance.

The 60 FPS target is a performance objective to validate, not a guarantee that every device will sustain it under every condition.

## 13.3 Renderer Configuration

Configure the Three.js renderer responsibly.

Requirements:

- Use antialiasing where its performance cost is acceptable.
- Cap the device pixel ratio, initially at 2.
- Resize the renderer and camera when the canvas dimensions change.
- Avoid unnecessarily large shadow maps.
- Use a restrained number of lights.
- Prefer emissive materials to excessive dynamic lighting.
- Avoid expensive post-processing unless profiling justifies it.
- Use object pooling for frequently spawned objects.
- Reuse geometry and materials.
- Dispose of resources when they are permanently removed.

Do not create separate WebGL renderers for each game state or character style.

## 13.4 Environment Performance

The environment should give the impression of a continuous world without creating an unbounded number of objects.

Requirements:

- Recycle road sections or repeated structures.
- Maintain a configured limit on active obstacles.
- Maintain a configured limit on active collectibles.
- Limit particle emission rates.
- Reuse particle geometries and materials.
- Avoid creating a new material every frame.
- Avoid allocating new meshes on every animation step.
- Remove event listeners during teardown.
- Prevent multiple style observers from accumulating after restarts.

## 13.5 Camera

Use a perspective camera positioned behind and above the player, angled toward the track.

The camera must:

- Keep the character visible.
- Show enough track ahead to support obstacle anticipation.
- Avoid clipping the player or major obstacles.
- Support responsive aspect ratios.
- Remain stable during jumps and lane changes.
- Avoid excessive camera shake.

Optional subtle FOV changes may communicate speed increases, but they must not make obstacle judgment difficult.

## 13.6 Lighting and Effects

Use a small number of effective light sources.

Recommended:

- Ambient or hemisphere lighting.
- A primary directional light.
- Limited local lights where visually necessary.
- Emissive surfaces for neon accents.
- Optional restrained fog.
- Lightweight collection and collision effects.

If bloom is implemented, configure the rendering pipeline carefully, monitor GPU cost, and provide a fallback that retains the intended neon appearance without post-processing.

## 13.7 Canvas Resize

The rendering canvas must adapt to:

- Window resizing.
- Device orientation changes.
- Parent container resizing.
- Changes in available viewport dimensions.

Update the renderer dimensions and camera aspect ratio when necessary.

Use `ResizeObserver` where appropriate for container-driven layouts.

Do not recreate the entire scene on every resize event.

---

# 14. User Interface and Responsive Design

## 14.1 Layout

The game should occupy the available container or viewport without forcing the user to scroll during active gameplay.

Recommended layout hierarchy:

- Application shell.
- Game canvas.
- Overlay UI layer.
- State-specific screens.
- HUD.
- Development-only simulator.

The HTML/CSS interface must remain separate from the Three.js scene graph.

## 14.2 Visual Hierarchy

The most important elements are:

1. Player and upcoming obstacles.
2. Current score.
3. Immediate gameplay controls.
4. Current user identity.
5. Secondary information such as personal best, collectible count, and speed.

The interface must not obscure important sections of the track.

## 14.3 Desktop

On desktop:

- Use the full available game area.
- Keep the profile and personal best accessible.
- Display the active score clearly.
- Provide accessible on-screen pause controls.
- Keep any development tooling visually separate from normal gameplay.

## 14.4 Mobile

On mobile:

- Adapt to portrait and landscape orientation.
- Keep the canvas within the visible viewport.
- Place HUD information away from primary swipe regions.
- Use appropriately sized buttons.
- Respect safe-area insets on devices that require them.
- Avoid accidental browser refresh or scroll gestures during gameplay.
- Support changes in viewport height when mobile browser controls appear or disappear.

The game should remain playable in portrait orientation, although landscape may be recommended for the best experience.

## 14.5 Accessibility

The interface must include:

- Semantic HTML controls.
- Accessible labels for icon-only buttons.
- Visible keyboard focus indicators.
- Sufficient contrast between text and background.
- Non-color indicators for important gameplay states.
- A reduced-motion preference for appropriate interface and nonessential effects.
- Clear error messages.
- Keyboard-accessible menus and ready/game-over screens.

The core gameplay may require movement and reaction, but the surrounding interface must remain usable with standard accessibility tools.

---

# 15. Error Handling

## 15.1 Authentication Errors

If the user is signed out:

- Display the appropriate sign-in instruction.
- Do not start a production run associated with an anonymous mock identity.
- Preserve a clear retry path after the user signs in.

If authentication cannot be verified:

- Show an appropriate service error.
- Provide a retry action.
- Do not silently create a new production identity.

## 15.2 Styling Errors

If styling JSON is invalid or missing:

- Use valid fallback styling.
- Preserve gameplay.
- Report a development diagnostic where appropriate.
- Avoid repeated console warnings on every render frame.
- Avoid crashing the character renderer.

If one property is invalid, apply defaults to that property while retaining other valid values.

## 15.3 Score Persistence Errors

If high-score retrieval fails:

- Show that the personal best could not be retrieved.
- Allow gameplay if the user remains authenticated and the platform's rules permit it.
- Do not claim a local value is an authoritative high score.

If score submission fails:

- Keep the final result available.
- Display a clear persistence status.
- Provide a retry action when appropriate.
- Prevent duplicate submissions.
- Preserve the association between the result and its run ID.

If the platform cannot guarantee score integrity from client-submitted values, implement or request server-side validation rather than claiming that client-side checks prevent score manipulation.

## 15.4 Rendering Errors

If WebGL is unavailable or renderer initialization fails, display a readable compatibility message.

If the WebGL context is lost, pause the game and attempt recovery only when supported.

All cleanup paths must dispose of resources and event listeners appropriately.

## 15.5 Network Errors

All platform requests must have explicit error handling.

The interface should distinguish between:

- Authentication failure.
- Profile-loading failure.
- High-score retrieval failure.
- Score-submission failure.
- General connectivity problems.

Do not swallow errors silently or log expected transient failures repeatedly during gameplay.

---

# 16. Security and Data Integrity

## 16.1 Identity Security

Production identity must originate from the verified start.ng authentication mechanism.

The client-provided user ID is used for local association and display, not as an independent authentication credential.

The persistence service must associate submitted results with the authenticated session.

## 16.2 Styling Input Safety

Profile styling data is untrusted input.

The game must:

- Validate values against an allowlisted schema.
- Parse only expected data types.
- Restrict colors to supported color formats.
- Restrict patterns and accessories to known identifiers.
- Clamp numeric values.
- Avoid inserting profile content into HTML without safe text handling.
- Never execute strings from profile data.
- Avoid loading arbitrary scripts or code through styling properties.

Remote images used for avatars or badges should follow the platform's approved URL policy.

A missing or inaccessible external image must not prevent the game from loading.

## 16.3 Score Integrity

The browser is not a trusted environment.

Production score persistence should apply server-side validation appropriate to the game, including:

- Authenticated-user verification.
- Numeric range validation.
- Duplicate-run detection.
- Run submission limits where appropriate.
- Reasonableness checks for score, duration, distance, and collectibles.

Where practical, the platform may apply more comprehensive anti-cheat validation.

Do not implement client-side checks and describe them as tamper-proof.

## 16.4 Secrets

Never commit secrets to the repository.

Do not embed privileged API keys or platform server credentials in client-side environment variables.

Any environment variable prefixed for inclusion in the browser bundle must be treated as public.

---

# 17. Configuration

Centralize game, platform, rendering, and development options.

Suggested configuration categories:

### Gameplay

- Lane positions.
- Starting speed.
- Maximum speed.
- Speed progression duration.
- Jump velocity.
- Gravity.
- Obstacle spawn intervals.
- Obstacle spawn probabilities.
- Collision dimensions.
- Collectible score value.
- Distance score rate.

### Rendering

- Initial camera position.
- Field of view.
- Maximum device pixel ratio.
- Fog parameters.
- Lighting intensity.
- Particle limits.
- Environment recycling distance.

### Styling

- Default character colors.
- Emissive intensity.
- Glow intensity.
- Supported patterns.
- Supported accessories.
- CSS token names.
- Style resolution precedence.

### Platform

- Integration mode.
- Approved host origins.
- Development mock configuration.
- Platform timeout settings.
- Score submission retry behavior.

### Development

- Style simulator availability.
- Diagnostic logging.
- Performance monitoring.
- Deterministic random seed for automated tests.

Do not scatter configuration values across gameplay classes.

---

# 18. Testing Strategy

## 18.1 Unit Tests

Create unit tests for:

- Game-state transitions.
- Lane clamping and movement.
- Jump initiation and landing.
- Score calculation.
- Difficulty progression.
- Collision boundaries.
- Collectible collection.
- Styling JSON validation.
- CSS token parsing.
- Style precedence.
- Character style resolution.
- Development mock score persistence.
- Duplicate score-submission prevention.

These tests must not require live start.ng credentials.

## 18.2 Integration Tests

Test the following workflows:

- Application initialization with a mock user.
- Ready screen initialization.
- Profile styling application.
- Live styling changes.
- Identity change handling.
- Starting a run.
- Pausing and resuming.
- Ending a run after collision.
- Successful score submission through a mocked platform adapter.
- Failed score submission and retry.
- High-score update after a successful response.
- Simulator override and reset.
- Renderer cleanup.

## 18.3 Gameplay Tests

Verify that:

- A left input changes the target lane.
- A right input changes the target lane.
- Outer lanes cannot be exceeded.
- Jumping clears the appropriate low barriers.
- Ground collisions end the run.
- Uncollected nodes remain active until collected or recycled.
- Collection awards points exactly once.
- Difficulty increases as configured.
- Obstacles remain avoidable.
- Restarting produces a fresh run.
- Pausing freezes the simulation.
- Resuming does not duplicate the animation loop.

## 18.4 Styling Tests

The styling integration must be tested independently from actual production authentication.

Test:

1. Default styling without platform inputs.
2. Profile JSON overrides built-in defaults.
3. CSS tokens override corresponding profile values.
4. Missing CSS tokens preserve valid profile values.
5. Invalid CSS tokens fall back safely.
6. Valid CSS changes update the character.
7. Profile JSON changes update the character.
8. Simulator overrides take precedence while active.
9. Resetting simulator overrides restores the correct source values.
10. Styling updates do not recreate the renderer.
11. Styling updates do not reset gameplay.
12. Styling continues to work after restarts.
13. Invalid profile data does not crash the game.
14. A user change does not leak the previous user's styling into the new session.

## 18.5 Browser Tests

Validate the core experience using current supported desktop and mobile browsers.

At minimum, verify:

- Chrome desktop.
- Firefox desktop.
- Safari desktop where available.
- Android Chrome.
- iOS Safari.

Verify that the application works at different viewport sizes and device pixel ratios.

## 18.6 Production Integration Tests

Before declaring platform integration complete, verify with a real start.ng environment:

- Authenticated identity is retrieved from the actual platform.
- The user's username and ID are mapped correctly.
- Profile styling JSON is retrieved and normalized correctly.
- Root CSS variables are resolved correctly in the deployment context.
- Cross-origin restrictions are handled where applicable.
- A completed run is associated with the correct authenticated user.
- The personal best is retrieved from the supported persistence mechanism.
- Successful submissions update the authoritative record.
- A logged-out session cannot impersonate a logged-in user.
- Production cannot silently use a mock identity.

Mock tests alone do not satisfy these requirements.

---

# 19. Acceptance Criteria

The following checklist defines the minimum completion conditions for the MVP.

## 19.1 Core Game

- [ ] The application loads in a supported modern browser.
- [ ] Three.js renders a playable 3D environment.
- [ ] The player character is constructed procedurally.
- [ ] The road and core environment use procedural geometry.
- [ ] No external 3D model pack is required for core gameplay.
- [ ] The player can move left and right between three lanes.
- [ ] The player can jump.
- [ ] The player can collide with obstacles.
- [ ] A valid obstacle collision ends the run exactly once.
- [ ] Energy nodes can be collected.
- [ ] Each collectible awards points only once.
- [ ] Difficulty increases according to configured progression.
- [ ] The game-over screen displays the final score.
- [ ] The player can restart without reloading the page.
- [ ] The player can return to the ready screen.
- [ ] Pause and resume preserve the current run state.

## 19.2 Platform Authentication

- [ ] Production uses a verified start.ng authentication integration.
- [ ] The game does not introduce a separate login system.
- [ ] The authenticated username is displayed.
- [ ] The stable platform user ID is mapped correctly.
- [ ] An available avatar is displayed correctly.
- [ ] An available platform badge is displayed correctly.
- [ ] Missing optional profile fields are handled gracefully.
- [ ] An unauthenticated production session is not silently converted to a mock user.
- [ ] A platform authentication failure produces a clear error or retry state.
- [ ] Identity changes are handled without mixing user data.
- [ ] Mock identity fallback is restricted to approved local development environments.

## 19.3 Character Styling

- [ ] The character uses a reusable procedural mesh hierarchy.
- [ ] The built-in style defaults are applied correctly.
- [ ] User profile styling JSON is parsed and validated.
- [ ] Root platform CSS custom properties are read when accessible.
- [ ] A supported host-message bridge is used when cross-origin restrictions prevent direct style access.
- [ ] CSS property values override the corresponding profile JSON values.
- [ ] Profile JSON supplies properties not overridden by CSS tokens.
- [ ] Invalid styling values do not crash rendering.
- [ ] Character colors change without a page reload.
- [ ] Emissive properties affect the intended materials.
- [ ] Pattern changes affect the character's appearance.
- [ ] Accessory changes affect the character's geometry.
- [ ] Styling changes work during active gameplay.
- [ ] Styling changes preserve the current score and gameplay state.
- [ ] Styling changes do not recreate the entire scene or renderer.
- [ ] Old style observers and event listeners are cleaned up correctly.

## 19.4 Live Style Simulator

- [ ] The simulator is available on localhost.
- [ ] The simulator is collapsed by default.
- [ ] The simulator exposes the supported styling controls.
- [ ] CSS token overrides can be tested.
- [ ] Profile JSON can be inspected and edited.
- [ ] Malformed JSON displays a useful error.
- [ ] Applying valid styling changes updates the character.
- [ ] Resetting overrides restores the underlying styling inputs.
- [ ] Resetting the simulator does not modify production profile data.
- [ ] The simulator remains functional during a run.
- [ ] Production builds do not expose unauthorized simulator controls.
- [ ] Diagnostic information does not reveal authentication secrets.

## 19.5 Scoring and Persistence

- [ ] Every run has a unique identifier.
- [ ] Score calculation is deterministic for a given run result.
- [ ] The correct user is associated with a submitted score.
- [ ] The personal best is retrieved through the platform integration.
- [ ] New personal bests are detected.
- [ ] A completed run is submitted through the platform's supported persistence mechanism.
- [ ] The interface distinguishes successful and unsuccessful persistence.
- [ ] Failed submissions can be retried where appropriate.
- [ ] Duplicate submission attempts are handled safely.
- [ ] Production does not treat local browser storage as the authoritative high-score source.
- [ ] Mock scores persist between local development sessions.
- [ ] Production score validation does not rely solely on client-provided identity or score values.

## 19.6 Controls and Responsiveness

- [ ] `A` and `D` control lane movement.
- [ ] Arrow keys control lane movement.
- [ ] `Space` initiates jumping.
- [ ] Mobile left and right swipes change lanes.
- [ ] A mobile upward swipe initiates jumping.
- [ ] Touch input does not accidentally trigger unwanted page scrolling during play.
- [ ] HUD and controls fit supported desktop viewports.
- [ ] HUD and controls fit supported mobile viewports.
- [ ] The canvas resizes correctly with the viewport and container.
- [ ] Camera aspect ratio updates after resizing.
- [ ] The game remains playable in portrait and landscape orientations.
- [ ] The interface remains usable by keyboard outside active gameplay.

## 19.7 Performance

- [ ] The game targets 60 FPS on representative supported desktop devices.
- [ ] Performance is evaluated on representative modern mobile devices.
- [ ] Device pixel ratio is capped appropriately.
- [ ] The renderer uses a single main animation loop.
- [ ] Gameplay simulation uses delta time or an equivalent frame-rate-independent method.
- [ ] Large frame delays do not cause uncontrolled movement.
- [ ] Active objects are reused where practical.
- [ ] Geometry and materials are reused where practical.
- [ ] The number of obstacles and particles is bounded.
- [ ] Long sessions do not exhibit unbounded scene-object growth.
- [ ] Repeated restarts do not leak event listeners or create additional render loops.
- [ ] Styling updates do not trigger unnecessary scene reconstruction.
- [ ] The game handles WebGL initialization failures gracefully.

## 19.8 Code Quality and Stability

- [ ] TypeScript compilation succeeds.
- [ ] The production build completes successfully.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] Core gameplay tests pass.
- [ ] Styling precedence tests pass.
- [ ] No uncaught runtime exceptions occur during normal gameplay.
- [ ] No unexpected console errors occur during the validated test workflows.
- [ ] No unhandled promise rejections occur during normal gameplay.
- [ ] Failed network requests are handled intentionally rather than producing uncontrolled errors.
- [ ] All application-created observers, listeners, renderers, and resources have an appropriate cleanup path.
- [ ] No production secrets are committed or bundled.
- [ ] No fake production start.ng endpoints or undocumented authentication APIs are used.
- [ ] README documentation explains local setup and platform integration configuration.

**Performance acceptance note:** "60 FPS target" must be evaluated with a documented test environment and representative gameplay scenario. The acceptance goal is stable performance close to 60 FPS on supported devices, not an unsupported guarantee for every device.

**Console acceptance note:** Known, deliberately handled failures may be exercised in dedicated error-path tests. They must not generate repeated, unhandled console errors during ordinary application use.

---

## 20. Deployment Requirements

### 20.1 Build

The application must produce a production build that can be hosted through the deployment mechanism supported by start.ng.

Requirements:

- Production assets must be generated through the build tool.
- File paths and asset references must respect the deployment base path.
- The application must not assume it is served from the root of a domain unless confirmed.
- Environment-specific integration settings must be configured separately from source code.
- Development-only simulator code or controls must not become publicly usable by accident.
- The deployed version must use the actual platform adapter.
- The application must be tested in its real embedding or hosting context.

### 20.2 Embedding

If the game is embedded into an existing start.ng page:

- Match the platform's required iframe or embedding configuration.
- Ensure the canvas fills the intended content area.
- Confirm whether the host page and game share an origin.
- Configure permitted frame ancestors and other security policies appropriately.
- Ensure the host allows required JavaScript execution and WebGL operations.
- Verify keyboard and touch behavior within the embedding context.
- Handle viewport resizing correctly.
- Ensure style and identity integration works in the deployed page, not just localhost.

Do not assume a cross-origin iframe can read platform cookies, DOM state, or CSS custom properties.

### 20.3 Persistence

Production high-score persistence must use the verified platform data service or an approved integration supplied by the platform.

The implementation must not introduce a separate production database solely to make mock functionality appear complete when an existing platform service is expected to provide persistence.

If the platform does not currently expose an appropriate persistence mechanism, document the missing capability and propose the smallest required integration contract before presenting production persistence as complete.

### 20.4 Documentation

The repository README must explain:

- Required runtime and tooling.
- Installation commands.
- Local development commands.
- Test commands.
- Production build commands.
- How local mock mode works.
- How to enable the style simulator locally.
- How CSS tokens are read and resolved.
- The normalized profile styling JSON schema.
- How the platform adapter is configured.
- Required start.ng integration dependencies.
- How to verify score persistence.
- Known platform integration limitations.

The documentation must distinguish implemented functionality from configuration that still requires access to the real platform.

---

## 21. Implementation Sequence for Google Antigravity

Implement the product in sequential phases. Keep each phase small enough to build, run, and verify before proceeding.

### Phase 1: Repository and Environment

1. Inspect the existing repository before changing files.
2. Identify existing framework, package manager, build tools, and conventions.
3. Initialize the project only where necessary.
4. Configure TypeScript and Vite.
5. Install and pin compatible dependencies.
6. Create the initial application entry point.
7. Verify local startup and production compilation.

**Exit criteria:** The project starts locally, compiles successfully, and has a documented development command.

### Phase 2: Three.js Foundation

1. Initialize the renderer, scene, camera, and lighting.
2. Implement responsive canvas sizing.
3. Create the road and three-lane layout.
4. Add a procedural player character.
5. Add a basic environment loop.
6. Implement resource cleanup.
7. Add basic performance diagnostics.

**Exit criteria:** A stable 3D environment renders and resizes correctly.

### Phase 3: Character Styling Pipeline

1. Define the normalized styling schema.
2. Implement CSS token parsing.
3. Implement profile JSON validation.
4. Implement style precedence.
5. Implement material and accessory updates.
6. Add the built-in fallback styling.
7. Write styling unit tests.
8. Verify that live changes do not recreate the scene.

**Exit criteria:** Test code can change the character's appearance dynamically through the styling pipeline.

### Phase 4: Platform Adapter and Mock Identity

1. Define the platform adapter contract.
2. Implement the mock adapter.
3. Implement local mock user retrieval.
4. Implement development-only high-score persistence.
5. Implement simulated platform style-change events.
6. Add tests for authentication state and adapter behavior.
7. Inspect and verify the actual start.ng integration contract.
8. Implement production mapping where the necessary documentation and platform capabilities are available.

**Exit criteria:** Local development works without platform credentials, and the production adapter has a clearly defined, verifiable integration boundary.

Do not fabricate production API details to bypass missing platform documentation.

### Phase 5: Gameplay Systems

1. Implement player lane movement.
2. Implement jumping.
3. Implement keyboard input.
4. Implement touch and swipe input.
5. Add the obstacle system.
6. Add collectible spawning and collection.
7. Implement collision detection.
8. Implement scoring.
9. Implement difficulty progression.
10. Implement game-over handling.

**Exit criteria:** A complete run can be played and completed through collision, with correct scoring.

### Phase 6: UI and Game States

1. Implement loading and authentication states.
2. Implement the ready screen.
3. Add user identity and personal-best displays.
4. Add character idle animation.
5. Implement the active gameplay HUD.
6. Implement pause and resume.
7. Implement game-over presentation.
8. Implement replay and return-to-menu actions.
9. Handle loading and error states.

**Exit criteria:** Every required game state works without page reloads.

### Phase 7: Live Style Simulator

1. Implement the collapsible panel.
2. Add platform CSS token controls.
3. Add profile styling JSON controls.
4. Connect controls to the shared style manager.
5. Add validation and diagnostic states.
6. Add reset and copy actions.
7. Restrict availability to approved development configurations.
8. Test styling changes during gameplay.

**Exit criteria:** Developers can simulate central platform styling and immediately observe the resulting character appearance.

### Phase 8: Score Persistence

1. Implement high-score retrieval through the adapter.
2. Implement run IDs and final run payloads.
3. Connect to the verified production persistence service.
4. Implement save status and retry behavior.
5. Handle duplicate submissions.
6. Add failure-path tests.
7. Verify correct authenticated-user association.

**Exit criteria:** Completed runs use the approved score persistence path, and the authoritative personal best is displayed correctly.

### Phase 9: Performance and Quality

1. Profile the render loop.
2. Optimize geometry and material reuse.
3. Tune object pooling.
4. Verify collision consistency.
5. Test responsive layouts.
6. Test browser visibility and pause behavior.
7. Check resource cleanup.
8. Run unit and integration suites.
9. Verify the browser console during normal workflows.
10. Produce a release build.

**Exit criteria:** The MVP passes its functional, styling, stability, and documented performance checks.

### Phase 10: start.ng Deployment

1. Configure the verified production integration.
2. Build using production settings.
3. Deploy using the platform-supported hosting or embedding mechanism.
4. Test the game under a real authenticated start.ng account.
5. Change platform styling and verify immediate character updates.
6. Submit a completed run and verify high-score persistence.
7. Test a signed-out session.
8. Verify that production mock fallback is disabled.
9. Document deployment configuration and remaining known limitations.

**Exit criteria:** The game operates correctly in the actual start.ng environment rather than only in local development.

---

## 22. Definition of Done

Neon Drift is complete when all of the following conditions are satisfied:

1. The core Three.js runner is playable from start to game over.
2. Keyboard and mobile controls work as specified.
3. The environment, player, obstacles, and collectibles are procedurally generated.
4. The ready screen displays the authenticated start.ng user's identity.
5. The character's styling comes from the supported platform CSS and profile JSON inputs.
6. Applicable central style changes update the character immediately.
7. The development style simulator exercises the same styling pipeline used in production.
8. The game works locally using a dedicated mock user without requiring platform credentials.
9. Production authentication uses the actual verified start.ng integration.
10. Completed runs are submitted through the supported persistence mechanism.
11. Personal high scores are retrieved and updated authoritatively.
12. Performance, responsive behavior, and error handling satisfy the acceptance criteria.
13. Automated tests pass.
14. The production build succeeds.
15. No unexpected console errors occur during the validated normal workflows.
16. Deployment and integration instructions are documented.
17. Any unsupported or unverified start.ng capability is explicitly documented rather than simulated as if it were a production integration.

---

## 23. Final Instructions for the AI Coding Agent

Treat this document as the source of truth for product behavior and acceptance requirements.

Before writing code, inspect the existing repository and identify whether any of the required infrastructure already exists. Preserve working functionality and follow established project conventions where appropriate.

Implement the game in the order specified in Section 21. Prefer small, testable changes over generating the entire application in one unverified step.

The following requirements are non-negotiable:

- Use Three.js for the 3D game.
- Use procedural geometry for the core character and environment.
- Use start.ng's actual authenticated identity in production.
- Support root CSS custom properties and user profile styling JSON.
- Update the character appearance dynamically without rebuilding the scene.
- Include the localhost mock user.
- Include the collapsible development-only style simulator.
- Implement functional gameplay, scoring, and personal high-score persistence.
- Meet the responsive and performance targets as verified on representative devices.
- Handle errors explicitly.
- Do not fabricate platform APIs, endpoints, or capabilities.

When a production integration depends on undocumented start.ng functionality, isolate the dependency behind the platform adapter, finish the independently testable game components, and document precisely what platform information is still required.

Do not mark an integration complete merely because the mock implementation passes its tests.

The final result must be a working, polished, responsive 3D game—not just a Three.js scene, static interface, or visual prototype.
