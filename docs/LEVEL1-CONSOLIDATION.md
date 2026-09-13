# Level 1 consolidation

## Baseline and architecture

The starting checkout was `faf5c46` (V60), with uncommitted V61 agency work. The actual deployed launcher instead pointed to `v57.html?release=63`, on remote main `0b1516d`. Work was based on that remote main in a separate worktree, preserving the original checkout and all its uncommitted experiments.

The selected functional baseline is the V38 flight, airframe, camera, terrain renderer, audio and touch core with V39 dogfight behavior. V40–V44 supply the strongest installation art, terrain-aware SAM behavior, missile smoke and target destruction. V49's mission agency is retained: bandit kills and radar destruction never gate the main strike. Later fork, reveal, exposure and briefing experiments informed the direction but their stacked implementations are not part of the active build.

V40–V58 builds recursively embedded earlier generated HTML and appended function wrappers before the clock. Their wrappers accumulated independent mission directors, geography changes, target priorities, cues and resets. V54–V57 compressed the objective toward the valley entrance. V58–V63 also diverged between local generated builds and deployed presentation shells.

The startup had three competing owners: the original HTML/HUD and timed `showRealmCard`, the dynamically created V40 `missionBrief` (subsequently rewritten repeatedly), and later launcher/iframe/presentation shells. The inherited V38 stylesheet supplied `#263342` as the pre-module blue background. Dismissal used delayed hiding; the main clock kept advancing and updating parts of the world during briefing.

The active build now has one static briefing and one lifecycle (`briefing → flight → complete`, with crashes handled by the existing flight state). The frame loop does no simulation or rendering while briefing. Launch renders the first live frame before revealing the canvas. Restart restores the same briefing, target, defenses, effects and audio state. Audio is suspended during briefing, crash and completion. Three.js is bundled locally. Content fingerprints prevent an updated entry page from loading stale game/CSS assets.

## Removed from the active experience

- Recursive builds from previous release HTML and V40–V57 mission wrapper chains.
- Timed theater card, dynamic briefing creation/rewrites, dismissal timer and presentation-shell redirects.
- Original objective banner, coach panel, score/contact counter, telemetry readout, focus prompt, decorative program/frame and propulsion label, including their DOM and update statements.
- All old compass implementations, objective/threat heading bugs and persistent world objective locator.
- Required radar strike, required fighter kills, launch-order gate, timed liftoff and escape timeout.
- Fork labels and route classification logic; the valley is a broad continuous route with an open western passage around a headland.

Historical numbered pages are retained as archives, not runtime/build inputs.

## Preserved

V38 attitude integration, neutral settling, bank coordination, camera transport through vertical flight, aircraft geometry, engine/weapon audio, gun behavior, air missile behavior, boost, turbo and touch controls. V39 fighter maneuvers and gun telegraphs remain. V40 industrial gantry/tanks/cradle, V41 physical SAM installations, V42 line-of-sight acquisition and low-altitude clutter, V43 launch smoke/impact debris, and V44 sustained fires remain as direct asset functions.

The current runtime is approximately 165 KB of readable source, versus roughly 316 KB of layered V57 code/HTML before its additional styles. The build concatenates three canonical sources and generates identical root and play entries; it never reads a numbered release.

## Geography

North is negative Z. One world unit is displayed by the inherited game as six feet.

| Location / distance | Previous V57/V60 | Consolidated Level 1 |
| --- | ---: | ---: |
| Initial aircraft Z | 2,850 | 4,000 |
| Valley entry reference Z | 930 | 2,600 |
| Target X, Z | 80, −1,280 | −300, −7,200 |
| Entry-to-target northward separation | 2,210 units | 9,800 units / 58,800 feet |
| Start-to-target northward separation | 4,130 units | 11,200 units / 67,200 feet |
| Extraction Z | inherited high-pass logic | −11,000 |
| Target-to-extraction separation | layered pass rules | 3,800 units / 22,800 feet |

