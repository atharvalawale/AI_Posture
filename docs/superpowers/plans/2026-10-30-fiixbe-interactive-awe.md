# FiixBE interactive product moments: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the homepage, For physios and For patients pages into interactive product views built on real pose tracking, and fix the scroll story bug that hides homepage sections.

**Architecture:** Pure pose math (joint measures, rep extraction, form score, pose blending) and a framework-free `LiveSession` controller live in `web/src/lib/pose/`. The homepage hero and scroll story merge into one pinned `HomeStage`, where one `LiveSession` drives the phone screen and the readout. A shared `useShowcase` hook and `Showcase` layout power every "items on one side, one panel that reacts" section. Figures drawn on the page background are SVG, so they follow the theme tokens.

**Tech Stack:** Next.js 16.4.3 App Router, React 19, TypeScript, Tailwind CSS v4, GSAP ScrollTrigger, React Three Fiber and drei, Vitest with Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-30-fiixbe-interactive-awe-design.md`. It builds on `docs/superpowers/specs/2026-10-29-fiixbe-nextjs-website-design.md`. Read both before you start.

## Global Constraints

- All paths below are relative to the repo root. Run every command from `web/`.
- Next.js 16.4.3 has breaking changes. Before writing Next-specific code, read the relevant guide in `web/node_modules/next/dist/docs/` (see `web/AGENTS.md`).
- Never use the em dash character in copy, comments or commit messages. Use "-".
- Anti-goals from the 2026-10-29 spec: no status pills, no uppercase or letter-spaced labels, sentence case everywhere, no gradients, no glow, no emojis. Fonts: Brygada 1918 (`font-serif`) and Instrument Sans (`font-sans`) only.
- Colors come from tokens only (`bg`, `surface`, `surface-2`, `line`, `text`, `muted`, `accent`, `on-accent`, `danger`, and the new `warn` from Task 16). The skeleton over video keeps its fixed colors.
- Breakpoints: phone below 640 px (`sm`), tablet 640 to 1023 px, desktop 1024 px and wider (`lg`).
- No horizontal page scroll at any width. Touch targets are at least 44 x 44 px. Text is never below 13 px.
- Every hover interaction also works with tap and keyboard. Tailwind v4 `hover:` already wraps styles in `@media (hover: hover)`. In JS, only treat `pointerenter` as hover when `pointerType === "mouse"`.
- Reduced motion: no auto advance, no scroll-driven animation, no count-up, no pin. Scrub, tap and sliders still work.
- Sample data (names, scores, clinics) appears only inside product views: dashboard, phone screens, demos, recovery slider, showcase panels. Never in marketing copy as a fact about FiixBE.
- People must match their media. Maya Thomas goes with the squat clip and the avatar cropped from it. Arjun Mehta goes with `shoulder_raises.webp`. Rohan Kulkarni goes with `straight_leg_raise.webp`.
- Commits: `feat(web): ...` or `fix(web): ...`. Do not add a Co-Authored-By line (Parth's rule).
- Checks: `npm run typecheck`, `npm run lint`, `npm test` (Vitest), and `npm run test:e2e`. While you iterate, `E2E_DEV=1 npx playwright test <file>` runs against `next dev`.

## Review Focus

1. **Autoplay is blocked** (iOS Low Power Mode). Scrub and tap still move the picture and update the readout from a paused video. Test: Task 6, "draws and feeds the session on seeked while paused".
2. **The pose clip fails to load.** The readout shows "--", the rep bars show their empty state, the dashboard still renders, and no error is thrown. Tests: Task 8 (null value), Task 13 (null depths), Task 16 (fetch rejects).
3. **The window is resized across 1024 px while the story is pinned** (rotating a tablet). The pin re-measures and the next section is not covered. Test: Task 10, "resize across the desktop breakpoint keeps the pin spacing".
4. **A vertical swipe on the phone on a touch screen** must scroll the page, not scrub. Test: Task 9, the handle's computed `touch-action` is `pan-y`.
5. **Auto advance races with the visitor.** Auto advance must stop after the first interaction, must not run off screen, and must leave no timer after unmount. Tests: Task 12.

---

### Task 1: Fix the scroll story pin

**Files:**
- Modify: `web/src/components/phone-stage/useScrollStory.ts` (the `box.story = ScrollTrigger.create({...})` call)
- Test: `web/e2e/phone-stage.spec.ts`

**Interfaces:**
- Produces: the stage still publishes `data-story-start` and `data-story-end` on `[data-phone-stage]`. Later tests rely on them.

- [ ] **Step 1: Write the failing test**

```ts
test("the story releases the pin and the next section follows it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const stage = page.locator("[data-phone-stage]");
  await expect(stage).toHaveAttribute("data-story-end", /\d+/);
  const { start, end, stageTop } = await stage.evaluate((el) => ({
    start: Number((el as HTMLElement).dataset.storyStart),
    end: Number((el as HTMLElement).dataset.storyEnd),
    stageTop: el.getBoundingClientRect().top + window.scrollY,
  }));
  const heading = page.locator("#problem-title");
  const problemTop = await heading.evaluate((el) => el.closest("section")!.getBoundingClientRect().top + window.scrollY);
  // The pin spacer pushes the next section down by the whole story length.
  expect(problemTop - stageTop).toBeGreaterThanOrEqual(end - start);
  await page.evaluate((y) => window.scrollTo(0, y), end + 200);
  await expect(heading).toBeInViewport();
  const covered = await heading.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return !el.contains(document.elementFromPoint(r.left + 8, r.top + r.height / 2));
  });
  expect(covered).toBe(false);
});
```

- [ ] **Step 2: Run it and check that it fails**

Run: `E2E_DEV=1 npx playwright test e2e/phone-stage.spec.ts -g "releases the pin"`
Expected: FAIL on `problemTop - stageTop`.

- [ ] **Step 3: Add `pinSpacing: true` to the story trigger**

Add a comment that says why: GSAP turns pin spacing off when the pinned element's parent is a flex container, and `<main>` in `layout.tsx` is one.

- [ ] **Step 4: Run the whole file and check that it passes**

Run: `E2E_DEV=1 npx playwright test e2e/phone-stage.spec.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/phone-stage/useScrollStory.ts web/e2e/phone-stage.spec.ts
git commit -m "fix(web): keep pin spacing so the story stops covering the next sections"
```

---

### Task 2: Joint measures

**Files:**
- Create: `web/src/lib/pose/measures.ts`
- Modify: `web/src/lib/pose/index.ts` (re-export), `web/src/lib/pose/geometry.ts` (extract `angleAt`)
- Test: `web/src/lib/pose/measures.test.ts` (`// @vitest-environment node`, imports the clip fixture the way `pose.test.ts` does)

**Interfaces:**
- Consumes: `keypoint`, `jointAngle`, `kneeAngle`, `coverBox`, `Box`, `PoseClip` from `@/lib/pose`.
- Produces:
  - `angleAt(pa: [number, number], pb: [number, number], pc: [number, number], aspect: number): number` in `geometry.ts`. `jointAngle` calls it.
  - `type JointId = "knee" | "hip" | "back"` and `JOINT_IDS: readonly JointId[] = ["knee", "hip", "back"]`
  - `type JointMeasure = { id: JointId; name: string; sub: string; target: number; goal: string; range: [number, number]; extreme: "min" | "max"; extremeLabel: string; vertex: number }`
  - `MEASURES: Record<JointId, JointMeasure>`
  - `hipAngle(clip: PoseClip, t: number): number`, the angle at landmark 23 between 11 and 25
  - `trunkLean(clip: PoseClip, t: number): number`, the lean of the line from hip 23 to shoulder 11 from vertical, in degrees, corrected for aspect ratio
  - `measure(clip: PoseClip, t: number, joint: JointId): number`
  - `nearestJoint(clip: PoseClip, t: number, box: Box, x: number, y: number, maxDist: number): JointId | null`. Candidates: knee 25, hip 23, shoulder 11 (shoulder selects "back").

The `MEASURES` values come from the spec and the hero mockup:

| id | name | sub | target | goal | range | extreme | extremeLabel | vertex |
|---|---|---|---|---|---|---|---|---|
| knee | Knee | bend, measured live | 100 | Your physio's target: 100° | [90, 180] | min | Deepest | 25 |
| hip | Hip | hinge, measured live | 90 | Your physio's target: 90° | [60, 180] | min | Deepest | 23 |
| back | Back | lean from upright | 45 | Keep it under 45° | [0, 60] | max | Most lean | 11 |

- [ ] **Step 1: Write the failing tests**

