import { expect, type Page, test, type WebSocketRoute } from "@playwright/test";

const POSE_WS = /\/ws\/pose\//;
// The fake device gives Chromium a synthetic camera. Tests that want a working camera grant the
// permission explicitly; the denied test grants nothing, so Chromium refuses the camera for real.
// (launchOptions can only be set at file level. --use-fake-ui-for-media-stream would auto-accept
// the prompt and make a real denial impossible, so it is not used here.)
test.use({ launchOptions: { args: ["--use-fake-device-for-media-stream"] } });

function update(partial: Record<string, unknown>) {
  return JSON.stringify({
    stage: "start",
    rep_count: 0,
    last_rep_score: null,
    session_avg_score: null,
    feedback: "Good start position. Now extend your knee.",
    severity: "good",
    angle: 96.4,
    angle2: null,
    hold_progress: 0,
    reps_target: 3,
    complete: false,
    view: "side",
    summary: null,
    ...partial,
  });
}

/** Records every camera track the page opens, so tests can check they were stopped. */
async function trackCamera(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __tracks: MediaStreamTrack[]; __gumCalls: number };
    w.__tracks = [];
    w.__gumCalls = 0;
    const original = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
    if (!original) return;
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      w.__gumCalls += 1;
      const stream = await original(constraints);
      w.__tracks.push(...stream.getTracks());
      return stream;
    };
  });
}

const liveTracks = (page: Page) =>
  page.evaluate(() => (window as unknown as { __tracks: MediaStreamTrack[] }).__tracks.filter((t) => t.readyState === "live").length);
const gumCalls = (page: Page) => page.evaluate(() => (window as unknown as { __gumCalls: number }).__gumCalls);

test.describe("with a camera", () => {
  test.use({ permissions: ["camera"] });

  test("full session ends in the report", async ({ page }) => {
    let url = "";
    let firstFrame = "";
    await page.routeWebSocket(POSE_WS, (ws) => {
      url = ws.url();
      let frames = 0;
      ws.onMessage((raw) => {
        frames += 1;
        if (frames === 1) {
          firstFrame = String(raw);
          ws.send(update({ stage: "moving", rep_count: 1, last_rep_score: 80, session_avg_score: 80, angle: 151 }));
          ws.send(update({ stage: "holding", rep_count: 2, last_rep_score: 90, session_avg_score: 85, angle: 163, hold_progress: 0.5 }));
          ws.send(
            update({
              stage: "complete",
              rep_count: 3,
              last_rep_score: 70,
              session_avg_score: 80,
              complete: true,
              summary: { avg_score: 80, max_score: 90, min_score: 70, reps_completed: 3, reps_target: 5, completion_pct: 60, scores: [80, 90, 70] },
            }),
          );
        }
      });
    });

    await page.goto("/session");
    await expect(page.getByRole("heading", { name: "Choose your exercise" })).toBeVisible();
    await page.getByText("Shoulder raises", { exact: true }).click();
    await page.getByText("Right", { exact: true }).click();
    await page.getByText("5", { exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();

    await expect(page.getByRole("heading", { name: "Get into position" })).toBeVisible();
    await expect(page.getByText("Point the camera at your side with your arm and shoulder visible.").filter({ visible: true })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible({ timeout: 15_000 });
    expect(url).toMatch(/\/ws\/pose\/shoulder_raises\/right\?reps_target=5$/);

    const frame = JSON.parse(firstFrame) as { frame: string };
    expect(Object.keys(frame)).toEqual(["frame"]);
    expect(frame.frame.length).toBeGreaterThan(100);
    expect(frame.frame.startsWith("/9j/")).toBe(true); // JPEG magic bytes in base64

    await expect(page.getByText("Average form score")).toBeVisible();
    await expect(page.getByText("80", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("img", { name: "Rep 2: 90" })).toBeVisible();
    await expect(page.getByText("Great work")).toBeVisible();
    expect(await liveTracks(page)).toBe(0);

    await page.getByRole("button", { name: "Do another session" }).click();
    await expect(page.getByRole("heading", { name: "Choose your exercise" })).toBeVisible();
  });

  test("ending early with no reps returns to the select step", async ({ page }) => {
    await trackCamera(page);
    await page.routeWebSocket(POSE_WS, () => {});
    await page.goto("/session");
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByRole("button", { name: "End session" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "End session" }).click();
    await expect(page.getByRole("heading", { name: "Choose your exercise" })).toBeVisible();
    await expect.poll(() => liveTracks(page)).toBe(0);
  });

  test("shows the wake-up retries, then a final error", async ({ page }) => {
    await page.clock.install();
    let connections = 0;
    await page.routeWebSocket(POSE_WS, (ws) => {
      connections += 1;
      ws.close();
    });
    await page.goto("/session");
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByText("Starting in 3").filter({ visible: true })).toBeVisible();
    await page.clock.runFor(3000);

    for (let attempt = 1; attempt <= 5; attempt++) {
      await expect(page.getByText(`Waking up the AI, attempt ${attempt} of 5`).filter({ visible: true })).toBeVisible();
      await page.clock.runFor(attempt * 3000);
    }
    await expect(page.getByText("We could not reach the AI").filter({ visible: true })).toBeVisible();
    expect(connections).toBe(6);

    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByText("Waking up the AI, attempt 1 of 5").filter({ visible: true })).toBeVisible();
  });

  test("leaving the page stops the camera and socket, and coming back shows the select step", async ({ page }) => {
    await trackCamera(page);
    let closed = 0;
    let opened = 0;
    await page.routeWebSocket(POSE_WS, (ws) => {
      opened += 1;
      ws.onClose(() => {
        closed += 1;
      });
      ws.onMessage(() => ws.send(update({})));
    });
    await page.goto("/session");
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByRole("button", { name: "End session" })).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => opened).toBe(1);
    expect(await liveTracks(page)).toBe(1);
    const callsBefore = await gumCalls(page);

    await page.getByRole("link", { name: "FiixBE home" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => liveTracks(page)).toBe(0);
    await expect.poll(() => closed).toBe(1);

    await page.getByRole("banner").getByRole("link", { name: "Try it on the web" }).click();
    await expect(page.getByRole("heading", { name: "Choose your exercise" })).toBeVisible();
    // Give any stray effect a moment to misbehave.
    await page.waitForTimeout(1500);
    expect(await gumCalls(page)).toBe(callsBefore);
    expect(await liveTracks(page)).toBe(0);
    expect(opened).toBe(1);
  });
});

test.describe("camera permission denied", () => {
  test.use({ permissions: [] });

  test("explains and offers a retry", async ({ page, context }) => {
    await page.goto("/session");
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByRole("heading", { name: "We need your camera" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();

    await context.grantPermissions(["camera"]);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { name: "Get into position" })).toBeVisible();
  });
});

test.describe("no camera", () => {
  test.use({ permissions: ["camera"] });

  test("says no camera was found", async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("Requested device not found", "NotFoundError"));
    });
    await page.goto("/session");
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByRole("heading", { name: "We could not find a camera" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "Choose your exercise" })).toBeVisible();
  });
});

