# V42 — Terrain Mask

V42 keeps the V41 strike-mission structure and makes the Desert mission read more like a believable low-level penetration.

## What changed

- The Desert is now a one-way northbound strike corridor: ingress -> radar -> launch vehicle -> high-pass egress. A clean run does not require backtracking.
- The Launch Complex has been moved deeper into the valley, with the radar installation staged physically before it on the same route.
- SAM acquisition no longer has a magic low-altitude invisibility threshold.
- Terrain line-of-sight is the hard mask. Low altitude only reduces acquisition quality through ground-clutter logic.
- SAM warnings now teach the player to use terrain and break radar line of sight.
- A launched SAM remains a physical threat until it misses, hits terrain, expires, or hits EW-01.
- Added a quiet heading tape with cardinal directions, heading readout, mission bearing bug, and temporary SAM bearing bug.
- The briefing now says EGRESS NORTH THROUGH HIGH PASS, which maps to the compass instrument.
- Preserves V41 flight model, camera, turbo behavior/audio, weapons, hostile interceptors, radar strike, launch-vehicle strike, Alpine, and Tempest.

Build with: `node scripts/build-v42.mjs`.
