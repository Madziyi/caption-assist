# CAPTION-008 — Headset Mode

**Status:** CAPTION-008.1 implemented by Builder and physically tried by the human on 2026-10-11 (satisfied; may need less sensitivity). Planner go/no-go: **GO**. Active slice: **CAPTION-008.2** (gate correction + gated transcription), ready for Builder. See "Planner review of 008.1" and the 008.2 specification below.

## As built (008.1)

- Pure headset level, calibration, gate, room-check, label, validation, preview-stat and anonymized-export modules live under `src/lib/headset/`, with co-located tests. `HeadsetMicrophone` wraps `MicrophoneCapture` with processing-off constraints and reports actual track settings.
- `ConnectedRoom`, `SupabaseRoomTransport`, the room API and `20261011140359_headset_mode` migration persist and restore `connected | headset`; Headset Mode never starts the room microphone or transcription provider. `HeadsetHost` and `HeadsetParticipant` own the local gate/room-check protocol.
- Host and phone UI includes Headset Mode (test), mode-specific invite/pre-join copy, speaking board, setup flow, room-check matrix and export controls. Wake Lock is best-effort.
- Verification progression: the initial Builder pass performed only a one-host local smoke. Subsequent use of bundled Playwright/installed Chromium verified a local host (1280×800) plus two simulated phones (390×844) against live Realtime: both calibrated, room check produced a matrix, one phone refreshed/rejoined/recalibrated, with no Presence-limit disconnects or page errors. No transcription token request/provider socket and no host microphone call were observed. This does not establish physical acoustic behavior, measured layout overflow, keyboard traversal or Copy-results browser validation.
- Mobile compatibility fixes: browser API receivers are preserved, and clipboard failures are caught and announced. The reported input-dependent `Illegal invocation` was reproduced in native Chromium: `HeadsetParticipant` invoked stored browser timers with the participant as the receiver. Binding both timers to the global fixes calibration startup and cancellation. The prior permission-window explanation was not established and is superseded by this reproduction.
- Input picker: the selected option follows the active track's `getSettings().deviceId`, held only in local setup state. No label matching or automatic input choice; requested input IDs still use the specified exact constraint. Generic `Headset microphone` routes are unknown, not confirmation of connected hardware; browser-route guidance is shown beside the picker.
- Additional verification: isolated native-Chromium before/after regression across Default, generic headset, Bluetooth headset and Speakerphone calibration paths; real capture/worklet with a browser-simulated microphone delivered level frames, advanced quiet → voice, restarted on input selection and cancelled on stop. `scripts/headset-timer-browser.mjs` can repeat this with an installed Playwright package/Chromium executable. This isolated runner tests neither live room transport nor physical headset behavior; the separate live-room run is described above.
- Participant connection fix: calibration/visibility transitions now send validated `headset-presence` Broadcast messages on the participant's existing private channel. A coalesced Presence snapshot runs at most every 12 s (the two initial room Presence tracks also count against the five-per-30-second connection limit). Session ID/sequence fields let hosts reject stale snapshots/retired sessions; these transport fields are not exported. Identical updates are deduplicated, queued snapshots are cancelled on disconnect, and metadata delivery errors are caught with visible retry feedback. This updates the initial immediate-Presence protocol to comply with verified Supabase quotas; no policy/schema or audio contract changes.

## Product decision

Headset Mode is a third, separate conversation mode alongside Table Mode and Connected Mode. Everyone who speaks wears AirPods or a headset connected to their own phone. **There is no room microphone.** Each phone listens only to its wearer's headset microphone and decides locally, from loudness, whether the sound it hears is its wearer talking or bleed from people nearby. Only its wearer's speech is transcribed, so captions are attributed by whose headset produced them, with no diarization or voice identification.

Why this is not a repeat of CAPTION-003.1–003.3: those attempts used phone microphones lying on a table, where a neighbour's voice is almost as loud as the owner's. Text matching (003.1/003.2) and Voice Focus (003.3) could not fix that. A headset microphone sits a few centimetres from the wearer's mouth, so the wearer should be much louder on their own headset than anyone else is. That is a physical claim that must be **measured before any transcription is built** (CAPTION-008.1).

Table Mode and Connected Mode remain unchanged and remain the one-device options. Headset Mode is opt-in for groups where every speaker has a headset. People without a headset are not captioned in this mode, and the UI must say so plainly. CAPTION-004 (Hybrid: room mic plus headsets) stays deferred.

## Target design (all slices)

```text
Wearer's headset mic ──► phone: level meter ──► loudness gate (calibrated per person)
                                                     │ open only while the wearer talks
                                                     ▼
                       phone: own AssemblyAI stream (008.2: Universal-3.6 Pro, Voice Focus near-field)
                                                     │ captions (text) + gate margin
                                                     ▼
                       host computer: captions named by whose phone sent them
                                      + duplicate safety net by loudness margin (008.3)
```

- **Calibration on join:** quiet (background level), then the wearer reads a sentence (own-voice level).
- **Room check:** once people have joined, each reads one sentence in turn while every phone measures. Each phone learns how loud each neighbour is on its own headset, which is the real bleed for that room and seating.
- **Gate:** opens when the level rises clearly above the measured bleed, stays open briefly after speech stops, and leans toward open. A missed sentence is invisible to a Deaf user; a duplicate is visible. Duplicates are left to the host safety net.
- **Phone decides locally:** no network round trip in the gate decision.
- **Raw levels:** the browser's automatic gain control, noise suppression and echo cancellation are requested OFF for this mode, and the phone reports what the browser actually applied.

## Slices

| Slice | Delivers | Audio leaves a phone? |
|---|---|---|
| **008.1** | Headset Mode room, headset check + calibration, room check, live gate preview ("speaking" lights), results export | **No** |
| 008.2 | Gate correction (room check tunes the gate, attack, host sensitivity control), then gated audio from each phone to its own AssemblyAI stream (Universal-3.6 Pro, Voice Focus near-field); captions relayed to host and named by phone | Yes, only while the gate is open |
| 008.3 | Duplicate safety net by calibrated margin, adaptive thresholds, headset disconnect/fallback detection, phone lock/refresh recovery | Yes |
| 008.4 | Physical multi-person UAT and closure | Yes |

---

## CAPTION-008.1 specification — headset check and gate preview

### Objective

Prove on real phones and headsets whether (a) each wearer is clearly louder on their own headset than neighbours are, and (b) a per-phone loudness gate opens for its wearer and not for neighbours, **before** any transcription is built. No audio leaves any device in this slice; no AssemblyAI session is opened in Headset Mode.

