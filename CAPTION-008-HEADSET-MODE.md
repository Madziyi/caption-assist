# CAPTION-008 — Headset Mode

**Status:** CAPTION-008.1 and 008.2 were physically tried by the human on 2026-10-11: captions work and are named by phone, but close seating causes duplicates and roughly 2 s perceived delay. Active slice **CAPTION-008.3** is implemented, locally verified and published as `6695c60` (Vercel success); physical acceptance and Planner review remain pending. An earlier run escaped one duplicate. No 008.4 latency optimization or 008.5 recovery expansion has started. See the as-built summaries, QUALITY.md and the physical script below.

## As built (008.2)

- Source `aac146a`, setup follow-up `df89148`: `HeadsetParticipant`, calibration/room-check/gate modules implement plausible room-check application, the supplied wired/Bluetooth vectors, 2-frame attack, host sensitivity, calibration-preserving restart and memory-only microphone-drop state. `HeadsetMicrophone` reports actual selected input/settings; generic route labels are not proof of hardware.
- `gated-audio.ts` and `headset-transcriber.ts` send 100 ms PCM frames at 16 kHz, 300 ms look-ahead, silence while closed or during calibration/check. One fixed Universal-3.6 Pro + near-field balanced session per ready phone, diarization off, formatting on; explicit failure and bounded reconnect, no fallback.
- `rooms/transport.ts`, `types.ts` and `controller.ts` validate sequence-numbered caption envelopes, bind channel-owned membership identity and ignore headset captions in Connected rooms. No application relay-acks or transcript/audio storage. Existing private Broadcast and 12 s coalesced Presence snapshots remain.
- Host transcript/history/status strip and phone setup/privacy/invite copy are wired. The setup follow-up restores a user-gesture start for the immediately initialized phone view, permission-pending feedback and stopped-microphone restart.
- Original verification: 175 tests/29 files for 008.2, 179/29 for setup; automated gates passed, live-provider verification was initially missing. The real browser/provider pipeline was exercised during 008.3 below. 008.3 also corrects guest instance reuse/current transport on rejoin and closes STT on microphone failure; these were intended 008.2 lifecycle behaviors, not new swap/background recovery policy.

## As built (008.3)

- Part A: `calibration.ts`, `room-check.ts`, `messages.ts`, `headset-host.ts` and `headset-participant.ts` implement integer −15..+6 dB offsets, legacy mapping, clamps, 250 ms drag coalescing/final commits, speech-frame own estimator and phone-reported `tuned`. Native host sliders show phone thresholds/quiet-speech warning; the board and export use current phone tuning instead of the historical matrix. New thresholds retain the allowed positive ceiling (`ownRef + 6`), separate from PCM-level validation.
- Part B: `level-history.ts`, `evidence.ts`, `latency.ts` and `relay-constants.ts` hold bounded capture/latency samples, subtract 300 ms look-ahead from word-timed spans, validate evidence and align the last 50 caption/gate observations. Provider `audioEndAt` is additive; Table/Connected display timing is unchanged. The relay sends leading interims immediately, keeps latest subsequent interims at 200 ms and drops queued interims on final/disconnect.
- `arbiter.ts` emits reducer actions between identity validation and headset dispatch: 3 dB interim margin, 4 dB/half-span bleed suppression, 0.6 short-side token coverage, 300 ms overlap tolerance, conditional final hold ≤800 ms, replacement, restored overlap and shown-only revisions. Records are bounded to 256 recent turns/15 s; hidden finals to 200. Local host captions use the same path with offset zero. Release/removal cancels held work.
- `headset-panels.tsx` and `room-panels.tsx` expose keyboard sliders, current tuning, per-person formula delay and default-off host-only hidden finals. `export.ts` emits version 3 numerical statistics and constants with anonymous P-references; no names, IDs, text or audio.
- Bounded implementation details: presence adds numerical `ownRefDb` so warnings remain accurate after host refresh without retaining a stale matrix; text comparison fails open above 256 tokens to bound quadratic comparison work; removing a previously shown level-only bleed final also increments `replaced`. A trailing caption delivery failure produces a visible warning, not a false room-disconnect event. No membership authorization, schema, Presence cadence or provider configuration was changed.
- Measurement caveat: preserve signed `receivedAt − audioEndAt`, including provider word endpoints slightly ahead of receipt. Dropping negative samples would bias the specified measurement. The formula display is not human-perceived latency. This needs Planner interpretation before 008.4; no accuracy/latency lever was changed here.
- Live local verification: Windows Chromium, one host and two independent 390 px fake-media phones, actual worklet/gated PCM, live Supabase and AssemblyAI. Four synthetic targets mixed into both streams with the other wearer 5 dB quieter; manual +6 dB sliders deliberately expose bleed. Final arbitration run: four correct-owner targets once, zero misses/duplicates/wrong names; two text and one level final suppressed. Bypass: two duplicates, two wrong names, zero misses. Both phones received Begin/Turn/Termination without Error; host requested no microphone. 390/1280 px no overflow, sliders and checkbox keyboard-tested.
- Verification variability: an initial calibration harness run timed out (cause unproven); isolated capture then passed. An earlier comparison had one escaped duplicate, and a diagnostic active run had none. Final active+bypass passed without tuning constants/provider options. This is a pipeline check, not proof of real acoustics, human quiet/overlapping replies or sustained reliability. QUALITY.md holds exact metrics; LIVE-STATE.md records verified live options.
- Repeatable runner: `scripts/verify-headset-captions-browser.mjs <playwright-directory> <chromium-executable>` against localhost:3000; `scripts/create-headset-speech.ps1` creates synthetic temporary fixtures. Optional `--capture-debug` isolates capture; `--diagnostic` prints non-text timing/evidence. A development-only global harness flag bypasses arbitration for comparison; production cannot enable it. Auth state stays in memory across the two runs; rooms end, browsers close and synthetic WAVs are deleted. No audio/storage state is committed.

