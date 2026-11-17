
-- ============================================================
-- PIPFOLIO SUPABASE DATABASE SETUP
-- Journals + User Profiles + Flexible Usernames
--
-- Supports:
-- - Usernames with emojis, spaces and special characters
-- - Unique usernames
-- - Username changes
-- - Automatic profile creation
-- - Existing user accounts
-- - Secure journal storage
-- - Row Level Security (RLS)
--
-- Existing journal data is preserved.
-- ============================================================

begin;


-- ============================================================
-- 1. JOURNALS
-- ============================================================

create table if not exists public.journals (
    user_id uuid primary key
        references auth.users(id) on delete cascade,

    payload jsonb not null,

    revision bigint not null default 0
        check (revision >= 0),

    updated_at timestamptz not null default now(),

    constraint journal_payload_object check (
        jsonb_typeof(payload) = 'object'
        and jsonb_typeof(payload -> 'trades') = 'array'
        and jsonb_typeof(payload -> 'settings') = 'object'
    )
);

alter table public.journals
enable row level security;

revoke all on table public.journals
from anon, authenticated;

grant select, insert, update
on table public.journals
to authenticated;


-- Journal security policies

drop policy if exists "Read own journal"
on public.journals;

create policy "Read own journal"
on public.journals
for select
to authenticated
using (
    (select auth.uid()) = user_id
);


drop policy if exists "Create own journal"
on public.journals;

create policy "Create own journal"
on public.journals
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
);


drop policy if exists "Update own journal"
on public.journals;

create policy "Update own journal"
on public.journals
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);


-- ============================================================
-- 2. SAVE JOURNAL FUNCTION
-- ============================================================

create or replace function public.save_journal(
    p_payload jsonb,
    p_expected_revision bigint
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_user uuid := auth.uid();
    v_revision bigint;
begin

    if v_user is null then
        raise exception 'Sign in first'
            using errcode = '42501';
    end if;

    if p_expected_revision is null
        or p_expected_revision < 0 then
        raise exception 'Invalid journal revision'
            using errcode = '22023';
    end if;

    if p_payload is null
        or jsonb_typeof(p_payload)
            is distinct from 'object'
        or jsonb_typeof(p_payload -> 'trades')
            is distinct from 'array'
        or jsonb_typeof(p_payload -> 'settings')
            is distinct from 'object'
        or jsonb_typeof(p_payload -> 'preferences')
            is distinct from 'object'
        or octet_length(p_payload::text)
            > 25 * 1024 * 1024 then

        raise exception
            'Invalid or oversized journal payload'
            using errcode = '22023';

    end if;

    insert into public.journals (
        user_id,
        payload,
        revision
    )
    values (
        v_user,
        p_payload,
        0
    )
    on conflict (user_id) do nothing;

    select j.revision
    into v_revision
    from public.journals as j
    where j.user_id = v_user
    for update;

    if v_revision is null
        or v_revision <> p_expected_revision then

        raise exception
            'Journal changed on another tab or device. Reload before saving.'
            using errcode = '40001';

    end if;

    update public.journals
    set
        payload = p_payload,
        revision = v_revision + 1,
        updated_at = now()
    where user_id = v_user;

    return v_revision + 1;

end;
$$;

revoke all on function
public.save_journal(jsonb, bigint)
from public, anon;

grant execute on function
public.save_journal(jsonb, bigint)
to authenticated;


-- ============================================================
-- 3. USER PROFILES
-- ============================================================

create table if not exists public.profiles (
    id uuid primary key
        references auth.users(id) on delete cascade,

    username text unique,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now()
);


-- Remove the previous restrictive username rule.

alter table public.profiles
drop constraint if exists username_format;


-- Replace the flexible username length constraint safely.

alter table public.profiles
drop constraint if exists username_length;


-- Allow emojis, spaces, special characters,
-- uppercase letters and Unicode.
--
-- Maximum: 100 PostgreSQL characters.
-- Empty or whitespace-only usernames are rejected.
-- NULL remains allowed for existing users.

alter table public.profiles
add constraint username_length
check (
    username is null
    or (
        char_length(username) between 1 and 100
        and length(btrim(username)) > 0
    )
);


-- ============================================================
-- 4. PROFILE SECURITY
-- ============================================================

alter table public.profiles
enable row level security;

revoke all on table public.profiles
from anon, authenticated;

grant select, insert, update
on table public.profiles
to authenticated;


drop policy if exists "Read own profile"
on public.profiles;

create policy "Read own profile"
on public.profiles
for select
to authenticated
using (
    (select auth.uid()) = id
);


drop policy if exists "Create own profile"
on public.profiles;

create policy "Create own profile"
on public.profiles
for insert
to authenticated
with check (
    (select auth.uid()) = id
);


drop policy if exists "Update own profile"
on public.profiles;

create policy "Update own profile"
on public.profiles
for update
to authenticated
using (
    (select auth.uid()) = id
)
with check (
    (select auth.uid()) = id
);


-- ============================================================
-- 5. AUTOMATIC PROFILE CREATION
-- ============================================================

create or replace function
public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_username text;
begin

    -- Preserve uppercase letters, emojis and symbols.
    -- Remove only leading/trailing ordinary spaces.

    v_username := btrim(
        new.raw_user_meta_data ->> 'username'
    );

    -- Reject invalid usernames when provided.

    if v_username is not null then

        if char_length(v_username) < 1
            or char_length(v_username) > 100 then

            raise exception
                'Username must contain 1 to 100 characters';

        end if;

    end if;

    insert into public.profiles (
        id,
        username
    )
    values (
        new.id,
        v_username
    )
    on conflict (id) do nothing;

    return new;

end;
$$;


-- Recreate automatic profile trigger.

drop trigger if exists
on_auth_user_created
on auth.users;

create trigger on_auth_user_created
after insert
on auth.users
for each row
execute function public.handle_new_user();


-- ============================================================
-- 6. EXISTING USERS
-- ============================================================

-- Create missing profiles for previously
-- registered accounts.
--
-- Existing usernames and journal data are preserved.

insert into public.profiles (
    id,
    username
)
select
    u.id,
    null
from auth.users as u
on conflict (id) do nothing;


-- ============================================================
-- 7. AUTOMATIC UPDATED TIMESTAMP
-- ============================================================

create or replace function
public.update_profile_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

    new.updated_at := now();

    return new;

end;
$$;


drop trigger if exists
on_profile_updated
on public.profiles;

create trigger on_profile_updated
before update
on public.profiles
for each row
execute function
public.update_profile_timestamp();


commit;
