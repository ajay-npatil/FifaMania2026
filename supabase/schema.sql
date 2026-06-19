-- FifaMania database schema
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query).

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

create index if not exists idx_predictions_match on predictions(match_id);
create index if not exists idx_predictions_user on predictions(user_id);
create index if not exists idx_matches_kickoff on matches(kickoff_at);

-- Row Level Security: the app talks to Supabase using the service-role key
-- from server-side API routes only, so RLS can stay restrictive (deny-all
-- by default) and the service-role key bypasses it.
alter table users enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;