## Human-approved UI/readability follow-up to 008.3

- The human reports deployed 008.3 "works perfectly now" and approved a polished input interface, rounded Speaking/Quiet rectangles on phones, compact replacement pills in existing host rows, and flowing same-speaker paragraphs. The human explicitly approved implementation with transcription timing unchanged. This is qualitative user evidence; no new device matrix or numeric accuracy/latency measurements were supplied.
- `headset-setup.tsx` retains permission/start/restart/device-ID logic and wraps the accessible native select in a microphone card. Browser-route guidance is expandable, not removed; switching input still reruns setup. `headset-activity.tsx` shares text/colour states across phones and host rows. Mic loss/denial/off/setup and STT failure/reconnect take precedence over speech; the display does not claim audio detection proves transcription. Motion is a gentle colour transition with reduced-motion support.
- `reading-blocks.ts`, `headset-transcript.tsx` and the headset branch in `page.tsx` compose adjacent same-known-speaker/source finals and interims without delaying them. First-pass display limits: gap ≤2 s, maximum 80 words at provider-turn boundaries; a single longer provider turn remains intact. Unknown speakers, source/speaker changes and overlapping spans stay separate; final ingest order is preserved. Original caption objects/turn IDs, reducer, arbitration, corrections/removal and history are unchanged. This visually joins fragments; it does not alter the provider's turn detection or rewrite punctuation.
- 238 tests/36 files, typecheck/lint/build/diff gates and isolated native Chromium UI checks passed. Host/phone 390/1280 px and 100/200% root text had no overflow; keyboard input/help, prominent/compact speaking/failure states, streaming paragraph updates, removal and reduced motion passed. Real capture/worklet with simulated media verified selection/restart through the existing runner. Screenshots inspected; no new live STT/room or physical-phone session performed. See QUALITY.md for fixture fixes and limits.
- No 008.4 timing optimization, additional caption hold, gate change, new provider/configuration, storage or schema change. After publication the human reloads and confirms the new visual/readability behavior; latency testing remains separate.

## As built (008.1)

