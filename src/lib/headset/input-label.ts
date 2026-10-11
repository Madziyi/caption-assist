export type InputClass = "headset" | "built-in" | "unknown";
const headset = /airpods|beats|buds|headset|headphone|earphone|bluetooth|hands-?free|bose|sony|jabra|plantronics|poly|sennheiser|shokz|logitech|hyperx|steelseries|razer|corsair/i;
const builtin = /iphone|ipad|built-?in|internal|microphone array|phone|bottom|front|back|speakerphone|macbook/i;
export function classifyInput(label: string): InputClass { return headset.test(label) ? "headset" : builtin.test(label) ? "built-in" : "unknown"; }
export function sanitizeInputLabel(label: string): string {
  return label.replace(/^\s*(?:Default|Communications)\s*-\s*/i, "").replace(/^[^'’]{1,30}['’]s\s+/u, "").replace(/\s*\([0-9a-f]{3,}:?[0-9a-f]{3,}\)\s*$/i, "").trim().slice(0, 60);
}
