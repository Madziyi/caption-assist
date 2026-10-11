import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ParticipantPage from "./participant-page";
import { HeadsetParticipant } from "@/lib/headset/headset-participant";
const mocks = vi.hoisted(() => ({ join: vi.fn(), identify: vi.fn(), startHeadset: vi.fn(), mode: "connected", getUserMedia: vi.fn(), onView: null as null | ((view: unknown) => void), base: {} as Record<string, unknown> }));
vi.mock("@/lib/rooms/browser", () => ({ roomRequest: async () => ({ status: "open", mode: mocks.mode }) }));
vi.mock("@/lib/rooms/controller", async (original) => {
  const actual = await original<typeof import("@/lib/rooms/controller")>();
  return { ...actual, ConnectedRoom: class {
    constructor(onView: (view: unknown) => void) { mocks.onView = onView; }
    async join(token: string, name: string) {
      mocks.join(token, name);
      const headset = mocks.mode === "headset" ? new HeadsetParticipant("sarah", { setPresence: async () => undefined, sendSignal: async () => undefined }, () => undefined).currentView : null;
      mocks.base = { ...actual.idleRoomView, phase: "joined", mode: mocks.mode, headsetSelf: headset, snapshot: { self: { id: "sarah", displayName: name } } };
      mocks.onView!(mocks.base);
    }
    async startHeadsetSetup() { mocks.startHeadset(); }
    async identify(participantId: string | undefined, action = "request") { mocks.identify(participantId, action); }
    async dispose() {}
  } };
});
const publish = (phase: string) => act(async () => mocks.onView!({ ...mocks.base, identification: { sarah: phase } }));

describe("participant phone", () => {
  beforeEach(() => { mocks.mode = "connected"; });
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
  it("joins by name without microphone permission and identifies the owner's voice through the host", async () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: mocks.getUserMedia } });
    render(<ParticipantPage token="synthetic-token" />);
    expect(screen.getByText(/does not record audio/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Your display name"), { target: { value: "Sarah" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Join Conversation" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Join Conversation" }));
    await screen.findByText("Your phone is not recording audio. The host's device listens to the room.");
    expect(mocks.join).toHaveBeenCalledWith("synthetic-token", "Sarah");
    expect(mocks.getUserMedia).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Identify my voice" }));
    expect(mocks.identify).toHaveBeenCalledWith(undefined, "request");
    await publish("listening");
    expect(screen.getByText("Speak normally for a few seconds now.")).toBeInTheDocument();
    expect(screen.getByText(/Hi, this is Sarah/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mocks.identify).toHaveBeenLastCalledWith(undefined, "cancel");
    await publish("identified");
    expect(screen.getByText(/Your voice is identified/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Identify my voice again" })).toBeInTheDocument();
    await publish("not_found");
    expect(screen.getByText(/couldn't pick out your voice/)).toBeInTheDocument();
    expect(mocks.getUserMedia).not.toHaveBeenCalled();
  });
});
