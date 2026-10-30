"use client";

import { PhoneFrame } from "@/components/phone/PhoneFrame";
import { SummaryScreen } from "@/components/phone/screens/SummaryScreen";
import { useShowcasePanelActive } from "@/components/showcase/Showcase";

/** The patient's side: the phone after a session. The depth bars fill each time this panel shows. */
export function PatientPanel() {
  const active = useShowcasePanelActive();
  return (
    <div className="flex h-full items-center justify-center overflow-hidden rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div role="img" aria-label="The FiixBE app after a session: the form score, the depth of each rep, and the report sent to the physio.">
        <PhoneFrame width={220}>
          <SummaryScreen active={active} />
        </PhoneFrame>
      </div>
    </div>
  );
}
