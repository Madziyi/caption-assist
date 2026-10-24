import type { ReactNode } from "react";
import type { CaptionEvent } from "@/lib/captions/types";
import { openReadingBlocks } from "@/lib/captions/open-reading-blocks";

export function OpenTranscript({ finalized, interim, speaker }: { finalized: CaptionEvent[]; interim: CaptionEvent | null; speaker(id: string | null): ReactNode }) {
  return <>{openReadingBlocks(finalized, interim).map((block) => <div className="live-caption-line open-reading-block" key={block.id}>
    {speaker(block.speakerId)}
    <p className="current-caption" aria-live="polite" aria-atomic="false">{block.parts.map((part, index) => <span key={part.id} className={part.isFinal ? "final-caption" : "interim-caption"}>{index > 0 ? " " : ""}{part.text}</span>)}</p>
  </div>)}</>;
}
