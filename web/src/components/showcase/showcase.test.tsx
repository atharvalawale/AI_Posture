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
let disconnects = 0;
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
      disconnect() {
        disconnects += 1;
      }
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
  disconnects = 0;
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

  it("wraps from the last item to the first", () => {
    setup(5000);
    for (let n = 0; n < 3; n++) act(() => void vi.advanceTimersByTime(5000));
    expect(selected()[0]).toBe(tab("First"));
  });

  it("pauses while the pointer is over the root and resumes after, without counting as a touch", () => {
    const { container } = setup(5000);
    const root = container.firstElementChild!;
    fireEvent.pointerEnter(root, { pointerType: "mouse" });
    act(() => void vi.advanceTimersByTime(20000));
    expect(selected()[0]).toBe(tab("First"));
    fireEvent.pointerLeave(root, { pointerType: "mouse" });
    act(() => void vi.advanceTimersByTime(5000));
    expect(selected()[0]).toBe(tab("Second"));
  });

  it("pauses while focus is inside the panel and resumes when it leaves", () => {
    render(
      <Showcase label="Steps" items={items} layout="steps" autoAdvanceMs={5000}
        panels={[<button key="a">Inside</button>, <p key="b">B</p>, <p key="c">C</p>]} />,
    );
    const inside = screen.getByText("Inside");
    fireEvent.focus(inside);
    act(() => void vi.advanceTimersByTime(20000));
    expect(selected()[0]).toBe(tab("First"));
    fireEvent.blur(inside);
    act(() => void vi.advanceTimersByTime(5000));
    expect(selected()[0]).toBe(tab("Second"));
  });

  it("disconnects the observer and clears its timer on unmount", () => {
    const { unmount } = setup(5000);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(disconnects).toBeGreaterThan(0);
  });
});

describe("Showcase structure", () => {
  it("drops extras and warns when items and panels differ in length", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<Showcase label="Steps" items={items} panels={panels.slice(0, 2)} layout="cards" />);
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(2);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("stays stacked, with no phone row, when steps are not three", () => {
    const four = [...items, { id: "d", title: "Fourth", body: "Fourth line" }];
    render(<Showcase label="Steps" items={four} panels={[...panels, <p key="d">D</p>]} layout="steps" />);
    expect(screen.getByRole("tablist").className).not.toContain("grid-cols-3");
    expect(screen.getAllByText("First line")).toHaveLength(1);
  });

  it("ignores arrows with a modifier held", () => {
    setup();
    fireEvent.keyDown(tab("First"), { key: "ArrowRight", altKey: true });
    expect(selected()[0]).toBe(tab("First"));
  });

  it("makes a panel with nothing focusable reachable", () => {
    const { container } = setup();
    expect(container.querySelectorAll('[role="tabpanel"]')[0].getAttribute("tabindex")).toBe("0");
  });
});
