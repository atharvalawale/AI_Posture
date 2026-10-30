import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Showcase } from "./Showcase";

const items = [
  { id: "a", title: "First", body: "First line" },
  { id: "b", title: "Second", body: "Second line" },
  { id: "c", title: "Third", body: "Third line" },
];
const panels = [<p key="a">Panel A</p>, <p key="b">Panel B</p>, <p key="c">Panel C</p>];

let intersecting = true;
let observerCallback: ((e: { isIntersecting: boolean }[]) => void) | null = null;

function mockEnv(reduced = false) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) => ({
      matches: reduced && query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
        observerCallback = cb;
      }
      observe() {
        observerCallback?.([{ isIntersecting: intersecting }]);
      }
      disconnect() {}
      unobserve() {}
    },
  );
}

function setup(autoAdvanceMs?: number) {
  return render(<Showcase label="Steps" items={items} panels={panels} layout="steps" autoAdvanceMs={autoAdvanceMs} />);
}

const tab = (name: string) => screen.getAllByRole("tab").find((t) => t.textContent?.includes(name))!;
const selected = () => screen.getAllByRole("tab").filter((t) => t.getAttribute("aria-selected") === "true");

beforeEach(() => {
  intersecting = true;
  mockEnv();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Showcase selection", () => {
  it("selects on click", () => {
    setup();
    fireEvent.click(tab("Second"));
    expect(selected()[0]).toBe(tab("Second"));
  });

  it("selects on mouse pointer enter only", () => {
    setup();
    fireEvent.pointerEnter(tab("Second"), { pointerType: "touch" });
    expect(selected()[0]).toBe(tab("First"));
    fireEvent.click(tab("Second"));
    expect(selected()[0]).toBe(tab("Second"));
    fireEvent.pointerEnter(tab("Third"), { pointerType: "mouse" });
    expect(selected()[0]).toBe(tab("Third"));
  });

  it("selects on focus", () => {
    setup();
    fireEvent.focus(tab("Third"));
    expect(selected()[0]).toBe(tab("Third"));
  });

  it("moves with arrow keys and End, with a roving tabindex", () => {
    setup();
    tab("First").focus();
    fireEvent.keyDown(tab("First"), { key: "ArrowRight" });
    expect(selected()[0]).toBe(tab("Second"));
    expect(document.activeElement).toBe(tab("Second"));
    expect(tab("Second").tabIndex).toBe(0);
    expect(tab("First").tabIndex).toBe(-1);
    fireEvent.keyDown(tab("Second"), { key: "End" });
    expect(selected()[0]).toBe(tab("Third"));
    fireEvent.keyDown(tab("Third"), { key: "ArrowUp" });
    expect(selected()[0]).toBe(tab("Second"));
    fireEvent.keyDown(tab("Second"), { key: "Home" });
    expect(selected()[0]).toBe(tab("First"));
  });

  it("keeps inactive panels inert", () => {
    const { container } = setup();
    const all = container.querySelectorAll('[role="tabpanel"]');
    expect(all).toHaveLength(3);
    expect(all[0].hasAttribute("inert")).toBe(false);
    expect(all[1].hasAttribute("inert")).toBe(true);
  });
});

describe("Showcase auto advance", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("advances every interval", () => {
    setup(5000);
    act(() => void vi.advanceTimersByTime(5000));
    expect(selected()[0]).toBe(tab("Second"));
    act(() => void vi.advanceTimersByTime(5000));
    expect(selected()[0]).toBe(tab("Third"));
  });

  it("stops after a click", () => {
    setup(5000);
    fireEvent.click(tab("Second"));
    act(() => void vi.advanceTimersByTime(20000));
    expect(selected()[0]).toBe(tab("Second"));
  });

  it("does not advance with reduced motion", () => {
    mockEnv(true);
    setup(5000);
    act(() => void vi.advanceTimersByTime(20000));
    expect(selected()[0]).toBe(tab("First"));
  });

  it("does not advance when out of view", () => {
    intersecting = false;
    setup(5000);
    act(() => void vi.advanceTimersByTime(20000));
    expect(selected()[0]).toBe(tab("First"));
  });

  it("clears its timer on unmount", () => {
    const { unmount } = setup(5000);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
