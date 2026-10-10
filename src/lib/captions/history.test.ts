import { describe, expect, it } from "vitest";
import { newestFirst } from "./history";

describe("newestFirst", () => {
  it("puts the latest caption first without mutating chronological state", () => {
    const chronological = ["first", "second", "latest"];

    expect(newestFirst(chronological)).toEqual(["latest", "second", "first"]);
    expect(chronological).toEqual(["first", "second", "latest"]);
  });
});
