-- A membership-scoped shared Presence topic is only a discovery hint.
-- Identity and mic state still come from authoritative metadata and each private participant topic.
create or replace function caption_private.topic_access(topic text, sending boolean, extension text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare parts text[] := string_to_array(topic, ':'); room uuid; participant uuid;
begin
  if auth.uid() is null or parts[1] <> 'caption-room' or array_length(parts,1) not in (3,4) then return false; end if;
  room := parts[2]::uuid;
  if not caption_private.member(room) then return false; end if;
  if parts[3]='presence' and array_length(parts,1)=3 then return extension='presence'; end if;
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
