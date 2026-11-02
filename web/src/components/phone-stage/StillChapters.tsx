import { useId, type ReactNode } from "react";
import { PhoneFrame } from "@/components/phone/PhoneFrame";
import { PlanScreen } from "@/components/phone/screens/PlanScreen";
import { SummaryScreen } from "@/components/phone/screens/SummaryScreen";
import { ChapterNote, PlanDetails, SummaryDetails } from "./ChapterDetails";

/**
 * When the stage does not pin (reduced motion, or a viewport too short for the pinned stack), the
 * summary and the plan follow the hero as still sections: the screen on a flat phone, with its note
 * and details. Hidden whenever the stage pins, since the scroll story shows them then.
 */
export function StillChapters() {
  return (
    <div data-still-chapters className="motion-safe:group-data-[pinned=true]/stage:hidden">
      <StillChapter screen="summary">
        <SummaryScreen />
      </StillChapter>
      <StillChapter screen="plan">
        <PlanScreen />
      </StillChapter>
    </div>
  );
}

/**
 * Laid out like the stage at each width: the note, phone and details in three columns on desktop,
 * the note and details beside the phone on tablets, and both under the phone on phones.
 */
function StillChapter({ screen, children }: { screen: "summary" | "plan"; children: ReactNode }) {
  const titleId = useId();
  return (
    <section data-still-chapter={screen} aria-labelledby={titleId} className="border-t border-line">
      <div className="mx-auto grid w-full max-w-[1200px] justify-items-center gap-y-8 px-6 py-16 sm:grid-cols-[auto_minmax(0,320px)] sm:justify-center sm:gap-x-12 sm:gap-y-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-x-8 lg:px-10 lg:py-20">
        <ChapterNote
          screen={screen}
          titleId={titleId}
          className="@container row-start-2 w-full max-w-[320px] sm:col-start-2 sm:row-start-1 sm:self-end lg:col-start-1 lg:max-w-none lg:self-center"
        />
        <PhoneFrame width={240} className="row-start-1 sm:col-start-1 sm:row-span-2 sm:self-center lg:col-start-2 lg:row-span-1">
          {children}
        </PhoneFrame>
        <div className="row-start-3 w-full max-w-[320px] sm:col-start-2 sm:row-start-2 sm:self-start lg:col-start-3 lg:row-start-1 lg:self-center lg:justify-self-start">
          {screen === "summary" ? <SummaryDetails variant="full" /> : <PlanDetails variant="full" />}
        </div>
      </div>
    </section>
  );
}