```ts
const sweep = (f: (t: number) => number) => { const v: number[] = []; for (let t = 0; t <= clipDuration(clip); t += 1 / 30) v.push(f(t)); return v; };

it("hip starts open and hinges to about 82°", () => {
  expect(hipAngle(clip, 0)).toBeGreaterThan(170);
  const min = Math.min(...sweep((t) => hipAngle(clip, t)));
  expect(min).toBeGreaterThan(78);
  expect(min).toBeLessThan(86);
});
it("trunk starts upright and leans up to about 42°", () => {
  expect(trunkLean(clip, 0)).toBeLessThan(10);
  const max = Math.max(...sweep((t) => trunkLean(clip, t)));
  expect(max).toBeGreaterThan(38);
  expect(max).toBeLessThan(46);
});
it("measure picks the joint", () => {
  expect(measure(clip, 3, "knee")).toBe(kneeAngle(clip, 3));
  expect(measure(clip, 3, "hip")).toBe(hipAngle(clip, 3));
  expect(measure(clip, 3, "back")).toBe(trunkLean(clip, 3));
});
it("nearestJoint picks the closest of knee, hip and shoulder within the distance", () => {
  const box = coverBox(280, 610, clip.w, clip.h);
  const px = (k: number) => { const [x, y] = keypoint(clip, 3, k); return [box.ox + x * box.w, box.oy + y * box.h] as const; };
  const [kx, ky] = px(25), [hx, hy] = px(23), [sx, sy] = px(11);
  expect(nearestJoint(clip, 3, box, kx + 5, ky, 48)).toBe("knee");
  expect(nearestJoint(clip, 3, box, hx, hy - 10, 48)).toBe("hip");
  expect(nearestJoint(clip, 3, box, sx, sy, 48)).toBe("back");
  expect(nearestJoint(clip, 3, box, kx + 200, ky, 48)).toBeNull();
});
it("knee goal reads like the mockup", () => {
  expect(MEASURES.knee.goal).toBe("Your physio's target: 100°");
});
```

- [ ] **Step 2: Run them and check that they fail**

Run: `npx vitest run src/lib/pose/measures.test.ts`
Expected: FAIL, the module is not found.

- [ ] **Step 3: Implement `measures.ts` and `angleAt`**

- [ ] **Step 4: Run the pose tests and check that they pass**

Run: `npx vitest run src/lib/pose`
Expected: PASS, including the existing `pose.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/pose
git commit -m "feat(web): measure hip hinge and trunk lean, and find the tapped joint"
```

---

### Task 3: Rep extraction and form score

**Files:**
- Create: `web/src/lib/pose/score.ts`
- Modify: `web/src/lib/pose/index.ts`
- Test: `web/src/lib/pose/score.test.ts` (node environment, clip fixture)

**Interfaces:**
- Consumes: `kneeAngle`, `clipDuration`.
- Produces:
  - `type Rep = { start: number; bottom: number; end: number; depth: number }`. Times are in seconds. `depth` is the smallest knee angle in the rep, not rounded.
  - `findReps(clip: PoseClip, opts?: { down?: number; up?: number; step?: number }): Rep[]`. Defaults: `down` 115, `up` 160, `step` 1/30. A rep runs from the last time above `up`, through a dip below `down`, to the next rise above `up`. These are the same thresholds as `RepCounter`.
  - `repScore(depth: number, target: number): number`, equal to `clamp(100 - max(0, depth - target) * 2.2, 0, 100)`
  - `formScore(depths: readonly number[], target: number): number | null`, the rounded mean of `repScore`, or null for no reps
  - `reachedCount(depths: readonly number[], target: number): number`, which counts `Math.round(depth) <= target`

- [ ] **Step 1: Write the failing tests**

```ts
it("finds the three real reps", () => {
  const reps = findReps(clip);
  expect(reps).toHaveLength(3);
  reps.forEach((r, i) => {
    expect(r.bottom).toBeCloseTo([3.0, 12.0, 25.4][i], 0);
    expect(r.start).toBeLessThan(r.bottom);
    expect(r.bottom).toBeLessThan(r.end);
  });
  expect(reps.map((r) => Math.round(r.depth))).toEqual([95, 102, 100]);
});
it("scores a rep against the target", () => {
  expect(repScore(95, 100)).toBe(100);
  expect(repScore(102, 100)).toBeCloseTo(95.6, 5);
  expect(repScore(160, 100)).toBe(0);
});
it("averages completed reps", () => {
  expect(formScore([], 100)).toBeNull();
  expect(formScore([95, 102, 100], 100)).toBe(99);
});
it("counts reps that reached the target after rounding", () => {
  const d = [95.1, 101.9, 99.5];
  expect(reachedCount(d, 100)).toBe(2);
  expect(reachedCount(d, 102)).toBe(3);
  expect(reachedCount(d, 85)).toBe(0);
  expect(reachedCount(d, 130)).toBe(3);
});
```

- [ ] **Step 2: Run them and check that they fail**

Run: `npx vitest run src/lib/pose/score.test.ts`
Expected: FAIL, the module is not found.

- [ ] **Step 3: Implement `score.ts`**

- [ ] **Step 4: Run them and check that they pass**

Run: `npx vitest run src/lib/pose`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/pose
git commit -m "feat(web): extract real reps from the clip and score form against the target"
```

---

### Task 4: Pose blending for the recovery slider

**Files:**
- Create: `web/src/lib/pose/blend.ts`
- Modify: `web/src/lib/pose/index.ts`
- Test: `web/src/lib/pose/blend.test.ts` (node environment, clip fixture)

**Interfaces:**
- Consumes: `keypoint`, `angleAt` (Task 2), `findReps` (Task 3), `kneeAngle`.
- Produces:
  - `type Pose = Record<number, [number, number]>`, mapping each landmark id in `clip.k` to normalized x and y
  - `poseAt(clip, t): Pose`, `blendPose(a: Pose, b: Pose, k: number): Pose`
  - `poseAngle(pose: Pose, a: number, b: number, c: number, aspect: number): number`, where `aspect` is `clip.h / clip.w`
  - `standingPose(clip): Pose`, which is `poseAt(clip, 0)`
  - `deepestPose(clip): { pose: Pose; t: number }`, at the bottom of the deepest rep from `findReps`
  - `WEEKS = 6`, `WEEK1_BLEND = 0.52`, `weekBlend(week: number): number`, linear from `WEEK1_BLEND` at week 1 to 1 at week 6
  - `weekPose(clip, week): Pose` and `weekDepths(clip): number[]`, the knee angle of each week's pose, not rounded
  - `blendForKnee(clip, angle: number): number`. Bisection on k in [0, 1], so the blended knee angle equals `angle`. The ghost target pose uses it with 100.

`WEEK1_BLEND` is a blend fraction, not an angle. The spec forbids typed angle values. 0.52 gives about 142° in week 1.

- [ ] **Step 1: Write the failing tests**

```ts
const r = clip.h / clip.w;
it("weeks deepen from a shallow squat to the clip's full depth", () => {
  const d = weekDepths(clip);
  expect(d).toHaveLength(6);
  expect(d[0]).toBeGreaterThan(135);
  expect(d[0]).toBeLessThan(145);
  for (let i = 1; i < 6; i++) expect(d[i]).toBeLessThan(d[i - 1]);
  expect(d[5]).toBeCloseTo(kneeAngle(clip, deepestPose(clip).t), 1);
});
it("finds the blend for the 100° target", () => {
  const k = blendForKnee(clip, 100);
  const p = blendPose(standingPose(clip), deepestPose(clip).pose, k);
  expect(Math.abs(poseAngle(p, 23, 25, 27, r) - 100)).toBeLessThan(0.5);
});
it("blend ends are the two poses", () => {
  const a = standingPose(clip), b = deepestPose(clip).pose;
  expect(blendPose(a, b, 0)).toEqual(a);
  expect(blendPose(a, b, 1)).toEqual(b);
});
```

- [ ] **Step 2: Run them and check that they fail**

Run: `npx vitest run src/lib/pose/blend.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `blend.ts`**

- [ ] **Step 4: Run them and check that they pass**

