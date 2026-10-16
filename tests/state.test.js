import { describe, it, expect } from 'vitest';
import { GameState, ALLOWED_TRANSITIONS } from '../src/main.js';

describe('GameState Machine — Transitions per ARCHITECTURE.md §9.1', () => {
  it('defines all required game states', () => {
    expect(GameState.BOOT).toBe('BOOT');
    expect(GameState.AUTHENTICATING).toBe('AUTHENTICATING');
    expect(GameState.LOADING_PROFILE).toBe('LOADING_PROFILE');
    expect(GameState.APPLYING_STYLE).toBe('APPLYING_STYLE');
    expect(GameState.READY).toBe('READY');
    expect(GameState.PLAYING).toBe('PLAYING');
    expect(GameState.PAUSED).toBe('PAUSED');
    expect(GameState.GAME_OVER).toBe('GAME_OVER');
    expect(GameState.SUBMITTING_SCORE).toBe('SUBMITTING_SCORE');
    expect(GameState.SCORE_SAVED).toBe('SCORE_SAVED');
    expect(GameState.ERROR).toBe('ERROR');
  });

  it('allows valid sequential startup handshake transitions', () => {
    // BOOT -> AUTHENTICATING
    expect(ALLOWED_TRANSITIONS[GameState.BOOT]).toContain(GameState.AUTHENTICATING);

    // AUTHENTICATING -> LOADING_PROFILE
    expect(ALLOWED_TRANSITIONS[GameState.AUTHENTICATING]).toContain(GameState.LOADING_PROFILE);

    // LOADING_PROFILE -> APPLYING_STYLE
    expect(ALLOWED_TRANSITIONS[GameState.LOADING_PROFILE]).toContain(GameState.APPLYING_STYLE);

    // APPLYING_STYLE -> READY
    expect(ALLOWED_TRANSITIONS[GameState.APPLYING_STYLE]).toContain(GameState.READY);
  });

  it('allows valid active run and scoring transitions', () => {
    // READY -> PLAYING
    expect(ALLOWED_TRANSITIONS[GameState.READY]).toContain(GameState.PLAYING);

    // PLAYING -> PAUSED and PLAYING -> GAME_OVER
    expect(ALLOWED_TRANSITIONS[GameState.PLAYING]).toContain(GameState.PAUSED);
    expect(ALLOWED_TRANSITIONS[GameState.PLAYING]).toContain(GameState.GAME_OVER);

    // PAUSED -> PLAYING and PAUSED -> READY
    expect(ALLOWED_TRANSITIONS[GameState.PAUSED]).toContain(GameState.PLAYING);
    expect(ALLOWED_TRANSITIONS[GameState.PAUSED]).toContain(GameState.READY);

    // GAME_OVER -> SUBMITTING_SCORE
    expect(ALLOWED_TRANSITIONS[GameState.GAME_OVER]).toContain(GameState.SUBMITTING_SCORE);

    // SUBMITTING_SCORE -> SCORE_SAVED
    expect(ALLOWED_TRANSITIONS[GameState.SUBMITTING_SCORE]).toContain(GameState.SCORE_SAVED);

    // SCORE_SAVED -> READY
    expect(ALLOWED_TRANSITIONS[GameState.SCORE_SAVED]).toContain(GameState.READY);
  });

  it('allows transitions to ERROR from any valid workflow state', () => {
    expect(ALLOWED_TRANSITIONS[GameState.BOOT]).toContain(GameState.ERROR);
    expect(ALLOWED_TRANSITIONS[GameState.AUTHENTICATING]).toContain(GameState.ERROR);
    expect(ALLOWED_TRANSITIONS[GameState.LOADING_PROFILE]).toContain(GameState.ERROR);
    expect(ALLOWED_TRANSITIONS[GameState.APPLYING_STYLE]).toContain(GameState.ERROR);
    expect(ALLOWED_TRANSITIONS[GameState.READY]).toContain(GameState.ERROR);
    expect(ALLOWED_TRANSITIONS[GameState.PLAYING]).toContain(GameState.ERROR);
    expect(ALLOWED_TRANSITIONS[GameState.GAME_OVER]).toContain(GameState.ERROR);
    expect(ALLOWED_TRANSITIONS[GameState.SUBMITTING_SCORE]).toContain(GameState.ERROR);
  });

  it('strictly rejects illegal transitions', () => {
    // Direct BOOT -> PLAYING is illegal (must authenticate first)
    expect(ALLOWED_TRANSITIONS[GameState.BOOT]).not.toContain(GameState.PLAYING);

    // Direct AUTHENTICATING -> PLAYING is illegal
    expect(ALLOWED_TRANSITIONS[GameState.AUTHENTICATING]).not.toContain(GameState.PLAYING);

    // Direct PLAYING -> BOOT is illegal
    expect(ALLOWED_TRANSITIONS[GameState.PLAYING]).not.toContain(GameState.BOOT);

    // Direct READY -> SCORE_SAVED is illegal
    expect(ALLOWED_TRANSITIONS[GameState.READY]).not.toContain(GameState.SCORE_SAVED);
  });
});
