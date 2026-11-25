-- Adds the "Lost in Orbit" room (Building Coding Agent Part 3) to a database that already runs schema.sql.
-- Supabase → SQL Editor → New query → paste → Run. Safe to run more than once.
insert into public.room_settings (room, title, max_attempts)
values ('coding-agent-cli', 'Lost in Orbit · Building Coding Agent Part 3', 10)
on conflict (room) do update set title = excluded.title;

select room, title, max_attempts from public.room_settings order by room;