Run: `npx vitest run src/lib/pose`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/pose
git commit -m "feat(web): blend the standing and deepest poses into recovery weeks"
```

---

### Task 5: `LiveSession`, the single source of truth for the live squat

**Files:**
- Create: `web/src/lib/pose/live-session.ts`
- Modify: `web/src/lib/pose/index.ts`
- Test: `web/src/lib/pose/live-session.test.ts` (node environment, clip fixture, `vi.useFakeTimers()`)

**Interfaces:**
- Consumes: `RepCounter`, `Cue`, `kneeAngle`, `measure`, `MEASURES`, `JOINT_IDS`, `JointId`, `formScore`.
- Produces:

```ts
export type LiveState = {
  t: number;
  joint: JointId;
  value: number | null;   // the selected joint's measure, rounded
  knee: number | null;    // rounded
  reps: number;
  cue: Cue;
  extreme: number | null; // deepest (min) or most lean (max) of the selected joint since the last reset, rounded
  depths: number[];       // deepest knee angle per completed rep, not rounded
  form: number | null;    // formScore(depths, MEASURES.knee.target)
  scrubbing: boolean;
};
export type VideoLike = { currentTime: number; readonly duration: number; readonly paused: boolean; play(): Promise<void>; pause(): void };
export const SCRUB_PER_WIDTH = 8; // seconds per full phone width, from the hero mockup
export const STEP_SECONDS = 0.25;
export const RESUME_MS = 900;
export class LiveSession {
  constructor(clip?: PoseClip | null);
  setClip(clip: PoseClip): void;
  getSnapshot(): LiveState;               // stable object until something changes (useSyncExternalStore)
  subscribe(fn: () => void): () => void;
  frame(t: number, source: VideoLike): void;
  attach(video: VideoLike): () => void;
  setJoint(joint: JointId): void;
  cycleJoint(): void;
  beginScrub(): void;
  scrubTo(dxPx: number, widthPx: number): void;
  endScrub(): void;
  step(dir: -1 | 1): void;
  loop(range: [number, number] | null): void;
  dispose(): void;
}
```

The rules:
- `frame()` ignores frames from a source that is not attached, and does nothing before a clip is set.
- A frame earlier than the last one by more than 0.05 s resets reps, depths, extreme, form and the `RepCounter`. This covers a backward scrub and the loop wrap.
- The `RepCounter` gets `target: 1000`, so it never wraps.
- While the knee is below `down`, track the smallest knee angle. When `reps` goes up, push that angle to `depths`.
- `attach()` makes this video the one that drives. When `t > 0`, it seeks the video to the session's `t`, so the 2D to 3D hand-over keeps the scrub position.
- `beginScrub` pauses and remembers the start time. `scrubTo` sets `currentTime` to `clamp(start + dx / width * SCRUB_PER_WIDTH, 0, duration - 0.05)`. `endScrub` and `step` play again after `RESUME_MS`. A new scrub or step cancels a pending resume.
- `loop(range)` seeks to `range[0]`. While a range is set, a frame past `range[1]` seeks back to `range[0]`.

- [ ] **Step 1: Write the failing tests**

The tests cover:
- Fed frames from 0 to 29.2 s at 1/30 s, the session ends with `reps` 3, rounded depths `[95, 102, 100]`, `form` 99 and knee `extreme` 95.
- `setJoint("hip")` makes `value` equal `Math.round(hipAngle(clip, t))`. With `"back"`, `extreme` is the largest lean.
- A frame 1 s earlier than the last one resets `reps` to 0, `depths` to `[]` and `form` to null.
- Frames from a source that is not attached do not change the state.
- `beginScrub()` calls `pause`. `scrubTo(140, 280)` from `t` 2 sets `currentTime` to 6. After `endScrub()`, `play` is not called at 899 ms and is called at 900 ms.
- `step(1)` adds 0.25. `step(-1)` at 0.1 clamps to 0.
- Attaching a second video when `t` is 4 sets its `currentTime` to 4.
- `loop([2, 4])` seeks to 2. Then `frame(4.1, video)` sets `currentTime` back to 2.
- `cycleJoint()` goes knee, hip, back, knee.
- Before `setClip`, `getSnapshot().value` is null.

Use a fake video: `{ currentTime: 0, duration: 29.27, paused: true, play: vi.fn(async () => {}), pause: vi.fn() }`.

- [ ] **Step 2: Run them and check that they fail**

Run: `npx vitest run src/lib/pose/live-session.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `LiveSession`**

- [ ] **Step 4: Run them and check that they pass**

Run: `npx vitest run src/lib/pose`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/pose
git commit -m "feat(web): one live session for scrub, joint, reps and form"
```

---

### Task 6: Drive the live screen from the session

**Files:**
- Modify: `web/src/components/phone/usePoseVideo.ts`, `web/src/components/phone/screens/LiveScreen.tsx`, `web/src/components/phone/ScreenStack.tsx`, `web/src/lib/pose/draw.ts`, `web/src/lib/pose/index.ts`
- Test: `web/src/components/phone/screens.test.tsx`, `web/src/lib/pose/draw.test.ts`

**Interfaces:**
- Consumes: `LiveSession`, `LiveState`, `MEASURES`, `JointId`.
- Produces:
  - `drawSkeleton(ctx, clip, t, box, opts: { arc?: JointId })`. It replaces `arcAt: 25`. The arc sits at `MEASURES[joint].vertex`. For "back", the arc runs between the trunk and the vertical at the hip.
  - `usePoseVideo(videoRef, canvasRef, { active?, position?, url?, session? }): LiveState`. Without `session` it makes its own. Each drawn frame calls `session.frame(t, video)` and draws the arc at `state.joint`. It also draws on `seeked` while paused, and counts the first `seeked` as started.
  - `LiveScreen({ active?, session? })`. The bottom card shows `${MEASURES[joint].name} ${value}°`, with "--" when null.
  - `ScreenStack({ screen, session?, story? })`, where `story?: { progress: MutableRefObject<number>; onProgress: (fn: () => void) => () => void }` is passed to `SummaryScreen` (used in Task 11).
- Removes: the `tracking` view, `drawAngleLabels` and `MEASURED`, and their tests. A tap now picks a joint instead.

drei's `Html` renders the screen in its own React root, so context does not reach it. Pass `session` and `story` as props all the way down.

- [ ] **Step 1: Write the failing tests**

- In `draw.test.ts`: `drawSkeleton(ctx, clip, 3, box, { arc: "hip" })` makes `JOINTS.length + 1` arc calls. With `{}` it makes `JOINTS.length`.
- In `screens.test.tsx`, "LiveScreen shows the selected joint": render with a `LiveSession`, call `session.setJoint("hip")` inside `act`, and expect text matching `/^Hip /`.
- Also in `screens.test.tsx`, "draws and feeds the session on seeked while paused": mock `play` to reject, set the video's `currentTime` to 3, dispatch `seeked`, and expect `ctx.arc` to have been called and `session.getSnapshot().knee` not to be null.

- [ ] **Step 2: Run them and check that they fail**

Run: `npx vitest run src/components/phone src/lib/pose/draw.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run all unit tests and the type check**

Run: `npm test && npm run typecheck`
Expected: PASS. Type errors in `PhoneStage.tsx`, `Phone3D.tsx` and `Phone2DStage.tsx` about `tracking` are expected. Fix them by dropping the prop now, so the build stays green.

- [ ] **Step 5: Commit**

```bash
git add web/src
git commit -m "feat(web): the live screen follows the session and arcs the selected joint"
```

---

### Task 7: Phone gestures: scrub, tap and lean, without turning

**Files:**
- Create: `web/src/components/phone-stage/gestures.ts`, `web/src/components/phone-stage/usePhoneGestures.ts`
- Delete: `web/src/components/phone-stage/useSpin.ts`
- Modify: `web/src/components/phone-stage/spin.ts` (keep `leanToward`, `step`, `settle`, `REST`, `NO_LEAN`. Drop `dragAngles`, `release`, `rubber`, `TURN`, `MAX_PITCH` and the `base` field.)
- Test: `web/src/components/phone-stage/gestures.test.ts`, `web/src/components/phone-stage/spin.test.ts` (drop the tests for removed functions)

**Interfaces:**
- Consumes: `PHONE_W`, `PHONE_H`, `BEZEL` from `@/components/phone/PhoneFrame`.
- Produces:
  - `TAP = { ms: 350, px: 6 }`, and `isTap(moved: number, ms: number): boolean`, true when `moved < TAP.px && ms < TAP.ms`
  - `phonePointToScreen(px: number, py: number): { x: number; y: number }`. It maps fractions over the phone body to design pixels on the screen: `x = px * PHONE_W - BEZEL`, `y = py * PHONE_H - BEZEL`.
  - `usePhoneGestures({ enabled, onScrubStart, onScrub, onScrubEnd, onTap }): { lean: { state: MutableRefObject<SpinState>; subscribe: (fn: () => void) => () => void }; handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerLeave }; dragging: boolean; scrubbed: boolean }`
    - `onScrub(dxPx: number)` gets the horizontal distance from the press point. A scrub starts only after more than `TAP.px` of horizontal movement, so a tap never pauses the video.
    - `onTap(px, py)` gets fractions over the handle.
    - With a mouse and no press, the phone leans toward the pointer. `enabled: false` turns off the lean only. Scrub and tap stay on under reduced motion.

