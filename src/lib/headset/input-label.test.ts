import { describe, expect, it } from "vitest";
import { classifyInput, sanitizeInputLabel } from "./input-label";
describe("headset input labels", () => { it("classifies and sanitizes labels", () => { expect(classifyInput("Default - AirPods Pro")).toBe("headset"); expect(sanitizeInputLabel("Stan's AirPods Pro")).toBe("AirPods Pro"); expect(classifyInput("iPhone Microphone")).toBe("built-in"); expect(classifyInput("Default")).toBe("unknown"); expect(sanitizeInputLabel("x".repeat(70))).toHaveLength(60); }); });