Valley penetration is 4.43 times the former entry-to-target separation. The 9,800-unit valley leg is about 17.92 km using the game's scale. At unboosted 124-unit/s cruise, its minimum axial travel takes about 79 seconds. Steering/descent add distance; boost reduces time.

The opening floor descends roughly 205 units over a 2,000-unit slope. The valley has a winding 840-unit-wide core, asymmetric shoulders rising hundreds of units, a western bend around the headland near Z −4,950, a wider terminal basin, and a broad northern opening from Z −9,600 to −11,700. Terrain rendering, collision and SAM/weapon line-of-sight sample the same height function. No checkpoint crossing is required. A ground service road connects the final bend to the installation.

## Threat and target staging

The vehicle exists and is destructible from mission start. Distance, haze and the headland conceal it; there is no timer or checkpoint that enables its damage. Its gantry, pad, tanks, service buildings and vapor provide the visual identity. Only actively holding the seeker produces a weapon bracket.

SAM installation Z coordinates are 200, −3,500, −6,500 and −9,200. The first is on the western shelf; the second is on an eastern shoulder; the third defends the installation; the fourth covers the northern escape. Their absolute X coordinates are derived from the valley curve or authored installation coordinates. Batteries acquire through physical line of sight, with slower low-altitude tracking. Missiles remain physical threats that can strike terrain.

The first defender activates when the aircraft reaches Z −1,500 and approaches from the middle valley near Z −2,900. It does not need to die. A surviving fighter remains active through extraction; if none survives, a final defender can enter beyond Z −8,100 after the strike. Cannon and missile can destroy the ground target while a fighter is alive.

Mission control only reports material events in short text: SAM tracking, inbound missile and target destroyed/exit north. The compass uses sparse cardinal marks and dots with no panel, numeric readout or waypoint bugs.

## Extraction

Completion requires both target destruction and aircraft Z ≤ −11,000, while alive. The entire northern boundary is valid regardless of X; there is no narrow gate. No elapsed-time fallback exists. The opening terrain, north mark, one strike message and continued SAM/fighter pressure establish the escape. Merely destroying the target leaves gameplay running.

## Verification

- Inspected the real deployed release-63 entry, its briefing and initial flight; compared it to the local V60 launcher and source/history. Local V60's untouched opening hit terrain shortly after launch. Neither old build was successfully flown through extraction during this audit; their full mission paths were traced in source.
- Completed a browser-controlled flight through the consolidated mission using normal keyboard inputs and read-only telemetry. No position, health, target damage or mission phase was injected during that flight. Destruction occurred around 79 seconds; extraction at 105.89 seconds, Z −11,002.13, hull 2/3, with a bandit still alive. Screenshots were visually inspected at approach, descent, low valley, SAM, bend, reveal, strike and escape.
- Full-flight console: no JavaScript errors.
- Compared complete snapshots across an idle briefing to confirm a frozen simulation. Restart returned to the same initial position, intact target, four SAM sites, zero mission time and no residual missiles/fire/smoke.
- Separate isolated browser scenarios verified cannon destruction while a bandit remained alive; no completion before target destruction; no completion from a 10,000-second timeout at the target; no completion one unit short of extraction; completion on the boundary at X = 2,000; concealed strike geometry; and three cleanup cycles. These scenarios deliberately inject setup state and are not counted as played flights.
- Mobile Chrome emulation at 390×844 and 844×390: briefing and gameplay layouts checked, real touch boost reached about 178 units/s, touch cancellation returned toward 124, and touch reset restored briefing. No JavaScript errors. Physical phone hardware and subjective audio listening were not tested.

Scripts: `scripts/verify-level1.cjs` (full flight), `scripts/check-level1.cjs` (isolated boundary/weapon checks), and `scripts/build-level1.mjs` (deterministic canonical build). Browser scripts accept `PLAYWRIGHT_MODULE` and `CHROME` paths; the flight script also accepts `URL` and `OUTPUT`.
