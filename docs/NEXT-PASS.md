# Next Pass — Tempo, Timer, Replayability


## Prototype status — first tempo pass implemented

A first conservative tempo prototype is now live on `main` and is **awaiting human flight testing**. Treat these values as a playable hypothesis, not final tuning.

Current prototype:

- normal cruise: **155**
- turbo: **190**
- start Z: **1500**
- valley entry: **1200**
- SAM 1: **700**
- bandit trigger: **300**, with the defender spawned farther ahead at **-500** to avoid pop-in
- SAM 2: **-1800**
- headland remains near **-4950**
- SAM 3: **-5900**
- target: **-6500**
- extraction SAM: **-7200**
- exit: **-8400**
- northern opening compressed to roughly **-7200 → -8600**
- live flight timer added opposite the objective stack
- local PB / NEW BEST extraction result preserved
- post-strike SAM cooldown shortened modestly so the escape leg can develop pressure
- an escape defender can appear after **-6800** when the earlier bandit is no longer alive

The generated build and fast browser checks pass in CI.

**Next decision must come from actually flying this version.** Do not add more systems before judging:
- whether 155 feels fast enough without turbo
- whether 190 still feels meaningfully faster
- whether the headland reveal survives the compression
- whether the new extraction is pressured but not noisy
- whether the whole mission now feels closer to the desired ~55–65 second rhythm

## Current diagnosis

The game is visually cleaner and prettier, but the full run is still too slow and boring.

The strongest player signal is behavioral:

> The natural way to make the mission tolerable is to hold turbo almost the entire time.

That means turbo is currently functioning as the real cruise speed rather than a tactical choice.

This is the next core problem to solve.

## Quantified run diagnosis

A reviewed full run finished in **1:32.5** with **Hull 3/3**.

Observed pacing:

- 0:00–0:07 — calm opening
- 0:07–0:10 — missile warning / brief threat event
- 0:10–0:46 — ~36 seconds of mostly empty transit
- 0:46–1:08 — primary mission content / strike
- 1:08–1:30 — ~22 seconds of mostly empty extraction
- 1:30–1:32.5 — extraction

Roughly **58 of 92.5 seconds (~63%)** were judged to be unopposed transit.

That is the clearest pacing problem in the current build.

The two biggest dead zones are:

1. mid-ingress after the first missile event
2. post-strike escape north

The game currently measures too much distance and too few decisions.

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

## Revised tempo priority

The current evidence suggests the next pass should address **both speed and distance**.

### Base speed

Normal cruise likely needs to rise enough that the aircraft feels urgent without Shift.

Working hypothesis:

- normal cruise ~145–155 units/s
- turbo ~185–195 units/s

These are tuning targets, not sacred numbers.

### Distance

Do not rely on speed alone.

Compress the two dead transit legs so no major section exists only to consume time.

The route should still feel like a real penetration and extraction, but a good run should spend most of its duration on:

- terrain decisions
- SAM pressure
- bandit positioning
- target acquisition / strike
- pressured extraction

not empty forward travel.

### Target mission duration

Working target:

**~55–70 seconds for a strong normal run.**

Do not force the mission to 45 seconds if that destroys its sense of journey. Skilled time-trial runs may naturally push toward ~50–60 seconds.

## Threat pressure

Do not increase threat count mechanically just to fill time.

Prefer one meaningful event over several noisy ones.

Especially:

- add or preserve one real pressure beat on extraction
- make threats force maneuvering, altitude choice or route adjustment
- do not solve pacing with projectile spam
- keep SAMs and bandits physical and readable in world space

The escape leg must not become a silent repeat of the approach.

## Desired feel

Normal flight should already feel fast and purposeful.

Turbo should be something the player uses to:

- close distance
- escape pressure
- commit to a run
- recover time
- chase a personal best

It should **not** feel mandatory for the entire mission.

Do not add a turbo meter or cooldown unless normal cruise is fixed first and playtesting still proves a constraint is necessary.

## Perceived speed

Some of the slowness may be visual as well as numerical.

Preserve / improve:

- terrain proximity
- near-field parallax
- restrained FOV response
- engine and vapor intensity
- world-space objects that move past the aircraft

Avoid:

- arcade speed-line clutter
- aggressive camera shake
- exaggerated screen stretch
- camera lag that disconnects steering from input

## Objective progress

The objective stack is structurally useful but should remain quiet.

Do **not** turn it into a heavier mission panel.

If a completion beat needs more satisfaction, use a tiny check animation / audio tick and let the physical event carry the emotional weight.

