import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ParticipantPage from "./participant-page";
const mocks = vi.hoisted(() => ({ join: vi.fn(), identify: vi.fn(), getUserMedia: vi.fn(), onView: null as null | ((view: unknown) => void), base: {} as Record<string, unknown> }));
vi.mock("@/lib/rooms/browser", () => ({ roomRequest: async () => ({ status: "open" }) }));
vi.mock("@/lib/rooms/controller", async (original) => {
  const actual = await original<typeof import("@/lib/rooms/controller")>();
  return { ...actual, ConnectedRoom: class {
    constructor(onView: (view: unknown) => void) { mocks.onView = onView; }
    async join(token: string, name: string) {
      mocks.join(token, name);
      mocks.base = { ...actual.idleRoomView, phase: "joined", snapshot: { self: { id: "sarah", displayName: name } } };
      mocks.onView!(mocks.base);
    }
    async identify(participantId: string | undefined, action = "request") { mocks.identify(participantId, action); }
    async dispose() {}
  } };
});
const publish = (phase: string) => act(async () => mocks.onView!({ ...mocks.base, identification: { sarah: phase } }));

describe("participant phone", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });
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
