"use client";

import { Html } from "@react-three/drei";
import { forwardRef, useMemo, type ReactNode, type RefObject } from "react";
import { ExtrudeGeometry, NoBlending, Shape, ShapeGeometry, type Group } from "three";
import { PHONE_H, PHONE_W } from "@/components/phone/PhoneFrame";

/** World units per CSS pixel of the 2D design, so the 3D phone matches the 2D one exactly. */
const U = 0.075 / PHONE_W;
export const BODY = { w: PHONE_W * U, h: PHONE_H * U, d: 0.0085, r: 48 * U };
const EDGE = { size: 0.0016, thickness: 0.0019 };

function roundedRect(w: number, h: number, r: number): Shape {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** A rounded slab of depth `d`, centered on the origin, with softly rounded edges. */
function slab(w: number, h: number, r: number, d: number, edge = EDGE): ExtrudeGeometry {
  const g = new ExtrudeGeometry(roundedRect(w - edge.size * 2, h - edge.size * 2, Math.max(0.0005, r - edge.size)), {
    depth: d - edge.thickness * 2,
    bevelEnabled: true,
    bevelSize: edge.size,
    bevelThickness: edge.thickness,
    bevelSegments: 8,
    curveSegments: 24,
  });
  g.translate(0, 0, -(d - edge.thickness * 2) / 2);
  return g;
}

/**
 * A procedural, brand-neutral phone: graphite aluminium body with rounded edges, a black glass
 * front, a volume rocker and power key on the right, and a two-lens camera on the back.
 * The screen is real DOM (drei Html, CSS 3D transform) so text stays sharp. With
 * `occlude="blending"` the page shows the DOM through a hole cut in the canvas, so the body
 * hides the screen whenever the back faces the camera.
 */
type Props = {
  children: ReactNode;
  /** Element the screen DOM is appended to. A stable element avoids drei re-creating it on mount. */
  portal?: RefObject<HTMLElement | null>;
};

export const PhoneModel = forwardRef<Group, Props>(function PhoneModel({ children, portal }, ref) {
  const geo = useMemo(() => {
    const bump = { w: 0.0215, h: 0.0335, r: 0.0072 };
    return {
      body: slab(BODY.w, BODY.h, BODY.r, BODY.d),
      // The flat front glass, inside the rounded metal rim. Used for the back panel, and as the
      // hole the front face DOM shows through.
      glass: new ShapeGeometry(roundedRect(BODY.w - EDGE.size * 2, BODY.h - EDGE.size * 2, BODY.r - EDGE.size), 32),
      bump: slab(bump.w, bump.h, bump.r, 0.0024, { size: 0.0007, thickness: 0.0008 }),
      bumpSize: bump,
    };
  }, []);

  const frame = (
    <meshStandardMaterial color="#3b4144" metalness={0.92} roughness={0.36} envMapIntensity={1.1} />
  );
  const z = BODY.d / 2;
  const bx = -BODY.w / 2 + 0.0035 + geo.bumpSize.w / 2;
  const by = BODY.h / 2 - 0.0035 - geo.bumpSize.h / 2;

  return (
    <group ref={ref}>
      <mesh geometry={geo.body} castShadow>
        {frame}
      </mesh>

      {/* Back panel: frosted glass, a shade lighter than the frame. */}
      <mesh geometry={geo.glass} position={[0, 0, -z - 0.00002]} rotation={[0, Math.PI, 0]}>
        <meshPhysicalMaterial color="#2a2f31" roughness={0.55} metalness={0.2} clearcoat={0.4} clearcoatRoughness={0.4} />
      </mesh>

      {/* Camera module and lenses. */}
      <group position={[bx, by, -z - 0.0011]}>
        <mesh geometry={geo.bump}>
          <meshPhysicalMaterial color="#202527" roughness={0.3} metalness={0.4} clearcoat={0.8} />
        </mesh>
        {[0.0078, -0.0078].map((y) => (
          <group key={y} position={[0, y, -0.0012]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.0052, 0.0052, 0.0009, 40]} />
              <meshStandardMaterial color="#8d969a" metalness={1} roughness={0.25} />
            </mesh>
            <mesh position={[0, -0.0003, 0]}>
              <cylinderGeometry args={[0.0042, 0.0042, 0.0004, 40]} />
              <meshPhysicalMaterial color="#04070a" roughness={0.05} metalness={0.3} clearcoat={1} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Volume rocker and power key, right side. */}
      {[
        { y: 0.03, len: 0.021 },
        { y: 0.004, len: 0.011 },
      ].map(({ y, len }) => (
        <mesh key={y} position={[BODY.w / 2 + 0.0003, y, 0]}>
          <boxGeometry args={[0.0012, len, 0.0032]} />
          {frame}
        </mesh>
      ))}

      {/*
        The whole front face (black bezel and screen) is DOM, 300 x 630 CSS px like the 2D phone,
        shown through a hole the size of the front glass. The DOM is larger than the hole, so the
        tiny differences between the CSS and WebGL projections land on black bezel, never on the
        page behind. 1 CSS pixel = U world units: distanceFactor maps Html pixels to units.
      */}
      <Html
        transform
        occlude="blending"
        portal={portal as RefObject<HTMLElement>}
        geometry={<primitive object={geo.glass} attach="geometry" />}
        // Writes transparent pixels with no blending, so the hole shows the DOM whatever drew there first.
        material={<meshBasicMaterial color="#000000" opacity={0} blending={NoBlending} />}
        distanceFactor={400 * U}
        position={[0, 0, z + 0.0001]}
        zIndexRange={[10, 0]}
        style={{ width: PHONE_W, height: PHONE_H, backfaceVisibility: "hidden" }}
      >
        {children}
      </Html>
    </group>
  );
});

