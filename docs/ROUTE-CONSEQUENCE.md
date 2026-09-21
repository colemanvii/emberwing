# Post-Throat route consequence

Starting main: `86199eeb9d185b33ddf5f1943430213f9c7e8bc2`.
The existing three-opening work was preserved byte-for-byte, rebuilt, browser-tested,
and published separately as `143bfb06d155cfd441edac5b988c14e44f48a6cd`.

## Gameplay changes

- Reduce the shadow saddle depression from 80% to 25%, retaining continuous low-west masking.
- Move the headland west by 210 units and narrow its lateral radius from 265 to 190.
  Move its crown west by 245 and narrow it from 150 to 110.
- Move the headland's western wing west by 70 and narrow it from 230 to 160.
  North/south dimensions and heights stay fixed.
- Move SAM 3 from center(-3150)+500, -3150 to center(-4250)+380, -4250.
  Its existing 1740 range and acquisition behavior remain intact.
- One corrective adjustment: SAM 3's pre-strike reload increases from 1.55s to 6.5s.
  SAM 4 still overlaps the exposed line, so the greedy flight receives three total launches.
  The existing one-live-missile pre-strike limit and escape reload remain intact.

No flight, opening, camera, target, timer, HUD, enemy-count, or collision changes.

## Browser verification

Run `CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node scripts/verify-routes.cjs`.
The development-only harness intercepts the built browser module and runs its actual
`loop()` at 60 Hz. It reads `emberwing.snapshot()`, dispatches the normal weapon key,
and uses normal flight input states. It does not change health, enemies, missiles,
collision, or targeting. Reports and rendered screenshots go to `.artifacts/routes/`.

Both flights start at Z=-3050, already committed to their side: west offset -480,
east +200, with 65 units of terrain clearance. Section timing starts there; the
synthetic 23-second mission clock is not a measured ingress time. West reduces
throttle near its tight shoulder turn; east holds turbo. Therefore timing compares
representative flown approaches, not equal-speed path lengths.

| Measurement | West | Greedy east |
|---|---:|---:|
| First terrain-clear target sightline | 9.45s | 0.02s |
| First on-screen strike opportunity within existing 700 range | 10.92s | 8.33s |
| Arrival at Z=-5350 | 10.45s | 9.82s |
| Target destruction | 13.10s | 10.73s |
| Any SAM tracking before destruction | 2.63s | 10.70s |
| Integrated summed SAM exposure | 2.49 | 21.14 |
| Launches before destruction | 1 | 3 |
| Hull at destruction | 3/3 | 1/3 |

Terrain-clear sightline is not a guarantee that a distant, fogged target is visually
recognizable. The opportunity measurement also checks actual camera geometry and range.
The eastern losses were both SAM hits. A lower eastern flight also completed the
strike with 1/3 hull. It did not demonstrate damage-free passage.

A separate high-west descent begins at 620 clearance to establish a real track
before entering cover. Terrain blocks SAM 3 at +2.77s (lock 1.00) and SAM 4 at
+2.85s (lock 0.78); both tracking stages are zero by +4.02s. That flight still takes
one hit from an already-launched missile: track loss is verified, but missile defeat
by the shoulder is not established by this case.

`npm run build` and the existing `npm run check` pass. Two physical-cover test
locations now sample the relocated western shoulder; their occlusion assertions
remain in place. Opening safety/rotation, targeting, collision cover, mission
boundaries, and replay cleanup remain covered.

## Remaining limits

The measured trade is present: west delays the strike by 2.37s while reducing
tracking by 75% and exposure by 88%. A damage-free eastern strike is **not yet
verified**; the unsuccessful bank/pull pilot is not evidence that damage is unavoidable.
No successful extraction timing is claimed. Early continuation pilots failed under
existing escape pressure; final focused measurements stop at target destruction.
These checkpoint runs do not establish full-run 40–55-second pacing or opening-to-fork
accessibility. No further tuning was made beyond the single corrective reload pass.
