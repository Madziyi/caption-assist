-- Run on a migrated development project. Every synthetic identity/room is rolled back.
begin;
create temp table caption_test_fixture (host uuid, guest uuid, other_guest uuid, outsider uuid, room uuid, headset_room uuid, host_participant uuid, guest_participant uuid);
grant select on caption_test_fixture to authenticated;
do $$
declare h uuid:=gen_random_uuid(); g uuid:=gen_random_uuid(); j uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); r jsonb; p jsonb; p2 jsonb; hr jsonb; rid uuid; hid uuid; pid uuid;
begin
  insert into auth.users(id,is_anonymous) values(h,true),(g,true),(j,true),(o,true),(s,true);
  r:=public.caption_room_action('create',h,null,repeat('a',64)); rid:=(r->>'roomId')::uuid;
  if r->>'mode'<>'connected' then raise exception 'default room mode failed'; end if;
  hr:=public.caption_room_action('create_headset',h,null,repeat('b',64));
  hid:=(hr->>'roomId')::uuid;
  if hr->>'mode'<>'headset' then raise exception 'headset room mode failed'; end if;
  if (public.caption_room_action('check',h,null,repeat('b',64))->>'mode')<>'headset' then raise exception 'headset check mode failed'; end if;
  if (public.caption_room_action('join',g,null,repeat('b',64),'Alex')->>'mode')<>'headset' then raise exception 'headset join mode failed'; end if;
  if (public.caption_room_action('snapshot',h,hid)->>'mode')<>'headset' then raise exception 'headset snapshot mode failed'; end if;
  update public.caption_rooms set created_at=now()+interval '1 second' where id=hid;
  if (public.caption_room_action('restore',h)->>'mode')<>'headset' then raise exception 'headset restore mode failed'; end if;
  delete from public.caption_room_participants where room_id=hid and user_id=g;
  if (public.caption_room_action('create',s,null,repeat('c',64))->>'mode')<>'connected' then raise exception 'second owner connected mode failed'; end if;
  if (public.caption_room_action('check',h,null,repeat('a',64))->>'mode')<>'connected' then raise exception 'existing room mode changed'; end if;
  if r->'self'->>'displayName'<>'You' or r->'self'->>'role'<>'host' then raise exception 'host identity failed'; end if;
  p:=public.caption_room_action('join',g,null,repeat('a',64),'Alex'); pid:=(p->'self'->>'id')::uuid;
  p2:=public.caption_room_action('join',g,null,repeat('a',64),'Changed');
  if p->'self'<>p2->'self' then raise exception 'rejoin identity changed'; end if;
  p2:=public.caption_room_action('join',j,null,repeat('a',64),'Alex');
  if p->'self'->>'id'=p2->'self'->>'id' then raise exception 'duplicate names merged'; end if;
  if (p->'self'->>'accentIndex')::int not between 0 and 5 then raise exception 'guest palette failed'; end if;
  perform set_config('request.jwt.claim.sub',g::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',g,'role','authenticated')::text,true);
  if not caption_private.topic_access('caption-room:'||rid||':participant:'||pid,true,'broadcast') then raise exception 'own publication denied'; end if;
  if caption_private.topic_access('caption-room:'||rid||':participant:'||(p2->'self'->>'id'),true,'broadcast') then raise exception 'guest impersonation allowed'; end if;
  if caption_private.topic_access('caption-room:'||rid||':control',true,'broadcast') then raise exception 'guest control allowed'; end if;
  if not caption_private.topic_access('caption-room:'||rid||':control',false,'broadcast') then raise exception 'guest control reception denied'; end if;
  if not caption_private.topic_access('caption-room:'||rid||':presence',true,'presence') then raise exception 'member presence denied'; end if;
  if caption_private.topic_access('caption-room:'||rid||':presence',true,'broadcast') then raise exception 'shared presence permitted captions'; end if;
  if caption_private.topic_access('caption-room:'||gen_random_uuid()||':control',false,'broadcast') then raise exception 'unrelated room allowed'; end if;
  if caption_private.topic_access('caption-room:invalid:control',false,'broadcast') then raise exception 'invalid topic allowed'; end if;
  begin perform public.caption_room_action('remove',g,rid,null,null,pid); raise exception 'guest removal allowed'; exception when others then if sqlerrm <> 'forbidden' then raise; end if; end;
  begin perform public.caption_room_action('end',g,rid); raise exception 'guest end allowed'; exception when others then if sqlerrm <> 'forbidden' then raise; end if; end;
  p:=public.caption_room_action('rename',g,rid,null,'家人');
  if p->'self'->>'displayName'<>'家人' then raise exception 'rename failed'; end if;
  insert into caption_test_fixture values(h,g,j,o,rid,hid,(r->'self'->>'id')::uuid,pid);
end;
$$;
-- Actual application table RLS, rather than only the helper function.
set local role authenticated;
do $$
declare f caption_test_fixture;
begin
  select * into f from caption_test_fixture;
  if (select count(*) from public.caption_rooms)<>1 then raise exception 'guest room read failed'; end if;
  if (select count(*) from public.caption_room_participants)<>1 then raise exception 'guest enumerated other memberships'; end if;
  if has_function_privilege(current_user,'public.caption_room_action(text,uuid,uuid,text,text,uuid)','EXECUTE') then raise exception 'guest privileged RPC allowed'; end if;
  perform set_config('request.jwt.claim.sub',f.outsider::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.outsider,'role','authenticated')::text,true);
  if (select count(*) from public.caption_rooms)<>0 or (select count(*) from public.caption_room_participants)<>0 then raise exception 'outsider enumerated room'; end if;
end;
$$;
reset role;
do $$
declare f caption_test_fixture;
begin
  select * into f from caption_test_fixture;
  perform set_config('request.jwt.claim.sub',f.host::text,true);
  if not caption_private.topic_access('caption-room:'||f.room||':control',true,'broadcast') then raise exception 'host control denied'; end if;
  if not caption_private.topic_access('caption-room:'||f.room||':participant:'||f.guest_participant,false,'broadcast') then raise exception 'host caption reception denied'; end if;
  if caption_private.topic_access('caption-room:'||f.room||':participant:'||f.guest_participant,true,'broadcast') then raise exception 'host impersonation allowed'; end if;
  perform public.caption_room_action('remove',f.host,f.room,null,null,f.guest_participant);
  perform set_config('request.jwt.claim.sub',f.guest::text,true);
  if caption_private.topic_access('caption-room:'||f.room||':participant:'||f.guest_participant,true,'broadcast') then raise exception 'removed sender authorized'; end if;
  begin perform public.caption_room_action('join',f.guest,null,repeat('a',64),'Alex'); raise exception 'removed membership rejoined'; exception when others then if sqlerrm <> 'removed' then raise; end if; end;
  perform public.caption_room_action('end',f.host,f.room);
  begin perform public.caption_room_action('join',f.outsider,null,repeat('a',64),'Alex'); raise exception 'ended invitation allowed'; exception when others then if sqlerrm <> 'ended' then raise; end if; end;
  update public.caption_rooms set status='open', expires_at=now()-interval '1 second' where id=f.room;
  begin perform public.caption_room_action('join',f.outsider,null,repeat('a',64),'Alex'); raise exception 'expired invitation allowed'; exception when others then if sqlerrm <> 'ended' then raise; end if; end;
end;
$$;
select 'PASS: identity, reuse, duplicate names, rename, expiry, removal, end, modes, table RLS, topic authorization, service-only RPC' as result;
rollback;