### User-visible behaviour

**Host computer**
- Mode selector offers `Table Mode`, `Connected Mode`, `Headset Mode (test)`. Locked during a conversation, as today.
- Starting Headset Mode creates a headset room (persisted mode) and opens the invite QR. Invite copy: "Everyone who will speak wears AirPods or a headset connected to their phone, scans this code, and sets up their headset. This test build shows who is speaking; it does not caption yet, and no audio leaves any phone."
- No room microphone is started or offered. No "Identify my voice" UI or identification banner.
- The main stage shows a **speaking board**: one row per participant with name and a text state: `Speaking`, `Quiet`, `Not set up`, `Setting up`, `Microphone off`, `Screen off`. State is never conveyed by colour alone.
- Participants panel: name, connection, `Using: <sanitized mic label>` with input class text, processing settings actually applied, setup state, separation result after a room check, Remove, Invite.
- **Set up my headset** (optional): the host can calibrate a headset on the host device with the same flow as phones and then appears on the board and in room checks. If the host never does this, nothing on the host device opens a microphone.
- **Start room check** is enabled when at least two people (including the host if set up) are `ready` with the microphone on and screen visible. Hint when disabled: "Needs at least two people with a ready headset." Progress shows who is reading by name, and Cancel. Results show per person: "Separation N dB — Clear / Usable / Weak", plus the full level matrix as an accessible table.
- **Copy results** copies the anonymized JSON export (below). **Reset speaking stats** clears gate-preview counters.
- History and Full Screen controls remain; there are no captions in this slice.

**Phone**
- Before joining, if the invitation's room is a headset room: "This conversation uses Headset Mode. Put on your AirPods or headset and connect them to this phone before you continue." Then name and Join, as today.
- After joining: "Your phone measures how loud your headset hears you, so it can tell your voice from people nearby. In this test, no audio leaves your phone." Button: **Start headset check** (the user gesture that opens the microphone).
- Input line: `Using: <sanitized label>`, then one of:
  - headset: "✓ Headset microphone"
  - built-in: "⚠ This looks like your phone's own microphone. Connect your AirPods or headset, then tap Check again." with **Check again** and **Use this microphone anyway**
  - unknown: "Make sure this is your headset microphone." with **Check again**
- An input picker appears only when the browser lists more than one audio input. Changing it restarts the check with that device.
- Quiet step: "Stay quiet for 3 seconds…"
- Voice step: "Now read this out loud at your normal volume: “I'm checking my headset so the captions know when I'm talking.”"
- Failure: "We couldn't hear you clearly. Check your headset is on and connected, then try again." with **Try again**.
- Ready: "✓ Headset ready. Keep this page open with the screen on." Live text indicator `Speaking` / `Quiet` driven by the gate.
- Room check: in the gap before each slot, "Get ready…". During own slot: "Your turn — read out loud: “I'm checking my headset so the captions know when I'm talking.”" During others: "Stay quiet — someone else is reading (i of n)." Phones never receive other participants' names.
- After the check, by band: clear "Your headset hears you clearly over others."; usable "Your headset hears you over others, but not by much."; weak "Your headset hears other people almost as loudly as you. Check it's in your ears, or move further apart."
- Screen Wake Lock is requested while joined in a headset room (best-effort, reacquired on visibility, as the pre-pivot participant page did).
- The microphone stops on Leave, conversation end, removal, room disconnect and page unload. After a disconnect and rejoin, calibration stays in memory for that page but the microphone needs a tap: "Turn microphone back on".

### In scope

1. Persisted room mode (one additive migration, below).
2. `MicrophoneCapture` optional constraints and track access, with the default constraints for Table/Connected unchanged.
3. Pure level, calibration, gate, room-check, label, message-validation, preview-stats and export modules with unit tests.
4. Phone-side `HeadsetParticipant` and host-side `HeadsetHost` orchestrators, wired through `ConnectedRoom` only when the room mode is `headset`.
5. Transport additions: headset presence state, `headset` broadcast signals from phones, `headset-check` control from host.
6. Host and phone UI as described above.
7. Durable context, QUALITY.md criteria and a physical test script.

### Explicit non-goals for 008.1

- No transcription, AssemblyAI token request or provider socket in Headset Mode. No audio bytes over any network.
- No duplicate resolution, adaptive thresholds, headset hot-swap recovery beyond "Microphone changed — check again", or host-refresh restoration of calibration (calibration is memory-only; phones redo setup after their own refresh).
- No change to Table Mode or Connected Mode behaviour, provider configuration, Supabase policies, or the CAPTION-003.4 voice identification path.
- No voiceprints, embeddings or stored audio. Calibration levels are plain numbers held in memory for one conversation.

### Data/schema change (exact)

Add a migration `supabase/migrations/<live version>_headset_mode.sql`. The filename version must match the version recorded in the live migration history after applying. It is additive and backward compatible: the function signature and grants are unchanged, the old `create` keeps producing Connected rooms, and older deployed clients ignore the extra `mode` field.

