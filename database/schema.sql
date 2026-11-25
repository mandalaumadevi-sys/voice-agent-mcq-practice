-- Escape Rooms — progress tracking for Supabase
-- Run this whole file once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Then add your dashboard login (see the last section).
--
-- Students never touch the tables directly. The game calls four functions with the public anon key:
--   check_student  → before playing: attempts used / left, best run
--   start_run      → when they enter the room: uses one attempt (max 10 per room, set in room_settings)
--   log_answer     → every answer they give
--   update_run     → every opened lock + a heartbeat every 20 s (for "playing now")
--   finish_run     → when they escape
-- Only signed-in dashboard admins can read the data.


-- ---------------------------------------------------------------- tables
create table if not exists public.students (
  user_id    text primary key,
  roll_no    text not null,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_settings (
  room         text primary key,
  title        text,
  max_attempts int  not null default 10 check (max_attempts > 0)
);

create table if not exists public.runs (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references public.students(user_id) on delete cascade,
  room          text not null,
  attempt_no    int  not null,
  status        text not null default 'playing' check (status in ('playing', 'escaped')),
  score         int  not null default 0,          -- questions right on the first try
  total         int  not null default 0,          -- questions in the room
  locks_opened  int  not null default 0,
  locks_total   int  not null default 0,
  current_lock  text,
  elapsed_sec   int  not null default 0,
  started_at    timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  finished_at   timestamptz,
  unique (user_id, room, attempt_no)
);
create index if not exists runs_room_user on public.runs (room, user_id);
create index if not exists runs_room_seen on public.runs (room, last_seen desc);

create table if not exists public.answers (
  id           bigint generated always as identity primary key,
  run_id       uuid not null references public.runs(id) on delete cascade,
  user_id      text not null,
  room         text not null,
  object_id    text not null,
  question_idx int  not null,
  question     text,
  correct      boolean not null,
  first_try    boolean not null,
  try_no       int not null,
  created_at   timestamptz not null default now()
);
create index if not exists answers_room_q on public.answers (room, object_id, question_idx);
create index if not exists answers_run on public.answers (run_id);
create index if not exists answers_room_time on public.answers (room, created_at desc);

-- test accounts: no attempt limit, left out of the dashboard numbers
create table if not exists public.test_accounts (
  user_id    text primary key,
  note       text,
  created_at timestamptz not null default now()
);

-- dashboard logins allowed to read the data
create table if not exists public.dashboard_admins (
  email text primary key
);

insert into public.room_settings (room, title, max_attempts)
values ('voice-agent', 'The Recording Studio · Building a Voice Agent', 10),
       ('coding-agent-cli', 'Lost in Orbit · Building Coding Agent Part 3', 10)
on conflict (room) do nothing;

-- ---------------------------------------------------------------- game functions (called with the anon key)
create or replace function public.max_attempts_for(p_room text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select max_attempts from room_settings where room = p_room), 10)
$$;

create or replace function public.is_test_account(p_user_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from test_accounts where user_id = p_user_id)
$$;

-- test accounts can play without limit
create or replace function public.attempts_limit(p_user_id text, p_room text) returns int
language sql stable security definer set search_path = public as $$
  select case when is_test_account(p_user_id) then 100000 else max_attempts_for(p_room) end
$$;

create or replace function public.best_of(p_user_id text, p_room text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'best_score', (select max(score) from runs where user_id = p_user_id and room = p_room and status = 'escaped'),
    'best_time',  (select min(elapsed_sec) from runs where user_id = p_user_id and room = p_room and status = 'escaped'),
    'escapes',    (select count(*) from runs where user_id = p_user_id and room = p_room and status = 'escaped')
  )
$$;

-- a student's own attempts (shown to them in the game: score, time, escaped or left early)
create or replace function public.runs_of(p_user_id text, p_room text) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object(
           'attempt_no', attempt_no, 'status', status, 'score', score, 'total', total,
           'locks_opened', locks_opened, 'locks_total', locks_total, 'elapsed_sec', elapsed_sec, 'started_at', started_at)
         order by attempt_no), '[]'::json)
  from runs where user_id = p_user_id and room = p_room
$$;

