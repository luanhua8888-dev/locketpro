create table if not exists public.admin_login_codes (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '60 seconds'),
  used_at timestamptz,
  constraint admin_login_codes_expiry_limit
    check (expires_at <= created_at + interval '60 seconds')
);

create index if not exists admin_login_codes_lookup_idx
  on public.admin_login_codes (target_user_id, code_hash, expires_at)
  where used_at is null;

create index if not exists admin_login_codes_creator_idx
  on public.admin_login_codes (created_by, created_at desc);

alter table public.admin_login_codes enable row level security;

revoke all on table public.admin_login_codes from anon, authenticated;

create or replace function public.consume_admin_login_code(
  p_username text,
  p_code_hash text
)
returns table(target_user_id uuid, target_email text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code_id uuid;
  v_target_user_id uuid;
  v_target_email text;
begin
  select c.id, c.target_user_id
    into v_code_id, v_target_user_id
  from public.admin_login_codes c
  join public.profiles p on p.id = c.target_user_id
  where lower(p.username) = lower(trim(p_username))
    and c.code_hash = p_code_hash
    and c.used_at is null
    and c.expires_at > now()
  order by c.created_at desc
  limit 1
  for update of c skip locked;

  if v_code_id is null then
    return;
  end if;

  update public.admin_login_codes
  set used_at = now()
  where id = v_code_id;

  select u.email
    into v_target_email
  from auth.users u
  where u.id = v_target_user_id;

  if v_target_email is null then
    return;
  end if;

  return query select v_target_user_id, v_target_email;
end;
$$;

revoke all on function public.consume_admin_login_code(text, text) from public, anon, authenticated;
grant execute on function public.consume_admin_login_code(text, text) to service_role;

