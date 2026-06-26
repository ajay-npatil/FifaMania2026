# Dev -> Test -> Prod Workflow

This project now has two isolated environments so feature work never touches
live production data:

- **Production** — `main` branch, deployed on Vercel, uses your existing
  production Supabase project.
- **Dev/Test** — `dev` branch (and any feature branches off it), deployed on
  Vercel as an automatic **Preview** deployment, uses a separate Supabase
  project so test data and schema experiments can't leak into prod.

## One-time setup (do this once, in the Supabase/Vercel dashboards)

### 1. Create a second Supabase project for dev

1. Go to https://supabase.com and create a new project (e.g.
   `fifamania-dev`). Free tier is fine.
2. In the SQL Editor, run `supabase/schema.sql` (same schema as prod).
3. Copy its **Project URL** and **service_role** key from
   Project Settings -> API.

### 2. Configure Vercel environment variables per environment

In your Vercel project settings -> Environment Variables, Vercel lets you
scope each variable to **Production**, **Preview**, or **Development**:

| Variable | Production (main) | Preview (dev branch + PRs) |
|---|---|---|
| `SUPABASE_URL` | prod project URL | dev project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | prod service role key | dev service role key |
| `FOOTBALL_DATA_API_KEY` | same key (read-only, safe to share) | same key |

Add each variable twice — once checked for "Production" with the prod
value, once checked for "Preview" (and "Development") with the dev value.
Vercel automatically picks the right one based on which branch triggered
the deploy.

### 3. Confirm the `dev` branch is connected

The `dev` branch was created locally in this repo. Push it once:

```bash
git push -u origin dev
```

After that, every push to `dev` (or a PR opened against it) gets its own
preview URL automatically — no extra Vercel config needed beyond step 2.

## Day-to-day workflow

1. Branch off `dev` for a feature: `git checkout dev && git checkout -b feature/my-thing`.
2. Develop locally using `.env.local` pointed at the **dev** Supabase
   project (copy `.env.example`, fill in the dev project's values).
3. Push the feature branch and open a PR into `dev` (or push directly to
   `dev` for solo work). Vercel builds a Preview deployment using the dev
   Supabase project — test there with throwaway data.
4. Once verified, merge `dev` -> `main`. Vercel deploys to production using
   the prod Supabase project. Nothing in dev/test ever writes to prod data,
   since it's a different database entirely.

## Why a second Supabase project (not just a branch)

Git branches isolate code, not data. Without a separate dev database,
testing a new feature on a preview URL would still read/write real
predictions, scores, and users. A second free Supabase project gives you a
disposable sandbox — safe to break, reset, or reseed without any risk to
production.
