import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ParticipantPage from "./participant-page";
import { HeadsetParticipant } from "@/lib/headset/headset-participant";
const mocks = vi.hoisted(() => ({ join: vi.fn(), startHeadset: vi.fn(), mode: "headset", getUserMedia: vi.fn(), onView: null as null | ((view: unknown) => void), base: {} as Record<string, unknown> }));
vi.mock("@/lib/rooms/browser", () => ({ roomRequest: async () => ({ status: "open", mode: mocks.mode }) }));
vi.mock("@/lib/rooms/controller", async (original) => {
  const actual = await original<typeof import("@/lib/rooms/controller")>();
  return { ...actual, HeadsetRoom: class {
    constructor(onView: (view: unknown) => void) { mocks.onView = onView; }
    async join(token: string, name: string) {
      mocks.join(token, name);
      const headset = mocks.mode === "headset" ? new HeadsetParticipant("sarah", { setPresence: async () => undefined, sendSignal: async () => undefined }, () => undefined).currentView : null;
      mocks.base = { ...actual.idleRoomView, phase: "joined", mode: mocks.mode, headsetSelf: headset, snapshot: { self: { id: "sarah", displayName: name } } };
      mocks.onView!(mocks.base);
    }
    async startHeadsetSetup() { mocks.startHeadset(); }
    async dispose() {}
  } };
});

describe("participant phone", () => {
  beforeEach(() => { mocks.mode = "headset"; });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });
  it("keeps microphone setup reachable after joining with the participant's initialized idle view", async () => {
    mocks.mode = "headset";
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: mocks.getUserMedia } });
    render(<ParticipantPage token="synthetic-headset-token" />);
    await screen.findByText(/Put on your AirPods or headset/);
    fireEvent.change(screen.getByLabelText("Your display name"), { target: { value: "Sarah" } });
    fireEvent.click(screen.getByRole("button", { name: "Join Conversation" }));
    const start = await screen.findByRole("button", { name: "Start headset check" });
    expect(mocks.startHeadset).not.toHaveBeenCalled();
    expect(mocks.getUserMedia).not.toHaveBeenCalled();
    fireEvent.click(start);
    await waitFor(() => expect(mocks.startHeadset).toHaveBeenCalledOnce());
    expect(screen.queryByText(/No microphone selected/)).not.toBeInTheDocument();
  });
  it("rejects legacy invitations without joining or requesting capture", async () => {
    mocks.mode = "connected";
    render(<ParticipantPage token="legacy" />);
    await screen.findByText("This conversation is no longer available.");
    fireEvent.change(screen.getByLabelText("Your display name"), { target: { value: "Sarah" } });
    expect(screen.getByRole("button", { name: "Join Conversation" })).toBeDisabled();
    expect(mocks.join).not.toHaveBeenCalled();
    expect(mocks.getUserMedia).not.toHaveBeenCalled();
    expect(screen.queryByText(/Identify my voice/)).not.toBeInTheDocument();
  });
});
