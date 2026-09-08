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

The aircraft and buildings still inherit relatively simple V37 geometry. Clouds are procedural sky shading, not traversable volumetric clouds. Water uses approximate sky reflection, not full scene reflections. Terrain LOD is a bounded two-mesh solution rather than a streaming world. Those remain worthwhile directions for future passes.
