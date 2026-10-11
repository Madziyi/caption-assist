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
