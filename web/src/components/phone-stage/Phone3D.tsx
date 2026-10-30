"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from "react";
import { CanvasTexture, MathUtils, PMREMGenerator, type Group, type PerspectiveCamera } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BEZEL, PHONE_H, PHONE_W, ScreenSurface, type ScreenId } from "@/components/phone/PhoneFrame";
import { ScreenStack, type StoryProgress } from "@/components/phone/ScreenStack";
import type { LiveSession } from "@/lib/pose";
import { BODY, PhoneModel } from "./PhoneModel";
import { introTilt, swayAt } from "./tilt";
import type { PhoneLean } from "./usePhoneGestures";

const FOV = 18;
/**
 * The model is authored at real size (7.5 cm wide). drei's Html maps world units to CSS pixels and
 * places the screen DOM at the camera distance under a CSS perspective of `fov` pixels. Scaling the
 * scene so 1 unit = 1 CSS pixel puts the DOM at about 1:1 magnification. At real size Chrome's
 * compositor magnifies it about 40x, so its pixel snapping turns into a visible offset between
 * the screen DOM and the model.
 */
const WORLD = PHONE_W / BODY.w;
/** Camera height above the phone's center, in degrees. Shows the contact shadow as a soft ellipse. */
const ELEVATION = 9;

type Props = {
  progress: MutableRefObject<number>;
  screen: ScreenId;
  /** Drives the live screen. Leave it out while this phone is not the one on show. */
  session?: LiveSession;
  story?: StoryProgress;
  /** On-screen phone width in CSS pixels. The canvas is larger so the phone can tilt. */
  phoneWidth: number;
  dark: boolean;
  /** The visitor's own lean of the phone, added on top of the intro and the sway. */
  lean: PhoneLean;
  /** performance.now() when the intro started. Shared with the 2D phone so the hand-over never restarts it. */
  introStart: number;
  onReady: () => void;
};

/** Where the phone is turned to: the intro turn-in plus the scroll sway. Also says if the intro still runs. */
function poseAt(progress: number, introStart: number) {
  const intro = introTilt(performance.now() - introStart);
  const sway = swayAt(progress);
  return { x: intro.x + sway.x, y: intro.y + sway.y, intro: intro.x !== 0 || intro.y !== 0 };
}

/** Places the camera so the phone is exactly `phoneHeight` CSS pixels tall, like the 2D phone. */
function CameraRig({ phoneHeight }: { phoneHeight: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const d = (BODY.h * WORLD * height) / (phoneHeight * 2 * Math.tan(MathUtils.degToRad(FOV / 2)));
    const e = MathUtils.degToRad(ELEVATION);
    camera.position.set(0, Math.sin(e) * d, Math.cos(e) * d);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    // Frames render on demand: without this, a resize leaves the old frame stretched to the new
    // canvas size while the screen DOM is already laid out for it.
    invalidate();
  }, [camera, width, height, phoneHeight, invalidate]);
  return null;
}

/** Studio reflections from three's procedural room, so the aluminium reads as metal. No HDR download. */
function Studio() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { gl, scene } = get();
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    return () => {
      scene.environment = null;
      env.dispose();
      room.dispose();
      pmrem.dispose();
    };
  }, [get]);
  return null;
}

/**
 * A soft elliptical shadow on the floor under the phone. A phone standing upright has almost no
 * footprint, so a real contact shadow pass renders next to nothing; one textured quad reads better
 * and costs nothing per frame.
 */
function SoftShadow({ dark }: { dark: boolean }) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext("2d")!;
    // Falloff of the shadow's alpha: dense under the phone, fading to nothing at the edge.
    const g = ctx.createRadialGradient(128, 32, 0, 128, 32, 128);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(0.35, "rgba(0,0,0,.55)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.setTransform(1, 0, 0, 0.25, 0, 24);
    ctx.fillStyle = g;
    ctx.fillRect(0, -96, 256, 256);
    return new CanvasTexture(c);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, (-BODY.h / 2 - 0.006) * WORLD, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
      <planeGeometry args={[BODY.w * 1.25 * WORLD, BODY.w * 0.34 * WORLD]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} opacity={dark ? 0.85 : 0.3} />
    </mesh>
  );
}

