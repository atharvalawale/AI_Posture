import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Showcase, useShowcasePanelActive } from "./Showcase";

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

  it("selects on a real mouse move, not on pointer enter or touch", () => {
    setup();
    fireEvent.pointerEnter(tab("Second"), { pointerType: "mouse" });
    expect(selected()[0]).toBe(tab("First"));
    fireEvent.pointerMove(tab("Second"), { pointerType: "touch" });
    expect(selected()[0]).toBe(tab("First"));
    fireEvent.click(tab("Second"));
    expect(selected()[0]).toBe(tab("Second"));
    fireEvent.pointerMove(tab("Third"), { pointerType: "mouse" });
    expect(selected()[0]).toBe(tab("Third"));
  });

  it("sets aria-orientation to horizontal for the phone row", () => {
    setup();
    expect(screen.getByRole("tablist").getAttribute("aria-orientation")).toBe("horizontal");
  });

  it("keeps the steps row horizontal on tablets and turns it vertical from 1024 px", () => {
    const at = (width: number) =>
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: /min-width: (\d+)px/.test(query) && width >= Number(query.match(/min-width: (\d+)px/)![1]),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
    at(768);
    const { unmount } = setup();
    expect(screen.getByRole("tablist").getAttribute("aria-orientation")).toBe("horizontal");
    unmount();
    at(1024);
    setup();
    expect(screen.getByRole("tablist").getAttribute("aria-orientation")).toBe("vertical");
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

describe("Showcase card details", () => {
  const detailed = [
    { id: "a", title: "First", body: "First line", detail: <a href="/a">First link</a> },
    { id: "b", title: "Second", body: "Second line", detail: <a href="/b">Second link</a> },
  ];
  const renderDetailed = () =>
    render(<Showcase label="Sides" items={detailed} panels={[<p key="a">Panel A</p>, <p key="b">Panel B</p>]} layout="cards" />);

  it("keeps each detail, with its link, outside the tablist", () => {
    renderDetailed();
    const tablist = screen.getByRole("tablist");
    for (const name of ["First link", "Second link"]) {
      const link = screen.getByRole("link", { name });
      expect(tablist.contains(link)).toBe(false);
    }
    expect([...tablist.children].every((el) => el.getAttribute("role") === "tab")).toBe(true);
  });

  it("marks the active card's detail, and a tap or a mouse move on a detail picks its card", () => {
    renderDetailed();
    const detailOf = (name: string) => screen.getByRole("link", { name }).parentElement!;
    expect(detailOf("First link").hasAttribute("data-active")).toBe(true);
    expect(detailOf("Second link").hasAttribute("data-active")).toBe(false);
    fireEvent.click(detailOf("Second link"));
    expect(tab("Second").getAttribute("aria-selected")).toBe("true");
    expect(detailOf("Second link").hasAttribute("data-active")).toBe(true);
    expect(detailOf("First link").hasAttribute("data-active")).toBe(false);
    fireEvent.pointerMove(detailOf("First link"), { pointerType: "touch" });
    expect(tab("Second").getAttribute("aria-selected")).toBe("true");
    fireEvent.pointerMove(detailOf("First link"), { pointerType: "mouse" });
    expect(tab("First").getAttribute("aria-selected")).toBe("true");
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
    const list = screen.getByRole("tablist");
    expect(list.className).not.toContain("grid-cols-3");
    expect(list.className).not.toContain("lg:grid-cols-1");
    expect(list.getAttribute("aria-orientation")).toBe("vertical");
    expect(screen.getAllByText("First line")).toHaveLength(1);
  });

  it("ignores arrows with a modifier held", () => {
    setup();
    fireEvent.keyDown(tab("First"), { key: "ArrowRight", altKey: true });
    expect(selected()[0]).toBe(tab("First"));
  });

  it("tells each panel whether it is the one showing", () => {
    function Probe({ name }: { name: string }) {
      return <p>{`${name} ${useShowcasePanelActive() ? "on" : "off"}`}</p>;
    }
    render(
      <Showcase label="Steps" items={items} layout="steps"
        panels={[<Probe key="a" name="A" />, <Probe key="b" name="B" />, <Probe key="c" name="C" />]} />,
    );
    expect(screen.getByText("A on")).toBeTruthy();
    expect(screen.getByText("B off")).toBeTruthy();
    fireEvent.click(tab("Second"));
    expect(screen.getByText("A off")).toBeTruthy();
    expect(screen.getByText("B on")).toBeTruthy();
  });

  it("makes a panel with nothing focusable reachable", () => {
    const { container } = setup();
    expect(container.querySelectorAll('[role="tabpanel"]')[0].getAttribute("tabindex")).toBe("0");
  });
});
