import type { ReactNode } from "react";
import type { CaptionEvent } from "@/lib/captions/types";
import { readingBlocks } from "@/lib/captions/reading-blocks";

export function HeadsetTranscript({ finalized, interims, speaker }: { finalized: CaptionEvent[]; interims: CaptionEvent[]; speaker(id: string | null): ReactNode }) {
  return <>{readingBlocks(finalized, interims).map((block) => <div className="live-caption-line headset-reading-block" key={block.id}>
    {speaker(block.speakerId)}
    <p className="current-caption" aria-live="polite" aria-atomic="false">{block.parts.map((part, index) => <span key={part.id} className={part.isFinal ? "final-caption" : "interim-caption"}>{index > 0 ? " " : ""}{part.text}</span>)}</p>
  </div>)}</>;
}