function Phone({
  progress,
  screen,
  session,
  story,
  lean,
  introStart,
  onReady,
  portal,
}: Pick<Props, "progress" | "screen" | "session" | "story" | "lean" | "introStart" | "onReady"> & { portal: RefObject<HTMLDivElement | null> }) {
  const group = useRef<Group>(null);
  const turn = useRef<Group>(null);
  const frames = useRef(0);
  const invalidate = useThree((s) => s.invalidate);

  // Frames render on demand: on scroll, during the intro, and while the rotation is still easing.
  useEffect(() => {
    const onScroll = () => invalidate();
    window.addEventListener("scroll", onScroll, { passive: true });
    const unsubscribe = lean.subscribe(invalidate);
    return () => {
      window.removeEventListener("scroll", onScroll);
      unsubscribe();
    };
  }, [invalidate, lean]);

  // Priority -1 runs before drei's Html, so the screen DOM and the model move in the same frame.
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    // The visitor's turn is already smoothed by its spring, so it applies directly.
    turn.current?.rotation.set(lean.state.current.x, lean.state.current.y, 0);
    const target = poseAt(progress.current, introStart);
    // Damped, so a fast flick of the scroll wheel still reads as smooth motion.
    const k = Math.min(dt, 1 / 30);
    g.rotation.x = MathUtils.damp(g.rotation.x, target.x, 8, k);
    g.rotation.y = MathUtils.damp(g.rotation.y, target.y, 8, k);
    const settled = Math.abs(g.rotation.x - target.x) < 1e-4 && Math.abs(g.rotation.y - target.y) < 1e-4;
    if (settled) g.rotation.set(target.x, target.y, 0);
    if (frames.current < 3 && ++frames.current === 3) onReady();
    if (!settled || target.intro || frames.current < 3) state.invalidate();
  }, -1);

  // Start where the intro and the scroll have the phone now, not at rest, so the first frame does not jump.
  useLayoutEffect(() => {
    const t = poseAt(progress.current, introStart);
    group.current?.rotation.set(t.x, t.y, 0);
  }, [progress, introStart]);
  return (
    <group scale={WORLD}>
      <group ref={turn}>
        <PhoneModel ref={group} portal={portal}>
          <div className="rounded-[48px] bg-device" style={{ width: PHONE_W, height: PHONE_H, padding: BEZEL }}>
            <ScreenSurface>
              <ScreenStack screen={screen} session={session} story={story} />
            </ScreenSurface>
          </div>
        </PhoneModel>
      </group>
    </group>
  );
}

/**
 * The 3D phone. Renders only while on screen. Loaded with next/dynamic (ssr: false) so three.js
 * stays out of the first load.
 */
export default function Phone3D({ progress, screen, session, story, phoneWidth, dark, lean, introStart, onReady }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const phoneHeight = phoneWidth * (BODY.h / BODY.w);
  const width = Math.round(phoneWidth * 1.7);
  const height = Math.round(phoneHeight * 1.24);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={wrap}
      className="pointer-events-none absolute left-1/2 top-1/2 isolate -translate-x-1/2 -translate-y-1/2"
      style={{ width: `min(${width}px, 100vw)`, height }}
    >
      <Canvas
        frameloop={inView ? "demand" : "never"}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: FOV, near: 50, far: 20000, position: [0, 0, 3000] }}
        style={{ pointerEvents: "none" }}
      >
        <CameraRig phoneHeight={phoneHeight} />
        <Studio />
        <ambientLight intensity={0.25} />
        <directionalLight position={[-0.5, 0.7, 1]} intensity={1.4} />
        <directionalLight position={[0.7, 0.25, -0.8]} intensity={dark ? 2.4 : 1.1} />
        <Phone
          progress={progress}
          screen={screen}
          session={session}
          story={story}
          lean={lean}
          introStart={introStart}
          onReady={onReady}
          portal={wrap}
        />
        <SoftShadow dark={dark} />
      </Canvas>
    </div>
  );
}
