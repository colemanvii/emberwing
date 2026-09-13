# Emberwing

A cinematic flight mission across a long desert valley.

[Play Emberwing](https://colemanvii.github.io/emberwing/play.html)

**Destroy the target. Avoid bandits and SAMs. Exit north.**

The briefing waits for you. Descend into the valley, penetrate to the launch installation, attack by cannon or guided missile, and survive to the northern opening. There are no checkpoint gates, required fighter kills, or escape timers.

## Controls

- Arrow keys: pitch and bank (up pitches down; down pulls up)
- Space: cannon
- Hold X: track; release X when locked: fire missile
- Hold Z or Shift: afterburner
- Double-tap up: turbo burst
- R: restart at the briefing
- Touch: left joystick, FIRE, TRACK, BOOST, RESET

## Development

Run `node scripts/build-level1.mjs`, then serve the repository root with any static web server.

Both `index.html` and `play.html` are generated from `src/level1/shell.html`. The canonical runtime consists of `core.js` (preserved flight, rendering, audio and air combat), `assets.js` (installation, SAMs and destruction effects), and `mission.js` (geography, mission, targeting, instruments and lifecycle). `game.js` is their generated bundle. Build fingerprints prevent new entry pages from loading stale presentation assets.

Three.js 0.180.0 is bundled in `vendor/` with its MIT license. Launch has no external CDN dependency.

Historical numbered pages remain archived experiments. They are not inputs to the current build. Local V58–V61 experiments in the original checkout were preserved in place during this consolidation.

See [consolidation and verification](docs/LEVEL1-CONSOLIDATION.md) for baseline selection, distances, testing and limitations.
