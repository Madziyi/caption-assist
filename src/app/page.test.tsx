import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import HomePage from "./page";
import type { RoomView } from "@/lib/rooms/controller";
import { type Participant } from "@/lib/rooms/types";

const host: Participant = { id: "host", role: "host", displayName: "You", accentIndex: null, removed: false };
const mocks = vi.hoisted(() => ({ openStart: vi.fn(), headsetCreate: vi.fn(), view: {} as Partial<RoomView>, actions: [] as unknown[] }));
vi.mock("@/lib/captions/session", () => ({ ConversationSession: class {
    constructor(private dispatch: (action: unknown) => void) {}
    async start() { mocks.openStart(); this.dispatch({ type: "START" }); this.dispatch({ type: "LISTENING" }); for (const action of mocks.actions) this.dispatch(action); }
    stop = vi.fn();
  } }));
vi.mock("@/lib/rooms/controller", async (original) => {
  const actual = await original<typeof import("@/lib/rooms/controller")>();
  return { ...actual, HeadsetRoom: class {
    constructor(private onView: (view: unknown) => void, private dispatch: (action: unknown) => void) {}
    async create() {
      mocks.headsetCreate();
      this.dispatch({ type: "HEADSET_START" });
      this.onView({ ...actual.idleRoomView, phase: "joined", snapshot: { roomId: "room", mode: "headset", self: host, participants: [host], joinUrl: "https://caption.test/join/synthetic-invitation" }, ...mocks.view });
      this.dispatch({ type: "LISTENING" });
      for (const action of mocks.actions) this.dispatch(action);
    }
    async end() { this.onView({ ...actual.idleRoomView, phase: "ended" }); }
    async dispose() {} async restore() { return false; }
  } };
});
const final = (turn: string, speakerId: string, text: string) => ({ type: "TRANSCRIPTION_EVENT", event: { type: "final_turn", sourceTurnId: turn,
  captions: [{ id: `${turn}/segment/0`, sourceTurnId: turn, text, speakerId, startedAt: 1, isFinal: true, sourceId: "assemblyai" }] } });

async function startHeadset() {
  render(<HomePage />);
  fireEvent.change(screen.getByLabelText("Conversation mode"), { target: { value: "headset" } });
  fireEvent.click(screen.getByRole("button", { name: "Start Conversation" }));
  await screen.findByRole("heading", { name: "Invite participants" });
  fireEvent.click(screen.getByRole("button", { name: /^Close$/ }));
}

describe("host Open / Headset UX", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
    Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.view = {}; mocks.actions = []; });

  it("defaults to Open, offers only two modes and starts a local session without a room", async () => {
    render(<HomePage />);
    expect(screen.getByLabelText("Conversation mode")).toHaveValue("open");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Open Mode", "Headset Mode"]);
    fireEvent.click(screen.getByRole("button", { name: "Start Conversation" }));
    await waitFor(() => expect(mocks.openStart).toHaveBeenCalledOnce());
    expect(mocks.headsetCreate).not.toHaveBeenCalled();
    expect(screen.queryByText(/Identify my voice|Start room microphone/)).not.toBeInTheDocument();
  });
  it("creates Headset, locks mode, invites, and ends without room-mic or identification controls", async () => {
    await startHeadset();
    expect(mocks.openStart).not.toHaveBeenCalled(); expect(mocks.headsetCreate).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Conversation mode")).toBeDisabled();
    expect(screen.queryByText(/Identify my voice|Start room microphone/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Participants 1" }));
    const dialog = screen.getByRole("dialog", { name: "Participants" });
    expect(within(dialog).getByText("You")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "End Conversation" }));
    await waitFor(() => expect(screen.getByLabelText("Conversation mode")).toBeEnabled());
    expect(screen.getByRole("button", { name: "Start New Conversation" })).toBeInTheDocument();
  });
  it("groups Open finals and resolves speaker names without rewriting caption text", async () => {
    mocks.actions = [final("t1", "speaker/A", "We should leave."), final("t2", "speaker/A", "Around seven.")];
    render(<HomePage />);
    fireEvent.click(screen.getByRole("button", { name: "Start Conversation" }));
    const transcript = screen.getByRole("region", { name: "Live caption transcript" });
    await within(transcript).findByText("We should leave.");
    expect(transcript.querySelectorAll(".open-reading-block")).toHaveLength(1);
    fireEvent.click(within(transcript).getByRole("button", { name: "Name Speaker 1" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Name Speaker 1" }), { target: { value: "Sarah" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(within(transcript).getByText("Sarah")).toBeInTheDocument();
    expect(within(transcript).getByText("We should leave.")).toBeInTheDocument();
  });
});
