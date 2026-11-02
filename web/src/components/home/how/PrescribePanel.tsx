import Image from "next/image";
import { MAYA, MAYA_TARGET, PHYSIO_NOTE, PLAN_ITEMS } from "@/lib/sample";

/** The physio's plan editor: Maya's exercises with their dose, the knee bend target on squats, and the note she reads on her plan screen. Sample data. */
export function PrescribePanel() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <Image src="/images/avatars/maya.webp" alt="" width={44} height={44} unoptimized className="size-11 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="text-[17px] font-semibold leading-snug text-text">{MAYA.name}</p>
          <p className="text-[15px] text-muted">Knee recovery plan, week {MAYA.week}</p>
        </div>
      </div>

      <ul className="mt-5 mb-5 divide-y divide-line border-t border-line">
        {PLAN_ITEMS.map((item, i) => (
          <li key={item.name} className="flex gap-3 py-4">
            <Image src={item.img} alt="" width={48} height={48} unoptimized className="size-12 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-snug text-text">{item.name}</p>
              <p className="text-[15px] text-muted">{item.dose}</p>
              {i === 0 && (
                <div className="mt-3 flex h-11 items-center justify-between gap-3 rounded-lg border border-line bg-bg px-3.5">
                  <span className="text-[15px] text-muted">Knee bend target</span>
                  <span className="text-[15px] font-semibold tabular-nums text-text">{MAYA_TARGET}°</span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* The same note Maya reads on her plan screen. */}
      <div className="mt-auto rounded-lg border border-line bg-bg px-3.5 py-3">
        <p className="text-[13px] text-muted">Note to Maya</p>
        <p className="mt-1 text-[15px] text-pretty text-text">{PHYSIO_NOTE}</p>
      </div>
    </div>
  );
}
