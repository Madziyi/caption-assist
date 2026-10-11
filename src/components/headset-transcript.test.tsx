import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HeadsetTranscript } from "./headset-transcript";
import type { CaptionEvent } from "@/lib/captions/types";
afterEach(cleanup);
const a: CaptionEvent = { id: "a", sourceTurnId: "a", sourceId: "participant:a", speakerId: "a", startedAt: 0, endedAt: 500, text: "First sentence.", isFinal: true };
const b: CaptionEvent = { ...a, id: "b", sourceTurnId: "b", startedAt: 700, endedAt: 1000, text: "Continuing words", isFinal: false };
const speaker = (id: string | null) => <button>{id === "a" ? "Alice" : "Bob"}</button>;
it("grows a stable paragraph through interim/final/revision updates, with one speaker label", () => {
  const result = render(<HeadsetTranscript finalized={[a]} interims={[b]} speaker={speaker} />);
  const paragraph = result.container.querySelector("p")!;
  expect(paragraph).toHaveTextContent("First sentence. Continuing words");
  expect(screen.getAllByRole("button", { name: "Alice" })).toHaveLength(1);
  expect(screen.getByText(/Continuing words/)).toHaveClass("interim-caption");
  result.rerender(<HeadsetTranscript finalized={[a, { ...b, isFinal: true, text: "Continuing words corrected." }]} interims={[]} speaker={speaker} />);
  expect(result.container.querySelector("p")).toBe(paragraph);
  expect(paragraph).toHaveTextContent("First sentence. Continuing words corrected.");
  result.rerender(<HeadsetTranscript finalized={[{ ...b, isFinal: true }]} interims={[]} speaker={speaker} />);
  expect(result.container).not.toHaveTextContent("First sentence.");
});
it("renders distinct blocks for a speaker change", () => {
  const result = render(<HeadsetTranscript finalized={[a, { ...b, isFinal: true, speakerId: "b", sourceId: "participant:b" }]} interims={[]} speaker={speaker} />);
  expect(result.container.querySelectorAll("p")).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Bob" })).toBeInTheDocument();
});