```sql
-- CAPTION-008: a room remembers the mode that created it. Metadata only.
alter table public.caption_rooms add column mode text not null default 'connected' check (mode in ('connected','headset'));

create or replace function public.caption_room_action(
  operation text, actor uuid, target_room uuid default null, token_hash text default null,
  participant_name text default null, target_participant uuid default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r public.caption_rooms; p public.caption_room_participants; result jsonb; guest_count integer;
begin
  if actor is null then raise exception 'forbidden'; end if;
  if operation in ('create','create_headset') then
    insert into public.caption_rooms(host_user_id,join_token_hash,mode)
      values(actor,token_hash,case when operation='create_headset' then 'headset' else 'connected' end) returning * into r;
    insert into public.caption_room_participants(room_id,user_id,role,display_name) values(r.id,actor,'host','You') returning * into p;
  else
    if operation in ('join','check') then
      select * into r from public.caption_rooms where join_token_hash=token_hash for update;
    elsif operation='restore' then
      select * into r from public.caption_rooms where host_user_id=actor and status='open' and expires_at>now() order by created_at desc limit 1 for update;
      if not found then return 'null'::jsonb; end if;
    else
      select * into r from public.caption_rooms where id=target_room for update;
    end if;
    if r.id is null then raise exception 'ended'; end if;
    if operation<>'snapshot' and (r.status<>'open' or r.expires_at<=now()) then raise exception 'ended'; end if;
    if operation='check' then return jsonb_build_object('status','open','mode',r.mode); end if;
    select * into p from public.caption_room_participants where room_id=r.id and user_id=actor;
    if operation='join' then
      if p.removed_at is not null then raise exception 'removed'; end if;
      if p.id is null then
        select count(*) into guest_count from public.caption_room_participants where room_id=r.id and role='participant';
        insert into public.caption_room_participants(room_id,user_id,role,display_name,accent_index)
          values(r.id,actor,'participant',btrim(participant_name),guest_count % 6) returning * into p;
      end if;
    elsif p.id is null then raise exception 'forbidden';
    end if;
    if p.removed_at is not null and operation<>'snapshot' then raise exception 'removed'; end if;
    if operation='rename' then
      if p.role='host' then raise exception 'forbidden'; end if;
      update public.caption_room_participants set display_name=btrim(participant_name),updated_at=now() where id=p.id returning * into p;
    elsif operation='remove' then
      if p.role<>'host' then raise exception 'forbidden'; end if;
      update public.caption_room_participants set removed_at=now(),updated_at=now() where id=target_participant and room_id=r.id and role='participant';
      if not found then raise exception 'forbidden'; end if;
    elsif operation='end' then
      if p.role<>'host' then raise exception 'forbidden'; end if;
      update public.caption_rooms set status='ended',ended_at=now() where id=r.id returning * into r;
    elsif operation='invite' then
      if p.role<>'host' then raise exception 'forbidden'; end if;
      update public.caption_rooms set join_token_hash=token_hash where id=r.id returning * into r;
    elsif operation not in ('join','snapshot','restore') then raise exception 'forbidden';
    end if;
  end if;
  select jsonb_agg(jsonb_build_object('id',x.id,'role',x.role,'displayName',x.display_name,'accentIndex',x.accent_index,'removed',x.removed_at is not null) order by x.joined_at,x.id)
    into result from public.caption_room_participants x where x.room_id=r.id and (p.role='host' or x.id=p.id);
  return jsonb_build_object('roomId',r.id,'mode',r.mode,'status',case when r.expires_at<=now() then 'ended' else r.status end,'expiresAt',r.expires_at,
    'self',jsonb_build_object('id',p.id,'role',p.role,'displayName',p.display_name,'accentIndex',p.accent_index,'removed',p.removed_at is not null),
    'participants',result);
end;
$$;
revoke all on function public.caption_room_action(text,uuid,uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function public.caption_room_action(text,uuid,uuid,text,text,uuid) to service_role;
```

Extend `supabase/tests/connected_rooms.sql` (still rollback-only): `create` yields `mode='connected'`; `create_headset` yields `mode='headset'`; `check`, `join`, `snapshot` and `restore` return the room's mode; `create_headset` by another user creates a separate room owned by that user and leaves existing rooms' modes unchanged; existing assertions keep passing.

**Order of operations (mandatory):**
1. Confirm the target is project ref `cqnyvevhuxwfzhqpmccn` (caption-assist). The Cursor Supabase connector has pointed at a different project before; never apply there.
2. Apply the migration, then run the rollback-only SQL test against the live project and confirm it passes.
3. Only then push source that calls `create_headset`.

If the Builder cannot apply migrations to that project, stop before pushing dependent source. Hand the human the SQL file to run in the Supabase SQL editor, and wait.

API route (`src/app/api/rooms/route.ts`): add `create_headset` to the allowed actions; generate an invitation for `create`, `create_headset` and `invite`; return `hostParticipantId` for both create actions. Types: `RoomMode = "connected" | "headset"`. `RoomSnapshot.mode: RoomMode` is normalized at the client boundary (missing or unknown becomes `connected`). `ConnectedRoom.create(mode: RoomMode = "connected")`. `ConnectedRoom.restore()` returns `Promise<RoomMode | null>` so the host page selects the restored room's mode.

### Message contracts

All messages are small JSON; none carries audio or caption text. Validators reject anything outside these shapes. Numbers are finite, rounded to 0.1 dB and clamped to [-100, 0]. Participant IDs are under 100 characters. `checkId` matches `^[A-Za-z0-9-]{8,64}$`.

**Presence state on the participant's own private topic.** The existing `track()` payload gains a field; the transport keeps one merged presence object so `identify` and `headset` updates never overwrite each other:

```ts
type HeadsetPresence = {
  mic: "off" | "starting" | "on" | "stopped" | "denied";
  input: "headset" | "built-in" | "unknown" | null;
  label: string | null;              // sanitized, at most 60 characters
  processing: { autoGainControl: boolean | null; noiseSuppression: boolean | null; echoCancellation: boolean | null } | null;
  setup: "not_started" | "input" | "quiet" | "voice" | "ready" | "failed";   // "input": waiting for Check again / Use anyway on a built-in mic
  floorDb: number | null;
  ownDb: number | null;
  visible: boolean;                  // document.visibilityState === "visible"
};
// tracked payload: { online: true, identify: string | null, headset?: HeadsetPresence }
```

**Broadcast event `headset` on the participant's own private topic** (owner publishes, host receives; existing policy):

```ts
type HeadsetSignal =
  | { kind: "gate"; seq: number; open: boolean; levelDb: number; openDb: number }
  | { kind: "check-result"; checkId: string; levels: Record<string, number | null> };  // keyed by speaker participant ID, at most 12 entries
```

**Host control broadcast** (existing host-only `control` event) gains:

```ts
| { type: "headset-check"; checkId: string; order: string[]; slotMs: number; gapMs: number }   // order: 2–12 IDs; slotMs 3000–10000; gapMs 500–3000
| { type: "headset-check-cancel"; checkId: string }
```

The host ignores headset signals from removed or unknown participants (existing `allowed` check) and from non-headset rooms. Phones ignore headset controls in non-headset rooms. The host's own headset, if set up, is wired locally to `HeadsetHost` without the network.

### Audio and level math (exact; constants are provisional and will be tuned from 008.1 evidence)

