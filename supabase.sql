-- Build Bharat AI City — leaderboard schema
-- Run this once in the Supabase SQL editor for your project.

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  total_score int not null,
  total_valuation_cr int not null,
  citizens_impacted int not null,
  archetype text not null,
  sectors text[] not null,
  created_at timestamptz not null default now()
);

alter table public.runs enable row level security;

-- Anyone (anon key) can read the leaderboard.
create policy "public read" on public.runs
  for select using (true);

-- Anyone (anon key) can submit their own run. No update/delete policy exists,
-- so scores are append-only and can't be tampered with after submission.
create policy "public insert" on public.runs
  for insert with check (true);

-- Enable realtime so the leaderboard updates live for all 1200 players.
alter publication supabase_realtime add table public.runs;

create index if not exists runs_score_idx on public.runs (total_score desc);
