# Active Initiative

**Initiative:** CAPTION-003 - Connected Mode / QR Participant Rooms
**Active correction:** CAPTION-003.4 - One room microphone + live diarization + session voice identification
**Status:** Personal-microphone Connected work stopped. CAPTION-003.1 text reconciliation, CAPTION-003.2 episode continuity and CAPTION-003.3 Voice Focus all failed real co-located-phone acceptance, so Connected Mode no longer opens a microphone on any phone. The host device is the single room microphone (AssemblyAI diarization), and each QR participant taps **Identify my voice** once so the host binds the next stable diarized speaker to that name for this conversation only. Source, automated gates, a live AssemblyAI check and local live end-to-end browser runs are complete; physical multi-person UAT is pending. CAPTION-004 remains deferred.
**Owner:** Builder until verified commit/push; then Planner/human for physical UAT review.

## Contracts

- Exactly one audio stream in Connected Mode: host room microphone → AssemblyAI `universal-streaming-english`, `speaker_labels=true`, `format_turns=true`, `speaker_labels_revision_interval_ms=120000`. Participant phones never call `getUserMedia`; they show "Your phone is not recording audio."
- `VoiceIdentityRegistry` (memory only) handles one identification window at a time (queue for others). A window lasts 20 s, ignores speech that started more than 1.5 s before the request, ignores interims and unresolved (`PENDING`) labels, and binds the speaker with the most words once it reaches 5 words. It never takes a speaker already bound to another participant; that attempt ends "Not identified — try again". Re-identifying replaces the person's binding; a later identification wins a contested speaker.
- Bindings are anchored to the evidence turns heard during identification, not to a provider letter. When `SpeakerRevision` relabels those turns, the name follows the corrected speaker. A new provider connection (reconnect, session limit, host refresh) has new speaker labels: earlier names stay on history, and everyone shows "Needs to identify again".
- Requests are participant-owned presence state `{ online, identify: requestId | null }` on the participant's private channel, so a host that subscribes after the tap still receives them. The host applies each request ID once and broadcasts phases plus the request ID each phase answers. The phone keeps its request until a phase naming that request reports an outcome; 10 s without acknowledgement shows a notice.
- The host can identify itself (`You`) or anyone from Participants, and can name unidentified voices (e.g. someone without a phone) from the speaker panel.
- Room-network loss does not stop the room microphone; captions continue locally while the room reconnects.
- Personal-microphone modules (`personal-microphone`, `cross-mic-reconciler`, reconciliation diagnostics/debug panel, microphone check, Voice Focus option builder) remain in the repository unwired, for a future Hybrid Mode. `?captionDebug=1` no longer shows anything.

## Next action

Physical UAT on the deployed build: one host laptop/phone placed as a room microphone, two or three people each with a phone. Record per person: identification success and time, wrong-name events (especially similar voices), short-reply misattribution, interim behaviour, perceived latency, behaviour after ~2 minutes of audio (first mid-session revision), and recovery after host refresh or network loss. If diarization proves insufficient in real rooms, bring the evidence to the Planner before evaluating pyannote or other providers.

## Known limitations

- Identification quality is bounded by diarization. Two synthetic female voices were merged into one speaker in local testing; the second person could not be identified and her speech appeared under the first person's name.
- Short replies (about 1–4 words) are sometimes attributed to the wrong speaker live; end-of-session and mid-session (after ~2 minutes) revisions corrected some in testing.
- Overlapping speech receives a single label. Other people talking during someone's 20-second window can mis-bind it; the banner asks others to pause and re-identifying replaces the binding.
- Supabase anonymous sign-ins failed ("Could not connect anonymously") after roughly 20 sign-ins in about 35 minutes from one IP during testing. The configured Auth rate limit was not inspected; larger events on shared Wi-Fi could hit it.
