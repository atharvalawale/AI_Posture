import { describe, expect, it } from "vitest";
import { site } from "./site";

describe("site", () => {
  it("uses the FiixBE name and mailbox", () => {
    expect(site.name).toBe("FiixBE");
    expect(site.email).toBe("hello@fiixbee.com");
    expect(site.domain).toBe("fiixbee.com");
  });

  it("has the primary navigation in order", () => {
    expect(site.nav.map((item) => item.href)).toEqual([
      "/#how-it-works",
      "/for-patients",
      "/for-physios",
      "/pricing",
      "/blog",
    ]);
  });
});
