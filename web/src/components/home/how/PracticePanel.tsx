"use client";

import { PhoneFrame } from "@/components/phone/PhoneFrame";
import { LiveScreen } from "@/components/phone/screens/LiveScreen";
import { useShowcasePanelActive } from "@/components/showcase/Showcase";

/**
 * The patient's phone during the live squat. The video plays only while this panel shows
 * (and, inside LiveScreen, only while it is on screen), so it never runs beside the hero's.
 */
export function PracticePanel() {
  const active = useShowcasePanelActive();
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div role="img" aria-label="The FiixBE app during a squat: it counts each rep, measures the knee and says how to fix the form.">
        <PhoneFrame width={220}>
          <LiveScreen active={active} />
        </PhoneFrame>
      </div>
    </div>
  );
}