- **Capture:** existing `MicrophoneCapture` + `public/audio/pcm-worklet.js` (mono 16 kHz PCM16, 100 ms frames). Headset Mode constraints: `{ channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false, deviceId?: { exact } }`. Report `track.getSettings()` booleans (null when absent) and `track.label`.
- **Frame level:** `frameLevelDb(frame) = 20·log10(rms / 32768)`, with rms over the 1600 samples; returns `-100` for silence or below `-100`.
- **Percentile:** nearest-rank on a sorted copy; `null` for an empty list.
- **Quiet floor:** `floorDb` = median of 30 frames (3 s).
- **Setup sequence:** microphone starts. Headset and unknown inputs continue automatically; built-in inputs wait in `input` for Check again or Use anyway. Then quiet (3 s), then voice (6 s), then ready or failed. Calibration lives in memory per room on that page and survives a rejoin; the microphone does not.
- **Own voice:** over 60 frames (6 s; the prompt shows for the whole step, and the lead-in before reading is excluded by the speech-frame filter), speech frames are those `≥ floorDb + 6`. Fewer than 10 speech frames fails as `too_short`. `ownDb` = median of the speech frames. `ownDb − floorDb < 10` fails as `too_quiet`.
- **Room check timeline** (relative to each phone's own receipt of `headset-check`): slot *i* starts at `i × (gapMs + slotMs)`; reading runs from `+gapMs` for `slotMs`; measurement window is `[reading start + 750 ms, reading end − 250 ms)`. Defaults: `gapMs = 1500`, `slotMs = 6000`. The host waits `n × (gapMs + slotMs) + 4000 ms` for results.
- **Per-slot result on each phone:** own slot = median of measuring-window frames `≥ floorDb + 6`, or `null` if fewer than 5 such frames. Other slots = 90th percentile of all measuring-window frames, or `null` if none (for example, page hidden).
- **Matrix on the host:** `levels[listener][speaker]`. `separationDb(L) = levels[L][L] − max over S≠L of levels[L][S]`, or `null` if either side is missing. Bands: `clear ≥ 15`, `usable ≥ 8`, `weak < 8`.
- **Phone thresholds:** `bleedDb` = max over S≠self of its own row; `own` = its own-slot value, falling back to calibration `ownDb`.
  - Before a room check (no bleed): `openDb = max(floorDb + 6, ownDb − 10)`.
  - With bleed: `candidate = bleedDb + 6`, `upper = own − 6`. If `candidate ≤ upper`, `openDb = max(candidate, floorDb + 6)`. Otherwise `openDb = max(floorDb + 6, (bleedDb + own) / 2)`.
  - `closeDb = openDb − 4`.
- **Gate (100 ms frames):** closed → open on the first frame `≥ openDb`. Open → closed after `600 ms` of consecutive frames `< closeDb`. Frames between `closeDb` and `openDb` keep an open gate open.
- **Gate signals:** a phone sends `gate` on each transition, and every `2000 ms` while open. The host treats a light as closed after a close signal, or `5000 ms` without an open signal.
- **Preview stats on the host (memory only):** per participant, opens and total open ms. Per pair, `coOnsets` (B opens within `500 ms` after A opens, by host receive time, either direction) and `overlapMs` (both open). Reset on demand and when a room check starts.

### Results export (Copy results)

JSON with no names, participant IDs, audio or text. Participants are `P1..Pn` by roster order. Labels have owner possessives stripped. The date is day precision only.

```json
{
  "kind": "caption-assist-headset-check", "version": 1, "capturedOn": "2026-10-11",
  "constants": { "gapMs": 1500, "slotMs": 6000, "bleedPercentile": 90, "openAboveBleedDb": 6, "openBelowOwnDb": 6, "closeHysteresisDb": 4, "holdMs": 600, "bands": { "clear": 15, "usable": 8 } },
  "participants": [{ "ref": "P1", "role": "host", "input": "headset", "label": "AirPods Pro", "processing": { "autoGainControl": false, "noiseSuppression": false, "echoCancellation": false }, "setup": "ready", "visible": true, "floorDb": -71.5, "ownDb": -32.4 }],
  "check": { "order": ["P1", "P2"], "levels": { "P1": { "P1": -31.8, "P2": -52.0 }, "P2": { "P1": -55.1, "P2": -30.2 } }, "separationDb": { "P1": 20.2, "P2": 24.9 }, "band": { "P1": "clear", "P2": "clear" } },
  "preview": { "durationMs": 180000, "participants": { "P1": { "opens": 41, "openMs": 52000 } }, "pairs": [{ "a": "P1", "b": "P2", "coOnsets": 2, "overlapMs": 1400 }] }
}
```

Label sanitizing: remove leading `Default - ` / `Communications - `, remove a leading owner possessive (`^[^'’]{1,30}['’]s\s+`), remove USB ids like `(1234:abcd)`, trim to 60 characters.

Input classification (case-insensitive; headset patterns first so "Default - AirPods Pro" is a headset):
- headset: `airpods|beats|buds|headset|headphone|earphone|bluetooth|hands-?free|bose|sony|jabra|plantronics|poly|sennheiser|shokz|logitech|hyperx|steelseries|razer|corsair`
- built-in: `iphone|ipad|built-?in|internal|microphone array|phone|bottom|front|back|speakerphone|macbook`
- otherwise unknown (including a bare `Default`, which names no physical device).

### File map

New, under `src/lib/headset/` (each with a co-located `*.test.ts`):
- `levels.ts` — `SILENCE_DB`, `frameLevelDb(frame: Int16Array): number`, `percentile(values: readonly number[], p: number): number | null`, `roundDb(value: number): number`.
- `calibration.ts` — `HeadsetCalibration = { floorDb; ownDb }`, `quietFloor(levels)`, `ownVoiceLevel(levels, floorDb): { ok: true; ownDb } | { ok: false; reason: "too_quiet" | "too_short" }`, `GateThresholds = { openDb; closeDb }`, `gateThresholds(calibration, bleedDb: number | null)`, `SeparationBand`, `separationBand(db)`.
- `gate.ts` — `class HeadsetGate { constructor(thresholds, holdMs?); setThresholds(t); push(levelDb, frameMs?): { open; changed }; get open(); reset() }`.
- `room-check.ts` — `RoomCheckPlan`, `checkDurationMs(plan)`, `slotAt(plan, elapsedMs)`, `class RoomCheckRecorder { constructor(plan, selfId, floorDb); push(levelDb, elapsedMs); result(): Record<string, number | null> }`, `CheckMatrix`, `checkMatrix(order, results)`, `bleedFromRow(selfId, row)`.
- `input-label.ts` — `InputClass`, `classifyInput(label)`, `sanitizeInputLabel(label)`.
- `messages.ts` — `HeadsetPresence`, `HeadsetSignal`, `HeadsetControl` types plus `validHeadsetPresence`, `validHeadsetSignal`, `validHeadsetControl`.
- `preview-stats.ts` — `class GatePreviewStats { constructor(now); gate(participantId, open); tick(); reset(); snapshot() }`.
- `export.ts` — `headsetResultsExport(input): string`.
- `headset-microphone.ts` — browser wrapper around `MicrophoneCapture` with Headset constraints, frame levels, track info, input listing, `devicechange` and track-ended handling. Injectable capture factory for tests.
- `headset-participant.ts` — phone-side state machine (setup steps, calibration, gate preview, room-check participation, presence updates, visibility). Injectable microphone, clock and timers.
- `headset-host.ts` — host-side roster/presence, speaking lights, room-check orchestration and timeout, matrix, preview stats, export.
- `wake-lock.ts` — best-effort Screen Wake Lock hook (port from `git show 41e9641:src/components/participant-page.tsx`).

New UI: `src/components/headset-setup.tsx` (shared phone/host setup and check prompts), `src/components/headset-panels.tsx` (speaking board, headset participants panel, room check and results panel).

Public APIs that the UI and controller rely on (names are binding; internals are the Builder's choice):

```ts
// headset-participant.ts (phone, and the host's optional own headset)
type HeadsetParticipantView = {
  setup: HeadsetPresence["setup"]; mic: HeadsetPresence["mic"];
  input: { label: string; inputClass: InputClass; processing: NonNullable<HeadsetPresence["processing"]> } | null;
  inputs: Array<{ deviceId: string; label: string }>;      // shown only when length > 1
  calibration: HeadsetCalibration | null; thresholds: GateThresholds | null;
  levelDb: number; speaking: boolean;
  check: { index: number; total: number; phase: "gap" | "reading"; mine: boolean } | null;
  result: { separationDb: number | null; band: SeparationBand | null } | null;
  notice: string | null;
};
class HeadsetParticipant {
  constructor(selfId: string, io: { setPresence(p: HeadsetPresence): Promise<void>; sendSignal(s: HeadsetSignal): Promise<void> },
    onView: (view: HeadsetParticipantView) => void, deps?: { microphone?: HeadsetMicrophone; now?: () => number });
  startSetup(deviceId?: string): Promise<void>;   // user gesture; also "Check again" / "Try again"
  useCurrentInput(): void;                        // "Use this microphone anyway"
  chooseInput(deviceId: string): Promise<void>;
  restartMicrophone(): Promise<void>;             // "Turn microphone back on" (keeps calibration)
  receiveControl(control: HeadsetControl): void;
  setVisible(visible: boolean): void;
  stopMicrophone(): Promise<void>;                // leave/end/removal/disconnect/unload
}

// headset-host.ts (host only)
type HeadsetHostView = {
  people: Record<string, { presence: HeadsetPresence | null; speaking: boolean }>;
  check: { plan: RoomCheckPlan; status: "running" | "done" | "cancelled"; matrix: CheckMatrix | null; missing: string[] } | null;
  canStartCheck: boolean;
  preview: ReturnType<GatePreviewStats["snapshot"]>;
};
class HeadsetHost {
  constructor(io: { sendControl(c: HeadsetControl): Promise<void> }, onView: (view: HeadsetHostView) => void, deps?: { now?: () => number });
  setRoster(participants: Participant[]): void;
  presence(participantId: string, presence: HeadsetPresence | null): void;
  signal(participantId: string, signal: HeadsetSignal): void;
  attachLocal(selfId: string, participant: HeadsetParticipant): void;   // host's own headset, no network
  startCheck(): Promise<void>;       // order = eligible people in roster order
  cancelCheck(): Promise<void>;
  resetPreview(): void;
  exportResults(): string;
}

// transport.ts additions
interface RoomTransport {
  setHeadsetPresence(presence: HeadsetPresence): Promise<void>;   // immediate headset-presence Broadcast; identify/headset merged in a throttled Presence snapshot
  sendHeadsetSignal(signal: HeadsetSignal): Promise<void>;        // guest only, own participant topic, event "headset"
}
// TransportCallbacks additions: headsetPresence(participantId, presence | null) [host], headsetSignal(participantId, signal) [host], headsetControl(control) [guest]

// controller.ts (wiring only)
// RoomView gains: mode: RoomMode; headsetHost: HeadsetHostView | null; headsetSelf: HeadsetParticipantView | null.
// ConnectedRoom gains getters headsetHost: HeadsetHost | null and headsetParticipant: HeadsetParticipant | null.
// Instances are created per headset room (discarded by resetRoom). release()/lostConnection()/finish()/dispose() call stopMicrophone().
// The host's HeadsetParticipant is created lazily by "Set up my headset" and attached with attachLocal.
```

Modified: `src/lib/audio/microphone.ts` (optional constraints + track accessor; defaults unchanged), `src/lib/rooms/types.ts` (`RoomMode`, snapshot mode, headset control union members), `src/lib/rooms/transport.ts` (merged presence, headset broadcast, headset control validation), `src/lib/rooms/controller.ts` (mode-aware: no room mic or identity sync in headset rooms; owns `HeadsetHost` / `HeadsetParticipant`; exposes headset views), `src/app/api/rooms/route.ts`, `src/app/page.tsx`, `src/components/participant-page.tsx`, `src/components/room-panels.tsx` (invite copy by mode), `src/app/globals.css`, migration and SQL test.

Keep files focused. `controller.ts` must not absorb headset logic beyond wiring.

### Tests required (minimum)

- **levels:** silence returns -100; full-scale square wave is about 0 dB; a half-amplitude sine is about -9 dB (±0.2); percentile edge cases (empty, single value, p0/p50/p90/p100).
- **calibration:** floor median; own-voice success; `too_short` (fewer than 10 speech frames); `too_quiet` (less than 10 dB above floor); thresholds before a check; thresholds with a large separation (candidate path); with a small separation (midpoint path); the floor + 6 minimum; bands at 7.9/8/14.9/15.
- **gate:** opens on one frame at `openDb`; stays open between close and open; closes only after 600 ms below close; reopening resets hold; `setThresholds` takes effect.
- **room-check:** `slotAt` gap/reading/measuring boundaries; recorder own-slot median with the floor+6 filter and null when fewer than 5 frames; others' p90; null when no frames; matrix separation and bands with missing values; `bleedFromRow`.
- **input-label:** AirPods variants, `Default - AirPods Pro`, "Stan's AirPods Pro" sanitized to "AirPods Pro", `iPhone Microphone` as built-in, Windows "Headset Microphone (Realtek…)" as headset, unknown labels, 60-character trim.
- **messages:** valid and invalid presence/signal/control (wrong kinds, out-of-range dB, oversized maps, bad checkId, too many order entries).
- **preview-stats:** opens/openMs, coOnsets within/outside 500 ms in both directions, overlapMs, reset.
- **export:** contains no names, participant IDs or labels with possessives; refs ordered by roster.
- **headset-participant:** setup step sequence with a fake microphone feeding levels; failure and retry; built-in warning; "use anyway"; gate signals on transitions and the 2 s repeat; room-check prompts and result signal; thresholds updated from its own row; mic stops on `stop()`; visibility in presence.
- **headset-host:** presence-driven states; speaking light with stale timeout; start-check eligibility (at least 2 ready and visible); results collection, timeout and missing rows; cancel; local host participant path; stats reset on check start.
- **transport:** merged presence keeps `identify` and `headset`; host parses valid headset presence and ignores invalid; `headset` broadcast accepted only from allowed participants and only on the host; guests receive validated headset controls.
- **controller:** headset room never calls the room-microphone factory or broadcasts `voice-identification`; Connected rooms are unchanged (existing tests stay green); `restore()` returns the mode; `create("headset")` uses `create_headset`.
- **route:** `create_headset` issues an invitation and passes only its hash.
- **UI:** host mode option and start path; no "Start room microphone" in headset mode; board text states; check button eligibility hint; phone pre-join headset copy from `check`; setup screens per step; built-in warning; check prompts.
- Table and Connected existing tests must pass unchanged, apart from mechanical type updates.

### Verification (Builder)

- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` — all must pass. On Windows PowerShell, chain with `;` and check `$LASTEXITCODE`; `&&` is not supported.
- Live SQL: migration applied to `cqnyvevhuxwfzhqpmccn` and the rollback-only test passing. Record the migration version (not secrets) in LIVE-STATE.md.
- Local live browser run (Playwright with Chromium fake media, as in CAPTION-003.4): a host plus two "phones" in a headset room; both complete setup with synthetic WAV audio (quiet lead-in, then speech); a room check runs to completion and produces a matrix; the gate preview lights change on host and phones; Copy results produces valid JSON with no names.
  - Assert that no request goes to `/api/transcription/session`, no WebSocket opens to `assemblyai.com` in Headset Mode, and the host page never calls `getUserMedia` unless "Set up my headset" is used.
  - The synthetic numbers prove the protocol only, not acoustic separation. Say so.
- Narrow phone width (390 px) and desktop (1280 px) render without horizontal overflow; keyboard reaches host controls.
- Anonymous sign-in rate limit: reuse saved storage states and keep runs few; never commit storage states.
- Physical devices are **not** available to the Builder. Do not claim acoustic results.

### Acceptance criteria (008.1)

1. Headset Mode exists as a separate mode, persists in the room, and is restored after host refresh. Table/Connected behaviour is unchanged.
2. In Headset Mode no audio leaves any device and no AssemblyAI session or token request occurs. The host opens a microphone only via "Set up my headset".
3. Phones open the headset microphone only after a tap, with processing-off constraints, and report the actual applied processing, label and input class.
4. Calibration, room check, gate preview and results export behave exactly as specified, with every state shown in text.
5. The export contains no names, IDs, audio or text.
6. Microphones stop on leave/end/removal/disconnect/unload; Wake Lock is best-effort.
7. All automated gates pass. The live migration and SQL test are verified. The local live protocol run passes. Durable context is updated and pushed, and Vercel status is recorded.

### Physical test script (human, after 008.1 deploys)

1. Two or three people, each with a phone and AirPods or a headset; the host laptop on the table. If possible, one boom-mic headset as a comparison.
2. Host starts **Headset Mode (test)**; everyone joins by QR and completes **Start headset check**. Note each phone's `Using:` label and whether processing shows as off.
3. Seat people about 1 m apart. Host runs **Start room check**. Copy results.
4. Talk naturally for three minutes. Watch the speaking board: does only the talker light up? Note any light for someone who wasn't talking, and any time a talker's light stayed off. Copy results.
5. Repeat the room check at about 50 cm apart, and once with one person using the phone's own mic ("Use this microphone anyway") for comparison. Copy results each time.
6. Return all exports and observations to the Planner.

### Go/no-go for 008.2 (Planner decision on evidence)

- **Go:** headset users mostly `clear` or `usable` (separation ≥ 8 dB, ideally ≥ 15), and during natural talk the lights follow the talker with few co-onsets.
- **Adjust:** AirPods weak but boom headsets clear. Proceed with headset guidance and/or tuned constants.
- **Stop:** headsets also weak, or iOS ignores the processing-off request so that levels are normalized. Record the evidence, and Planner and human decide. This would be the third failed personal-microphone approach overall.

### Risks

- iOS Safari may not honour `autoGainControl: false`. The export's processing fields reveal this.
- AirPods switch to call-quality audio while the mic is open, and can auto-switch to another Apple device.
- Broadcast receipt skew between phones affects room-check windows. Guards are 750/250 ms; skew contaminates conservatively (understates separation).
- Mobile pages lose the microphone when the screen locks. Wake Lock is best-effort and `visible` is reported.
- The live migration requires project access. Follow the stop rule above.

---

## Planner review of 008.1 — 2026-10-11

- **Physical result (human-observed):** the human tested the deployed build on real phones and headsets and reported: "I am satisfied with the results, might need to calibrate for less sensitivity, but this could actually work." No results export, device/headset models or separation numbers were returned yet. **Decision: GO for 008.2**, with the gate corrections below. Exports from the next physical run must be returned so that numbers, not impressions, tune the constants.
- **Accepted deviation:** immediate headset state travels as validated `headset-presence` Broadcast, with coalesced Presence snapshots at most every 12 s. This is required by Supabase's five-per-30-second Presence limit. It amends the 008.1 presence contract.
- **Defect found in review:** when a room check finishes, the phone shows its separation but never applies the measured bleed to its gate (`HeadsetParticipant.finishCheck` does not call `gateThresholds(…, bleedDb)` / `setThresholds`). Every gate keeps the provisional pre-check threshold (`ownDb − 10`), which plausibly explains the reported over-sensitivity.
- **Deviation found in review:** the guest controller creates a new `HeadsetParticipant` on every room entry, so calibration is lost on rejoin, contrary to the 008.1 spec.
- **Test gap:** several required 008.1 tests are missing: gate edge cases; threshold paths that use bleed; participant gate signals and their 2 s repeat; check-result content; thresholds from the participant's own row; host result collection, timeout and missing rows. Part A of 008.2 closes the gaps that matter for transcription.

## CAPTION-008.2 specification — gate correction and gated transcription

### Objective

Turn Headset Mode into a working caption mode. Each ready phone transcribes only its wearer's gated speech with AssemblyAI Universal-3.6 Pro + Voice Focus `near-field`, and the host shows those captions named by whose phone sent them. First fix the gate so the room check actually tunes it, and give the host a per-person sensitivity control for field tuning.

### Part A — gate correction (land and test first; may be its own commit)

1. **Room check feeds the gate.** On check completion the phone computes `bleedDb = bleedFromRow(selfId, row)` and `own = row[selfId] ?? calibration.ownDb`. It then sets `thresholds = applySensitivity(gateThresholds({ floorDb, ownDb: own }, bleedDb), sensitivity, { floorDb, ownDb: own })` and calls `gate.setThresholds(thresholds)`, updating `view.thresholds`. A cancelled or incomplete check leaves thresholds unchanged. The phone keeps the latest applied bleed until recalibration.
2. **Attack:** the gate opens only after **2 consecutive frames** (200 ms) at or above `openDb` (`ATTACK_FRAMES = 2`). Close and hold are unchanged (`closeDb = openDb − 4`, 600 ms). The 300 ms look-ahead in Part B means the first syllable is still sent.
3. **Sensitivity (host-controlled, memory-only):** `type Sensitivity = "lower" | "normal" | "higher"`, default `normal`. Add pure `applySensitivity(base: GateThresholds, sensitivity: Sensitivity, calibration: HeadsetCalibration): GateThresholds` to `calibration.ts`. It shifts `openDb` by `lower +4 dB`, `normal 0`, `higher −3 dB`, then clamps it to `[floorDb + 6, ownDb − 3]`; `closeDb = openDb − 4`. Apply it every time thresholds are computed: after calibration, after a room check, and when the sensitivity changes. The host sets it per person, including its own headset, in the Participants panel: a radio group labelled "Sensitivity" with options "Less sensitive", "Normal", "More sensitive". New host control: `{ type: "headset-sensitivity"; levels: Record<participantId, Sensitivity> }`, validated (at most 64 entries, ids under 100 characters, values in the enum). The host broadcasts the full map on every change, whenever a participant's status becomes Connected, and after the host (re)enters. Each phone applies its own entry; a missing entry means `normal`. The phone shows "Sensitivity: Less sensitive (set by the host)" and so on.
4. **Calibration survives rejoin:** reuse the guest's `HeadsetParticipant` for the same room ID, discarding it only in `resetRoom`, and route its `io` through the current transport (`this.transport`) instead of a captured one. The microphone still stops on release, and "Turn microphone back on" keeps calibration.
5. **Presence/export additions** (optional fields in validators, so stale pages are tolerated):
   - `HeadsetPresence` gains `sensitivity?: Sensitivity`, `openDb?: number | null` and `stt?: "off" | "connecting" | "on" | "reconnecting" | "failed"`.
   - The export becomes `version: 2` and adds `sensitivity`, `openDb` and `stt` per participant.
6. **Tests:**
   - gate: attack (one frame does not open, two do); hysteresis; hold reset on re-crossing; `setThresholds`.
   - `gateThresholds`: candidate path, midpoint path, floor minimum.
   - `applySensitivity`: offsets and both clamps.
   - participant: room-check completion applies bleed thresholds and cancel leaves them unchanged; check-result content; gate signals on transitions plus the 2 s repeat; a sensitivity control changes thresholds; calibration persists across controller rejoin.
   - host: results collection, timeout with missing rows, sensitivity map broadcast on change and on participant Connected.
   - validators for the new control and fields.

### Part B — gated transcription

1. **Provider options:** export `HEADSET_ASSEMBLYAI_OPTIONS = connectedAssemblyAIOptions("near-field")` from `provider.ts`. The resulting query must contain `speech_model=universal-3-6-pro`, `speaker_labels=false`, `voice_focus=near-field`, `mode=balanced`, `format_turns=true`, `sample_rate=16000`. A rejection surfaces "Captioning couldn't start on this phone. The speech service rejected its settings." with **Retry captions**, and never falls back to another model. Table and Connected options are unchanged.
2. **Frames:** `HeadsetMicrophone` passes each PCM frame along with its level: `onFrame(levelDb: number, frame: ArrayBuffer)`.
3. **Look-ahead delay line** (new pure `src/lib/headset/gated-audio.ts`): `class GatedAudio { constructor(preRollFrames = 3); push(frame: ArrayBuffer, gateOpen: boolean): ArrayBuffer | null; reset(): void }`.
   - Each push enqueues `{ frame, send: gateOpen }`. If `gateOpen`, all queued frames are marked `send`.
   - Once the queue exceeds `preRollFrames`, the oldest entry is returned: its frame if `send`, otherwise a same-length zero (silence) frame.
   - Exactly one output frame per input after the first three, so captions run a constant 300 ms behind and the provider's audio clock stays continuous.
4. **Transcriber** (new `src/lib/headset/headset-transcriber.ts`): `class HeadsetTranscriber { constructor(roomId, publish: (event: TranscriptionEvent) => void, onState: (state: SttState) => void, deps?: { providerFactory?, fetch?, session? }); start(): Promise<void>; sendFrame(frame: ArrayBuffer): void; stop(): Promise<void> }`, with `type SttState = "off" | "connecting" | "on" | "reconnecting" | "failed"`.
   - Port the token request (`POST /api/transcription/session?roomId=…` with the Supabase bearer), turn-ID mapping (`<streamId>/turn/<n>`, `sourceId: "personal"`, `speakerId: null`) and bounded reconnect (500/1000/2000 ms, then `failed`) from the dormant `src/lib/rooms/personal-microphone.ts`. Leave that dormant file untouched.
   - Each provider connection gets a fresh `streamId`.
5. **When audio flows:**
   - The transcriber starts automatically the first time setup reaches `ready` and runs until the microphone stops (leave, end, removal, disconnect, unload, failure).
   - Every captured frame then goes through `GatedAudio` into `sendFrame`. During re-calibration (setup not `ready`) and during a room check, `gateOpen` is forced false, so only silence is sent.
   - "Turn microphone back on" restarts capture and the transcriber; "Retry captions" restarts only the transcriber.
6. **Caption relay** (restore and adapt from `git show 41e9641:src/lib/rooms/transport.ts`):
   - Guest `sendCaption(event)` broadcasts event `caption` on its own participant topic with `CaptionEnvelope { event, sequence, readyAt, streamId }`.
   - The host validates with `validEnvelope` and drops non-increasing sequences per participant+stream (bounded at 512 keys). It binds identity with `exactIdentity(event, participantId)` and calls a new `caption(participantId, event)` callback, in headset rooms only.
   - **No relay-ack messages.**
   - **Coalesce interims to at most one per 200 ms per stream**, latest wins. Finals and speaker revisions are sent immediately; a final drops any pending interim from its stream.
   - The host's own headset dispatches locally with `exactIdentity(event, selfId)`.
7. **Host captions:**
   - In headset rooms the controller dispatches `TRANSCRIPTION_EVENT` for each identity-bound event into the existing reducer. Speaker profiles already come from `participantProfiles`, so captions, live interims and history show participant names.
   - The main stage shows the existing caption transcript. The speaking board becomes a compact strip above it: one text item per person with `Speaking`/`Quiet`/`Not set up`/`Setting up`/`Microphone off`/`Screen off`, plus caption state `Captioning`/`Connecting captions…`/`Captions reconnecting…`/`Captions stopped`.
   - Empty-stage copy: "Captions appear here when someone with a ready headset speaks. Only people wearing a set-up headset are captioned."
8. **Copy changes:**
   - Phone setup line: "Your headset microphone captions your voice. Audio is sent for transcription only while you're speaking, and nothing is recorded or stored."
   - Phone status line: "Captioning your voice" / "Connecting captions…" / "Captions reconnecting…" / "Captions stopped." + **Retry captions**.
   - Invite: "Everyone who will speak wears AirPods or a headset connected to their phone, scans this code and sets up their headset. Each person's captions show their name. People without a set-up headset are not captioned."
   - The mode label stays "Headset Mode (test)" until 008.4.
9. **Limits and cost:**
   - Check Supabase's Realtime quotas (broadcast messages per second and payload size for this project's plan) and AssemblyAI's Universal-3.6 Pro streaming price, any Voice Focus surcharge and the concurrent-stream limit.
   - Record them, dated, as documentation facts in QUALITY.md (cost table and notes). Record them in LIVE-STATE.md only if read from the live account or project.
   - Cost basis: one Pro stream per ready person for the whole conversation.

### Non-goals for 008.2

- No duplicate safety net, adaptive thresholds or automatic recovery from a headset swap (008.3).
- No product toggle that disables the gate.
- No transcript or audio persistence.
- No change to Table/Connected behaviour or provider options, Supabase policies or schema.

### Verification (Builder)

- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`. Unit tests must cover:
  - **`GatedAudio`:** one output per input after warm-up; three pre-roll frames sent before an opening; silence while closed; hold tail.
  - **Transcriber:** options and query; token path; bounded reconnect to `failed`; turn-ID normalization; stop terminates.
  - **Relay:** validation, sequence dedupe, identity binding, headset-only acceptance, interim coalescing, final flushing.
  - **Controller:** headset captions dispatched with participant identity; connected rooms ignore `caption` broadcasts.
  - **UI:** caption and STT states.
- **Live provider check:** one real AssemblyAI session through the actual browser path with `HEADSET_ASSEMBLYAI_OPTIONS` and a synthetic voice WAV. Observe Begin, Turn and Termination with no Error, and record the model/config names (never secrets) in LIVE-STATE.md. A socket opening alone does not prove Voice Focus works.
- **Local live end-to-end** (host + two fake-media phones, live Supabase + AssemblyAI):
  - Give each phone its own WAV: its "wearer" speaking at normal level, plus the other wearer's sentences about 20 dB quieter (simulated bleed), alternating.
  - Calibrate, run a room check, then play the conversation.
  - Report per phone: lines captioned under the correct name, duplicates (the same sentence under both names), missed lines, and the count of non-silent versus silent frames sent.
  - Synthetic audio proves the pipeline, not real acoustics; say so.
  - Optional and valuable: using a test harness only, run phone A's WAV with the gate forced open to observe Voice Focus alone on the simulated bleed, and record the result.
- 390 px and 1280 px render checks; keyboard reaches host controls, including the sensitivity radio group.
- Keep sign-ins few (anonymous rate limit), end every test room, and commit no audio or storage states.

### Acceptance criteria (008.2)

1. Room-check bleed tunes each phone's gate. The 2-frame attack and host sensitivity control work within their clamps. Calibration survives rejoin.
2. Each ready phone sends only gated audio (300 ms look-ahead, silence otherwise, nothing during calibration or room check) to its own Universal-3.6 Pro + Voice Focus `near-field` session. There is no fallback, failure states are visible, and reconnect is bounded.
3. The host shows live interims and finals named by the sending phone's identity, in the transcript and history. Table and Connected behaviour is unchanged.
4. Interims are coalesced to at most 5 per second per phone; there are no relay-acks. Nothing is stored.
5. All automated gates, the live provider check and the local end-to-end run (with counts) are recorded. Docs are updated, the work is pushed and the Vercel status is recorded.

### Physical test script (human, after 008.2 deploys)

1. Reload every page. Two or three people with AirPods/headsets. The host starts **Headset Mode (test)**; everyone joins, sets up, and the host runs **Start room check**.
2. Talk naturally for five minutes. Include turn-taking, a quick back-and-forth with short replies ("yeah", "no"), a moment where two people talk at once, laughter, and one person speaking softly.
3. On the host screen note:
   - **duplicates:** the same words under two names;
   - **missed speech:** someone spoke and nothing appeared;
   - **wrong names;**
   - **delay:** how long captions take to appear.
4. If someone's captions pick up other people, set that person to **Less sensitive** and repeat a minute. If someone's soft speech is missed, try **More sensitive**. Note what you chose.
5. **Copy results** at the end, and return the export(s) plus your notes. Optionally run a 20–30 minute session to check stability and battery.

## CAPTION-008.3 outline — safety net and recovery

- **Duplicate safety net:** when two phones produce overlapping finals with matching text, keep the one with the larger calibrated gate margin. Reuse the CrossMicReconciler matching, with a margin-based leader. Margin data is added to the relay in this slice.
- **Adaptive thresholds** from live open/closed frame statistics.
- **Recovery:** detect headset disconnect or fallback to the built-in mic (`devicechange`, label change) and warn on the host and phone. Handle phone lock, page refresh and recalibration.

## CAPTION-008.4 outline — physical UAT and closure

A sustained multi-person session measuring duplicates, missed speech, wrong attribution, latency and cost per person-hour, recorded in QUALITY.md, plus human acceptance.
