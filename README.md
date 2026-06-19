# FifaMania

Predict World Cup scores with friends, earn points based on accuracy, and
climb the leaderboard. Built to run entirely on free tiers.

## Scoring rules

| Scenario | Points |
|---|---|
| Exact score correct (winner + both scores match) | 50 |
| Draw predicted, draw happened, exact score matches | 65 |
| Correct winner + that team's score also matches (either side) | 35 |
| Correct winner only (scores wrong) | 25 |
| Draw predicted, draw happened, score didn't match | 25 |
| Draw predicted, no draw happened, but predicted number matches the actual loser's score | 10 |
| Anything else | 0 |

Logic lives in `src/lib/scoring.ts`, with full test coverage in
`src/lib/scoring.test.ts` (`npm test`).

## Stack (all free)

- **Next.js** (App Router) — frontend + API routes
- **Supabase** (free tier) — Postgres database, used directly via the
  service-role key from server-side API routes (no Supabase Auth — login is
  a custom display name + PIN system, no email/Google required)
- **football-data.org** (free tier) — World Cup fixtures and results
- **Vercel** (free Hobby plan) — hosting, or any other free Node host

## One-time setup

### 1. Create a Supabase project

1. Go to https://supabase.com, sign up free, create a new project.
2. Open the SQL Editor and run the contents of `supabase/schema.sql`.
3. Go to Project Settings -> API and copy the **Project URL** and the
   **service_role** key (not the anon key — keep this secret).

### 2. Get a football-data.org API key

1. Go to https://www.football-data.org/client/register and sign up free.
2. Copy your API token from the dashboard.

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the three values:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
FOOTBALL_DATA_API_KEY=...
```

### 4. Install and run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### 5. Make yourself an admin

Sign up normally through the UI, then in the Supabase SQL Editor run:

```sql
update users set is_admin = true where display_name = 'YourName';
```

Admins see an "Admin" link in the nav that syncs World Cup fixtures/results
from football-data.org into the database, and automatically scores any
match that has just finished.

### 6. Keep fixtures/results up to date

Visit `/admin` and click "Sync World Cup fixtures" periodically (e.g. once a
day, and again after matches you care about finish) to pull in new fixtures
and score finished matches. This is a manual click rather than a background
job to stay entirely within free tiers — Vercel's free plan doesn't include
always-on cron, though you could add a free external cron service (e.g.
cron-job.org) that pings `POST /api/admin/sync-fixtures` if you'd rather
automate it. Note that route currently checks for an admin session cookie,
so an external cron service would need a way to authenticate — for a fully
automated setup you'd want to add a shared secret header check to that route
first.

## Deploying for free

1. Push this folder to a GitHub repo.
2. Go to https://vercel.com, import the repo, add the same three
   environment variables in the Vercel project settings.
3. Deploy. You get a free `your-project.vercel.app` URL.
4. (Optional) Add a custom domain like `DhruvPatil.nl` under Vercel's
   domain settings — this costs a few dollars/year through a registrar
   (e.g. Namecheap, Hostinger), it's the only part of this setup that isn't
   free.

## How the 15-minute lock works

Each match stores its `kickoff_at` time. The `/api/predictions` POST route
rejects any save once `now >= kickoff_at - 15 minutes`, and the UI disables
the inputs at the same threshold so users can't even attempt it client-side.

## Project structure

```
src/lib/scoring.ts          Scoring engine (pure function, fully tested)
src/lib/auth.ts             PIN hashing + session lookup
src/lib/supabaseServer.ts   Server-side Supabase client (service role key)
src/lib/footballData.ts     football-data.org API client
supabase/schema.sql         Database schema
src/app/api/...             API routes (auth, predictions, leaderboard, admin sync)
src/app/...                 Pages (signup, login, predictions, leaderboard, admin)
```
