# Emberwing: Gus Edition — Operation Alien Invasion

Open `/gus.html`. The previous Gus HOTAS wrapper is preserved verbatim as
`/gus-playtest.html`. Regular Emberwing sources, entries, and configuration are unchanged.

## Play

- Enter: start / instantly restart. Space can also start from the opening screen.
- Arrow keys or WASD: fly. Space: hold for homing lasers. X: missile; hold to repeat.
- Touch: drag the right stick to fly, hold PEW on the left, tap the missile button.
- Sound begins after interaction. Sound toggle and restart are always at top right.
- Cyan electric balls drain shields; gold balls restore a shield and grant faster lasers.
- Officer Blue follows, attacks, intercepts nearby hazards, and restores depleted shields.
- The Great Green Googler enters after 32 seconds. Destroy all three pink pods to win.

## Implementation

Independent local Three.js modules, procedural meshes and synthesized Web Audio.
320 electric sprites share one Points draw call; scenery uses three instanced batches;
explosion particles are bounded to 900. Pixel ratio is capped at 1.6. No CDN, backend,
external media, or changes to the original game are required.

A static server is sufficient. The root project build continues to build regular Emberwing.

## Verification

Run a server at port 8877 (or set BASE_URL), then:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright node tests/gus/browser.cjs
```

CHROME_PATH optionally selects the Chrome executable. `?test` enables test diagnostics,
deterministic time advancement, and an orb collision fixture. Normal game URLs expose none.

Browser assertions cover keyboard movement, laser kills, a visible moving X missile and
its hit, wingman attacks/kills, collected power-ups, forgiving shield rescue, boss timing,
all three target destructions, victory, restart, audio unlock/mute, simultaneous touch
flight/fire, and touch missile hits. Landscape and portrait screenshots are captured.

Local Chrome tests passed with no page errors. Desktop measurement: approximately 30 fps
(33.3 ms median / 33.4 ms p95) in this headless environment. Optimized scene measured about
206 draw calls. This is not a physical iPad or Safari performance certification; touch
checks use Chrome's iPad-size/mobile and multi-touch emulation.
