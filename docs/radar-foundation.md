# V38 radar foundation

Starting branch: `tom7/ground-strike-v1`, `06ccf9ed14c6891a4a827d94697e8cfba1b621a5`.

`src/v38/objectives.js` is the radar source of truth. `scripts/build-v38.mjs` composes it after dogfight and the other systems it wraps. Do not hand-edit the generated encounter in `v38.html`.

Run `node scripts/check-v38-build.mjs` to rebuild twice and verify deterministic output, one encounter marker, complete source inclusion, and composition order. Run `node scripts/prepare-v38-review.mjs` and open `.review-v38.html` for the development-only radar controls and regression suite.

The encounter pauses during crash, completion, and theater transition. A launched strike retains its target until weapon resolution, even after the optional encounter's deadline. Installation cleanup removes the group and clears dish, beacon, and light references. Strike debris is marked as encounter-owned for reset/transition cleanup; the wreck remains as geographic aftermath until reset or theater change.

Discovery begins with the physical installation and a faint intermittent stereo carrier. Radar wording and brackets appear after nearby forward contact or deliberate designation. This changes no flight, aircraft, camera, world, controls, or dogfight source.

## Verification performed

- Rebuilt twice: identical output, one complete encounter layer after dogfight.
- Browser lifecycle suite: first cannon kill → quiet → radar, no bandit respawn; fly-away → signal lost → installation cleanup → bandits.
- Browser designator acquisition and release through the real input handler: normal strike and launch at age 27.999 both impact, remove the installation, create a wreck, and resume bandits.
- Real-time moving flight: discovery and voluntary fly-away; normal strike and deadline strike, both with impact and subsequent bandit return.
- Browser lifecycle suite: crash, mission complete, and transition freeze encounter age, dish, beacon, missile, phase, announcements, and chirp calls.
- Six destruction/reset cycles return scene children to the baseline count with no encounter references, lights, missiles, or owned FX remaining. The test waits for the existing bandit explosion's short-lived timer particles to expire.
- Both rear bearings override stale airborne guidance direction.
- Existing player-authority regression: identical trajectory with rear threat and lock, plus sustained steep-bank checks.
- Runtime outside the encounter matches the branch baseline except one composition boundary blank line; all protected source files are byte-identical.

## Deferred seam

The existing wrappers remain intentionally small. The next architectural step is one lightweight `activeTarget` interface for geometry, range, guidance, designation, and missile resolution to consume either a bandit or encounter target. No generalized scheduler, additional objectives, multi-target combat, cockpit UI, or new weapon system was introduced. Carrier loudness/direction was exercised in the running browser but still merits human listening feedback.
