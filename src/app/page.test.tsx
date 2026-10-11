import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import HomePage from "./page";
const mocks = vi.hoisted(() => ({ tableStart: vi.fn(), connectedCreate: vi.fn() }));
vi.mock("@/lib/captions/session", () => ({ ConversationSession: class { start = mocks.tableStart; stop = vi.fn(); } }));
vi.mock("@/lib/rooms/controller", async (original) => {
  const actual = await original<typeof import("@/lib/rooms/controller")>();
  return { ...actual, ConnectedRoom: class {
    constructor(private onView: (view: unknown) => void, private dispatch: (action: unknown) => void) {}
    async create() {
      mocks.connectedCreate();
      this.dispatch({ type: "CONNECTED_START" });
      this.onView({ ...actual.idleRoomView, phase: "joined", snapshot: { roomId: "room", self: { id: "host", role: "host" }, participants: [{ id: "host", role: "host", displayName: "You", removed: false }], joinUrl: "https://caption.test/join/synthetic-invitation" } });
      this.dispatch({ type: "LISTENING" });
    }
    async end() { this.onView({ ...actual.idleRoomView, phase: "ended" }); }
    async dispose() {} async restore() { return false; }
  } };
});
describe("host Connected UX", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });
  it("starts a Connected room without Table capture, locks mode and opens the local QR invite", async () => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
    Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
    render(<HomePage />);
    fireEvent.change(screen.getByLabelText("Conversation mode"), { target: { value: "connected" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Conversation" }));
    await screen.findByRole("heading", { name: "Invite participants" });
    expect(mocks.tableStart).not.toHaveBeenCalled(); expect(mocks.connectedCreate).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Conversation mode")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Unmute your microphone" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Participants 1" })).toBeInTheDocument();
    expect(screen.getByText("Waiting for participants…")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Close$/ }));
    fireEvent.click(screen.getByRole("button", { name: "End Conversation" }));
    await waitFor(() => expect(screen.getByLabelText("Conversation mode")).toBeEnabled());
    expect(screen.getByRole("button", { name: "Start New Conversation" })).toBeInTheDocument();
  });
});
