# Emberwing

A cinematic browser flight mission across a long desert valley.

[Play Emberwing](https://colemanvii.github.io/emberwing/play.html)

**Destroy the target. Avoid bandits and SAMs. Exit north.**

The briefing waits for you. Descend into the valley, penetrate to the launch installation, attack by cannon or guided missile, and survive to the northern opening. There are no checkpoint gates, required fighter kills, or escape timers.

## Controls

- Arrow keys: pitch and bank (up pitches down; down pulls up)
- Space: cannon
- Hold X: track; release X when locked: fire missile
- Hold Shift: turbo
- Double-tap up: turbo burst
- R: restart at the briefing
- Touch: left joystick, FIRE, TRACK, BOOST, RESET

## Development

Requirements: Node.js 20+.

```bash
npm install
npm run setup:browsers
npm run build
npm start
```

Then open `http://127.0.0.1:8892/play.html`.

Useful commands:

- `npm run build` — regenerate the canonical Level 1 bundle and public entry pages
- `npm test` — run fast browser mission checks
- `npm run verify` — run the full browser pilot and write screenshots/logs to `.artifacts/level1/`
- `npm start` — serve the repository locally

Both `index.html` and `play.html` are generated from `src/level1/shell.html`. The canonical runtime consists of `core.js` (flight, rendering, audio and air combat), `assets.js` (installation, SAMs and destruction effects), and `mission.js` (geography, mission, targeting, instruments and lifecycle). `game.js` is their generated bundle.

Generated deployment files are intentionally committed because GitHub Pages serves this repository directly. CI rebuilds them and fails if the committed outputs drift from source.

Three.js 0.180.0 is bundled in `vendor/` with its MIT license. Launch has no external CDN dependency.

## Repository layout

- `src/level1/` — canonical game source
- `scripts/` — build, local server, browser checks and full-flight verification
- `docs/` — design, QA and current implementation notes
- `vendor/` — vendored runtime dependencies required in-browser
- `archive/` — historical prototypes, release notes and retired tooling
- `.artifacts/` — generated verification screenshots/logs; ignored by Git
- `.github/workflows/ci.yml` — portable build and browser-check CI

Historical numbered pages, release notes, legacy build scripts, retired workflows and standalone experiments live under `archive/`. They are preserved for reference and are not inputs to the current build.

## Project guardrails

- [Design constitution](docs/EMBERWING-DESIGN.md)
- [QA checklist](docs/QA-CHECKLIST.md)
- [Consolidation and verification](docs/LEVEL1-CONSOLIDATION.md)
- [Next pass](docs/NEXT-PASS.md)
