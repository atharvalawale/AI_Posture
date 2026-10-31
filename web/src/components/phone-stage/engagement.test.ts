import { afterEach, describe, expect, it, vi } from "vitest";
import { engage, isEngaged, resetEngaged, subscribeEngaged } from "./engagement";

afterEach(() => resetEngaged());

describe("engagement", () => {
  it("starts unengaged and turns on at the first scroll, once", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeEngaged(onChange);
    expect(isEngaged()).toBe(false);
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("keydown"));
    expect(isEngaged()).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("can be set directly and stays set", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeEngaged(onChange);
    engage();
    engage();
    expect(isEngaged()).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("stops listening once nothing subscribes", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    subscribeEngaged(() => {})();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
    remove.mockRestore();
  });
});
