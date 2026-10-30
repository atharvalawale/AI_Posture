import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlanScreen } from "@/components/phone/screens/PlanScreen";
import { SummaryScreen } from "@/components/phone/screens/SummaryScreen";
import { ChapterNote, PlanDetails, SummaryDetails } from "./ChapterDetails";

afterEach(cleanup);

const text = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").toLowerCase();

// The facts the details put in words. Each one must also be on the phone screen they describe.
const SUMMARY_FACTS = ["99", "up 6 from yesterday", "deepest knee bend", "95°", "sent to your physio"];
const PLAN_FACTS = ["week 3", "knee", "split squats", "go slow on the way down"];

describe("ChapterNote", () => {
  it("titles the summary chapter and says what it does", () => {
    render(<ChapterNote screen="summary" />);
    expect(screen.getByRole("heading", { level: 2, name: "Corrects you out loud" })).toBeTruthy();
    expect(screen.getByText("“Lower slowly.” “Good depth, hold.” Then a score for your form.")).toBeTruthy();
  });

  it("titles the plan chapter and says what it does", () => {
    render(<ChapterNote screen="plan" />);
    expect(screen.getByRole("heading", { level: 2, name: "Keeps your physio close" })).toBeTruthy();
    expect(screen.getByText("They review each session and adjust your plan.")).toBeTruthy();
  });
});

describe.each([
  { name: "SummaryDetails", Details: SummaryDetails, Screen: SummaryScreen, facts: SUMMARY_FACTS },
  { name: "PlanDetails", Details: PlanDetails, Screen: PlanScreen, facts: PLAN_FACTS },
])("$name", ({ Details, Screen, facts }) => {
  it.each(["full", "stage"] as const)("holds three lines that mirror the phone screen (%s)", (variant) => {
    const { container } = render(<Details variant={variant} />);
    const details = container.querySelector("[data-chapter-details]")!;
    expect(details.querySelectorAll("dt")).toHaveLength(3);
    const phone = render(<Screen />).container;
    for (const fact of facts) {
      expect(text(details)).toContain(fact);
      expect(text(phone)).toContain(fact);
    }
  });
});
