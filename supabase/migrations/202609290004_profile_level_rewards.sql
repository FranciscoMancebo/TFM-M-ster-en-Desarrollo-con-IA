alter table public.profiles
  add column show_media boolean not null default true,
  add column show_social_links boolean not null default true;

create table public.profile_media_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  media_type text not null check (media_type in ('image', 'youtube')),
  url text not null check (char_length(url) between 12 and 500),
  title text not null check (char_length(title) between 2 and 80),
  description text check (char_length(description) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slot)
);

create table public.profile_social_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 4),
  network text not null check (network in ('instagram', 'youtube', 'tiktok', 'x', 'website')),
  url text not null check (char_length(url) between 12 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slot),
  unique (user_id, network)
);

comment on table public.profile_media_items is
  'Up to three public showcase items unlocked at account levels 3, 6 and 9.';
comment on table public.profile_social_links is
  'Up to four social links unlocked at account levels 2, 4, 6 and 8.';

alter table public.profile_media_items enable row level security;
alter table public.profile_social_links enable row level security;

create policy profile_media_owner_read on public.profile_media_items
for select using (user_id = auth.uid());
create policy profile_social_owner_read on public.profile_social_links
for select using (user_id = auth.uid());

grant select on public.profile_media_items, public.profile_social_links to authenticated;

create or replace function private.profile_account_level(target_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select account_level from public.athlete_progress where user_id = target_user_id), 1);
$$;

create or replace function private.valid_profile_media_url(target_type text, target_url text)
returns boolean
language sql
immutable
as $$
  select case target_type
    when 'image' then lower(trim(target_url)) ~ '^https://[^[:space:]]+\.(jpg|jpeg|png|webp)(\?[^[:space:]]*)?$'
    when 'youtube' then lower(trim(target_url)) ~ '^https://(www\.)?(youtube\.com/(watch\?v=|shorts/)|youtu\.be/)[^[:space:]]+$'
    else false
  end;
$$;

create or replace function private.valid_profile_social_url(target_network text, target_url text)
returns boolean
language sql
immutable
as $$
  select case target_network
    when 'instagram' then lower(trim(target_url)) ~ '^https://(www\.)?instagram\.com/[^[:space:]]+$'
    when 'youtube' then lower(trim(target_url)) ~ '^https://(www\.)?(youtube\.com/|youtu\.be/)[^[:space:]]+$'
    when 'tiktok' then lower(trim(target_url)) ~ '^https://(www\.)?tiktok\.com/[^[:space:]]+$'
    when 'x' then lower(trim(target_url)) ~ '^https://(www\.)?(x\.com|twitter\.com)/[^[:space:]]+$'
    when 'website' then lower(trim(target_url)) ~ '^https://[^[:space:]]+$'
    else false
  end;
$$;

