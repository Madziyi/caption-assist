import type { TranscriptionEvent } from "../captions/types";

export const BENCHMARK_PHRASES = [
  { text: "We should meet after lunch.", entities: [] },
  { text: "Yes, that works for me.", entities: [] },
  { text: "No, not this afternoon.", entities: [] },
  { text: "My name is Jordan Lee.", entities: ["Jordan Lee"] },
  { text: "Please ask Priya to call me.", entities: ["Priya"] },
  { text: "The appointment is on October twenty fourth.", entities: ["October twenty fourth"] },
  { text: "Let's meet at seven thirty tomorrow.", entities: ["seven thirty"] },
  { text: "The total is forty two dollars and nineteen cents.", entities: ["forty two dollars and nineteen cents"] },
  { text: "The number is five five five, zero one four, two eight nine zero.", entities: ["five five five, zero one four, two eight nine zero"] },
  { text: "Send the update to the QA team.", entities: ["QA"] },
  { text: "The API returned a 404 error.", entities: ["API", "404"] },
  { text: "We will review the SQL query after the demo.", entities: ["SQL"] },
  { text: "I said fifteen, not fifty.", entities: ["fifteen", "fifty"] },
  { text: "Please bring the blue folder, not the new folder.", entities: ["blue folder", "new folder"] },
  { text: "The train leaves at nine oh five from platform twelve.", entities: ["nine oh five", "platform twelve"] },
  { text: "I paid one hundred and twenty dollars for the replacement charger.", entities: ["one hundred and twenty dollars"] },
  { text: "Can you confirm that the north entrance is open before we leave?", entities: ["north entrance"] },
  { text: "We can move the conversation to the quieter room if the hallway gets too noisy.", entities: ["quieter room"] },
] as const;

export function isHeadsetBenchmarkEnabled(search: string, role: string): boolean {
  return role !== "host" && new URLSearchParams(search).get("sttBenchmark") === "1";
}

export type BenchmarkRow = {
  id: string;
  assemblyText: string;
  openaiText: string;
  reference: string | null;
  entities: string[];
  contextHints: boolean;
  timings: { assemblyFirstTextMs: number | null; assemblyFinalMs: number | null; gateCloseToAssemblyFinalMs: number | null; openaiFirstTextMs: number | null; openaiFinalMs: number | null; gateCloseToOpenaiFinalMs: number | null; gateCloseMs: number | null };
  scores?: { assemblyWer: number; openaiWer: number; assemblyEntities: number; openaiEntities: number };
};

export function normalizedWer(reference: string, hypothesis: string): number {
  const ref = words(reference), hyp = words(hypothesis);
  if (!ref.length) return hyp.length ? 1 : 0;
  let previous = Array.from({ length: hyp.length + 1 }, (_, i) => i);
  for (let i = 1; i <= ref.length; i++) {
    const current = [i];
    for (let j = 1; j <= hyp.length; j++) current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
    previous = current;
  }
  return previous[hyp.length] / ref.length;
}

export function scoreEntities(text: string, entities: readonly string[]): number {
  if (!entities.length) return 1;
  const normalized = normalize(text);
  return entities.filter((entity) => normalized.includes(normalize(entity))).length / entities.length;
}

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
}

export function eventText(event: TranscriptionEvent): string {
  return event.type === "interim" ? event.caption.text : event.type === "speaker_revision" ? "" : event.captions.map((caption) => caption.text).join(" ");
}

function words(value: string): string[] { return normalize(value).split(/\s+/u).filter(Boolean); }
function normalize(value: string): string { return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim(); }
