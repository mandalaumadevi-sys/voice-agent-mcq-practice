# Escape Rooms — database + live dashboard setup

Everything runs on one free Supabase project. Do these steps once (about 10 minutes).

## 1. Create the database
1. Go to https://supabase.com → New project (any name, e.g. `escape-rooms`). Keep the database password safe.
2. Open **SQL Editor → New query**, paste all of `database/schema.sql`, press **Run**.
   It is safe to run again after an update.

## 2. Connect the game and the dashboard
1. Supabase → **Project Settings → API** (Data API).
2. Copy the **Project URL** and the **anon public** key into `shared/config.js`:
   ```js
   window.ESCAPE_DB = window.ESCAPE_DB || {
     url: 'https://abcd1234.supabase.co',
     anonKey: 'eyJhbGciOi...'
   };
   ```
   The anon key is meant to be public. Students can only call the five game functions; they cannot read or change any table.
   Never put the `service_role` key here.

## 3. Your dashboard login
1. Supabase → **Authentication → Users → Add user → Create new user**: your email + a password, tick **Auto Confirm**.
2. SQL Editor, run (with your email):
   ```sql
   insert into public.dashboard_admins (email) values ('you@example.com') on conflict do nothing;
   ```
3. Recommended: **Authentication → Sign In / Providers** → turn off **Allow new users to sign up**.
4. Open `dashboard/index.html` and sign in. Add more instructors the same way.

## How students play
- Open `rooms/voice-agent/index.html`. First visit: User ID, roll number, name. The same device remembers them next time ("Not you? Switch" changes student).
- From the portal, link with the student in the URL and the sign-in is skipped:
  `rooms/voice-agent/index.html?user_id=NW-1042&roll_no=22B81A0342&name=Asha%20Rao`
- 10 attempts per room (change it on the dashboard). An attempt counts when they press **Enter the room**; closing the tab mid-game still uses that attempt.
- Every answer, opened lock, a heartbeat every 20 s, and the escape are saved. Students see all their attempts on the intro and escape screens.

## The dashboard
Tiles (students, plays, escaped %, average best score and time, playing now), **Playing now** with each student's lock progress, **Live answers**, **Question difficulty** (first-try % per question, ▲ HARD below 50%), best-score spread, the student table (search, sort, click a student for every attempt and their first-try results), **Export CSV**, and the attempts limit per room.
Updates arrive instantly through Supabase Realtime; it also refreshes every 15 s.

## Tests (no Supabase needed)
`NODE_PATH=<node_modules with playwright> node tests/<file>.js …`
- `play-through.js <w> <h> <outdir>` plays the whole room (`MOCK_DB=1` = with a fake database)
- `tracking.js <outdir>` checks what reaches the database and the attempt limit
- `dashboard.js <outdir>` opens the dashboard with sample data
- `database/schema.sql` was tested in PGlite (Postgres in WebAssembly): limits, scoring, access rules
