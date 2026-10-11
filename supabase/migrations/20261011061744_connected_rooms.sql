-- Metadata only. Audio and transcript events never enter application tables.
create schema if not exists caption_private;
revoke all on schema caption_private from public;
grant usage on schema caption_private to authenticated;

create table public.caption_rooms (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  join_token_hash text not null unique check (length(join_token_hash) = 64),
  status text not null default 'open' check (status in ('open','ended')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  ended_at timestamptz
);
create table public.caption_room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.caption_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('host','participant')),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  accent_index integer check (accent_index between 0 and 5),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  removed_at timestamptz,
  unique(room_id,user_id)
);
create index caption_rooms_host_idx on public.caption_rooms(host_user_id);
create index caption_participants_user_idx on public.caption_room_participants(user_id);
alter table public.caption_rooms enable row level security;
alter table public.caption_room_participants enable row level security;
revoke all on public.caption_rooms, public.caption_room_participants from anon, authenticated;
grant select on public.caption_rooms, public.caption_room_participants to authenticated;
grant all on public.caption_rooms, public.caption_room_participants to service_role;

-- Internal membership lookup avoids recursive table policies. No user-editable JWT metadata.
create function caption_private.member(room uuid, host_only boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.caption_room_participants p join public.caption_rooms r on r.id=p.room_id
    where p.room_id=room and p.user_id=auth.uid() and p.removed_at is null
      and r.status='open' and r.expires_at>now() and (not host_only or p.role='host')
  );
$$;
revoke all on function caption_private.member(uuid,boolean) from public;
grant execute on function caption_private.member(uuid,boolean) to authenticated;
create policy caption_rooms_read on public.caption_rooms for select to authenticated
  using (caption_private.member(id));
create policy caption_participants_read on public.caption_room_participants for select to authenticated
  using (user_id=(select auth.uid()) or caption_private.member(room_id,true));

create function caption_private.topic_access(topic text, sending boolean, extension text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare parts text[] := string_to_array(topic, ':'); room uuid; participant uuid;
begin
  if auth.uid() is null or parts[1] <> 'caption-room' or array_length(parts,1) not in (3,4) then return false; end if;
  room := parts[2]::uuid;
  if not caption_private.member(room) then return false; end if;
  if parts[3]='control' and array_length(parts,1)=3 then
    return extension='broadcast' and (not sending or caption_private.member(room,true));
  end if;
  if parts[3]<>'participant' or array_length(parts,1)<>4 then return false; end if;
  participant := parts[4]::uuid;
  return extension in ('broadcast','presence') and exists (
    select 1 from public.caption_room_participants p where p.room_id=room and p.id=participant and p.removed_at is null
      and (p.user_id=auth.uid() or (not sending and caption_private.member(room,true)))
  );
exception when invalid_text_representation then return false;
end;
$$;
revoke all on function caption_private.topic_access(text,boolean,text) from public;
grant execute on function caption_private.topic_access(text,boolean,text) to authenticated;
-- realtime.messages already has RLS; managed schema must not be altered.
create policy caption_realtime_receive on realtime.messages for select to authenticated
  using (caption_private.topic_access((select realtime.topic()),false,extension));
create policy caption_realtime_send on realtime.messages for insert to authenticated
  with check (caption_private.topic_access((select realtime.topic()),true,extension));

-- Server API validates bearer tokens with auth.getUser before invoking this service-only transaction.
create function public.caption_room_action(
  operation text, actor uuid, target_room uuid default null, token_hash text default null,
  participant_name text default null, target_participant uuid default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r public.caption_rooms; p public.caption_room_participants; result jsonb; guest_count integer;
begin
  if actor is null then raise exception 'forbidden'; end if;
  if operation='create' then
    insert into public.caption_rooms(host_user_id,join_token_hash) values(actor,token_hash) returning * into r;
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
    if operation='check' then return jsonb_build_object('status','open'); end if;
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
  return jsonb_build_object('roomId',r.id,'status',case when r.expires_at<=now() then 'ended' else r.status end,'expiresAt',r.expires_at,
    'self',jsonb_build_object('id',p.id,'role',p.role,'displayName',p.display_name,'accentIndex',p.accent_index,'removed',p.removed_at is not null),
    'participants',result);
end;
$$;
revoke all on function public.caption_room_action(text,uuid,uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function public.caption_room_action(text,uuid,uuid,text,text,uuid) to service_role;
