---
title: "Building FifaMania: My First Real Project"
date: 2026-07-11
---

# Building FifaMania: My First Real Project

> 📸 *Screenshot: the FifaMania homepage / login screen*

I've never shipped a real app before. FifaMania — a World Cup score-prediction game for me and my friends — is my first one, and this post is the story of how it went: why I started, the decisions I made, the features I added (and re-added, and fixed), and what I learned along the way.

## The idea

Every World Cup, the same thing happens in our group chat: everyone predicts scores, someone tries to track it in a spreadsheet, and by the round of 16 nobody remembers who's actually winning. I wanted something better — a real site where you predict match scores, get points for accuracy, and see a live leaderboard.

The scoring had to feel fair. Getting the exact score right should be worth more than just picking the winner, but I also wanted partial credit for close calls — like correctly calling a draw even if the scoreline was off. I sat down and wrote out the rules before writing a single line of code:

| Scenario | Points |
|---|---|
| Exact score correct (winner + both scores match) | 50 |
| Draw predicted, draw happened, exact score matches | 65 |
| Correct winner + that team's score also matches | 35 |
| Correct winner only (scores wrong) | 25 |
| Draw predicted, draw happened, score didn't match | 25 |
| Draw predicted, no draw, predicted number matches actual loser's score | 10 |
| Anything else | 0 |

Writing this table down first turned out to be the best decision I made on the whole project — every time the logic got complicated later, I could point back to it as the source of truth.

## Picking a stack I could afford

I wasn't trying to build a startup, I was trying to build something for maybe 15-20 friends without spending money. So every choice was filtered through "does this have a real free tier?":

- **Next.js** for the frontend and API routes in one project — no separate backend to host.
- **Supabase** (free tier Postgres) for the database, accessed directly from server-side API routes with a service-role key. I skipped Supabase Auth entirely and built a simple display-name + PIN login instead, so nobody needs an email or Google account to join.
- **football-data.org** (free tier) for real World Cup fixtures and results, so I didn't have to enter match data by hand.
- **Vercel** (free Hobby plan) for hosting.

The only thing that isn't free is a custom domain, and even that's optional.

## Building the core loop

The first real feature was the prediction flow itself: pick a score for each match, save it, and once the match kicks off your prediction locks — no editing after the fact. I built this as a hard rule enforced on both sides: the API route rejects any save once we're within 15 minutes of kickoff, and the UI disables the inputs at the same threshold so nobody can even try to sneak a late change in through the browser.

> 📸 *Screenshot: the Match Predictor page with a countdown timer*

Early commits were about getting the basics solid: bulk saving predictions instead of one match at a time, a results page to see how everyone did, a scoring-rules explainer built into the UI, and a countdown timer so people could see exactly how much time was left to lock in a pick.

## Making it feel like a real product

Once the core worked, I spent a surprising amount of time on things that had nothing to do with scoring logic: a single teal accent color across the whole app instead of a mess of default styles, real team flags next to every match, a stadium-style background image. Small stuff, but it's the difference between "a spreadsheet with buttons" and something that feels like an actual app.

> 📸 *Screenshot: the app with team flags and background visible*

This part had its own share of bugs I didn't expect — UK home nations (England, Scotland, Wales) don't map cleanly to a single flag code, and a few countries like Bosnia, Congo, and Cape Verde needed fallback name-matching logic before their flags would show up correctly. Nothing that seems obvious until you actually try to render 32 countries' flags from a public API.

## The leaderboard, and keeping it honest

The leaderboard went through the most iteration of any single feature. It started simple — total points, ranked — but grew a lot:

- A blur on the leaderboard for guests, so you can't see standings without actually joining and predicting.
- A points breakdown so you can see *why* you're ranked where you are, not just the final number.
- "Movers" to show who's climbing or falling.
- Category views (exact matches, correct winners, knockout points) with sort buttons, so competitive friends could dig into their own stats.

> 📸 *Screenshot: leaderboard with points breakdown and movers*

## Predict-a-Winner: the feature that kept changing

If the match-by-match predictions were the meat of the app, **Predict-a-Winner** was the ambitious side dish — pick your knockout bracket in advance (who makes the semis, the final, who wins it all), plus Golden Ball and Golden Glove award predictions.

This feature went through more redesigns than anything else in the project. First pass: a bracket tree that visually converged toward the final, which looked great but was fiddly to interact with. I simplified it to flat sets of picks per stage instead. Then I had to add real constraints — you can't pick the same team twice in a stage, and your semi-final picks have to come from the teams you picked in the quarter-finals, and so on down the bracket. Later I reworked it again so that if a team you picked gets knocked out, the affected stages (finalists, winner, third place) reopen for editing using only the teams still alive — rather than just locking wrong predictions in forever.

> 📸 *Screenshot: Predict-a-Winner bracket picks*

The trickiest bug here was actually in scoring, not the UI: I added penalty-shootout predictions for knockout draws, but the stored match score included the penalty goals, which threw off the normal scoring math. The fix was to strip penalty-shootout goals from the stored score before scoring a match, then re-score anything that had already finished. That's the kind of bug you only find by actually using your own app during a real tournament.

## Admin tools nobody else sees

Behind the scenes there's an admin view that syncs fixtures and results from football-data.org and automatically scores any match that just finished. I kept this manual — click a "Sync" button — rather than a background cron job, because Vercel's free tier doesn't include always-on scheduled jobs. It's not glamorous, but it's honest about the constraints of building on free infrastructure, and it's one click a day.

> 📸 *Screenshot: the admin sync page*

I also added an "Everyone's Picks" admin view so I could sanity-check that predictions were being scored correctly across the whole group — which ended up being how I caught more than one scoring bug before anyone else noticed.

## Dev, test, and prod — the boring but important part

About a week in, I set up a second Supabase project purely for development, with a `dev` branch on Vercel that deploys to preview URLs automatically. The reasoning: a git branch isolates *code*, but not *data*. Without a second database, testing a new feature on a preview deploy would still read and write real predictions and real scores from my friends. Splitting the database meant I could break things in dev without any risk to the live game.

It's the least exciting thing I built, and probably the thing I'm most glad I did — it meant I could ship fixes mid-tournament without holding my breath.

## What I'd tell past-me

A few things stuck with me from this project, since it was my first time actually shipping something real:

**Write the rules down before you write the code.** The scoring table I wrote on day one saved me every time logic got complicated later — I could always check new code against it instead of re-deriving the rules from memory.

**Free tiers shape your architecture, and that's fine.** No background cron job meant a manual sync button. No budget for a second real environment felt like overkill until I needed it once, mid-tournament, and was very glad I'd built it in advance.

**The bugs you don't expect come from real usage.** The flag-matching edge cases and the penalty-shootout scoring bug weren't things I could have planned for upfront — I only found them by actually using the app with real data and real friends predicting real matches.

**Small polish matters more than it seems like it should.** A single accent color and real flags did more for how "finished" the app felt than most of the actual features.

## Try it yourself

FifaMania is built to run entirely on free infrastructure — Next.js, Supabase, and a free football data API — so if you want to run your own version for your friend group, everything you need is in the [README](../README.md). The scoring engine alone lives in about 100 lines of fully-tested TypeScript, if you just want to see how the rules translate into code.

> 📸 *Screenshot: final leaderboard / results screen*

---

*This is my first project, so if you spot something I could have done better, I'd genuinely like to hear it.*