- [ ] **Step 1: Write the failing tests**

```ts
expect(isTap(5, 200)).toBe(true);
expect(isTap(7, 200)).toBe(false);
expect(isTap(2, 400)).toBe(false);
expect(phonePointToScreen(0.5, 0.5)).toEqual({ x: 140, y: 305 });
```

- [ ] **Step 2: Run them and check that they fail**

Run: `npx vitest run src/components/phone-stage`
Expected: FAIL.

- [ ] **Step 3: Implement it, then move `PhoneStage.tsx`, `Phone3D.tsx` and `Phone2DStage.tsx` to `lean`**

Rename their `spin` prop to `lean`. The drag-to-turn e2e test in `phone-stage.spec.ts` no longer applies, so delete it here. Task 9 replaces it.

- [ ] **Step 4: Run them and check that they pass**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A web/src/components/phone-stage web/e2e/phone-stage.spec.ts
git commit -m "feat(web): drag scrubs and taps measure, the phone only leans toward the cursor"
```

---

### Task 8: The live readout

**Files:**
- Create: `web/src/components/home/LiveReadout.tsx`
- Test: `web/src/components/home/LiveReadout.test.tsx`

**Interfaces:**
- Consumes: `LiveState`, `JointId`, `JOINT_IDS`, `MEASURES`.
- Produces: `LiveReadout({ state, onJoint, variant }: { state: LiveState; onJoint: (j: JointId) => void; variant: "full" | "compact" })`
  - **Full:** the joint name and sub line, then the angle in `font-serif tabular-nums`, sized with `clamp()` between about 110 and 190 px. The degree sign sits in a separate `font-sans` span at about 0.4em. After that come the target track, the cue, a `dl` with Reps, `extremeLabel` and Form, and three joint buttons.
  - **Target track:** a rail, a dot at the value's place in `range`, and a goal mark with `goal` as its label.
  - **Joint buttons:** `aria-pressed`, at least 44 px tall.
  - **Compact:** the angle at about 72 px, the track, and one row of the three stats. No joint buttons.
  - **Data hooks:** `data-readout-value` on the number and `data-readout-joint` on the joint name. The e2e tests use them.
  - **Empty values:** a null `value` shows "--". A null `form` or `extreme` shows "-".
  - **Cue:** the cue line is `aria-live="polite"`.

- [ ] **Step 1: Write the failing tests**

The tests check:
- A knee state with value 95 renders "95" and a separate "°".
- The full variant shows "Your physio's target: 100°".
- Clicking "Hip" calls `onJoint("hip")`, and "Knee" has `aria-pressed="true"`.
- A null value renders "--", and a null form renders "-".
- The compact variant has no buttons.
- With `joint: "back"`, the readout shows "Most lean" and "Keep it under 45°".

- [ ] **Step 2: Run them and check that they fail**

Run: `npx vitest run src/components/home/LiveReadout.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run them and check that they pass**

Run: `npx vitest run src/components/home`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/home
git commit -m "feat(web): big live readout with target track, stats and joint picker"
```

---

### Task 9: One stage for the hero and the phone

**Files:**
- Create: `web/src/components/phone-stage/HomeStage.tsx`, `web/src/components/home/HeroCopy.tsx`, `web/src/components/phone-stage/tilt.test.ts`
- Delete: `web/src/components/home/Hero.tsx`, `web/src/components/phone-stage/PhoneStage.tsx`
- Modify: `web/src/app/page.tsx`, `web/src/components/phone-stage/tilt.ts`, `Phone3D.tsx`, `Phone2DStage.tsx`
- Test: `web/e2e/phone-stage.spec.ts`, `web/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `LiveSession` (Task 5), `usePhoneGestures`, `phonePointToScreen` (Task 7), `LiveReadout` (Task 8), `nearestJoint`, `coverBox`, `loadPoseClip`, and `useScrollStory`, `ChapterRail`, `usePhoneWidth`, `useMedia`, `Fallback` (move these last three from `PhoneStage.tsx` into `HomeStage.tsx`).
- Produces:
  - `HomeStage()`, a client component with the `[data-phone-stage]` section. `page.tsx` renders `<HomeStage />` in place of `<Hero />` and `<PhoneStage />`.
  - `HeroCopy({ className? })` holds the h1 "See every degree of your recovery.", the lead, the two buttons and `site.appsComingSoon`. Keep the copy from `Hero.tsx`, left-aligned on desktop.
  - In `tilt.ts`: `INTRO_MS = 1200`, `introTilt(ms: number): { x: number; y: number }` (smoothstep from `START_TILT` to 0 over `INTRO_MS`), and `swayAt(p: number)` (the old `p >= 0` branch). Remove `tiltAt`.
  - `Phone3D` and `Phone2DStage` take `{ progress, screen, session, story, lean, ... }`. They add `introTilt(now - mountTime) + swayAt(progress) + lean`. `Phone3D` keeps invalidating frames until the intro ends.

The stage behavior:
- **Desktop:** the grid is `lg:grid-cols-[1fr_auto_1fr]`, with `HeroCopy` on the left, the phone in the center and `<LiveReadout variant="full">` on the right. At 1280 x 720 the phone and the readout fit in the first viewport.
- **Phone and tablet:** use the stacked layout from spec §2 for now. Task 10 adds the pin rules.
- **Handle:** `data-phone-handle`, `tabIndex={0}`, `role="group"`, `aria-label="Squat video with live tracking"`, `aria-describedby` pointing at the hint, `touch-pan-y`, `cursor-ew-resize`, and a focus ring. It is there under reduced motion too.
- **Scrub:** `onScrubStart` calls `session.beginScrub()`, `onScrub(dx)` calls `session.scrubTo(dx, width)`, and `onScrubEnd` calls `session.endScrub()`.
- **Tap:** only on the live screen. Convert the tap with `phonePointToScreen`. Use `box = coverBox(SCREEN_W, SCREEN_H, clip.w, clip.h)` and `maxDist = 48 * PHONE_W / width`. If `nearestJoint` returns a joint, call `session.setJoint`.
- **Keys:** ArrowLeft and ArrowRight call `session.step(-1 | 1)` with `preventDefault`. Enter calls `session.cycleJoint()`.
- **Hint:** "Drag to move through the squat. Tap a joint to measure it." It fades once the visitor has scrubbed once and tapped once.

- [ ] **Step 1: Write the failing tests**

`tilt.test.ts`:

```ts
expect(introTilt(0)).toEqual(START_TILT);
expect(introTilt(INTRO_MS)).toEqual({ x: 0, y: 0 });
expect(swayAt(0).y).toBeCloseTo(0);
expect(swayAt(0.25).y).toBeCloseTo(0.12);
```

`phone-stage.spec.ts` replaces the drag-to-turn test:
- **"scrubbing the phone changes the angle readout"** at 1440 x 900, once 3D is ready. Read `[data-readout-value]`, then drag 120 px across the handle with the mouse. While the button is down, expect the readout text to change and `[data-screen="live"] video` to be paused. 1.5 s after release, expect the video to be playing.
- **"a tap near the hip switches the readout to Hip"** under `reducedMotion: "reduce"`. The 2D phone is face-on there, so the geometry is exact. Press ArrowRight to pause. In the page, read the live video's `currentTime` and its bounding rect, and fetch `/media/squat.pose.json`. Work out where landmark 23 sits with the same cover math. Click that point, then expect `[data-readout-joint]` to read "Hip".
- **"keyboard steps and cycles the joint":** focus the handle, press Enter, and expect "Hip". Press ArrowRight and expect the video to be paused.
- **"vertical swipes still scroll":** expect the handle's computed `touch-action` to be `pan-y`.
- **Reduced motion test:** remove the four-notes check. Instead expect `[data-readout-value]` to be visible and `.pin-spacer` to have a count of 0.

- [ ] **Step 2: Run them and check that they fail**

Run: `npx vitest run src/components/phone-stage && E2E_DEV=1 npx playwright test e2e/phone-stage.spec.ts e2e/home.spec.ts`
Expected: the new tests fail.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run them and check that they pass**

Run: `npm test && npm run typecheck && E2E_DEV=1 npx playwright test e2e/phone-stage.spec.ts e2e/home.spec.ts`
Expected: PASS, including the Task 1 pin test.

- [ ] **Step 5: Commit**

```bash
git add -A web/src web/e2e
git commit -m "feat(web): hero and phone become one stage you can scrub and tap"
```

---

### Task 10: Chapters, crossfades and the phone-width pin

