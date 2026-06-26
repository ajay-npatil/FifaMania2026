-- FifaMania database schema
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query).
--
-- This file is IDEMPOTENT and safe to run on any database, new or existing:
-- `create table if not exists` builds a fresh DB, and the `alter table ...
-- add column if not exists` block near the bottom backfills any columns that
-- were added after a table was first created. Re-running it changes nothing
-- that's already in place. No data is dropped or modified.

create extension if not exists "uuid-ossp";

-- Users: simple name + hashed PIN, no email/password/Google involved.
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  display_name text not null unique,
  pin_hash text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Matches: synced from football-data.org, but editable manually too.
create table if not exists matches (
  id uuid primary key default uuid_generate_v4(),
  external_id text unique, -- football-data.org fixture id, null for manually-added matches
  home_team text not null,
  away_team text not null,
  kickoff_at timestamptz not null,
  home_score int, -- null until the match has finished
  away_score int,
  status text not null default 'SCHEDULED', -- SCHEDULED | LIVE | FINISHED
  stage text, -- football-data.org stage, e.g. GROUP_STAGE, LAST_16, FINAL
  winner_team text, -- the winning team's name (handles penalty shootouts), null for draws/unfinished
  created_at timestamptz not null default now()
);

-- Predictions: one row per user per match.
create table if not exists predictions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  predicted_home_score int not null,
  predicted_away_score int not null,
  points_awarded int, -- filled in once the match finishes
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

-- Leaderboard snapshots: a frozen copy of every user's rank + points at a
-- moment in time (captured by an admin, e.g. just before a round begins).
-- The leaderboard compares "now" against the most recent snapshot to show
-- movers (rank ▲/▼ and points gained since).
create table if not exists leaderboard_snapshots (
  id uuid primary key default uuid_generate_v4(),
  batch_id uuid not null, -- groups all rows captured together
  user_id uuid not null references users(id) on delete cascade,
  rank int not null,
  points int not null,
  captured_at timestamptz not null default now()
);

-- Predict-a-Winner: each user's tournament-long side bets. One row per user:
-- which country they think will score the most goals, and which player will be
-- top scorer. Settled once at the end of the tournament — 175 points for each
-- correct pick.
create table if not exists tournament_predictions (
  user_id uuid primary key references users(id) on delete cascade,
  top_country text,     -- predicted highest-scoring country
  top_scorer text,      -- predicted top goal scorer (player name)
  country_points int,   -- 175 if correct, 0 if wrong, null until settled
  scorer_points int,    -- 175 if correct, 0 if wrong, null until settled
  bracket jsonb,        -- knockout predictions: { qf:[], sf:[], final:[], winner, third }
  golden_ball text,     -- predicted best overall player
  golden_glove text,    -- predicted best goalkeeper
  golden_ball_points int,  -- 175 if correct, 0 if wrong, null until settled
  golden_glove_points int, -- 175 if correct, 0 if wrong, null until settled
  updated_at timestamptz not null default now()
);

-- The settled actual answers (single row, id always 1), so the page can show
-- "Top country / Top scorer" after the admin settles.
create table if not exists tournament_results (
  id int primary key default 1,
  top_country text,
  top_scorer text,
  golden_ball text,   -- actual best player (entered by admin at settle)
  golden_glove text,  -- actual best goalkeeper (entered by admin at settle)
  settled_at timestamptz,
  constraint tournament_results_single_row check (id = 1)
);

-- Column backfills for databases created before these columns existed. These
-- run after the create-table statements above, so the tables are guaranteed to
-- exist by now. Safe to re-run; each is a no-op if the column is already there.
alter table matches add column if not exists stage text;
alter table matches add column if not exists winner_team text;

alter table tournament_predictions add column if not exists country_points int;
alter table tournament_predictions add column if not exists scorer_points int;
alter table tournament_predictions add column if not exists bracket jsonb;
alter table tournament_predictions add column if not exists golden_ball text;
alter table tournament_predictions add column if not exists golden_glove text;
alter table tournament_predictions add column if not exists golden_ball_points int;
alter table tournament_predictions add column if not exists golden_glove_points int;

alter table tournament_results add column if not exists golden_ball text;
alter table tournament_results add column if not exists golden_glove text;

create index if not exists idx_predictions_match on predictions(match_id);
create index if not exists idx_predictions_user on predictions(user_id);
create index if not exists idx_matches_kickoff on matches(kickoff_at);
create index if not exists idx_snapshots_captured on leaderboard_snapshots(captured_at desc);

-- Row Level Security: the app talks to Supabase using the service-role key
-- from server-side API routes only, so RLS can stay restrictive (deny-all
-- by default) and the service-role key bypasses it.
alter table users enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;
alter table leaderboard_snapshots enable row level security;
alter table tournament_predictions enable row level security;
alter table tournament_results enable row level security;