create or replace function public.save_profile_media_item(
  target_slot integer,
  target_media_type text,
  target_url text,
  target_title text,
  target_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  required_level integer;
  saved_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if target_slot not between 1 and 3 then raise exception 'Invalid media slot'; end if;
  required_level := target_slot * 3;
  if private.profile_account_level(current_user_id) < required_level then
    raise exception 'Media slot requires account level %', required_level;
  end if;
  if not private.valid_profile_media_url(target_media_type, target_url) then
    raise exception 'Unsupported media URL';
  end if;
  if char_length(trim(coalesce(target_title, ''))) not between 2 and 80 then
    raise exception 'Media title must contain between 2 and 80 characters';
  end if;
  if char_length(trim(coalesce(target_description, ''))) > 240 then
    raise exception 'Media description cannot exceed 240 characters';
  end if;

  insert into public.profile_media_items (user_id, slot, media_type, url, title, description)
  values (current_user_id, target_slot, target_media_type, trim(target_url), trim(target_title), nullif(trim(coalesce(target_description, '')), ''))
  on conflict (user_id, slot) do update
  set media_type = excluded.media_type,
      url = excluded.url,
      title = excluded.title,
      description = excluded.description,
      updated_at = now()
  returning id into saved_id;
  return saved_id;
end;
$$;

create or replace function public.delete_profile_media_item(target_slot integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.profile_media_items where user_id = auth.uid() and slot = target_slot;
end;
$$;

create or replace function public.save_profile_social_link(
  target_slot integer,
  target_network text,
  target_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  required_level integer;
  saved_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if target_slot not between 1 and 4 then raise exception 'Invalid social slot'; end if;
  required_level := target_slot * 2;
  if private.profile_account_level(current_user_id) < required_level then
    raise exception 'Social slot requires account level %', required_level;
  end if;
  if not private.valid_profile_social_url(target_network, target_url) then
    raise exception 'Unsupported social URL';
  end if;

  insert into public.profile_social_links (user_id, slot, network, url)
  values (current_user_id, target_slot, target_network, trim(target_url))
  on conflict (user_id, slot) do update
  set network = excluded.network,
      url = excluded.url,
      updated_at = now()
  returning id into saved_id;
  return saved_id;
exception
  when unique_violation then raise exception 'That social network is already present in the profile';
end;
$$;

create or replace function public.delete_profile_social_link(target_slot integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.profile_social_links where user_id = auth.uid() and slot = target_slot;
end;
$$;

revoke all on function private.profile_account_level(uuid) from public, anon, authenticated;
revoke all on function private.valid_profile_media_url(text,text) from public, anon, authenticated;
revoke all on function private.valid_profile_social_url(text,text) from public, anon, authenticated;
revoke all on function public.save_profile_media_item(integer,text,text,text,text) from public, anon;
revoke all on function public.delete_profile_media_item(integer) from public, anon;
revoke all on function public.save_profile_social_link(integer,text,text) from public, anon;
revoke all on function public.delete_profile_social_link(integer) from public, anon;
grant execute on function public.save_profile_media_item(integer,text,text,text,text) to authenticated;
grant execute on function public.delete_profile_media_item(integer) to authenticated;
grant execute on function public.save_profile_social_link(integer,text,text) to authenticated;
grant execute on function public.delete_profile_social_link(integer) to authenticated;

alter function public.public_athlete_profile(uuid) rename to public_athlete_profile_without_showcase;
revoke all on function public.public_athlete_profile_without_showcase(uuid) from public, anon, authenticated;

create or replace function public.public_athlete_profile(target_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  athlete public.profiles%rowtype;
  base_profile jsonb;
  may_see_media boolean;
  may_see_social boolean;
begin
  if viewer_id is null then raise exception 'Authentication required'; end if;
  base_profile := public.public_athlete_profile_without_showcase(target_user_id);
  select * into athlete from public.profiles where user_id = target_user_id;
  may_see_media := viewer_id = target_user_id or athlete.show_media;
  may_see_social := viewer_id = target_user_id or athlete.show_social_links;

  return base_profile || jsonb_build_object(
    'mediaVisible', may_see_media,
    'mediaItems', case when may_see_media then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id,
        'slot', item.slot,
        'mediaType', item.media_type,
        'url', item.url,
        'title', item.title,
        'description', coalesce(item.description, '')
      ) order by item.slot)
      from public.profile_media_items item
      where item.user_id = target_user_id
        and private.profile_account_level(target_user_id) >= item.slot * 3
    ), '[]'::jsonb) else '[]'::jsonb end,
    'socialLinksVisible', may_see_social,
    'socialLinks', case when may_see_social then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', link.id,
        'slot', link.slot,
        'network', link.network,
        'url', link.url
      ) order by link.slot)
      from public.profile_social_links link
      where link.user_id = target_user_id
        and private.profile_account_level(target_user_id) >= link.slot * 2
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

revoke all on function public.public_athlete_profile(uuid) from public, anon;
grant execute on function public.public_athlete_profile(uuid) to authenticated;

alter function public.export_my_data() rename to export_my_data_without_showcase;
revoke all on function public.export_my_data_without_showcase() from public, anon, authenticated;

create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  return public.export_my_data_without_showcase() || jsonb_build_object(
    'profileMedia', coalesce((select jsonb_agg(to_jsonb(item) order by item.slot) from public.profile_media_items item where item.user_id = current_user_id), '[]'::jsonb),
    'socialLinks', coalesce((select jsonb_agg(to_jsonb(link) order by link.slot) from public.profile_social_links link where link.user_id = current_user_id), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
