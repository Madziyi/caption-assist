import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import HomePage from "./page";
import type { RoomView } from "@/lib/rooms/controller";
import { participantProfiles, type Participant } from "@/lib/rooms/types";

const host: Participant = { id: "host", role: "host", displayName: "You", accentIndex: null, removed: false };
const guest: Participant = { id: "guest", role: "participant", displayName: "Alex", accentIndex: 0, removed: false };
const mocks = vi.hoisted(() => ({ tableStart: vi.fn(), connectedCreate: vi.fn(), startRoomMicrophone: vi.fn(), identify: vi.fn(), view: {} as Partial<RoomView>, actions: [] as unknown[] }));
vi.mock("@/lib/captions/session", () => ({ ConversationSession: class { start = mocks.tableStart; stop = vi.fn(); } }));
vi.mock("@/lib/rooms/controller", async (original) => {
  const actual = await original<typeof import("@/lib/rooms/controller")>();
  return { ...actual, ConnectedRoom: class {
    startRoomMicrophone = mocks.startRoomMicrophone; identify = mocks.identify;
    constructor(private onView: (view: unknown) => void, private dispatch: (action: unknown) => void) {}
    async create() {
      mocks.connectedCreate();
      this.dispatch({ type: "CONNECTED_START" });
      this.onView({ ...actual.idleRoomView, phase: "joined", roomMicrophone: "Listening", snapshot: { roomId: "room", mode: "connected", self: host, participants: [host], joinUrl: "https://caption.test/join/synthetic-invitation" }, ...mocks.view });
      this.dispatch({ type: "LISTENING" });
      for (const action of mocks.actions) this.dispatch(action);
    }
    async end() { this.onView({ ...actual.idleRoomView, phase: "ended" }); }
    async dispose() {} async restore() { return false; }
  } };
});
const final = (turn: string, speakerId: string, text: string) => ({ type: "TRANSCRIPTION_EVENT", event: { type: "final_turn", sourceTurnId: turn,
  captions: [{ id: `${turn}/segment/0`, sourceTurnId: turn, text, speakerId, startedAt: 1, isFinal: true, sourceId: "assemblyai" }] } });

async function startConnected() {
  render(<HomePage />);
  fireEvent.change(screen.getByLabelText("Conversation mode"), { target: { value: "connected" } });
  fireEvent.click(screen.getByRole("button", { name: "Start Conversation" }));
  await screen.findByRole("heading", { name: "Invite participants" });
  fireEvent.click(screen.getByRole("button", { name: /^Close$/ }));
}

describe("host Connected UX", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
    Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.view = {}; mocks.actions = []; });

  it("starts a Connected room with the host room microphone, locks mode and opens the local QR invite", async () => {
    await startConnected();
    expect(mocks.tableStart).not.toHaveBeenCalled(); expect(mocks.connectedCreate).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Conversation mode")).toBeDisabled();
    expect(screen.getByText("🎤 Room mic on")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Unmute/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Participants 1" })).toBeInTheDocument();
    expect(screen.getByText("Listening. Invite participants, then ask each person to identify their voice.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "End Conversation" }));
    await waitFor(() => expect(screen.getByLabelText("Conversation mode")).toBeEnabled());
    expect(screen.getByRole("button", { name: "Start New Conversation" })).toBeInTheDocument();
  });

  it("offers an explicit start when the room microphone is off", async () => {
    mocks.view = { roomMicrophone: "Off" };
    await startConnected();
    expect(screen.getByText("The room microphone is off. Start it to caption the conversation.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start room microphone" }));
    expect(mocks.startRoomMicrophone).toHaveBeenCalledOnce();
  });

  it("shows who is identifying, lets the host cancel, and offers identification per participant", async () => {
    mocks.view = { snapshot: { roomId: "room", mode: "connected", expiresAt: "", status: "open", self: host, participants: [host, guest] }, identification: { host: "identified", guest: "listening" }, statuses: { guest: "Connected" } };
    await startConnected();
    expect(screen.getByText("Listening for Alex's voice.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mocks.identify).toHaveBeenCalledWith("guest", "cancel");
    fireEvent.click(screen.getByRole("button", { name: "Participants 2" }));
    const dialog = screen.getByRole("dialog", { name: "Participants" });
    expect(within(dialog).getByText("✓ Voice identified")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Identify my voice again" }));
    expect(mocks.identify).toHaveBeenLastCalledWith("host", "request");
  });

  it("names identified voices with the participant and lets the host name unidentified voices", async () => {
    mocks.view = { snapshot: { roomId: "room", mode: "connected", expiresAt: "", status: "open", self: host, participants: [host, guest] } };
    mocks.actions = [
      { type: "CONNECTED_SPEAKERS", speakers: participantProfiles([host, guest]) },
      final("t1", "room/speaker/B", "I think we should leave around seven."),
      final("t2", "room/speaker/C", "Pass the salt, please."),
      { type: "SPEAKER_ALIASES", aliases: { "room/speaker/B": "guest" } },
    ];
    await startConnected();
    const transcript = screen.getByRole("region", { name: "Live caption transcript" });
    expect(within(transcript).getByText("Alex")).toBeInTheDocument();
    expect(within(transcript).queryByText("Speaker 1")).not.toBeInTheDocument();
    fireEvent.click(within(transcript).getByRole("button", { name: "Name Speaker 2" }));
    expect(screen.getByRole("heading", { name: "Unidentified voices" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Name Speaker 2" }), { target: { value: "Grandma" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(within(transcript).getByText("Grandma")).toBeInTheDocument();
  });
});
