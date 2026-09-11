# V40 — Mission Flight

Adds robust Shift release/reconciliation, brief contextual Mission Control cues, a required south-to-north Alpine relay passage, and a small muted US aft-fuselage flag. Flight, camera, enemy spacing, weapons, all audio (including turbo), terrain, mobile, and earlier versions remain unchanged.

The relay uses swept traversal and visible-beam collision checks. Bypasses and reverse crossings do not clear it. Alpine completion waits for passage; no steering assistance or teleport is used. A cleared relay returns guidance to North Ridgeline. This single traversal-volume pattern can support later theater maneuvers; none are added here.

Build: `node scripts/build-v40.mjs`. Check: `node scripts/check-v40.mjs`. Review: `node scripts/prepare-v40-review.mjs`, then open `.review-v40.html` through a local server.

Verification: 16 browser mission checks passed, covering Shift hold/release/OS-shortcut reconciliation, input reset, double-tap burst, clean/bypass/reverse/beam traversal, transition gating, reset, locator priority, cue suppression, and marking size. Visual relay inspection and runtime-error check passed. The OS screenshot shortcut was simulated through its modifier event shape; the native macOS shortcut itself was not invoked. Audio source is preserved, not retuned.

V39 is added as its existing unchanged build/source snapshot because it had not yet been committed to GitHub. V38 files and current entry points are not rewritten.
