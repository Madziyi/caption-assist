import { useEffect } from "react";
export function useHeadsetWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: { release(): Promise<void>; addEventListener(type: string, listener: () => void): void } | null = null;
    let active = true;
    const request = async () => { try { if (active) { sentinel = await (navigator as Navigator & { wakeLock: { request(type: "screen"): Promise<typeof sentinel> } }).wakeLock.request("screen"); sentinel?.addEventListener("release", request); } } catch { /* Wake Lock is supplemental. */ } };
    void request();
    const onVisibility = () => { if (document.visibilityState === "visible") void request(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { active = false; document.removeEventListener("visibilitychange", onVisibility); void sentinel?.release(); };
  }, [enabled]);
}
