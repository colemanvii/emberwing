# V38 — Distant Thunder

V38 is built from the archived V37 flight/combat core. V3–V37 remain intact.

The continuous desert and alpine terrain replaces V37's decorative stacked rocks. Near terrain and a coarse outer mesh use the same deterministic height function, extending the landscape to 28 km across. Terrain shading adds strata, slope-dependent snow, surface detail and height-dependent atmospheric perspective. City structures remain part of the desert mission.

The sky has a coherent sun direction, layered cloud shading and separate palettes for each theater. Tempest uses world-anchored swells, sky reflection, roughness, sun highlights, distant rain curtains and a shared wave function for collision. Opaque water replaces the intersecting transparent water/ground surfaces. Lighting and shadows are applied before rendering.

The chase camera transports its frame through vertical flight, smoothly recovers the horizon, avoids terrain and obstacles, and resets its orientation at theater transitions. Bank assistance retains the original response through ±90 degrees and folds smoothly through inverted attitudes. Cannon origins now coincide with modeled wing barrels. Exhaust tapers aft and stretches along the thrust axis.

Touch controls use the same flight and combat simulation. Portrait framing keeps the wings visible; touch capture, cancellation and blur release held controls. Desktop Z and Shift both operate afterburner. Mobile disables shadow maps and caps pixel density.

## Build and review

Run `node scripts/build-v38.mjs` to regenerate `v38.html` from V37 plus `src/v38/`. No package installation is required for the build.

Run `node scripts/prepare-v38-review.mjs`, serve the repository, and open `.review-v38.html` for the development-only review controls. The generated review page is ignored by Git. Its regression suite exercises all three theaters, full banks, reversals, pitch loops, boost banking, muzzle alignment, enemy terrain clearance, low camera clearance, campaign transitions, missile launch/impact, cannon kills and structure collisions. Live flight stress runs the actual render/update loop. These controls are not included in the published game.

## Verification and limits

Verified in the Codex Chromium browser at desktop and 390×844 portrait size. Desktop tests measured approximately 32 FPS in low-altitude landscape runs and 63 FPS during the sea maneuver stress sequence. The sea stress endpoint used 28 draw calls; desert peaked at 115 in its final run. These are local observations, not guarantees for other hardware. Low-altitude terrain performance still has room to improve. Visually checked all three theaters, touch joystick/fire/seeker/boost/reset, shader errors and campaign transitions. Physical iOS/Android devices and their audio behavior have not been tested.

The player aircraft now uses a longer chined fuselage, tapered diamond wings, canted tails, a smoked canopy, and recessed twin exhausts. Graphite composite and titanium materials retain broad highlights without chrome. The presentation replacement preserves the player transform, flight model, collision rules, and existing cannon origins. Buildings still inherit relatively simple V37 geometry. Clouds are procedural sky shading, not traversable volumetric clouds. Water uses approximate sky reflection, not full scene reflections. Terrain LOD is a bounded two-mesh solution rather than a streaming world. Those remain worthwhile directions for future passes.

## Aircraft polish — September 10

Rebuilt the player silhouette and materials without changing terrain, atmosphere, world population, camera, flight physics, controls, weapons, or campaign progression. Existing local Tempest sky and ocean changes were preserved. Exhaust now stretches from the nozzle lip and fades aft; idle heat is subdued and boost increases length and intensity.

Verified desert and Tempest launch views, an alpine bank, boosted chase view, and settled 390×844 portrait framing. The existing regression suite passed all checks. A 21-second live flight stress run completed without crashing or browser errors. Browser-only validation; no physical mobile device test or deployment was performed in this pass.

### Surface and motion follow-up

The approved silhouette is retained. Wing skins now shade smoothly across their internal triangles while keeping sharp edges. Composite panels have restrained color and roughness variation, with a fine highlight along the leading edge. The elevons are cut from the trailing edge and rotate around fixed hinges; the canted tails respond subtly to pitch and roll. Deflection is capped below 11 degrees and eases back to neutral. This animation follows the existing flight rates and adds no flight forces or camera movement.

Verified control-surface direction, deflection limits, fixed hinge positions, settling and reset. The full existing gameplay regression suite passed, with no browser shader errors. Protected gameplay and camera function bodies match the approved design build.

### Dogfight geometry follow-up

Bandits now use four bounded behaviors: extend, turn in for an offset merge, defend a sustained tail chase, and press a positional advantage. Defensive breaks smoothly reduce speed and can reverse once; they have an eight-second cooldown. A rear attack lasts at most 6.5 seconds before the bandit turns away to create separation. Re-engagement aims across the player's projected path, while climbers can take a modest high-side approach. Existing terrain avoidance and clearance remain in force.

The rear locator now says “ON YOUR SIX” when position and nose direction support an actual threat. All enemy roles can use the existing guns, with longer warning times, short bursts and recovery intervals. They do not fire while extending or breaking. Player guns, missile acquisition/guidance, controls, camera, aircraft, terrain and campaign remain unchanged.

Validation: all four roles exchanged front/rear position, defended sustained pursuit, gained attacking position and re-engaged in 60-second geometry scenarios. An offset opposing pass reached 9 metres separation without a position jump. Led cannon fire hit a 90-degree crossing, and missile acquisition accepted an offset broadside target. Rear gun warning and suppression during separation passed. A 40-second live encounter with two player break turns recorded two rear-pressure phases, separation and re-engagement, no crash and approximately 116 FPS on this local browser. The existing full gameplay regression suite passed. These are bounded playtests, not exhaustive difficulty balancing or physical-device verification. This pass is local and has not been published.
