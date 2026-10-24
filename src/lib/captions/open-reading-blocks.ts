import type { CaptionEvent } from "./types";
import { READING_BLOCKS, type ReadingBlock } from "./reading-blocks";

const end = (caption: CaptionEvent) => caption.audioEndAt ?? caption.endedAt ?? caption.startedAt;
const count = (text: string) => text.trim().split(/\s+/u).length;

/** Pure presentation: raw speaker labels, source turns and stored text remain untouched. */
export function openReadingBlocks(finalized: CaptionEvent[], interim: CaptionEvent | null): ReadingBlock[] {
  // Resolve runs of unknown finals only when both surrounding finalized labels agree.
  const identities = finalized.map((caption) => caption.speakerId);
  for (let i = 0; i < finalized.length;) {
    if (identities[i] !== null) { i++; continue; }
    const start = i;
    while (i < finalized.length && identities[i] === null) i++;
    const before = start > 0 ? finalized[start - 1] : undefined;
    const after = finalized[i];
    const continuous = finalized.slice(start, i + 1).every((caption, offset) => {
      const previous = finalized[start + offset - 1];
      return previous && caption.startedAt - end(previous) <= READING_BLOCKS.pauseMs;
    });
    if (before?.speakerId && before.speakerId === after?.speakerId && continuous) {
      for (let j = start; j < i; j++) identities[j] = before.speakerId;
    }
  }
  const blocks: ReadingBlock[] = [];
  let previous: CaptionEvent | undefined;
  let wordCount = 0;
  const append = (caption: CaptionEvent, speakerId: string | null) => {
    const last = blocks.at(-1);
    const sameWindow = previous && caption.startedAt - end(previous) <= READING_BLOCKS.pauseMs;
    const total = count(caption.text);
    if (last && sameWindow && last.speakerId === speakerId && wordCount + total <= READING_BLOCKS.maxWords) {
      last.parts.push(caption); wordCount += total;
    } else {
      // Break long provider turns into presentation-only slices. Preserve whitespace/text.
      const tokens = caption.text.match(/\S+\s*/gu) ?? [];
      for (let offset = 0; offset < tokens.length; offset += READING_BLOCKS.maxWords) {
        const text = tokens.slice(offset, offset + READING_BLOCKS.maxWords).join("");
        const part = offset === 0 && tokens.length <= READING_BLOCKS.maxWords ? caption : { ...caption, id: offset === 0 ? caption.id : `${caption.id}/reading/${offset}`, text };
        blocks.push({ id: part.id, speakerId, parts: [part] });
        wordCount = Math.min(tokens.length - offset, READING_BLOCKS.maxWords);
      }
    }
    previous = caption;
  };
  finalized.forEach((caption, index) => append(caption, identities[index]));
  if (interim) {
    const last = blocks.at(-1);
    // Interim identity is provisional. Words join the current paragraph immediately;
    // only finalized different labels create durable boundaries. Raw identity is intact.
    const withinWindow = previous && interim.startedAt - end(previous) <= READING_BLOCKS.pauseMs;
    append(interim, withinWindow && last?.speakerId ? last.speakerId : interim.speakerId);
  }
  return blocks;
}
