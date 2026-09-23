# Mineral flight art pass

Based on main `5234f93`, preserving the three authored entrances, western radar-shadow route, flight controls, target/weapon logic and mission timing.

## Material changes

- Open the eastern basin substantially and widen the northern release. Break up the enclosing background slopes and add four stable distant massifs without filling the flight floor with props.
- Move the existing small hangar installation into the basin as a scale reference; no additional buildings or combat systems.
- Replace brown terrain with pale sediment and cool exposed stone, filtered strata, lower sunlight and lighter atmospheric depth.
- Sample a static 256 × 384 height atlas for long terrain shadows on the ground and aircraft. This adds no shadow scene render; the shared atlas is created once and reused on restart.
- Lighten the aircraft's titanium/composite surfaces, retain articulated control surfaces, moderate turbo FOV from +20° to +9°, and soften banking lag. Reduce decorative speed streaks.
- Change the radar alert to “THEY HAVE A TRACK.” Existing HUD and airborne openings remain intact.

## Validation

- `npm run build` and `npm test` pass, including all three opening safety checks, mission boundaries, weapon authority, terrain concealment, SAM cover and restart cleanup.
- `scripts/verify-routes.cjs` passes all four route cases: both attack lines destroy the target; west strikes at full hull and preserves materially lower radar exposure; climbing above cover draws and then breaks a track.
- `scripts/inspect-art.cjs` captures opening, ridge, throat, shoulder, basin and breakout in Chrome at 1440 × 900 with zero page/console errors. These are explicitly staged visual checkpoints, not a complete flight.
- Local playable build also loads and restarts in the Codex app browser at its narrow viewport.
- The existing full-run keyboard autopilot crashes into terrain on both baseline main and this pass. A separate post-throat continuation reached the strike and north breakout but was shot down before extraction. A successful uninterrupted full run and 40–50 second completion are **not certified** by this pass.

Visual checkpoints: `CHROME="/path/to/Chrome" node scripts/inspect-art.cjs`; output is ignored under `.artifacts/art/`.
