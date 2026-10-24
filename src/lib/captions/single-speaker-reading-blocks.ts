import type { CaptionEvent } from "./types";

export const SINGLE_SPEAKER_PARAGRAPH_WORDS = 80;
export type SingleSpeakerBlock = { id: string; parts: Array<{ id: string; text: string; isFinal: boolean }> };

/** Presentation only: no pause, identity or finalization requirement for a paragraph. */
export function singleSpeakerReadingBlocks(finalized: CaptionEvent[], interim: CaptionEvent | null): SingleSpeakerBlock[] {
  const pending = interim && !finalized.some((caption) => (caption.sourceTurnId ?? caption.id) === (interim.sourceTurnId ?? interim.id)) ? [interim] : [];
  const blocks: SingleSpeakerBlock[] = [];
  let used = 0;
  for (const caption of [...finalized, ...pending]) {
    const tokens = caption.text.match(/\S+\s*/gu) ?? [];
    for (let offset = 0; offset < tokens.length;) {
      const id = offset === 0 ? caption.id : `${caption.id}/reading/${offset}`;
      if (!blocks.length || used === SINGLE_SPEAKER_PARAGRAPH_WORDS) { blocks.push({ id, parts: [] }); used = 0; }
      const size = Math.min(SINGLE_SPEAKER_PARAGRAPH_WORDS - used, tokens.length - offset);
      blocks.at(-1)!.parts.push({ id, text: tokens.slice(offset, offset + size).join(""), isFinal: caption.isFinal });
      used += size; offset += size;
    }
  }
  return blocks;
}