**Files:**
- Create: `web/src/components/phone-stage/ChapterDetails.tsx`
- Modify: `HomeStage.tsx`, `useScrollStory.ts`
- Test: `web/e2e/phone-stage.spec.ts`

**Interfaces:**
- Consumes: `screenAt`, `SCREENS` and `goTo` from `useScrollStory`, and `LiveReadout`.
- Produces:
  - `ChapterNote({ screen })` for "summary" and "plan". It has a serif title and one line. The copy is "Corrects you out loud" with "“Lower slowly.” “Good depth, hold.” Then a score for your form.", and "Keeps your physio close" with "They review each session and adjust your plan."
  - `SummaryDetails({ variant })` and `PlanDetails({ variant })`. Each holds three short lines that describe what the phone screen shows. The values match `SummaryScreen` and `PlanScreen` exactly: form score 92, up 6 from Monday, deepest knee bend 96°, sent to your physio. For the plan: week 3 of the knee plan, split squats added, the physio's note.
  - `useScrollStory`: drop the enter trigger. `progress` now runs from 0 to 1 only. The pin starts at `` `top+=${frame.offsetTop} top+=${headerHeight()}` ``, where `frame` is `[data-stage-frame]`. On desktop the frame is at offset 0. Below 1024 px the copy sits above the frame, so it scrolls away first.

The layout:
- **Desktop:** two grid-stacked crossfade columns. The left one shows `HeroCopy`, then the summary `ChapterNote`, then the plan `ChapterNote`. The right one shows `LiveReadout full`, then `SummaryDetails`, then `PlanDetails`. Use a 300 ms opacity and visibility fade. Inactive layers get `aria-hidden` and `inert`.
- **Below 1024 px:** `HeroCopy` comes first, outside `[data-stage-frame]`. The frame is `h-[calc(100svh-64px)]` and holds the phone plus a readout area that crossfades per chapter. Below 640 px the readout area is compact and sits under the phone. From 640 px it is full and sits beside the phone. The chapter rail and the hint come after.
- **Reduced motion:** no pin. The hero shows the phone and the readout. Below it come two still blocks, each a 2D `PhoneFrame` with `SummaryScreen` or `PlanScreen` next to its note and details.

- [ ] **Step 1: Write the failing tests**

- **"desktop columns crossfade with the chapters"** at 1440 x 900. At story 0.5 (use the existing `scrollStory` helper), expect the "Corrects you out loud" heading to be visible and the h1 to be hidden. At 0.9, expect the plan details to be visible.
- **"phone width: copy scrolls away, then the phone and the compact readout pin"** at 390 x 844. Scroll to `storyStart + 10`. Expect `[data-stage-frame]`'s top to be within 2 px of the header's height, the h1 to be out of the viewport, and `[data-readout-value]` to be visible.
- **"resize across the desktop breakpoint keeps the pin spacing"** at 1280 x 800. Wait for the story range, set the viewport to 390 x 844, and wait 500 ms. Scroll to `storyEnd + 200`. Expect `#problem-title` not to be covered (the same check as Task 1), and `scrollWidth` to be at most `clientWidth`.
- **Reduced motion:** expect the "Session complete" and "Good morning" screens to be visible after scrolling down, and no `.pin-spacer`.

- [ ] **Step 2: Run them and check that they fail**

Run: `E2E_DEV=1 npx playwright test e2e/phone-stage.spec.ts`
Expected: the new tests fail.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run them and check that they pass**

Run: `E2E_DEV=1 npx playwright test e2e/phone-stage.spec.ts e2e/home.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A web/src web/e2e
git commit -m "feat(web): chapters crossfade beside the phone, and the phone pins on small screens"
```

---

### Task 11: Scroll-driven summary, and Maya on the plan screen

**Files:**
- Modify: `web/src/components/phone/screens/SummaryScreen.tsx`, `web/src/components/phone/screens/PlanScreen.tsx`, `web/credits/avatars.md`
- Create: `web/public/images/avatars/maya.webp` (160 x 160, from `.superpowers/brainstorm/90472-1793340934/content/maya-tile.jpg`) and `web/public/images/avatars/maya-call.webp` (360 x 480, from `maya.jpg`). Make both with `cwebp -q 82`. Check that each file shows the woman from the squat clip.
- Delete: `web/public/images/avatars/riya.webp` and its credit row
- Create: `web/src/lib/sample.ts`, holding `PLAN_ITEMS`, moved from `PlanScreen`
- Test: `web/src/components/phone/screens.test.tsx`, `web/e2e/phone-stage.spec.ts`

**Interfaces:**
- Produces:
  - `SummaryScreen({ active?, story? })`. With `story`, chapter progress is `k = clamp01((p - 0.33) / 0.33)`. Bar `i` fills once `k > i / DEPTH.length`. The score text counts from 0 to 92 as `k` goes from 0 to 1. Write both straight to the DOM through refs, as `ChapterRail` does. Without `story`, or under reduced motion, show the full state.
  - `PlanScreen` greets "Good morning, Maya" and uses the avatar `/images/avatars/maya.webp`.
  - `PLAN_ITEMS: { name: string; dose: string; img: string; target?: string }[]` in `@/lib/sample`. Task 14 reuses it.
- The new credit rows: both files are crops of a frame of Pexels video 7117089 by Katrin Bolovtsova, under the Pexels License.

- [ ] **Step 1: Write the failing tests**

- In `screens.test.tsx`, "Good morning, Riya" becomes "Good morning, Maya", and the avatar `src` contains `maya.webp`.
- With a story whose `progress.current` is 0.33, the score shows "0". After setting it to 0.66 and calling the listeners, the score shows "92". Without a story, it shows "92".
- In `phone-stage.spec.ts`, replace "Riya" with "Maya".

- [ ] **Step 2: Run them and check that they fail**

Run: `npx vitest run src/components/phone`
Expected: FAIL.

- [ ] **Step 3: Implement and make the assets**

Run: `grep -rn -i riya web/src web/credits web/e2e`
Expected: no matches.

- [ ] **Step 4: Run them and check that they pass**

Run: `npm test && E2E_DEV=1 npx playwright test e2e/phone-stage.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A web/src web/public/images/avatars web/credits web/e2e
git commit -m "feat(web): summary fills with scroll and the plan greets Maya, who matches the clip"
```

---

### Task 12: The showcase primitive

**Files:**
- Create: `web/src/components/showcase/useShowcase.ts`, `web/src/components/showcase/Showcase.tsx`
- Test: `web/src/components/showcase/showcase.test.tsx`

**Interfaces:**
- Produces:

```ts
export function useShowcase(count: number, opts?: { autoAdvanceMs?: number; initial?: number; idPrefix?: string }): {
  active: number;
  select: (i: number) => void; // marks the showcase as touched
  touched: boolean;
  tabProps: (i: number) => { role: "tab"; id: string; "aria-selected": boolean; "aria-controls": string; tabIndex: 0 | -1; onClick; onFocus; onPointerEnter; onKeyDown; ref };
  panelProps: { role: "tabpanel"; id: string; "aria-labelledby": string };
  rootRef: RefObject<HTMLElement | null>; // observed for visibility
};
export type ShowcaseItem = { id: string; title: string; body: string; icon?: ReactNode; note?: string };
export function Showcase(props: { label: string; items: ShowcaseItem[]; panels: ReactNode[]; layout: "steps" | "cards"; autoAdvanceMs?: number; className?: string }): JSX.Element;
```

The rules:
- **Hover:** `onPointerEnter` selects only for `pointerType === "mouse"`.
- **Keys:** ArrowRight and ArrowDown go to the next item, ArrowLeft and ArrowUp to the previous one, and Home and End to the ends. Each moves focus with a roving tabindex.
- **Auto advance:** it runs only when `autoAdvanceMs` is set, motion is not reduced, the visitor has not touched the showcase, and at least half of `rootRef` is in view (IntersectionObserver with threshold 0.5).
- **`layout: "steps"`:** steps left and panel right from 1024 px. Panel on top below that. Below 640 px the steps become a row of three tabs with titles only, and the active step's line shows under the row.
- **`layout: "cards"`:** cards left and panel right from 1024 px. Panel on top below that.
- **Active item:** a lifted card (`bg-surface`, `border-line`, a soft shadow). Inactive items are flat and use `hover:` styles.
- **Card text:** the title is `text-[17px] font-semibold`, the line `text-[15px] text-muted`, always visible.
- **Panels:** all of them sit stacked in one grid cell. Inactive ones get `invisible opacity-0` and `inert`.

- [ ] **Step 1: Write the failing tests**

