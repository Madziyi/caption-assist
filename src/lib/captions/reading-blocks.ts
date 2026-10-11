import type { CaptionEvent } from "./types";

// Presentation only: keep original captions/turn IDs for corrections/removal.
export const READING_BLOCKS = { pauseMs: 2000, maxWords: 80 } as const;
export type ReadingBlock = { id: string; speakerId: string | null; parts: CaptionEvent[] };
const end = (caption: CaptionEvent) => caption.endedAt ?? caption.audioEndAt ?? caption.startedAt;
const words = (caption: CaptionEvent) => caption.text.trim().split(/\s+/u).length;
const overlaps = (a: CaptionEvent, b: CaptionEvent) => a.startedAt <= end(b) && b.startedAt <= end(a);

export function readingBlocks(finalized: CaptionEvent[], interims: CaptionEvent[]): ReadingBlock[] {
  const blocks: ReadingBlock[] = [];
  // Final ingest order is authoritative; only simultaneous live previews are sorted.
  const pending = interims.filter((caption) => !finalized.some((final) => (final.sourceTurnId ?? final.id) === (caption.sourceTurnId ?? caption.id)));
  for (const caption of [...finalized, ...[...pending].sort((a, b) => a.startedAt - b.startedAt)]) {
    const previous = blocks.at(-1);
    const tail = previous?.parts.at(-1);
    const gap = tail ? caption.startedAt - end(tail) : Infinity;
    const interrupted = pending.some((other) => other.sourceId !== caption.sourceId && overlaps(other, caption));
    const canJoin = tail && previous && caption.speakerId !== null && previous.speakerId === caption.speakerId
      && tail.sourceId === caption.sourceId && gap >= 0 && gap <= READING_BLOCKS.pauseMs
      && previous.parts.reduce((total, part) => total + words(part), 0) + words(caption) <= READING_BLOCKS.maxWords
      && !interrupted;
    if (canJoin) previous.parts.push(caption);
    else blocks.push({ id: caption.id, speakerId: caption.speakerId, parts: [caption] });
  }
  return blocks;
}
