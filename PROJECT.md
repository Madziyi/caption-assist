# Project

## Name

**Accessible Conversation Captions** — working title.

## Purpose

Build a production-grade, low-cost real-time captioning system that allows a Deaf or hard-of-hearing participant to remain engaged in ordinary in-person group conversations. The participant can speak normally and read what others say on a nearby laptop, tablet, or phone.

The product must work immediately with one host device, while allowing nearby participants to optionally join by QR/link and contribute their own microphone for stronger speaker attribution and audio quality.

## Primary users

- Deaf or hard-of-hearing participants who can read live captions and speak for themselves.
- Friends, family, classmates, coworkers, and other participants in the same physical conversation.
- Administrators/supporters configuring devices only when needed; daily use should not depend on technical assistance.

## Core product principles

- **Conversation first:** the technology should disappear behind the interaction.
- **Works with one device:** other participants must not be required to install or join anything for the system to function.
- **Progressive accuracy:** optional participant phones/microphones improve quality without changing the basic experience.
- **Caption-first UX:** optimize for glanceable, readable live conversation rather than meeting-note transcription.
- **Low latency:** partial captions should feel conversational, not delayed like a post-meeting transcript.
- **Failure must be visible:** never silently appear to be listening when audio/transcription is broken.
- **Privacy by default:** no raw audio retention and no durable transcript retention unless explicitly enabled later.
- **Low operating cost:** architecture and provider choices should support hours of daily use without premium accessibility-device pricing.
- **Evidence over assumptions:** provider claims are not accepted as proof until tested on representative conversations.

## Product modes

### Table Mode
One host laptop/tablet/phone captures the room and produces live captions. Speaker diarization may provide temporary labels such as `Speaker 1`, `Speaker 2`.

### Connected Mode
Participants scan a QR/link on their own phones. Each phone contributes a separate named microphone stream, so connection identity supplies speaker identity without requiring diarization between those streams.

### Hybrid Mode
The host room microphone remains active while optional participant microphones are also connected. Personal streams are authoritative for their participant. Duplicate text from the room microphone must eventually be suppressed when it overlaps a connected participant's utterance.

## Planned technology stack

These are architectural intentions until verified by repository implementation and live configuration.

### Frontend
- Next.js
- React
- TypeScript
- PWA-capable responsive web application
- Browser MediaDevices / Web Audio APIs as appropriate

### Backend
- Server-side TypeScript/Node runtime
- WebSocket or equivalent real-time session transport where appropriate
- Provider abstraction for streaming speech-to-text
- Persistent database only where product requirements justify it

### Initial speech strategy
- Begin with a streaming cloud STT provider behind an internal adapter.
- AssemblyAI is the initial implementation candidate.
- Deepgram and Speechmatics remain benchmark candidates.
- Provider-specific events must be normalized before entering UI/application state.

### Infrastructure
- Hosting/deployment provider: not yet verified.
- Database: not yet required/verified.
- Authentication: guests should not require accounts for joining a conversation.
- Secrets: server-side only; use temporary/short-lived browser credentials when supported.

## Stable architecture

```text
Host microphone / participant microphone(s)
                │
                ▼
        Audio capture layer
                │
                ▼
         STT provider adapter
                │
                ▼
     Normalized caption events
                │
                ▼
      Conversation state engine
                │
      ┌─────────┴─────────┐
      ▼                   ▼
Live caption UI      Transcript/history UI
```

Future Hybrid Mode adds multiple audio sources and duplicate-resolution logic without changing the normalized caption contract consumed by the UI.

## Stable caption event contract

Provider-specific payloads should be converted into an application-owned model similar to:

```ts
export type CaptionEvent = {
  id: string;
  text: string;
  speakerId: string | null;
  speakerName?: string;
  startedAt: number;
  endedAt?: number;
  isFinal: boolean;
  confidence?: number;
  sourceId?: string;
};
```

The exact fields may evolve through an approved architecture change, but UI components must not depend directly on a speech provider's raw schema.

## Privacy and security rules

- Never expose permanent speech-provider API keys in the browser.
- Never commit secrets.
- Never store raw audio by default.
- Do not persist conversation transcripts by default during the initial milestones.
- Do not log full caption text in production diagnostics unless explicitly approved and protected.
- Use short-lived room/session credentials for guest participation.
- Expire guest rooms and participant tokens.
- Use HTTPS for microphone access outside local development.
- Use least-privilege access for infrastructure and providers.
- Record secret/environment-variable **names only** in `LIVE-STATE.md`, never values.
- Treat conversation text as sensitive user content.

## Accessibility requirements

- Main caption view must remain usable without fine motor interaction once a conversation starts.
- Text size must support large viewing sizes.
- Strong contrast and clear current-speaker emphasis.
- Keyboard-accessible controls for core desktop actions.
- Status must clearly distinguish listening, connecting, reconnecting, microphone blocked, and stopped states.
- Do not use color as the only means of identifying speaker/status.
- Interim text and confirmed/final text should be visually distinguishable without becoming distracting.
- Previous conversational turns should remain briefly available while keeping the newest speech dominant.

## Constraints

- Must remain useful when only the host device is present.
- Guest participants should be able to join from a link/QR without app installation.
- Bluetooth microphone routing differs by browser/OS; the product must test and display the actual selected/available input rather than assuming earbuds are active.
- Mobile browsers may suspend background pages; connected-participant UX must account for this later.
- Overlapping room speech cannot be assumed to diarize perfectly from one microphone.
- Low-cost operation matters, but cost reductions must not silently compromise accessibility reliability.

## Explicit initial non-goals

- Replacing hearing aids or medical devices.
- Diagnosing hearing conditions.
- Recording/archiving raw audio.
- Building a general meeting-minutes product.
- Translation as part of CAPTION-001.
- Native iOS/Android applications before web/PWA limitations are measured.
- Non-speech sound classification before core speech reliability is established.

## Roadmap

- `CAPTION-001` — Conversation Core
- `CAPTION-002` — Speaker-aware Table Mode
- `CAPTION-003` — QR participant rooms
- `CAPTION-004` — Hybrid room + personal microphones
- `CAPTION-005` — Accessibility and optional sound-event layer
- `CAPTION-006` — Production hardening
- `CAPTION-007` — Provider/accuracy/cost benchmark and field validation

## Definition of done

A meaningful feature is done only when:
- implementation is complete;
- focused automated tests pass;
- type/lint/build gates pass as applicable;
- browser UAT is complete for relevant UI work;
- real microphone/audio-path verification is complete when applicable;
- live verification is complete for deployment/provider work;
- required quality evidence is recorded;
- context files are updated;
- changes are committed and pushed to `main`.