Mock `IntersectionObserver` as visible and `matchMedia` as no reduced motion unless a test says otherwise. Then:
- `click` selects.
- `pointerEnter` with `pointerType: "mouse"` selects. With `"touch"` it does not, but a click after it does.
- `focus` selects.
- ArrowRight moves focus and selection to the next item, and End goes to the last.
- With fake timers and 5000 ms: after 5000 ms the second item is active, and after 10000 ms the third.
- After a click, advancing 20000 ms changes nothing.
- With reduced motion it does not advance.
- When not intersecting it does not advance.
- After unmount, `vi.getTimerCount()` is 0.

- [ ] **Step 2: Run them and check that they fail**

Run: `npx vitest run src/components/showcase`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run them and check that they pass**

Run: `npx vitest run src/components/showcase`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/showcase
git commit -m "feat(web): showcase of items and one panel, with hover, tap, keys and auto advance"
```

---

### Task 13: Rep bars, target slider and clip hooks

**Files:**
- Create: `web/src/components/product/RepBars.tsx`, `web/src/components/product/TargetSlider.tsx`, `web/src/components/pose/usePoseClip.ts`
- Test: `web/src/components/product/product.test.tsx`

**Interfaces:**
- Consumes: `findReps`, `Rep`, `reachedCount`, `loadPoseClip`.
- Produces:
  - In `usePoseClip.ts`: `usePoseClip(): PoseClip | null` (null while loading or after a failure), and `useClipReps(): Rep[] | null`, memoized per clip
  - `RepBars({ depths, target, activeRep?, onRep?, range? }: { depths: number[] | null; target: number; activeRep?: number | null; onRep?: (i: number) => void; range?: [number, number] })`
    - The default range is `[60, 180]`. The bar height is `(180 - depth) / (180 - 60)`.
    - The dashed target line sits at `bottom = height of target`.
    - A bar that reached the target uses `bg-accent`. Others use `bg-line`, with a `text-muted` label.
    - Each bar is a button with `aria-label="Rep 1, 95°, reached your target"` (or "short of your target") and `data-reached`.
    - Null depths render a quiet "Loading the session" line in a box of the same height.
  - `TargetSlider({ value, onChange, min = 85, max = 130, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string })`. It shows a native `input type="range"` with a 44 px hit area, the value as `${value}°`, and `aria-valuetext={`${value}°`}`.

- [ ] **Step 1: Write the failing tests**

- `RepBars` with depths `[95.1, 101.9, 99.5]` and target 100 gives `data-reached` values `["true", "false", "true"]`, and clicking rep 2 calls `onRep(1)`.
- Null depths show "Loading the session".
- `TargetSlider` calls `onChange(102)` when its input changes to 102.

- [ ] **Step 2: Run them and check that they fail**

Run: `npx vitest run src/components/product`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run them and check that they pass**

Run: `npx vitest run src/components/product`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/product web/src/components/pose
git commit -m "feat(web): rep bars and target slider computed from the clip"
```

---

### Task 14: How it works as one changing visual

**Files:**
- Modify: `web/src/components/home/HowItWorks.tsx`
- Create: `web/src/components/home/how/PrescribePanel.tsx`, `PracticePanel.tsx`, `ReviewPanel.tsx`
- Test: `web/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `Showcase` with `layout: "steps"` and `autoAdvanceMs: 5000` (Task 12), `PLAN_ITEMS` (Task 11), `PhoneFrame` with `LiveScreen` (`active` is the panel's active state), `RepBars` with `useClipReps` (Task 13).

The steps, one line each:
- Prescribe: "Your physio sets your exercises and the angle to reach."
- Practice: "Prop your phone up. FiixBE counts, measures and corrects you out loud."
- Review: "Your physio sees every rep and adjusts your plan."

The panels:
- **Prescribe:** the physio's plan editor. Show the `PLAN_ITEMS` rows with their dose, and a target field "Knee bend target 100°" on squats.
- **Practice:** a 2D phone about 220 px wide with `LiveScreen`.
- **Review:** "Maya's session, Tuesday" over `RepBars` at target 100.

Keep the heading, the intro and the "Try a live session" button.

- [ ] **Step 1: Write the failing test**

"How it works: each step changes the panel". Click the "Review" tab and expect a "Rep 1" button to be visible. Press ArrowLeft and expect the Practice tab to have `aria-selected="true"`.

- [ ] **Step 2: Run it and check that it fails**

Run: `E2E_DEV=1 npx playwright test e2e/home.spec.ts -g "How it works"`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run it and check that it passes**

Run: `E2E_DEV=1 npx playwright test e2e/home.spec.ts`
Expected: PASS, including the axe tests.

- [ ] **Step 5: Commit**

```bash
git add -A web/src/components/home web/e2e/home.spec.ts
git commit -m "feat(web): how it works shows the plan, the session and the review"
```

---

### Task 15: Problem and Both sides

**Files:**
- Modify: `web/src/components/home/Problem.tsx`, `web/src/components/home/BothSides.tsx`
- Create: `web/src/components/home/WeekCompare.tsx`
- Test: `web/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `Showcase` (`layout: "cards"`, no auto advance), `PhoneFrame` with `SummaryScreen`, `RepBars` with `useClipReps`.

**Problem.** The left column keeps the heading, the intro and the three problems as short lines. The right column is `WeekCompare`:
- Two `aria-pressed` buttons, "From a printed sheet" (the default) and "With FiixBE".
- Below them, a seven-day strip from Mon to Sun.
- In sheet mode, each day reads "Squats 3 × 10" and "Form unknown". The footer says "Your physio sees nothing until your next visit."
- In FiixBE mode, the days show the sample scores 84, 88, missed (in warn), 90, 91, 93, and "Today". The footer says "Your physio sees every rep, every day". The four existing "What FiixBE changes" lines follow as a short list.
- Below 640 px, the cells show only the day and the number, at no less than 13 px.

**Both sides.** A `Showcase` has two cards, "For physiotherapists" and "For patients". Each shows its existing body and link. The active card also shows its four points as short lines. The panels:
- **Patient:** a 2D phone with `SummaryScreen`.
- **Physio:** a dashboard card with Maya's avatar and name, "Squats, sent from Maya's phone this morning", and `RepBars`.

- [ ] **Step 1: Write the failing tests**

- Click "With FiixBE" and expect "Your physio sees every rep, every day" to be visible.
- Click the "For patients" card and expect "Session complete" to be visible in the panel.

- [ ] **Step 2: Run them and check that they fail**

Run: `E2E_DEV=1 npx playwright test e2e/home.spec.ts`
Expected: the new tests fail.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run them and check that they pass**

Run: `E2E_DEV=1 npx playwright test e2e/home.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/home web/e2e/home.spec.ts
git commit -m "feat(web): problem and both sides each get one visual that reacts"
```

---

### Task 16: For physios dashboard hero

**Files:**
- Create: `web/src/components/physios/PhysioDashboard.tsx`, `PatientList.tsx`, `SessionReplay.tsx`, `PatientDetail.tsx`
- Modify: `web/src/lib/sample.ts` (add `PATIENTS`), `web/src/components/pages/ForPhysios.tsx` (replace the hero `Photo`), `web/src/app/globals.css` (add `--warn`: light `#b54708`, dark `#fdb022`, and `--color-warn` in `@theme`)
- Test: `web/src/components/physios/PhysioDashboard.test.tsx`, `web/e2e/pages.spec.ts`

**Interfaces:**
- Consumes: `LiveSession` with `loop` (Task 5), `usePoseVideo` (Task 6), `useClipReps`, `RepBars`, `TargetSlider` (Task 13), `formScore`, `reachedCount` (Task 3).
- Produces:

```ts
export type DayMark = "done" | "missed" | "today";
export type SamplePatient = {
  id: "maya" | "arjun" | "rohan"; name: string; condition: string; week: number; exercise: string;
  days: DayMark[]; form: number | "clip"; sessions: string; pain: string;
  avatar?: string; initials: string; still?: string;
  flags: { text: string; note: string; ok?: boolean }[];
};
export const PATIENTS: SamplePatient[];
```

| id | name | condition, week | exercise | days | form | sessions | pain | media | flags |
|---|---|---|---|---|---|---|---|---|---|
| maya | Maya Thomas | ACL reconstruction, 3 | Squats | done, done, done, missed, done, done, today | "clip" | 5 of 6 | 2 of 10 | avatar `maya.webp`, the squat video | short-rep flags are computed, then "Pain down from 4 last week" with the note "Good" (ok) |
| arjun | Arjun Mehta | Rotator cuff repair, 6 | Shoulder raises | done, missed, missed, done, missed, missed, today | 74 | 2 of 6 | 4 of 10 | initials AM, `/images/session/shoulder_raises.webp` | "Missed 4 sessions this week" with "Send a nudge", then "Raise stopped at 78° on the left" with "Target 90°" |
| rohan | Rohan Kulkarni | Hip replacement, 2 | Straight leg raise | done x6, today | 88 | 6 of 6 | 3 of 10 | initials RK, `/images/session/straight_leg_raise.webp` | "Every session done this week" with "On track" (ok) |

