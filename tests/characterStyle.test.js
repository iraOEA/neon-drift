import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerCharacter, FINISH_PRESETS, LANE_COORDINATES } from '../src/character.js';

describe('PlayerCharacter — Hierarchy and Styling', () => {
  let character;

  beforeEach(() => {
    character = new PlayerCharacter();
  });

  it('contains all required discoverable node names per ARCHITECTURE.md §5.2', () => {
    const root = character.rootGroup;
    expect(root.name).toBe('PlayerCharacter');

    // Find named nodes in hierarchy
    const body = root.getObjectByName('Body');
    const head = root.getObjectByName('Head');
    const visor = root.getObjectByName('Visor');
    const limbs = root.getObjectByName('Limbs');
    const armL = root.getObjectByName('Arm_L');
    const armR = root.getObjectByName('Arm_R');
    const legL = root.getObjectByName('Leg_L');
    const legR = root.getObjectByName('Leg_R');
    const halo = root.getObjectByName('Accessory_Halo');
    const wings = root.getObjectByName('Accessory_Wings');
    const wingL = root.getObjectByName('Wing_L');
    const wingR = root.getObjectByName('Wing_R');
    const crown = root.getObjectByName('Accessory_Crown');
    const trail = root.getObjectByName('Trail');

    expect(body).toBeDefined();
    expect(head).toBeDefined();
    expect(visor).toBeDefined();
    expect(limbs).toBeDefined();
    expect(armL).toBeDefined();
    expect(armR).toBeDefined();
    expect(legL).toBeDefined();
    expect(legR).toBeDefined();
    expect(halo).toBeDefined();
    expect(wings).toBeDefined();
    expect(wingL).toBeDefined();
    expect(wingR).toBeDefined();
    expect(crown).toBeDefined();
    expect(trail).toBeDefined();
  });

  it('enforces mutually exclusive accessory visibility per ARCHITECTURE.md §5.3', () => {
    const halo = character.rootGroup.getObjectByName('Accessory_Halo');
    const wings = character.rootGroup.getObjectByName('Accessory_Wings');
    const crown = character.rootGroup.getObjectByName('Accessory_Crown');
    const visor = character.rootGroup.getObjectByName('Visor');

    // 1. None
    character.applyCentralStyling({ accessory: 'none' });
    expect(halo.visible).toBe(false);
    expect(wings.visible).toBe(false);
    expect(crown.visible).toBe(false);
    expect(visor.visible).toBe(true);

    // 2. Halo
    character.applyCentralStyling({ accessory: 'halo' });
    expect(halo.visible).toBe(true);
    expect(wings.visible).toBe(false);
    expect(crown.visible).toBe(false);

    // 3. Wings
    character.applyCentralStyling({ accessory: 'wings' });
    expect(halo.visible).toBe(false);
    expect(wings.visible).toBe(true);
    expect(crown.visible).toBe(false);

    // 4. Visor-Crown
    character.applyCentralStyling({ accessory: 'visor-crown' });
    expect(halo.visible).toBe(false);
    expect(wings.visible).toBe(false);
    expect(crown.visible).toBe(true);
  });

  it('updates material colors and finish properties in-place without reallocating materials', () => {
    const originalPrimaryMat = character.primaryMaterial;
    const originalAccentMat = character.accentMaterial;
    const originalSurfaceMat = character.surfaceMaterial;

    // Apply neon style
    character.applyCentralStyling({
      primaryColor: '#ff0055',
      accentColor: '#00ffcc',
      surfaceColor: '#222233',
      finishType: 'neon',
      themeMode: 'dark'
    });

    // Material references must remain identical (zero-reallocation rule)
    expect(character.primaryMaterial).toBe(originalPrimaryMat);
    expect(character.accentMaterial).toBe(originalAccentMat);
    expect(character.surfaceMaterial).toBe(originalSurfaceMat);

    // Color values must reflect new inputs
    expect(character.primaryMaterial.color.getHexString().toLowerCase()).toBe('ff0055');
    expect(character.accentMaterial.color.getHexString().toLowerCase()).toBe('00ffcc');

    // PBR presets for neon
    expect(character.primaryMaterial.metalness).toBe(FINISH_PRESETS.neon.primary.metalness);
    expect(character.primaryMaterial.roughness).toBe(FINISH_PRESETS.neon.primary.roughness);
    expect(character.primaryMaterial.emissiveIntensity).toBe(FINISH_PRESETS.neon.primary.emissiveIntensity);

    // Apply light mode: emissive intensity should be multiplied by 0.85
    character.applyCentralStyling({
      finishType: 'neon',
      themeMode: 'light'
    });
    expect(character.primaryMaterial.emissiveIntensity).toBeCloseTo(FINISH_PRESETS.neon.primary.emissiveIntensity * 0.85, 4);
  });

  it('correctly manages 3-lane movement with boundary clamping', () => {
    expect(character.currentLane).toBe(1);
    expect(character.targetX).toBe(LANE_COORDINATES[1]); // 0

    // Shift left to lane 0
    character.moveLeft();
    expect(character.currentLane).toBe(0);
    expect(character.targetX).toBe(LANE_COORDINATES[0]); // -2.2

    // Cannot shift beyond left lane
    character.moveLeft();
    expect(character.currentLane).toBe(0);
    expect(character.targetX).toBe(LANE_COORDINATES[0]);

    // Shift right to lane 1, then lane 2
    character.moveRight();
    expect(character.currentLane).toBe(1);
    character.moveRight();
    expect(character.currentLane).toBe(2);
    expect(character.targetX).toBe(LANE_COORDINATES[2]); // 2.2

    // Cannot shift beyond right lane
    character.moveRight();
    expect(character.currentLane).toBe(2);
    expect(character.targetX).toBe(LANE_COORDINATES[2]);
  });

  it('implements arcade jump physics and prevents mid-air double jumping', () => {
    expect(character.isGrounded).toBe(true);
    expect(character.rootGroup.position.y).toBe(0);

    // Jump
    character.jump();
    expect(character.isGrounded).toBe(false);
    expect(character.verticalVelocity).toBeGreaterThan(0);

    const initialVel = character.verticalVelocity;
    // Attempt double jump while airborne -> velocity unchanged
    character.jump();
    expect(character.verticalVelocity).toBe(initialVel);

    // Simulate air progression (0.1s delta)
    character.update(0.1, 'PLAYING');
    expect(character.rootGroup.position.y).toBeGreaterThan(0);

    // Simulate descent until grounded
    for (let i = 0; i < 40; i++) {
      character.update(0.025, 'PLAYING');
    }

    expect(character.rootGroup.position.y).toBe(0);
    expect(character.isGrounded).toBe(true);
    expect(character.verticalVelocity).toBe(0);
  });
});