- Pure headset level, calibration, gate, room-check, label, validation, preview-stat and anonymized-export modules live under `src/lib/headset/`, with co-located tests. `HeadsetMicrophone` wraps `MicrophoneCapture` with processing-off constraints and reports actual track settings.
- `ConnectedRoom`, `SupabaseRoomTransport`, the room API and `20261011140359_headset_mode` migration persist and restore `connected | headset`; Headset Mode never starts the room microphone or transcription provider. `HeadsetHost` and `HeadsetParticipant` own the local gate/room-check protocol.
- Host and phone UI includes Headset Mode (test), mode-specific invite/pre-join copy, speaking board, setup flow, room-check matrix and export controls. Wake Lock is best-effort.
- Verification progression: the initial Builder pass performed only a one-host local smoke. Subsequent use of bundled Playwright/installed Chromium verified a local host (1280×800) plus two simulated phones (390×844) against live Realtime: both calibrated, room check produced a matrix, one phone refreshed/rejoined/recalibrated, with no Presence-limit disconnects or page errors. No transcription token request/provider socket and no host microphone call were observed. This does not establish physical acoustic behavior, measured layout overflow, keyboard traversal or Copy-results browser validation.
- Mobile compatibility fixes: browser API receivers are preserved, and clipboard failures are caught and announced. The reported input-dependent `Illegal invocation` was reproduced in native Chromium: `HeadsetParticipant` invoked stored browser timers with the participant as the receiver. Binding both timers to the global fixes calibration startup and cancellation. The prior permission-window explanation was not established and is superseded by this reproduction.
- Input picker: the selected option follows the active track's `getSettings().deviceId`, held only in local setup state. No label matching or automatic input choice; requested input IDs still use the specified exact constraint. Generic `Headset microphone` routes are unknown, not confirmation of connected hardware; browser-route guidance is shown beside the picker.
- Additional verification: isolated native-Chromium before/after regression across Default, generic headset, Bluetooth headset and Speakerphone calibration paths; real capture/worklet with a browser-simulated microphone delivered level frames, advanced quiet → voice, restarted on input selection and cancelled on stop. `scripts/headset-timer-browser.mjs` can repeat this with an installed Playwright package/Chromium executable. This isolated runner tests neither live room transport nor physical headset behavior; the separate live-room run is described above.
- Participant connection fix: calibration/visibility transitions now send validated `headset-presence` Broadcast messages on the participant's existing private channel. A coalesced Presence snapshot runs at most every 12 s (the two initial room Presence tracks also count against the five-per-30-second connection limit). Session ID/sequence fields let hosts reject stale snapshots/retired sessions; these transport fields are not exported. Identical updates are deduplicated, queued snapshots are cancelled on disconnect, and metadata delivery errors are caught with visible retry feedback. This updates the initial immediate-Presence protocol to comply with verified Supabase quotas; no policy/schema or audio contract changes.

## As built (008.2 setup follow-up)

- The non-null initialized phone view published by `aac146a` must still expose **Start headset check** when setup is `not_started` and the mic is `off`. Microphone permission remains a user tap; input enumeration follows successful capture, and the picker still appears only for multiple browser-listed inputs. Starting shows permission feedback; stopped shows **Turn microphone back on**; ready is not claimed when the mic is off.
- This scoped UI regression fix changes no audio, transcription, room transport or threshold contract. 179 tests/29 files and source gates pass; `scripts/headset-setup-browser.mjs` verifies actual UI, native capture/worklet, simulated input selection/restart and 390/1280 px overflow with external networking blocked. Physical/live-provider acceptance remains outstanding. The physical script below is unchanged.

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
| 008.3 | Duplicate control: continuous per-person sensitivity slider, visible room-check tuning state, robust own-level estimator, calibrated cross-phone arbitration of overlapping captions, latency measurement | Yes |
| 008.4 | Latency improvements chosen from the 008.3 measurements, without visible accuracy loss | Yes |
| 008.5 | Remaining recovery items, physical multi-person UAT and closure | Yes |

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