Arjun says "Missed 4", not the mockup's "Missed 3", so the flag agrees with his strip and his "2 of 6".

The behavior:
- **Maya's replay:** the squat video and canvas through `usePoseVideo`, with its own `LiveSession`. It shows the knee arc, a "Knee 95°" overlay, and a timeline with a mark at each `rep.bottom`.
- **Rep bars:** a click calls `session.loop([rep.start, rep.end])`. A "Play all" button calls `loop(null)`.
- **Maya's form:** `formScore(depths, target)`, which changes with the slider.
- **Count line:** "x of 3 reached your target", from `reachedCount`.
- **Maya's computed flags:** each rep whose `Math.round(depth) > target` gives "Rep N stopped short of your target", with the rounded angle as the note. A click on the flag loops that rep. When no rep is short, show "Every rep reached your target" as ok.
- **Arjun and Rohan:** the replay shows their photo. Rep bars and slider are at 35% opacity and `inert`.
- **Days strip:** done uses accent, missed uses warn, today uses line.
- **Layout:** below 640 px the patient list is a horizontal row of avatars and first names, the replay is full width, and the detail comes below. From 640 to 1023 px the list sits on top, with the replay and detail side by side. From 1024 px there are three columns, and the replay is at least 520 px tall. The whole thing sits in one product window: `rounded-2xl border border-line bg-surface`.

- [ ] **Step 1: Write the failing tests**

In the unit test, stub `fetch` to return the clip. Then:
- Expect "2 of 3 reached your target" and "Rep 2 stopped short of your target".
- Change the slider to 102. Expect "3 of 3" and "Every rep reached your target".
- Change it to 85. Expect "0 of 3".
- Click "Arjun Mehta". Expect "Rotator cuff repair, week 6" and "Missed 4 sessions this week".
- With `fetch` rejecting, expect the dashboard to render the patient list and "Loading the session", without throwing.

In `pages.spec.ts`, add "physio target slider changes the reached count". Focus the slider, press ArrowRight twice, and expect "3 of 3 reached your target".

- [ ] **Step 2: Run them and check that they fail**

Run: `npx vitest run src/components/physios`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run them and check that they pass**

Run: `npm test && E2E_DEV=1 npx playwright test e2e/pages.spec.ts`
Expected: PASS, including the axe tests in both themes.

- [ ] **Step 5: Commit**

```bash
git add -A web/src web/e2e/pages.spec.ts
git commit -m "feat(web): for physios opens on a dashboard you can use"
```

---

### Task 17: For physios feature tabs and practices

**Files:**
- Create: `web/src/components/physios/FeatureTabs.tsx`, `web/src/components/physios/featurePanels.tsx`, `web/src/components/physios/PracticeShowcase.tsx`
- Modify: `web/src/components/pages/ForPhysios.tsx`
- Test: `web/e2e/pages.spec.ts`

**Interfaces:**
- Consumes: `useShowcase` and `Showcase` (`layout: "cards"`), `PATIENTS`, `PLAN_ITEMS`, `maya-call.webp`, `physio.webp`.

The tabs are a tablist styled like the mockup: `font-serif text-[28px]`, `text-muted`, the active tab `text-text` with a 2 px accent underline. Below 1024 px the tab row scrolls sideways with no visible scrollbar. Under the tabs comes a one-line intro, then a `Showcase` of three cards. Switching tabs resets the cards to the first one. Each card carries the mockup's icon in a rounded square, since icons are kept by default.

| Tab | Intro | Cards (title: line) |
|---|---|---|
| See every session | Know how each home session went, rep by rep, without being in the room. | AI form analysis: Joint angles, range of motion and smoothness on every rep. / Patient dashboard: Every patient's scores, angles and sessions, updated live. / Smart alerts: Missed sessions and low scores reach you first. |
| Prescribe and follow up | Write the plan once. Adjust it as the numbers come in. | Exercise prescription: Pick from a library of physio-validated movements. / Progress reports: A weekly PDF for the patient or for insurance. / Messaging: Voice notes, corrections and encouragement. |
| Run your practice | Bookings, calls and every clinic you run, in one place. | Appointment booking: In-clinic or video, booked with you directly. / Teleconsultation: Video calls inside FiixBE. (plain muted note "Planned") / Multi-clinic support: Every clinic, physio and patient under one account. |

The panels follow `physios-v3.html`. Each sets `data-panel="<key>"`:

| key | Panel |
|---|---|
| form | Knee bend 96°, range of motion +14° since week 1, smoothness |
| dash | The `PATIENTS` rows plus Kabir Rao (81, 4 of 6) |
| alerts | Arjun missed 4 sessions, Maya's rep 2 stopped at 102°, Rohan finished his week |
| rx | `PLAN_ITEMS` with edit chips |
| report | A weekly report for Maya, week 3, with a deepest-bend line from `weekDepths` |
| msg | A chat with a voice note. The play icon is an SVG, not a text glyph. |
| book | A November calendar, "Maya, video check-in, Thu 6, 10:30" |
| tele | `maya-call.webp` and `physio.webp` tiles |
| multi | Koregaon Park, Baner, Andheri West with physio and patient counts |

**Practices.** A `Showcase` uses the three existing practice titles and bodies. Its panels:
- Standalone clinics: "Today: 4 in clinic, 11 exercising at home", with home scores.
- Hospital departments: discharged patients by post-op day.
- Independent physios: patients in Pune, Nashik, Kolhapur and Nagpur.

- [ ] **Step 1: Write the failing tests**

"feature tabs and cards change the panel with mouse, keyboard and tap":
- Click each tab. Hover each card with the mouse and expect the visible `[role=tabpanel] [data-panel]` to match.
- Focus the first card and press ArrowRight. Expect the second panel.
- In a `hasTouch: true` context, tap the third card and expect its panel.

"practices change the panel": click "Hospital departments" and expect its panel.

- [ ] **Step 2: Run them and check that they fail**

Run: `E2E_DEV=1 npx playwright test e2e/pages.spec.ts -g "feature tabs|practices"`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run them and check that they pass**

Run: `E2E_DEV=1 npx playwright test e2e/pages.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A web/src web/e2e/pages.spec.ts
git commit -m "feat(web): feature tabs with one panel that follows the card"
```

---

### Task 18: Pose figure and the recovery slider

**Files:**
- Create: `web/src/components/pose/PoseFigure.tsx`, `web/src/components/patients/RecoverySlider.tsx`, `web/src/components/patients/WeekChart.tsx`
- Modify: `web/src/components/pages/ForPatients.tsx` (the hero)
- Test: `web/src/components/patients/RecoverySlider.test.tsx`

**Interfaces:**
- Consumes: `Pose`, `weekPose`, `weekDepths`, `blendForKnee`, `blendPose`, `standingPose`, `deepestPose` (Task 4), `EDGES`, `JOINTS`, `usePoseClip` (Task 13).
- Produces:
  - `figureBounds(poses: Pose[], aspect: number, pad?: number): { x: number; y: number; w: number; h: number }`, in SVG units, where 1 unit is 1 px of a 1000-wide frame
  - `toSvg(pose: Pose, landmark: number, aspect: number): [number, number]`
  - `PoseFigure({ pose, aspect, bounds, ghost?, highlight?, arcAt?, className?, children? })`. It is an SVG drawn with tokens: bones `stroke-accent` 3 px, joints `fill-bg stroke-text`, the ghost `stroke-muted`, dashed at 50%, and highlighted joints in a larger accent ring. `children` render inside the same coordinate space.
  - `WeekChart({ depths, week, onWeek, target })`. Six points with a line and a dashed target line. Each point is a button labelled "Week N, 120°".
  - `RecoverySlider()`. It holds the week state, from 1 to 6, starting at 1. It renders:
    - the figure with the ghost at `blendForKnee(clip, 100)`
    - the knee angle at display size in serif, with the degree sign in sans
    - "Deepest knee bend, week N"
    - a range input with `aria-valuetext="Week N, deepest knee bend X°"`
    - `WeekChart`
    - the caption "An illustration built from real pose tracking of one squat. Your own numbers depend on your recovery."

The layout follows spec §7. Below 640 px: the figure, then the number and the chart. From 640 to 1023 px: the figure and the number side by side. From 1024 px: the copy, the figure and the readout. The h1, lead and buttons from the current hero stay.

