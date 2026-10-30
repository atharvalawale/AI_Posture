import Image from "next/image";
import { PLAN_ITEMS } from "@/lib/sample";

/** The physio's plan editor: Maya's exercises with their dose, and the knee bend target on squats. Sample data. */
export function PrescribePanel() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <Image src="/images/avatars/maya.webp" alt="" width={44} height={44} unoptimized className="size-11 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="text-[17px] font-semibold leading-snug text-text">Maya Thomas</p>
          <p className="text-[15px] text-muted">Knee recovery plan, week 3</p>
        </div>
      </div>

      <ul className="mt-5 mb-5 divide-y divide-line border-t border-line">
        {PLAN_ITEMS.map((item, i) => (
          <li key={item.name} className="flex gap-3 py-4">
            <Image src={item.img} alt="" width={44} height={44} unoptimized className="size-11 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-snug text-text">{item.name}</p>
              <p className="text-[15px] text-muted">{item.dose}</p>
              {i === 0 && (
                <div className="mt-3 flex h-11 items-center justify-between gap-3 rounded-lg border border-line bg-bg px-3.5">
                  <span className="text-[15px] text-muted">Knee bend target</span>
                  <span className="text-[15px] font-semibold tabular-nums text-text">100°</span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-auto flex items-center gap-2 border-t border-line pt-4 text-[15px] text-muted">
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 12.5l4 4 8-9" />
        </svg>
        Sent to Maya&apos;s phone
      </p>
    </div>
  );
}
