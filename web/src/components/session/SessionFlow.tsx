"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from "react";
import { track } from "@/lib/analytics";
import { getExercise, WS_BASE, wsUrl } from "@/lib/session/protocol";
import { initialState, sessionReducer } from "@/lib/session/reducer";
import { AlignStep } from "./AlignStep";
import { CameraProblem } from "./CameraProblem";
import { LiveStep } from "./LiveStep";
import { ReportSheet } from "./ReportSheet";
import { SelectStep } from "./SelectStep";
import { useCamera } from "./useCamera";
import { usePoseSocket } from "./usePoseSocket";

/**
 * The web session: select -> get into position -> live -> report.
 *
 * With cacheComponents on, Next.js keeps this route mounted but hidden (React Activity) after the
 * visitor navigates away. Hiding runs effect cleanups, so the camera, the frame loop and the
 * socket stop. The layout effect below also resets to the select step, so nothing restarts by
 * itself when the route becomes visible again.
 */
export function SessionFlow() {
  const [state, dispatch] = useReducer(sessionReducer, initialState);
  const videoRef = useRef<HTMLVideoElement>(null);
  const exercise = getExercise(state.exercise);

  useLayoutEffect(() => {
    return () => dispatch({ type: "reset" });
  }, []);

  const failed = state.connection.status === "failed";
  const cameraOn = (state.phase === "align" || state.phase === "live") && !failed;
  const camera = useCamera(cameraOn, state.facing, state.cameraRun);

  const pose = usePoseSocket({
    active: state.phase === "live" && !failed,
    url: wsUrl(WS_BASE, state.exercise, state.side, state.repsTarget),
    run: state.socketRun,
    videoRef,
    dispatch,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.phase]);

  const goLive = useCallback(() => {
    track("exercise_start", { exercise: state.exercise, side: state.side, reps_target: state.repsTarget });
    dispatch({ type: "go_live" });
  }, [state.exercise, state.side, state.repsTarget]);

  // One event per report: exercise and side cannot change while it shows. `completed` is false when the
  // visitor ended the session before the target.
  const { phase, summary, completed, exercise: exerciseKey, side } = state;
  useEffect(() => {
    if (phase !== "report" || !summary) return;
    track("exercise_complete", {
      exercise: exerciseKey,
      side,
      reps_completed: summary.reps_completed,
      avg_score: summary.avg_score,
      completed,
    });
  }, [phase, summary, completed, exerciseKey, side]);
  const stop = useCallback(() => dispatch({ type: "stop" }), []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  const switchCamera = useCallback(() => dispatch({ type: "switch_camera" }), []);

  const problem =
    camera.status === "denied" ||
    camera.status === "no-camera" ||
    camera.status === "busy" ||
    camera.status === "unsupported" ||
    camera.status === "error"
      ? camera.status
      : null;

  if (state.phase === "select") {
    return (
      <SelectStep
        exercise={state.exercise}
        side={state.side}
        repsTarget={state.repsTarget}
        onChoose={(choice) => dispatch({ type: "choose", ...choice })}
        onStart={() => dispatch({ type: "start" })}
      />
    );
  }

  if (state.phase === "report" && state.summary) {
    return (
      <ReportSheet
        exercise={exercise}
        side={state.side}
        repsTarget={state.repsTarget}
        summary={state.summary}
        completed={state.completed}
        onAgain={reset}
      />
    );
  }

  if (problem) {
    return <CameraProblem problem={problem} onRetry={() => dispatch({ type: "retry_camera" })} onBack={state.scores.length ? stop : reset} />;
  }

  if (state.phase === "align") {
    return (
      <AlignStep
        exercise={exercise}
        videoRef={videoRef}
        stream={camera.stream}
        facing={state.facing}
        onSwitchCamera={switchCamera}
        onCancel={reset}
        onDone={goLive}
      />
    );
  }

  const latest = state.latest;
  return (
    <LiveStep
      exercise={exercise}
      side={state.side}
      repsTarget={state.repsTarget}
      connection={state.connection}
      cue={state.cue}
      repCount={latest?.rep_count ?? 0}
      angle={latest?.angle ?? null}
      holdProgress={latest?.hold_progress ?? 0}
      scores={state.scores}
      avgScore={latest?.session_avg_score ?? null}
      videoRef={videoRef}
      pose={pose}
      stream={camera.stream}
      facing={state.facing}
      onSwitchCamera={switchCamera}
      onStop={stop}
      onRetry={() => dispatch({ type: "retry_connection" })}
      onBack={state.scores.length ? stop : reset}
    />
  );
}