The reward for **Destroy Launch Site** should primarily be the destruction itself; the green check is confirmation.

## Personal best loop

The codebase already contains timing utilities and local best-time storage infrastructure.

Use that rather than inventing a parallel system.

On successful extraction, show:

- final run time
- personal best
- delta from best, when useful
- `NEW BEST` when the player improves their record

This is the cheapest meaningful replayability layer and should ship with or immediately after the pacing pass.

## Live run timer

Add a very small, restrained live mission timer **after the dead transit is fixed, or in the same pass once the new pacing is proven**.

A visible clock should create tension, not merely quantify boredom.

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

## Longer-term competitive layer

Do not build this yet, but preserve the direction:

- personal best
- recent run history
- fastest clean run
- friend leaderboard
- shareable run result
- eventual friend competition / leaderboard system

A leaderboard would currently reward holding turbo through dead geography. Do not calcify that behavior.

The immediate product test is:

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

1. Compress the 0:10–0:46-style ingress dead zone.
2. Compress the post-strike escape dead zone.
3. Raise normal cruise enough that Shift no longer feels mandatory.
4. Preserve a smaller but meaningful turbo advantage.
5. Add one meaningful pressure beat to extraction if needed after compression.
6. Surface local personal best on the extraction screen.
7. Add the restrained live timer once the run itself is worth timing.
8. Verify objective checks remain quiet and legible.
9. Cold-play several runs and ask whether racing the previous time is genuinely fun.
10. Only then revisit the briefing presentation.
11. Only after local replayability works should social / friend competition be designed.

## Release gate

Before publishing the tempo pass, answer yes to all:

- Does normal cruise feel fast without Shift?
- Does turbo feel optional and tactical?
- Is there still room for acceleration to feel exciting?
- Has the ~63% dead-air problem been materially reduced?
- Is there no 15–20 second stretch where nothing meaningful changes?
- Does extraction contain pressure or decision-making rather than empty travel?
- Is the mission shorter / denser without becoming chaotic?
- Does the PB/timer create replay desire rather than HUD clutter?
- Is the clean visual field preserved?


## Precomputed candidate pacing map

This is a **starting geometry/timing hypothesis for Astra**, not a mandate. It is designed to save tuning time by aligning the route with the 55–65 second target before playtesting.

### Current axial pacing

Current key Z positions:

- Start: 3100
- Valley entry: 2600
- SAM 1: 1900
- Bandit activation: 1200
- SAM 2: -1300
- Headland: -4950
- SAM 3: -6500
- Target: -7200
- SAM 4: -9200
- Exit: -11000

At ~155 units/s, straight-line axial timing is approximately:

- entry: 3.2 s
- SAM 1: 7.7 s
- bandit: 12.3 s
- SAM 2: 28.4 s
- headland: 51.9 s
- target: 66.5 s
- exit: 91.0 s

That matches the observed ~90-second run surprisingly closely. The route geometry itself is therefore a major cause of the current pacing.

### Candidate compressed map

A strong first tuning candidate:

- Start: **1500**
- Valley entry: **1200**
- SAM 1: **700**
- Bandit activation: **300**
- SAM 2: **-1800**
- Keep headland near **-4950**
- SAM 3: **-5900**
- Target: **-6500**
- Escape pressure / SAM 4: **-7200**
- Exit: **-8400**

At ~155 units/s, idealized axial timings become roughly:

- entry: 1.9 s
- SAM 1: 5.2 s
- bandit: 7.7 s
- SAM 2: 21.3 s
- headland: 41.6 s
- SAM 3: 47.7 s
- target: 51.6 s
- escape pressure: 56.1 s
- exit: 63.9 s

At ~190 units/s turbo, idealized axial exit time is ~52.1 s.

This is close to the desired relationship:

- normal clean run: ~60–70 s after maneuvering / combat
- optimized run with tactical turbo: ~50–60 s

### Important terrain note

If exit moves northward from -11000 to around -8400, the current northern opening also needs to move with it. The existing opening transition begins much farther north (roughly -9600 to -11700).

Do not extract the player while the valley still visually looks closed.

Compress the opening geography so the world visibly releases into the north shortly after the target and escape-pressure beat.

### Why this candidate is useful

It preserves the strongest authored geography:

- early valley
- long sight lines
- the headland reveal
- terminal basin
- launch site

while cutting the distance that currently produces the 36-second and 22-second dead legs.

Astra should treat these coordinates as a first playable experiment, then tune by feel.
