# Emberwing Design Constitution

## Mission thesis

Emberwing is a cinematic low-level strike mission through hostile terrain.

**Get in. Survive the airspace. Destroy the primary target. Get out north.**

Everything in the game should reinforce that mission. Bandits, SAMs, terrain, audio and UI are complications around the strike — not separate minigames competing for attention.

## Non-negotiables

### 1. Mission first

The primary target is the launch installation. The player should always understand that the run is moving toward the strike and then toward extraction.

Fighter kills, SAM kills and route choices may help, but they must not become arbitrary gates unless the mission explicitly changes.

### 2. The world should explain danger before the HUD does

Threats should exist physically in the scene.

- SAMs launch from recognizable ground positions.
- Missile trajectories are visible in world space.
- Bandits approach, cross or close naturally rather than popping into existence.
- Terrain masking should be readable from geometry, not explained through tutorial text.

Warnings may reinforce danger, but text alone should never be the danger.

### 3. Clean visual field

Emberwing should feel sparse, deliberate and cinematic.

Keep:
- a subtle compass
- a restrained reticle / lock state
- minimal mission-control text
- the three-item objective progress stack
- essential hull and threat information

Avoid:
- mission panels
- busy telemetry
- persistent waypoint bugs
- excessive labels
- large banners
- decorative HUD chrome
- arcade speed lines
- gamified percentages

When in doubt, remove UI and make the world more legible.

### 4. Momentum without chaos

Quiet is allowed. Empty is not.

Current pacing target:
- hostile intent should become visible within roughly the first 5–10 seconds
- a meaningful decision or engagement should develop within roughly 8–15 seconds
- no 15–20 second stretch should pass with nothing meaningful changing

Do not solve pacing by flooding the player with enemies, alerts or effects. Prefer better sequencing, shorter dead transit and clearer physical threats.

### 5. Flight must feel direct

The aircraft should feel fast because of terrain proximity, parallax, audio, restrained FOV response and committed maneuvering.

Do not add camera behavior that makes control feel detached from player input. Preserve the current direct keyboard/touch flight response.

Canonical desktop controls:
- Arrows: pitch and bank
- Space: cannon
- Hold X: track; release X when locked: missile
- Hold Shift: turbo
- Double-tap Up: turbo burst
- R: restart

### 6. Objectives should reward progress quietly

The run has three primary objectives:

1. Penetrate Valley
2. Destroy Launch Site
3. Escape North

Completion should register with a small, satisfying muted-green check state. The objective stack is a progress signal, not a task panel. It should never compete with the center of the screen.

### 7. Restraint is part of the aesthetic

The target tone is austere, cinematic and dangerous: a large desert landscape, a fast aircraft, hostile machinery and brief moments of violence.

Effects should feel physical rather than ornamental. Explosions, smoke, vapor, lighting and audio can be strong, but they should remain grounded in an event the player caused or must react to.

### 8. One problem per pass

Future agent work should be surgical.

Before changing code:
1. Inspect the current canonical build.
2. Play or replay the affected section.
3. Identify one player-facing failure.
4. Make the smallest coherent change that addresses it.
5. Rebuild and test.
6. Review the actual experience, not only the diff.

Do not use broad refactors, new systems or visual restyling to solve a narrow pacing or clarity issue.

## Canonical project structure

The current game is:

- `index.html` / `play.html`
- `src/level1/core.js`
- `src/level1/assets.js`
- `src/level1/mission.js`
- `src/level1/flight.css`
- `src/level1/touch.css`

`scripts/build-level1.mjs` generates the bundled `game.js` and both public entry pages.

Historical numbered builds and release notes live under `archive/` and must not become build inputs again.

## Design test

Before adding anything, ask:

**Does this make the mission more physical, legible, urgent or beautiful without making the screen busier?**

If not, it probably does not belong in Emberwing.