create or replace function public.check_student(p_user_id text, p_roll_no text, p_name text, p_room text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user text := nullif(trim(p_user_id), '');
  v_roll text := nullif(trim(p_roll_no), '');
  v_name text := nullif(trim(p_name), '');
  v_used int; v_max int; v_known students;
begin
  if v_user is null or v_roll is null or v_name is null then
    raise exception 'User ID, roll number and name are all required';
  end if;
  select * into v_known from students where user_id = v_user;
  if found and lower(v_known.roll_no) <> lower(v_roll) then
    raise exception 'This User ID is registered with a different roll number';
  end if;
  insert into students (user_id, roll_no, name) values (v_user, v_roll, v_name)
  on conflict (user_id) do update set name = excluded.name, updated_at = now();
  select count(*) into v_used from runs where user_id = v_user and room = p_room;
  v_max := attempts_limit(v_user, p_room);
  return json_build_object('attempts_used', v_used, 'max_attempts', v_max, 'attempts_left', greatest(v_max - v_used, 0),
                           'is_test', is_test_account(v_user), 'runs', runs_of(v_user, p_room))
         ::jsonb || best_of(v_user, p_room)::jsonb;
end $$;

create or replace function public.start_run(p_user_id text, p_room text, p_total int, p_locks_total int)
returns json language plpgsql security definer set search_path = public as $$
declare v_used int; v_max int; v_id uuid;
begin
  if not exists (select 1 from students where user_id = p_user_id) then
    raise exception 'Unknown student';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_user_id || '|' || p_room));   -- two tabs can't both take the last attempt
  select count(*) into v_used from runs where user_id = p_user_id and room = p_room;
  v_max := attempts_limit(p_user_id, p_room);
  if v_used >= v_max then
    return json_build_object('blocked', true, 'attempts_used', v_used, 'max_attempts', v_max);
  end if;
  insert into runs (user_id, room, attempt_no, total, locks_total)
  values (p_user_id, p_room, v_used + 1, greatest(p_total, 0), greatest(p_locks_total, 0))
  returning id into v_id;
  return json_build_object('run_id', v_id, 'attempt_no', v_used + 1, 'max_attempts', v_max, 'attempts_left', v_max - v_used - 1);
end $$;

create or replace function public.log_answer(p_run_id uuid, p_object_id text, p_question_idx int, p_question text,
                                             p_correct boolean, p_first_try boolean, p_try_no int)
returns void language plpgsql security definer set search_path = public as $$
declare r runs;
begin
  select * into r from runs where id = p_run_id;
  if not found or r.status <> 'playing' then return; end if;
  insert into answers (run_id, user_id, room, object_id, question_idx, question, correct, first_try, try_no)
  values (p_run_id, r.user_id, r.room, p_object_id, p_question_idx, left(p_question, 500), p_correct, p_first_try, p_try_no);
  update runs set
    score = (select count(*) from answers where run_id = p_run_id and first_try and correct),
    current_lock = p_object_id,
    last_seen = now()
  where id = p_run_id;
end $$;

create or replace function public.update_run(p_run_id uuid, p_locks_opened int, p_current_lock text, p_elapsed_sec int)
returns void language sql security definer set search_path = public as $$
  update runs set
    locks_opened = greatest(locks_opened, least(p_locks_opened, locks_total)),
    current_lock = coalesce(p_current_lock, current_lock),
    elapsed_sec  = greatest(elapsed_sec, p_elapsed_sec),
    last_seen    = now()
  where id = p_run_id and status = 'playing'
$$;

create or replace function public.finish_run(p_run_id uuid, p_elapsed_sec int)
returns json language plpgsql security definer set search_path = public as $$
declare r runs;
begin
  update runs set
    status = 'escaped',
    locks_opened = locks_total,
    current_lock = null,
    elapsed_sec = greatest(elapsed_sec, p_elapsed_sec),
    score = (select count(*) from answers where run_id = p_run_id and first_try and correct),
    finished_at = now(), last_seen = now()
  where id = p_run_id and status = 'playing'
  returning * into r;
  if not found then return null; end if;
  return json_build_object('score', r.score, 'attempt_no', r.attempt_no, 'attempts_left',
                           attempts_limit(r.user_id, r.room) - (select count(*) from runs where user_id = r.user_id and room = r.room)::int,
                           'runs', runs_of(r.user_id, r.room))
         ::jsonb || best_of(r.user_id, r.room)::jsonb;
end $$;

-- ---------------------------------------------------------------- access rules
alter table public.students         enable row level security;
alter table public.runs             enable row level security;
alter table public.answers          enable row level security;
alter table public.room_settings    enable row level security;
alter table public.dashboard_admins enable row level security;
alter table public.test_accounts    enable row level security;

create or replace function public.is_dashboard_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from dashboard_admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;

drop policy if exists admin_read on public.students;
drop policy if exists admin_read on public.runs;
drop policy if exists admin_read on public.answers;
drop policy if exists admin_read on public.room_settings;
drop policy if exists admin_write on public.room_settings;
drop policy if exists admin_read on public.test_accounts;
create policy admin_read  on public.students      for select to authenticated using (public.is_dashboard_admin());
create policy admin_read  on public.runs          for select to authenticated using (public.is_dashboard_admin());
create policy admin_read  on public.answers       for select to authenticated using (public.is_dashboard_admin());
create policy admin_read  on public.room_settings for select to authenticated using (public.is_dashboard_admin());
create policy admin_read  on public.test_accounts for select to authenticated using (public.is_dashboard_admin());
create policy admin_write on public.room_settings for update to authenticated using (public.is_dashboard_admin()) with check (public.is_dashboard_admin());

