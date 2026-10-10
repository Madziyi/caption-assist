import type { CaptionEvent } from "./types";

export function newestFirst<T>(items: readonly T[]): T[] {
  return [...items].reverse();
}

export type HistoryGroup = {
  speakerId: string | null;
  captions: CaptionEvent[];
};

export function groupNewestFirst(captions: readonly CaptionEvent[]): HistoryGroup[] {
  const groups: HistoryGroup[] = [];
  for (const caption of captions) {
    const previous = groups.at(-1);
    if (caption.speakerId && previous?.speakerId === caption.speakerId) {
      previous.captions.push(caption);
      continue;
    }
    groups.push({ speakerId: caption.speakerId, captions: [caption] });
  }
  return groups;
}
