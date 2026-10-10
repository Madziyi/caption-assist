import { describe, expect, it } from "vitest";
import { groupNewestFirst, newestFirst } from "./history";
import type { CaptionEvent } from "./types";

describe("newestFirst", () => {
  it("puts the latest caption first without mutating chronological state", () => {
    const chronological = ["first", "second", "latest"];

    expect(newestFirst(chronological)).toEqual(["latest", "second", "first"]);
    expect(chronological).toEqual(["first", "second", "latest"]);
  });
});

describe("groupNewestFirst", () => {
  const caption = (id: string, speakerId: string | null): CaptionEvent => ({
    id,
    text: id,
    speakerId,
    sourceTurnId: id,
    startedAt: 1,
    isFinal: true,
  });

  it("groups adjacent stable speakers without merging caption records", () => {
    const groups = groupNewestFirst([
      caption("newest-james", "james"),
      caption("older-james", "james"),
      caption("sarah", "sarah"),
      caption("someone-1", null),
      caption("someone-2", null),
      caption("old-james", "james"),
    ]);

    expect(groups.map((group) => group.speakerId)).toEqual(["james", "sarah", null, null, "james"]);
    expect(groups[0]?.captions.map((item) => item.id)).toEqual(["newest-james", "older-james"]);
    expect(groups[2]?.captions).toHaveLength(1);
    expect(groups[3]?.captions).toHaveLength(1);
  });
});