- [ ] **Step 1: Write the failing tests**

Stub `fetch` with the clip. At week 1, the displayed angle is between 135 and 145. Changing the range to 6 shows `Math.round(weekDepths(clip)[5])`, which is 95. `aria-valuetext` reads "Week 6, deepest knee bend 95°". Clicking the "Week 3" chart point sets the slider to 3.

- [ ] **Step 2: Run them and check that they fail**

Run: `npx vitest run src/components/patients`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run them and check that they pass**

Run: `npm test && E2E_DEV=1 npx playwright test e2e/pages.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A web/src
git commit -m "feat(web): for patients opens on a recovery slider built from real tracking"
```

---

### Task 19: For patients steps, live demos and app cards

**Files:**
- Create: `web/src/components/patients/PatientStepPanels.tsx`, `web/src/components/patients/SessionDemos.tsx`, `web/src/components/pose/clipClock.ts`
- Modify: `web/src/components/pages/ForPatients.tsx`
- Test: `web/src/components/pose/clipClock.test.ts`, `web/e2e/pages.spec.ts`

**Interfaces:**
- Consumes: `Showcase` (`layout: "steps"`, `autoAdvanceMs: 5000`), `PhoneFrame`, `PlanScreen`, `PoseFigure`, `WeekChart`, `LiveSession`, `repScore`, `usePoseClip`.
- Produces:
  - `clipTime(elapsedMs: number, duration: number): number`, which loops the elapsed time over the clip
  - `useClipClock(clip: PoseClip | null, playing: boolean): VideoLike`. It is a clock object that `LiveSession.attach` accepts. A rAF loop calls `session.frame` and runs only while visible. Under reduced motion it holds still at the deepest rep's bottom.

**Steps.** The copy, one line each:
- Get your plan: "Your physio writes your plan and it arrives in the app."
- Exercise with the camera on: "Prop your phone up so your whole body fits the guide."
- Track your progress: "Your deepest bend improves week by week, and your physio sees it."

The panels:
- A 2D phone with `PlanScreen`.
- A 2D phone with the standing figure as a dashed muted framing guide, and the line "Step back until your whole body is inside the guide". Use the same wording as `AlignStep` if it differs.
- `WeekChart`.

**Demos.** Three cards share one `LiveSession` fed by `useClipClock`. Each card has a title, a line and a small `PoseFigure`:
- "Real-time form correction" with "Tells you out loud when to adjust, like a physio beside you." It shows the current cue.
- "Automatic rep counting" with "Only full, controlled reps count." It shows the counter.
- "A score for every rep" with "Each rep gets a score from 0 to 100, based on range of motion, hold time and smoothness." It shows one bar per completed rep, from `repScore(depth, 100)`.

The grid is one column below 640 px and three columns from 1024 px. From 640 to 1023 px, each card shows the figure on the left and the text on the right.

**App cards.** "Coming with the iPhone and Android apps" stays as three cards (`bg-surface`, `border-line`, rounded) with the existing copy.

- [ ] **Step 1: Write the failing tests**

```ts
expect(clipTime(0, 29.27)).toBe(0);
expect(clipTime(30_000, 29.27)).toBeCloseTo(0.73, 2);
```

In `pages.spec.ts`, check that the For patients page shows three demo figures and that, within 8 s, the counter shows a number at least 1. Use the production build. The first squat bottoms at 3 s.

- [ ] **Step 2: Run them and check that they fail**

Run: `npx vitest run src/components/pose`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run them and check that they pass**

Run: `npm test && E2E_DEV=1 npx playwright test e2e/pages.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A web/src web/e2e/pages.spec.ts
git commit -m "feat(web): patient steps and live demos instead of text lists"
```

---

### Task 20: Body map

**Files:**
- Create: `web/src/components/patients/BodyMap.tsx`, `web/src/components/patients/bodyMap.ts`
- Modify: `web/src/components/pages/ForPatients.tsx` (replace the `physio-knee.webp` photo and the `conditions` columns)
- Test: `web/src/components/patients/BodyMap.test.tsx`

**Interfaces:**
- Consumes: `PoseFigure`, `toSvg`, `standingPose`, `useShowcase`, and `EXERCISES` from `@/lib/session/protocol`.
- Produces:

```ts
export type Area = "knee" | "shoulder" | "hip" | "sports";
export const AREAS: { id: Area; button: string; condition: string; body: string; landmarks: number[]; exercise: ExerciseKey | null }[];
```

| id | button | condition | body | landmarks | exercise |
|---|---|---|---|---|---|
| knee | Knee | Knee rehabilitation | After ACL reconstruction, meniscus repair or knee replacement. | [25] | knee_extension |
| shoulder | Shoulder | Shoulder recovery | Rotator cuff injuries, frozen shoulder and shoulder replacement. | [11] | shoulder_raises |
| hip | Hip | Hip rehabilitation | After hip replacement surgery and hip fractures. | [23] | straight_leg_raise |
| sports | Sports injuries | Sports injuries | Sprains, strains and sports-related muscle injuries. | [25, 11, 23] | null |

The panel shows the condition in serif at 28 px and its body. It then shows the exercise row: the photo `/images/session/<key>.webp`, the `EXERCISES` name and its description. Last comes "FiixBE measures the {angleLabel} angle." Sports injuries has no exercise row and no measure line. All copy comes from `protocol.ts` or the current page, so every claim is true today.

The buttons row is a `useShowcase` tablist with hover, focus and tap. The hotspots are dots at each landmark, drawn inside `PoseFigure` as `<g>` elements with a 44 px invisible hit circle. They select on mouse hover and on tap. They are `aria-hidden`, because the buttons row is the keyboard and screen reader path (Claude's call, to avoid duplicate tab stops).

The layout: below 640 px, the figure, then the buttons, then the panel. From 640 px, the figure with the buttons under it, beside the panel.

- [ ] **Step 1: Write the failing tests**

- By default the panel shows "Knee rehabilitation" and "Knee extension".
- Click "Shoulder", and the panel shows "Shoulder recovery", "Shoulder raises" and "FiixBE measures the Shoulder angle."
- Click "Sports injuries", and three hotspots have `data-on="true"`, with no text matching `/measures/`.
- Click the hip hotspot, and "Hip rehabilitation" shows.

- [ ] **Step 2: Run them and check that they fail**

Run: `npx vitest run src/components/patients/BodyMap.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run them and check that they pass**

Run: `npm test && E2E_DEV=1 npx playwright test e2e/pages.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A web/src
git commit -m "feat(web): body map of the joints FiixBE measures today"
```

---

### Task 21: Responsiveness pass, screenshots and cleanup

**Files:**
- Create: `web/e2e/responsive.spec.ts`, `web/e2e/screens.spec.ts`
- Delete, if `grep -rn` shows no remaining use: `web/public/images/pages/doctor-tablet.webp`, `patient-home-mat.webp`, `physio-knee.webp`, the `Photo` primitive, and their rows in `web/credits/pages.md`
- Modify: any component the screenshot review shows to be off

**Interfaces:**
- Consumes: every page from the earlier tasks.

- [ ] **Step 1: Write the responsive tests**

`responsive.spec.ts` loops over `/`, `/for-physios` and `/for-patients` at widths 360, 390, 430, 768 and 1024, all 800 px tall. For each, it scrolls through the page in steps of one viewport, then checks:
- `document.documentElement.scrollWidth <= innerWidth`
- every visible element with direct text in `main` has a computed `font-size` of at least 13 px
- every visible `main button, main [role=tab], main input[type=range]` has a bounding box at least 44 px tall and 44 px wide, or 44 px tall for full-width rows

`screens.spec.ts` is skipped unless `SCREENS=1`. It saves a full-page screenshot of each of the three pages at 360, 390, 430, 768, 1024, 1280 and 1440, in light and dark, to `test-results/screens/<page>-<width>-<theme>.png`.

- [ ] **Step 2: Run them, then fix what fails**

Run: `npx playwright test e2e/responsive.spec.ts`
Expected: PASS after the fixes. Note each fix in the commit message.

- [ ] **Step 3: Take and review the screenshots**

Run: `SCREENS=1 npx playwright test e2e/screens.spec.ts`

Then open every PNG with the Read tool. Check:
- alignment, clipping and overlap
- readable contrast in both themes
- that names and avatars match their media
- that no section looks busy

Fix and repeat until every screenshot is clean.

- [ ] **Step 4: Run the full suite**

Run: `npm run typecheck && npm run lint && npm test && npm run test:e2e`
Expected: everything passes.

- [ ] **Step 5: Commit**

```bash
git add -A web
git commit -m "fix(web): responsive pass at every width, and drop the unused stock photos"
```
