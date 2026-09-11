# V43 — Attack Run

V43 is a directorial pass over V42. It preserves the flight model, camera, turbo behavior/audio, player weapons, terrain masking logic, Alpine and Tempest.

## Intent

Make the Desert strike feel like one authored, violent northbound mission rather than a collection of systems.

## Changes

- Desert interceptors now spawn from the defended north, cross the penetration route, and begin in an immediate ENGAGE state instead of spending the opening seconds extending away.
- Long-range acquisition is clearer: Mission Control calls committed intercepts while the existing glint/locator still requires the player to work the merge.
- Added a subtle physical service road/utility route running north toward the radar and Launch Complex. It guides the eye without gates or floating breadcrumbs.
- Added distant launch-site steam so the final objective has a visual signature before it becomes the active target.
- SAM launches now create a visible launch flash and a longer-lived physical smoke trail. The missile remains subject to the V42 terrain-mask rules.
- Launch-vehicle destruction gets a larger primary flash, shock ring, heavy gantry debris, visible structural damage, and the existing persistent smoke column.
- Egress now includes one last-ditch interceptor after the strike. It is a threat, not a required extra kill; the correct move is still north.
- Heading-tape objective labels now say NORTH, RADAR, LAUNCH, or EGRESS instead of generic OBJ.
- Added restrained peripheral SAM-search / SAM-inbound pressure states to the HUD.

Build with: `node scripts/build-v43.mjs`.
