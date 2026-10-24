import type { CaptionEvent } from "@/lib/captions/types";
import { singleSpeakerReadingBlocks } from "@/lib/captions/single-speaker-reading-blocks";

export function SingleSpeakerTranscript({ finalized, interim }: { finalized: CaptionEvent[]; interim: CaptionEvent | null }) {
  return <>{singleSpeakerReadingBlocks(finalized, interim).map((block) => <div className="live-caption-line single-speaker-reading-block" key={block.id}>
    <p className="current-caption" aria-live="polite" aria-atomic="false">{block.parts.map((part, index) => <span key={part.id} className={part.isFinal ? "final-caption" : "interim-caption"}>{index > 0 ? " " : ""}{part.text}</span>)}</p>
  </div>)}</>;
}