revoke all on public.students, public.runs, public.answers, public.room_settings, public.dashboard_admins, public.test_accounts from anon;
grant select on public.students, public.runs, public.answers, public.room_settings, public.test_accounts to authenticated;
grant update (max_attempts) on public.room_settings to authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;   -- Supabase grants new functions to anon directly
grant execute on function public.check_student(text, text, text, text) to anon, authenticated;
grant execute on function public.start_run(text, text, int, int)        to anon, authenticated;
grant execute on function public.log_answer(uuid, text, int, text, boolean, boolean, int) to anon, authenticated;
grant execute on function public.update_run(uuid, int, text, int)       to anon, authenticated;
grant execute on function public.finish_run(uuid, int)                  to anon, authenticated;
grant execute on function public.is_dashboard_admin()                   to authenticated;

-- dashboard buttons: mark / unmark a test account, and wipe a test account's runs
create or replace function public.set_test_account(p_user_id text, p_is_test boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_dashboard_admin() then raise exception 'Only dashboard admins can do this'; end if;
  if p_is_test then insert into test_accounts (user_id) values (p_user_id) on conflict do nothing;
  else delete from test_accounts where user_id = p_user_id; end if;
end $$;

create or replace function public.reset_test_account(p_user_id text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_dashboard_admin() then raise exception 'Only dashboard admins can do this'; end if;
  if not is_test_account(p_user_id) then raise exception 'Only test accounts can be reset'; end if;
  delete from runs where user_id = p_user_id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.set_test_account(text, boolean) from public, anon;
revoke execute on function public.reset_test_account(text) from public, anon;
grant execute on function public.set_test_account(text, boolean) to authenticated;
grant execute on function public.reset_test_account(text)        to authenticated;

-- ---------------------------------------------------------------- dashboard views (read through the admin rules above)
create or replace view public.student_summary with (security_invoker = true) as
select s.user_id, s.roll_no, s.name, r.room,
       count(r.id)                                           as attempts_used,
       count(r.id) filter (where r.status = 'escaped')        as escapes,
       max(r.score) filter (where r.status = 'escaped')       as best_score,
       min(r.elapsed_sec) filter (where r.status = 'escaped') as best_time,
       max(r.total)                                          as total,
       max(r.last_seen)                                      as last_seen,
       bool_or(r.status = 'playing' and r.last_seen > now() - interval '60 seconds') as playing_now,
       exists (select 1 from public.test_accounts t where t.user_id = s.user_id) as is_test
from public.students s
join public.runs r on r.user_id = s.user_id
group by s.user_id, s.roll_no, s.name, r.room;

create or replace view public.question_stats with (security_invoker = true) as
select room, object_id, question_idx, max(question) as question,
       count(*) filter (where first_try)                as first_tries,
       count(*) filter (where first_try and correct)    as first_try_correct,
       round(100.0 * count(*) filter (where first_try and correct) / nullif(count(*) filter (where first_try), 0)) as first_try_pct,
       round(avg(try_no) filter (where correct), 1)     as avg_tries_to_solve
from public.answers a
where not exists (select 1 from public.test_accounts t where t.user_id = a.user_id)   -- test runs never skew the numbers
group by room, object_id, question_idx;

grant select on public.student_summary, public.question_stats to authenticated;

-- ---------------------------------------------------------------- live updates for the dashboard
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.runs;    exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.answers; exception when duplicate_object then null; end;
  end if;
end $$;

-- ---------------------------------------------------------------- built-in test account
-- Play as it with: rooms/voice-agent/index.html?user_id=TEST-01&roll_no=TEST&name=Test%20Account
insert into public.students (user_id, roll_no, name) values ('TEST-01', 'TEST', 'Test Account') on conflict do nothing;
insert into public.test_accounts (user_id, note) values ('TEST-01', 'built-in test account') on conflict do nothing;

-- ---------------------------------------------------------------- YOUR DASHBOARD LOGIN
-- 1. Supabase → Authentication → Users → Add user → Create new user (your email + a password, tick "Auto Confirm").
-- 2. Put the same email below and run just this line:
-- insert into public.dashboard_admins (email) values ('you@example.com') on conflict do nothing;
-- 3. Recommended: Authentication → Sign In / Providers → turn OFF "Allow new users to sign up".
