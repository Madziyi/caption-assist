import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReconciliationDebugPanel } from "./reconciliation-debug-panel";
import type { ReconciliationDiagnostic } from "@/lib/captions/reconciliation-diagnostics";

afterEach(() => cleanup());
describe("temporary host metrics panel", () => {
  it("resolves names, copies metrics only and clears without touching captions", async () => {
    const row: ReconciliationDiagnostic = { at: 300, sourceA: "participant:a", sourceB: "participant:b", eventA: "final", eventB: "final", wordCountA: 5, wordCountB: 5, receiveDeltaMs: 2740,
      similarity: .78, containmentScore: .86, matched: false, decision: "kept", reason: "outside_time_window", similarityEvaluated: true };
    let rows = [row]; const clearDiagnostics = vi.fn(() => { rows = []; });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<ReconciliationDebugPanel room={{ get diagnosticRecords() { return rows; }, clearDiagnostics }} participants={[
      { id: "a", displayName: "Sarah", role: "participant", accentIndex: 0, removed: false }, { id: "b", displayName: "James", role: "participant", accentIndex: 1, removed: false }]} />);
    expect(screen.getByText("Sarah ↔ James")).toBeInTheDocument(); expect(screen.getByText(/2740 ms/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy diagnostics" })); await screen.findByText("Metrics copied.");
    const payload = JSON.parse(writeText.mock.calls[0][0]); expect(payload.comparisons).toEqual([row]);
    expect(writeText.mock.calls[0][0]).not.toMatch(/Sarah|James|text|tokens|joinUrl|access_token/);
    fireEvent.click(screen.getByRole("button", { name: "Clear" })); expect(clearDiagnostics).toHaveBeenCalledOnce();
    expect(screen.getByText(/No comparisons yet/)).toBeInTheDocument();
  });
});
