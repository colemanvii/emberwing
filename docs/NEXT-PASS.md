# Next Pass — Tempo, Timer, Replayability

## Current diagnosis

The game is visually cleaner and prettier, but the full run is still too slow and boring.

The strongest player signal is behavioral:

> The natural way to make the mission tolerable is to hold turbo almost the entire time.

That means turbo is currently functioning as the real cruise speed rather than a tactical choice.

This is the next core problem to solve.

## Current flight relationship

Reference values from the current flight code:

- Base cruise: ~124 units/s
- Turbo contribution: +56 units/s
- Effective turbo cruise: ~180 units/s

The next pass should tune the relationship between:

- base cruise speed
- turbo speed
- mission distance
- encounter timing
- perceived velocity

Do **not** solve this by simply changing one speed constant and calling it done.

## Desired feel

Normal flight should already feel fast and purposeful.

Turbo should be something the player uses to:

- close distance
- escape pressure
- commit to a run
- recover time
- chase a personal best

It should **not** feel mandatory for the entire mission.

Working tuning hypothesis:

- raise normal cruise toward ~150–155 units/s
- keep turbo in roughly the ~185–195 range
- then replay the entire mission and trim geographic dead time if the run still drags

These are tuning targets, not sacred numbers.

## Live run timer

Add a very small, restrained live mission timer to the flight HUD.

Example:

`01:14.6`

Optional secondary line:

`BEST 01:08.2`

Design requirements:

- no box
- no scoreboard panel
- quiet typography
- likely opposite the objective stack
- readable without competing with the flight view
- timer begins when the mission starts
- timer freezes on extraction
- restart resets the active run timer

## Personal best loop

The codebase already contains timing utilities and local best-time storage infrastructure.

Use that rather than inventing a parallel system.

On successful extraction, show:

- final run time
- best time
- delta from best, when useful
- `NEW BEST` when the player improves their record

The purpose is to make a second run immediately tempting.

## Longer-term competitive layer

Do not build this yet, but preserve the direction:

- personal best
- recent run history
- fastest clean run
- friend leaderboard
- shareable run result
- eventual friend competition / leaderboard system

The immediate product test is simpler:

**Is shaving 2–3 seconds off a run fun enough that the player wants to replay?**

Prove that locally before building accounts or multiplayer infrastructure.

## Opening / briefing follow-up

The current briefing page is also not at the quality level of the in-game visual field.

Desired future direction:

- use a frozen cinematic game frame as the briefing background
- sparse mission typography
- no generic landing-page composition
- no bright product-style button
- quiet transparent/dark action control with thin warm border
- reduce briefing copy to intent, not instructions

Concept:

```
EMBERWING // LEVEL 01

VALLEY STRIKE

DESTROY THE LAUNCH SITE.
EXIT NORTH.

BEGIN MISSION

ARROWS FLY · SPACE CANNON · HOLD X MISSILE · SHIFT TURBO
```

Do not let this work distract from the tempo problem. Tempo comes first.

## Next implementation order

1. Tune base speed / turbo relationship.
2. Replay the full mission and remove remaining dead geography if needed.
3. Add live timer + local personal best display.
4. Verify objective checks still stay visually quiet.
5. Cold-play several runs and ask whether racing the previous time is genuinely fun.
6. Only then revisit the briefing presentation.
7. Only after local replayability works should social / friend competition be designed.

## Release gate

Before publishing the tempo pass, answer yes to all:

- Does normal cruise feel fast without Shift?
- Does turbo feel optional and tactical?
- Is there still room for acceleration to feel exciting?
- Is the mission shorter / denser without becoming chaotic?
- Does the timer create replay desire rather than HUD clutter?
- Is the clean visual field preserved?
