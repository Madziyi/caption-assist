import type { CaptionEvent } from "./types";

export const SINGLE_SPEAKER_PARAGRAPH_PAUSE_MS = 3000;
export type SingleSpeakerBlock = { id: string; parts: Array<{ id: string; text: string; isFinal: boolean }> };

/** Presentation only: use audio timing, never delivery delay or word count. */
export function singleSpeakerReadingBlocks(finalized: CaptionEvent[], interim: CaptionEvent | null): SingleSpeakerBlock[] {
  const pending = interim && !finalized.some((caption) => (caption.sourceTurnId ?? caption.id) === (interim.sourceTurnId ?? interim.id)) ? [interim] : [];
  const blocks: SingleSpeakerBlock[] = [];
  let previous: CaptionEvent | undefined;
  for (const caption of [...finalized, ...pending]) {
    if (!caption.text.trim()) continue;
    // Missing audio endpoints cannot establish silence; keep the paragraph together.
    const endedAt = previous?.audioEndAt ?? previous?.endedAt;
    const pause = endedAt !== undefined && Number.isFinite(endedAt) && Number.isFinite(caption.startedAt)
      && caption.startedAt - endedAt >= SINGLE_SPEAKER_PARAGRAPH_PAUSE_MS;
    if (!blocks.length || pause) blocks.push({ id: caption.id, parts: [] });
    blocks.at(-1)!.parts.push({ id: caption.id, text: caption.text, isFinal: caption.isFinal });
    previous = caption;
  }
  return blocks;
}
