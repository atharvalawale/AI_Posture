import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { PoseClip } from "@/lib/pose";
import fixture from "../../../public/media/squat.pose.json";
import { BodyMap } from "./BodyMap";

const clip = fixture as PoseClip;

beforeAll(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => clip })),
  );
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});
afterAll(() => vi.unstubAllGlobals());
afterEach(cleanup);

/** The panel that shows: the one the selected tab controls. The others are hidden. */
function shownPanel() {
  const tab = screen.getAllByRole("tab").find((t) => t.getAttribute("aria-selected") === "true")!;
  return document.getElementById(tab.getAttribute("aria-controls")!)!;
}

/** Hotspots, once the clip has loaded and the figure is drawn. */
async function hotspots(container: HTMLElement) {
  await waitFor(() => expect(container.querySelectorAll("[data-hotspot]").length).toBe(3));
  return [...container.querySelectorAll<SVGGElement>("[data-hotspot]")];
}

describe("BodyMap", () => {
  it("opens on the knee", () => {
    render(<BodyMap />);
    const panel = shownPanel();
    expect(panel).toHaveTextContent("Knee rehabilitation");
    expect(panel).toHaveTextContent("Knee extension");
    expect(panel).toHaveTextContent("FiixBE measures the knee angle.");
    expect(screen.getByRole("tab", { name: "Knee" })).toHaveAttribute("aria-selected", "true");
  });

  it("a button switches the area", () => {
    render(<BodyMap />);
    fireEvent.click(screen.getByRole("tab", { name: "Shoulder" }));
    const panel = shownPanel();
    expect(panel).toHaveTextContent("Shoulder recovery");
    expect(panel).toHaveTextContent("Shoulder raises");
    expect(panel).toHaveTextContent("FiixBE measures the shoulder angle.");
  });

  it("sports injuries lights every hotspot and claims no measure", async () => {
    const { container } = render(<BodyMap />);
    fireEvent.click(screen.getByRole("tab", { name: "Sports injuries" }));
    const spots = await hotspots(container);
    expect(spots.filter((g) => g.getAttribute("data-on") === "true")).toHaveLength(3);
    const panel = shownPanel();
    expect(panel).toHaveTextContent("Sprains, strains and sports-related muscle injuries.");
    expect(panel.textContent).not.toMatch(/measures/);
  });

  it("a hotspot selects its area, and only that hotspot lights", async () => {
    const { container } = render(<BodyMap />);
    const spots = await hotspots(container);
    const hip = spots.find((g) => g.getAttribute("data-hotspot") === "hip")!;
    fireEvent.click(hip);
    expect(shownPanel()).toHaveTextContent("Hip rehabilitation");
    expect(screen.getByRole("tab", { name: "Hip" })).toHaveAttribute("aria-selected", "true");
    expect(spots.map((g) => g.getAttribute("data-on"))).toEqual(
      spots.map((g) => String(g.getAttribute("data-hotspot") === "hip")),
    );
  });

  it("hotspots stay out of the accessibility tree", async () => {
    const { container } = render(<BodyMap />);
    const spots = await hotspots(container);
    for (const g of spots) expect(g.closest("[aria-hidden='true']")).not.toBeNull();
  });
});