1. **Room check feeds the gate, but only when the row is plausible.** On check completion the phone computes `bleedDb = bleedFromRow(selfId, row)` and `own = row[selfId]`.
   - **Plausible** means all of: `own` is not null; `own ≥ calibration.ownDb − 12`; and `own − bleedDb > 0` (or `bleedDb` is null).
   - **If plausible:** set `thresholds = applySensitivity(gateThresholds({ floorDb, ownDb: own }, bleedDb), sensitivity, { floorDb, ownDb: own })`, call `gate.setThresholds(thresholds)`, update `view.thresholds`, and keep the applied bleed and own until recalibration.
   - **If not plausible:** leave the thresholds unchanged and show "The room check didn't hear you clearly. Check your headset is connected, then ask the host to run the room check again." The host's room-check result marks that person "Not heard — run the room check again". The export records `applied: false` for that row.
   - A cancelled or incomplete check changes nothing.
   - **Why the guard:** the first physical export had a Bluetooth phone whose own reading was −66.2 dB against a calibrated −26.1 dB, with "bleed" at −36.1 dB. The human reports the headset kept connecting and disconnecting. Applying that row unguarded would drop the phone's open threshold to the `ownDb − 3` clamp (−69.2 dB), so it would open on almost any sound.
   - **Required test vectors from that export:**
     - floor −41, own −22.6, row `{self: −27.3, other: −36.1}`: applied; Normal gives open −31.7 / close −35.7, Less sensitive −30.3 (clamped), More sensitive −34.7.
     - floor −85.3, own −26.1, row `{self: −66.2, other: −36.1}`: rejected, thresholds unchanged at −36.1 / −40.1.
2. **Attack:** the gate opens only after **2 consecutive frames** (200 ms) at or above `openDb` (`ATTACK_FRAMES = 2`). Close and hold are unchanged (`closeDb = openDb − 4`, 600 ms). The 300 ms look-ahead in Part B means the first syllable is still sent.
3. **Sensitivity (host-controlled, memory-only):** `type Sensitivity = "lower" | "normal" | "higher"`, default `normal`. Add pure `applySensitivity(base: GateThresholds, sensitivity: Sensitivity, calibration: HeadsetCalibration): GateThresholds` to `calibration.ts`. It shifts `openDb` by `lower +4 dB`, `normal 0`, `higher −3 dB`, then clamps it to `[floorDb + 6, ownDb − 3]`; `closeDb = openDb − 4`. Apply it every time thresholds are computed: after calibration, after a room check, and when the sensitivity changes. The host sets it per person, including its own headset, in the Participants panel: a radio group labelled "Sensitivity" with options "Less sensitive", "Normal", "More sensitive". New host control: `{ type: "headset-sensitivity"; levels: Record<participantId, Sensitivity> }`, validated (at most 64 entries, ids under 100 characters, values in the enum). The host broadcasts the full map on every change, whenever a participant's status becomes Connected, and after the host (re)enters. Each phone applies its own entry; a missing entry means `normal`. The phone shows "Sensitivity: Less sensitive (set by the host)" and so on.
4. **Calibration survives rejoin:** reuse the guest's `HeadsetParticipant` for the same room ID, discarding it only in `resetRoom`, and route its `io` through the current transport (`this.transport`) instead of a captured one. The microphone still stops on release, and "Turn microphone back on" keeps calibration.
5. **Presence/export additions** (optional fields in validators, so stale pages are tolerated):
   - `HeadsetPresence` gains `sensitivity?: Sensitivity`, `openDb?: number | null` and `stt?: "off" | "connecting" | "on" | "reconnecting" | "failed"`.
   - The export becomes `version: 2` and adds `sensitivity`, `openDb`, `stt` and `micDrops` per participant, plus `applied` per room-check row.
6. **Headset drop resilience** (minimal; full recovery stays in 008.3):
   - `devicechange` fails the microphone only if the current track has ended or its `deviceId` is no longer listed by `enumerateDevices()`. Changes to unrelated devices are ignored.
   - A failure after setup was `ready` shows "Your headset disconnected." with **Turn microphone back on**, which keeps calibration (the existing `restartMicrophone` path), alongside **Check again**.
   - The phone counts drops in `micDrops` (memory-only, sent in presence). The host strip shows "Headset disconnected" for that person.
   - From Part B, the phone's transcriber stops with the microphone and restarts with it.
