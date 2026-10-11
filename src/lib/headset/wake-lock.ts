import { useEffect } from "react";

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener?: (type: string, listener: () => void) => void;
};

type WakeLockLike = {
  request: (type: "screen") => Promise<WakeLockSentinelLike>;
};

export function useHeadsetWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || typeof document === "undefined") return;
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
    if (!wakeLock || typeof wakeLock.request !== "function") return;

    let sentinel: WakeLockSentinelLike | null = null;
    let active = true;

    const release = async (candidate: WakeLockSentinelLike) => {
      try {
        // Keep the Web API receiver intact. Some mobile browsers throw
        // "Illegal invocation" when these methods are detached.
        await candidate.release.call(candidate);
      } catch { /* Wake Lock is supplemental. */ }
    };

    const request = async () => {
      if (!active || document.visibilityState !== "visible" || sentinel) return;
      try {
        const next = await wakeLock.request.call(wakeLock, "screen");
        if (!active) {
          await release(next);
          return;
        }
        sentinel = next;
        const onRelease = () => {
          if (sentinel === next) sentinel = null;
          void request();
        };
        if (typeof next.addEventListener === "function") {
          next.addEventListener.call(next, "release", onRelease);
        }
      } catch { /* Wake Lock is supplemental. */ }
    };

    void request();
    const onVisibility = () => { if (document.visibilityState === "visible") void request(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibility);
      const current = sentinel;
      sentinel = null;
      if (current) void release(current);
    };
  }, [enabled]);
}
