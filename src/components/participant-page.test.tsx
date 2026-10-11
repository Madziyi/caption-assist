import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ParticipantPage from "./participant-page";
const mocks = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn().mockResolvedValue(undefined), join: vi.fn(), unmute: vi.fn() }));
vi.mock("@/lib/rooms/browser", () => ({ roomRequest: async () => ({ status: "open" }) }));
vi.mock("@/lib/audio/microphone-check", () => ({ MicrophoneCheck: class { start = mocks.start; stop = mocks.stop; } }));
vi.mock("@/lib/rooms/controller", async (original) => {
  const actual = await original<typeof import("@/lib/rooms/controller")>();
  return { ...actual, ConnectedRoom: class {
    constructor(private onView: (view: unknown) => void) {}
    async join(token: string, name: string) { mocks.join(token, name); this.onView({ ...actual.idleRoomView, phase: "joined", snapshot: { self: { displayName: name } } }); }
    async toggleMicrophone() { mocks.unmute(); }
    async dispose() {}
  } };
});
describe("participant microphone setup", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });
  it("explains audio before permission, checks without STT, releases the test mic and joins muted", async () => {
    mocks.start.mockImplementation(async (level: (value: number, label: string) => void) => level(0.4, "Test microphone"));
    render(<ParticipantPage token="synthetic-token" />);
    fireEvent.change(screen.getByLabelText("Your display name"), { target: { value: "Sarah" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/Your microphone sends live audio/)).toBeInTheDocument();
    expect(mocks.start).not.toHaveBeenCalled(); expect(mocks.unmute).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Enable microphone permission" }));
    await screen.findByText("Test microphone");
    expect(screen.getByLabelText(/Microphone input level/)).toHaveAttribute("value", "0.4");
    fireEvent.click(screen.getByRole("button", { name: "Join Conversation" }));
    await screen.findByText("Microphone muted");
    expect(mocks.stop.mock.invocationCallOrder.at(-1)).toBeLessThan(mocks.join.mock.invocationCallOrder[0]);
    expect(mocks.join).toHaveBeenCalledWith("synthetic-token", "Sarah");
    expect(mocks.unmute).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Unmute" })).toBeInTheDocument();
  });
});