7. **Connection check before coding:** read the Supabase Realtime logs since the `d839f09` deployment for `ClientPresenceRateLimitReached` or other channel errors and record the counts. The human's report of "connecting and disconnecting" may mean the room connection rather than the headset. If room disconnections persist, fix and verify that first, and say so in the handoff.
8. **Tests:**
   - gate: attack (one frame does not open, two do); hysteresis; hold reset on re-crossing; `setThresholds`.
   - `gateThresholds`: candidate path, midpoint path, floor minimum.
   - `applySensitivity`: offsets and both clamps.
    - participant: room-check completion applies bleed thresholds for a plausible row and rejects an implausible one (both export vectors), and cancel leaves them unchanged; unrelated `devicechange` is ignored, and a lost track shows the disconnected state and keeps calibration on restart; check-result content; gate signals on transitions plus the 2 s repeat; a sensitivity control changes thresholds; calibration persists across controller rejoin.
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

## Planner review of 008.2 — 2026-10-11

- **Human physical result** (two phones: a wired headset and a Bluetooth headset; export version 2; 160 s preview):
  - Captions work and are named by phone.
  - Bleed from the other person still opens gates ("too much sensitivity to some bleed from another person speaking"). It works well at a distance but needs lower sensitivity as people sit closer.
  - Captions feel about 2 s behind.
  - Verdict: "I'm actually happy, it's kind of working."
