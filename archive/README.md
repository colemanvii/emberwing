# Emberwing Archive

Historical material preserved for reference.

- `versions/`: numbered HTML experiments from earlier iterations
- `releases/`: historical release notes
- `scripts/`: legacy version-specific build, smoke-test, and review utilities
- `workflows/`: retired GitHub Actions from the numbered-build era

These files are not inputs to the current Level 1 build.

The canonical playable entry points are `index.html` and `play.html`, backed by `src/level1/`.

Active tooling is intentionally small:

- `scripts/build-level1.mjs`
- `scripts/check-level1.cjs`
- `scripts/verify-level1.cjs`
