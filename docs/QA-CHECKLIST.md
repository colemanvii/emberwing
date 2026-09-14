# Emberwing QA Checklist

Use this before publishing any gameplay or presentation change.

## Build integrity

- [ ] Run `node scripts/build-level1.mjs`.
- [ ] `index.html` and `play.html` are regenerated from the same shell.
- [ ] The canonical runtime still comes only from `src/level1/`.
- [ ] No historical `archive/` file is used as a runtime/build input.
- [ ] No new JavaScript console errors appear during play.
- [ ] Cache-busting build fingerprints update when canonical assets change.

## Startup and briefing

- [ ] No blue startup flash or stale intermediate screen appears.
- [ ] The simulation remains frozen while the briefing is visible.
- [ ] The briefing remains concise and immediately understandable.
- [ ] Desktop controls show Shift as turbo.
- [ ] Launch transitions cleanly into the live game.

## Opening 45 seconds

- [ ] Aircraft begins low enough for terrain parallax to communicate speed.
- [ ] First hostile intent is visible within roughly 5–10 seconds.
- [ ] First meaningful decision / engagement develops within roughly 8–15 seconds.
- [ ] The first SAM launch is physical and readable from its ground position.
- [ ] SAM smoke remains visible long enough to understand the missile path.
- [ ] The first bandit develops in space rather than popping in.
- [ ] No 15–20 second stretch is pure empty transit with no meaningful change.
- [ ] The opening still feels restrained rather than overloaded.

Current reference behavior after the pacing pass: first SAM launch is approximately 6–8 seconds in a normal opening run; the first bandit develops shortly after. Treat these as tuning references, not permanent hard-coded requirements.

## Threats and weapons

- [ ] SAM launch sites are recognizable in the world.
- [ ] Incoming SAMs have readable world-space trajectories.
- [ ] The player can hold X, acquire a SAM, release X and destroy it.
- [ ] Destroying a SAM does not alter or accidentally complete the primary objective.
- [ ] Bandit destruction is optional and does not gate the strike.
- [ ] Distant aircraft become more legible as they become relevant.
- [ ] Cannon cadence remains consistent across frame rates.
- [ ] Missile lock and launch feedback corresponds to the actual lock state.

## Mission logic

- [ ] Primary launch site exists and is destructible from mission start.
- [ ] Cannon can destroy the primary target.
- [ ] Guided missile can destroy the primary target.
- [ ] No fighter kill, SAM kill, checkpoint or timer is required to damage the target.
- [ ] Destroying the target does not instantly end the mission.
- [ ] Extraction requires target destruction and crossing the northern boundary alive.
- [ ] No elapsed-time fallback can complete the mission.

## Objective progress

- [ ] “Penetrate Valley” checks only after the valley entry is crossed.
- [ ] “Destroy Launch Site” checks only after primary-target destruction.
- [ ] “Escape North” checks only on successful mission completion.
- [ ] Completed objectives use the restrained muted-green state.
- [ ] Checkmarks feel satisfying but do not pull attention away from flying.
- [ ] Objective UI does not overlap the compass, reticle, radio text or mobile controls.
- [ ] Restart clears all three objective states correctly.

## Visual restraint

- [ ] Center screen remains open and readable.
- [ ] Compass stays subtle.
- [ ] No persistent mission panel, waypoint bug or decorative telemetry has returned.
- [ ] New effects are tied to physical events.
- [ ] No arcade speed-line clutter.
- [ ] No unnecessary labels or tutorial prompts.
- [ ] Camera changes do not make steering feel delayed or disconnected.

## Controls

Desktop:
- [ ] Arrow keys fly correctly.
- [ ] Space fires cannon.
- [ ] Hold X tracks; release X fires only when locked.
- [ ] Shift turbo works.
- [ ] Double-tap Up turbo burst works.
- [ ] R resets to briefing.

Touch:
- [ ] Left control flies.
- [ ] FIRE works.
- [ ] TRACK / release missile works.
- [ ] BOOST works.
- [ ] RESET returns to briefing.
- [ ] Touch UI does not obscure objective progress or mission-critical threats.

## Automated verification

When the local browser runtime is available:

- [ ] Run `scripts/check-level1.cjs`.
- [ ] Run `scripts/verify-level1.cjs`.
- [ ] Confirm the full-flight verification reaches extraction without injected mission state.
- [ ] Confirm restart leaves no residual SAM missile, smoke, fire or destroyed-target state.

## Cold-play release gate

Play one run without looking at code first.

Answer yes to all five:

1. **Does the aircraft feel fast?**
2. **Does danger exist physically in the world?**
3. **Do I always know the mission is moving toward target → strike → north?**
4. **Does something meaningful keep developing without the game becoming noisy?**
5. **Is the screen still beautiful and clean?**

If one answer is no, identify that single failure before starting another feature pass.