- **Export numbers:**
  - **Wired headset:** room-check own −25.6, bleed −30.0, separation 4.4 dB (weak).
  - **Bluetooth headset:** own −26.7, bleed −33.6, separation 6.9 dB (weak).
  - **Gate overlap:** both gates were open together for 16.1 s with 7 co-onsets (about 40% of each phone's open time). Each overlap is a potential duplicate caption.
- **Key observation:** comparing phones works better than either phone alone. When the Bluetooth wearer spoke, the wired phone heard it 4.4 dB below *its own wearer's* level. When the wired wearer spoke, the Bluetooth phone heard it 6.9 dB below its own wearer's level. So the person actually talking is always the one nearest their own calibrated level, even when no single-phone threshold separates cleanly. CAPTION-008.3 builds on this.
- **Findings:**
  - **Wired phone's threshold:** it reported `openDb −26`, which is exactly its pre-room-check threshold (−30) plus "Less sensitive" (+4). Recalibrating or reloading after a room check silently discards the room-check tuning, while the host keeps showing the old matrix as applied. The phone must report whether its tuning is current.
  - **The three-step control is too coarse.** "Less sensitive" is +4 dB, clamped at `own − 3`, so the host could not raise the wired phone's threshold enough. The human asked for a continuous slider.
  - **The Bluetooth phone calibrated its own voice at −41.6 dB, but the room check heard it at −26.7.** Its floor is −81.5 because the headset silences noise digitally, so "floor + 6" admits room noise as "speech" and pulls the median down. The own-level estimator needs a peak-relative floor.
  - **Interim relay delay:** it delays the first interim of every burst by a full 200 ms (trailing-edge timer).
  - **Gaps from 008.2:** the Builder did not add an "As built (008.2)" section, did not perform the live provider check, and did not run the live end-to-end check. The human's session shows the provider path working in real use. The 008.3 handoff must close these documentation and verification gaps.
- **Decision:** proceed to CAPTION-008.3, duplicate control. Latency gets measured in 008.3 and optimized in 008.4 from the measurements, without trading away accuracy.

## CAPTION-008.3 specification — duplicate control

### Objective

Each spoken sentence appears once, under the right name, while every person keeps their captions. Three parts:
- the host gets a continuous per-person sensitivity slider;
- the host chooses between overlapping captions by comparing each phone's level against its own wearer's calibrated level;
- every stage of latency is measured so 008.4 can fix the right stage.

### Part A — tuning controls and estimator fixes (land and test first)

1. **Continuous sensitivity slider** (replaces the three-step control):
   - Each person gets `sensitivityDb`, an integer from **−15 to +6**, default 0. Negative means less sensitive.
   - `applySensitivity(base, sensitivityDb, calibration, ownRefDb)` sets `openDb = base.openDb − sensitivityDb`, clamped to `[floorDb + 6, ownRefDb + 6]`, with `closeDb = openDb − 4`. `ownRefDb = max(calibration.ownDb, applied room-check own)`.
   - The `headset-sensitivity` control carries `levels: Record<participantId, number>`, validated as integers in range (at most 64 entries). Legacy string values map to `lower = −4`, `normal = 0`, `higher = +3`.
   - **Host UI:** one native range input per person, including the host's own headset, labelled "Sensitivity for {name}". "Less" is on the left and "More" on the right, in 1 dB steps; arrow keys work.
     - Visible and `aria-valuetext` text: "Normal", "Less sensitive (−6 dB)" or "More sensitive (+2 dB)".
     - Small text shows "Opens at {openDb} dB" from that phone's presence. When `openDb > ownRefDb − 3` it also shows "Quiet speech may be missed".
   - **Sending:** during a drag, send at most one control every 250 ms, and always send the final value. The host keeps the map in memory and rebroadcasts it as in 008.2.
   - **Phone:** applies a new value immediately and shows "Sensitivity: Less sensitive (−6 dB), set by the host".
2. **Tuning state is visible:**
   - The phone reports `tuned: boolean` in presence: true once a plausible room check has been applied since its last calibration. Recalibrating, reloading or rejoining with a new instance sets it false.
   - The host strip shows "Room check needed" for a ready person with `tuned: false` whenever at least two people are ready.
   - Export `applied` uses the phone-reported `tuned` value, not a host recomputation.
3. **Robust own-level estimator** (calibration voice step and room-check own slot):
   - Speech frames are those `≥ max(floorDb + 6, p95(frames) − 15)`. Own level is their median.
   - The existing minimums stay: 10 frames for calibration, 5 for the room check, and `own − floor ≥ 10` for calibration.
   - **Test vector:** floor −81.5; 30 frames at −55 (room noise) and 30 frames at −27 (speech). The old rule gives a mixed median; the new rule gives −27.
4. **Leading-edge interim throttle:** send the first interim of a stream immediately. Then send at most one per 200 ms, keeping only the latest, and flush it at the end of the window. Finals still flush and replace pending interims. The maximum rate is unchanged (≤ 5/s).

### Part B — duplicate arbitration and latency measurement

5. **Phone level history** (new pure `src/lib/headset/level-history.ts`):
   - `LevelHistory(capacity = 600)` holds 60 s of 100 ms frames, filled with `push(atMs, levelDb, open)` for every captured frame. `open` is the effective gate state, so it is false during calibration and room checks.
   - `stats(fromMs, toMs, ownRefDb) → { relDb: number | null; openRatio: number; frames: number }`:
     - `relDb` is the median of `levelDb − ownRefDb` over open frames in the window, or over all frames in the window if none were open; null if the window has no frames.
     - `openRatio` is the fraction of frames in the window that were open.
6. **Audio timing on captions:**
   - Add optional `audioEndAt` to `CaptionEvent`, set in `normalizeTurn` for interims and finals as `sessionStartedAt + lastWord.end`. Table and Connected ignore it; validators accept it as optional.
   - Export `LOOKAHEAD_MS = 300` from `gated-audio.ts`.
   - A caption's capture window is `[startedAt − LOOKAHEAD_MS, (endedAt ?? audioEndAt ?? now) − LOOKAHEAD_MS]`.
7. **Evidence on the relay:**
   - For every interim and final, the phone computes `evidence = { ...history.stats(window, ownRefDb), startAt, endAt }`, using phone wall-clock capture times.
   - It sends the evidence in `CaptionEnvelope.evidence`.
   - Host validation: finite numbers; `relDb` in [−100, 40] or null; `openRatio` in [0, 1]; `endAt ≥ startAt`; span ≤ 120 s.
   - Gate signals gain `at` (phone `Date.now()`).
   - The host's own headset computes evidence locally.
8. **Clock alignment on the host:**
   - For each participant, keep the minimum of `hostReceivedAt − phoneSentAt` over the last 50 caption envelopes and gate signals (`readyAt` / `at`). This minimum is the clock offset; phone time + offset gives host time.
   - The host's own headset uses offset 0.
   - The error equals the difference between the phones' best-case network delays, typically under 50 ms.
9. **Arbiter** (new pure `src/lib/headset/arbiter.ts`; headset rooms only):
   - **Placement:** sits between the relay and `dispatch` in the controller. It emits `CaptionAction`s and adds a reducer action `REMOVE_TURN { sourceTurnId }`. Reuse `comparisonTokens` and `shortSideCoverage` from `cross-mic-reconciler.ts`.
   - **Turn records:** keep one record per (participant, sourceTurnId) for 15 s, at most 256: host-time span, `relDb`, `openRatio`, latest tokens, final or not, and status (`shown` / `hidden` / `held`).
   - **Overlap:** two spans overlap if they intersect with 300 ms tolerance. A turn's overlap fraction is the overlapping time divided by that turn's own span.
   - **Text duplicate:** both texts have ≥ 2 tokens and `shortSideCoverage ≥ 0.6`, or both are a single identical token.
   - **Winner between two overlapping turns:**
     - the higher `relDb`;
     - if within 1 dB: the higher `openRatio`;
     - if still tied: the earlier start.
     - A turn with null evidence never wins against a turn with evidence, and is never suppressed on level alone.
   - **Interim:** hide it (`CLEAR_INTERIM` for that source, no dispatch) while any overlapping turn from another participant has `relDb` at least **3 dB** higher. Otherwise dispatch it. A newly dominant interim also clears a weaker overlapping *interim*; finals are never cleared this way.
   - **Final:** the decision depends on overlapping turns from other participants.
     - **No overlapping turns:** dispatch immediately. No added latency.
     - **An overlapping turn has no final yet:** hold this final for up to **800 ms**, waiting for that final. At the timeout, compare against that turn's latest interim text.
     - **Text duplicate:** suppress the loser (clear its interim, do not dispatch it). If the loser was already shown as a final, dispatch `REMOVE_TURN` for it and show the winner; count this as `replaced`.
     - **Level-only suppression:** if the texts are not duplicates but the turn's `relDb` is **≥ 4 dB** below the other's and its overlap fraction is ≥ 0.5, suppress it as bleed fragments.
     - **Otherwise both people really spoke:** show both, including a final whose interim had been hidden (count it as `restored`).
   - **Speaker revisions:** pass through for shown turns; drop them for suppressed turns.
   - **Constants:** export all of them in one `ARBITER` object; the export includes them.
   - **Testing aid:** a host-only checkbox "Show hidden duplicates (for testing)", off by default, shows suppressed finals dimmed and in time order, prefixed "Hidden duplicate:". They are held in memory only, at most 200.
10. **Latency measurement only** (no tuning in this slice):
    - **Phone:** for every provider event, `sttMs = receivedAt − audioEndAt`. Keep the last 200 interim samples and the last 200 final samples, and publish `latency: { interimP50, interimP90, finalP50, finalP90, samples }` in presence at most every 10 s.
    - **Host:** per participant, `relayExtraMs = (hostReceivedAt − readyAt) − offset` on caption envelopes; p50 and p90 over the last 200 samples.
    - **On-screen estimate:** "Estimated delay: ~{lookahead + interimP50 + relayExtraP50} ms" per person in the host's Participants panel.
11. **Export version 3** adds:
    - per participant: `sensitivityDb`, `tuned`, `latency` (phone stt plus host relay values) and `captions: { shown, suppressedText, suppressedLevel, replaced, restored }`;
    - per pair: `duplicatesHidden`;
    - constants: `ARBITER`, `lookaheadMs`, `interimThrottleMs`.
    - Still no names, IDs, audio or caption text.

### Non-goals for 008.3

- No latency optimization beyond the leading-edge throttle: no `mode` change, no look-ahead change, no turn-detection parameters (008.4).
- No adaptive thresholds and no automatic sensitivity.
- No audio or transcript storage.
- No schema or policy change.
- No change to Table or Connected behaviour.

### Verification (Builder)

- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`.
- **Unit tests:**
  - **Slider:** maths and clamps; old-string mapping; validation; throttled sending.
  - **Tuning state:** `tuned` lifecycle; "Room check needed"; robust estimator vectors; leading-edge throttle.
  - **`LevelHistory`:** windows, the open-only median and the all-frames fallback.
  - **Evidence:** windows on interims and finals.
  - **Clock offset:** estimation, including a phone clock 2 s fast.
  - **Arbiter scenarios:**
    1. **Bleed duplicate:** same text; `relDb` 0 vs −5. The weaker one is suppressed.
    2. **Garbled bleed:** "should leaf" at −6 vs "we should leave at five" at −0.5, overlapping. Suppressed on level.
    3. **Genuine overlap:** different text at −1 and 0. Both shown.
    4. **Soft interjection:** "yeah" at −3 during a long turn at 0. Shown.
    5. **Hidden interim restored:** the interim is hidden, then the final is not a duplicate and is within 4 dB. Restored.
    6. **Final hold, partner final arrives in time:** the partner's final arrives within 800 ms. No flash of the weaker final.
    7. **Final hold, timeout:** the timeout path compares against the partner's interim.
    8. **Replacement:** `REMOVE_TURN` is dispatched, then the winner is shown.
    9. **Missing evidence:** never suppressed on level.
  - Export version 3.
- **Live provider check (owed from 008.2):** one real AssemblyAI session through the browser path with `HEADSET_ASSEMBLYAI_OPTIONS`, observing Begin, Turn and Termination. Record it in LIVE-STATE.md.
- **Live local end-to-end** (host + two fake-media phones, live Supabase + AssemblyAI):
  - Each phone's WAV is its wearer at normal level plus the other wearer **about 5 dB quieter**, overlapping in time, to match the weak separation in the physical export.
  - Run it once with arbitration and once with a test-only bypass.
  - Report shown, suppressed and duplicate counts, missed lines, and the latency metrics.
  - Synthetic audio proves the pipeline, not real acoustics; say so.
- 390 px and 1280 px render checks; keyboard operation of the sliders and the checkbox.
- Keep sign-ins few, end every test room, and commit no audio or storage states.
- Add the missing "As built (008.2)" summary alongside "As built (008.3)".

### Acceptance criteria (008.3)

1. The host can tune each person continuously from −15 to +6 dB. The phone applies it immediately and the host shows the resulting threshold. Lost room-check tuning is visible as "Room check needed".
2. Own levels are robust to headsets that silence noise digitally.
3. In the synthetic end-to-end run, every duplicated sentence from simulated bleed appears once under the right name, with no real speech hidden. The test-only bypass shows the duplicates the arbiter removed.
4. Interims from a clearly weaker phone are hidden. Finals are held only while another phone has an overlapping open turn, for at most 800 ms.
5. Latency is measured per stage and shown on the host. All gates, the live checks and the docs are done, the work is pushed and the Vercel status is recorded.

### Physical test script (human, after 008.3 deploys)

1. Reload every page. Set up both headsets and run the room check. Confirm no "Room check needed" appears.
2. Sit at your usual distance and talk for 3 minutes. When someone's name shows on another person's words, drag *that* person's slider toward **Less** until it stops. Note the final values.
3. Talk naturally for 5 minutes, including quick back-and-forth, overlap and soft replies. Count duplicates, missed speech and wrong names. Note the host's "Estimated delay" for each person.
4. Optionally turn on "Show hidden duplicates (for testing)" for a minute and check that the hidden lines really were duplicates.
5. Move to about 50 cm apart, retune, and repeat step 3 briefly.
6. **Copy results** and return the export and your notes.

## CAPTION-008.4 outline — latency (evidence-driven)

Uses the 008.3 latency measurements. Candidate levers, each evaluated for both accuracy and latency before adoption:
- `mode=min_latency`;
- a shorter look-ahead (for example 200 ms) now that the gate needs 2 attack frames;
- AssemblyAI turn-detection parameters;
- relay path optimizations.

Adopt a lever only if accuracy is not visibly worse.

## CAPTION-008.5 outline — physical UAT and closure

Absorbs the remaining recovery items: headset fallback to the built-in microphone, phone lock and page refresh. Then a sustained multi-person session measuring duplicates, missed speech, wrong attribution, latency and cost per person-hour, recorded in QUALITY.md, plus human acceptance.
