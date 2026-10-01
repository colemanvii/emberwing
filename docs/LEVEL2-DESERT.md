# Level 2 — WHICH ONE

Branch: `level2-desert-prototype`
Base: `af87b1b` (`preview/emberwing-combat-feel-2026-10-01`)
Entry: `/level2.html`

Three low compounds sit across an open desert basin. Follow moving vehicles and their dust toward the occupied courtyard. Its sweeping radar and parked escorts distinguish it from the two quiet sites. The primary is the low command truck with an antenna. Hold X to acquire it; release X to fire. Guns also damage the primary. Arrows fly, Space fires, Shift boosts, R restarts. Touch controls use the same flight and weapon systems.

The first approach crosses a small village. All service roads are physical world-space paths: the five-truck convoy travels to and from the active compound, and a mobile SAM patrols that same branch. The mobile launcher spends 13 seconds moving, then stops for 11 seconds to search, acquire and fire. Both SAMs can be attacked at any time, independently of the fighter. Guns or a missile destroy them.

The objective model is find → strike → escape. No fighter kills are required. After destroying the command truck, get more than 2,600 world units from the target and outside every surviving SAM's range. Any bearing works. Existing missiles remain physical during escape. The initial active site is chosen from three authored placements; restarting rotates sites, convoy offset and mobile-SAM timing. Fighter arrival depends on proximity and a variant-specific response delay.

## Implementation

- `src/level2/world.js`: basin height function, authored compounds/villages/roads, traffic, dust, desert lighting.
- `src/level2/mission.js`: objective state, target placement, response, mobile SAM controller, reset and loop.
- `src/level2/combat.js`: baseline weapon/HUD behavior adapted for independent ground targets and moving missile destinations.
- `src/level2/effects.js`: baseline physical SAM models, missiles, smoke and destruction effects.
- `scripts/build-level2.mjs`: reuses the exact `src/level1/core.js` aircraft, flight, camera, audio and physical bandit code; does not load Level 1's mission or encounter controller. Builds committed `level2.html` and `src/level2/game.js`.

Level 1 sources and both existing entry pages remain byte-for-byte identical to the requested base. Desert mission/world files contain no `valleyCenter` or Z-threshold completion logic.

## Build and verify

```sh
npm install
npm run build:level2
npm run check:level2
npm run verify:level2
npm test
npm start
```

Open `http://127.0.0.1:8892/level2.html`. `CHROME` optionally selects a local Chromium executable; `PLAYWRIGHT_MODULE` optionally selects an installed Playwright module. `VARIANT=0`, `1` or `2` makes the keyboard pilot rotate through normal restart input to that arrangement. `OUTPUT` selects its screenshot directory.

The regression suite uses test-only response injection for isolated scenarios: stationary SAM gun/missile kills with and without a fighter; mobile SAM kills with a fighter alive; moving missile destination updates; all primary placements; four extraction bearings with a surviving fighter; movement/stop-to-fire; convoy movement and dust; mobile layout and launch. The shipped page exposes only read-only telemetry.

The keyboard pilot flies the live simulation without changing game state: select the active site, lock/fire, survive, and escape. Screenshots include the opening, clues at combat speed, approach, strike and extraction. Existing Level 1 browser regressions also pass.

## Deliberately rough

This is a playable first pass. Compounds share a simple kit, the convoy turns around directly at its route ends, and threat balance needs human playtesting. Dust is stylized low-poly geometry. The command vehicle is the only mission-critical convoy-related target; cargo trucks and village buildings are not destructible. Portrait screens need a turn to inspect the side compounds. No campaign selector or automatic Level 1 transition has been added; load `level2.html` directly.