// Screenshots for visual review: SESSION_SHOTS=/some/dir npx playwright test e2e/session.spec.ts -g screenshots
const SHOTS = process.env.SESSION_SHOTS;
test.describe("screenshots", () => {
  test.skip(!SHOTS, "set SESSION_SHOTS to a folder");
  test.use({ permissions: ["camera"] });

  for (const theme of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`${theme} ${width}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width, height: width < 600 ? 844 : 900 },
          colorScheme: theme,
          permissions: ["camera"],
          deviceScaleFactor: width < 600 ? 3 : 1,
        });
        await context.addInitScript((t) => localStorage.setItem("theme", t), theme);
        const page = await context.newPage();
        let socket: WebSocketRoute | null = null;
        await page.routeWebSocket(POSE_WS, (ws) => {
          socket = ws;
        });
        const shot = (name: string) => page.screenshot({ path: `${SHOTS}/${name}-${width}-${theme}.png`, fullPage: name === "select" || name === "report" });

        await page.goto("/session");
        await expect(page.getByRole("heading", { name: "Choose your exercise" })).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await shot("select");

        await page.getByRole("button", { name: "Start" }).click();
        await expect(page.getByText("Starting in 3").filter({ visible: true })).toBeVisible();
        await page.waitForTimeout(400);
        await shot("align");

        await expect(page.getByRole("button", { name: "End session" }).first()).toBeAttached({ timeout: 15_000 });
        await expect.poll(() => socket !== null).toBe(true);
        const ws = socket as unknown as WebSocketRoute;
        ws.send(update({ stage: "moving", rep_count: 1, last_rep_score: 92, session_avg_score: 92, angle: 120 }));
        ws.send(update({ stage: "moving", rep_count: 2, last_rep_score: 74, session_avg_score: 83, angle: 130 }));
        ws.send(update({ stage: "moving", rep_count: 3, last_rep_score: 48, session_avg_score: 71.3, angle: 140 }));
        ws.send(
          update({
            stage: "holding",
            rep_count: 3,
            last_rep_score: 48,
            session_avg_score: 71.3,
            angle: 158.2,
            hold_progress: 0.6,
            feedback: "Hold — keep it straight.",
            severity: "good",
          }),
        );
        await expect(page.getByText("Hold, keep it straight.").filter({ visible: true })).toBeVisible();
        await page.waitForTimeout(800);
        await shot("live");

        // A retrying state for review.
        ws.close();
        await expect(page.getByText(/Reconnecting to the AI, attempt 1 of 5/).filter({ visible: true })).toBeVisible();
        await shot("retrying");

        await page.getByRole("button", { name: "End session" }).filter({ visible: true }).click();
        await expect(page.getByRole("heading", { name: "Session ended" })).toBeVisible();
        await page.waitForTimeout(300);
        await shot("report");
        await context.close();
      });
    }
  }

  for (const theme of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`denied ${theme} ${width}`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, colorScheme: theme, deviceScaleFactor: width < 600 ? 3 : 1 });
        await context.addInitScript((t) => {
          localStorage.setItem("theme", t);
          navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
        }, theme);
        const page = await context.newPage();
        await page.goto("/session");
        await page.getByRole("button", { name: "Start" }).click();
        await expect(page.getByRole("heading", { name: "We need your camera" })).toBeVisible();
        await page.screenshot({ path: `${SHOTS}/denied-${width}-${theme}.png` });
        await context.close();
      });
    }
  }
});
