import { getSupabaseAdmin } from "@/lib/supabaseServer";
import type { FdScorer } from "@/lib/footballData";

/** Points awarded for each correct tournament-long pick (country, scorer). */
export const PREDICT_WINNER_POINTS = 175;

/** How long before the first knockout match picks freeze. */
export const PREDICT_WINNER_LOCK_MINUTES = 15;

/**
 * The instant picks freeze: 15 minutes before the first Round-of-32 match
 * kicks off. Derived live from the fixtures — the earliest match whose stage
 * isn't the group stage is the first knockout game.
 *
 * Falls back, until knockout fixtures are synced, to the PREDICT_WINNER_LOCK_AT
 * env var, or 8:45 PM CEST on 28 Jun 2026 (15 min before a 9:00 PM CEST
 * Round-of-32 kickoff).
 */
export async function predictWinnerLockAt(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<Date> {
  const { data } = await supabase
    .from("matches")
    .select("kickoff_at")
    .not("stage", "is", null)
    .neq("stage", "GROUP_STAGE")
    .order("kickoff_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data?.kickoff_at) {
    return new Date(
      new Date(data.kickoff_at).getTime() -
        PREDICT_WINNER_LOCK_MINUTES * 60 * 1000
    );
  }

  const env = process.env.PREDICT_WINNER_LOCK_AT;
  return env ? new Date(env) : new Date("2026-06-28T20:45:00+02:00");
}

export async function isPredictWinnerLocked(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  now: number = Date.now()
): Promise<boolean> {
  return now >= (await predictWinnerLockAt(supabase)).getTime();
}

/** Normalises a name for forgiving comparison (case/space/accent-insensitive). */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sums goals scored by each team across FINISHED matches and returns the
 * leader(s). Returns every team tied for the most goals (so a shared lead
 * rewards everyone who picked a leading country).
 */
export async function computeTopCountries(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<{ leaders: string[]; goalsByTeam: Record<string, number> }> {
  const { data: matches } = await supabase
    .from("matches")
    .select("home_team, away_team, home_score, away_score")
    .eq("status", "FINISHED");

  const goals: Record<string, number> = {};
  for (const m of matches ?? []) {
    if (m.home_score == null || m.away_score == null) continue;
    goals[m.home_team] = (goals[m.home_team] ?? 0) + m.home_score;
    goals[m.away_team] = (goals[m.away_team] ?? 0) + m.away_score;
  }

  const max = Math.max(0, ...Object.values(goals));
  const leaders =
    max > 0 ? Object.keys(goals).filter((t) => goals[t] === max) : [];
  return { leaders, goalsByTeam: goals };
}

/** Returns the player name(s) tied for the most goals in the scorers list. */
export function topScorers(scorers: FdScorer[]): string[] {
  const withGoals = scorers.filter((s) => (s.goals ?? 0) > 0);
  const max = Math.max(0, ...withGoals.map((s) => s.goals ?? 0));
  if (max === 0) return [];
  return withGoals
    .filter((s) => (s.goals ?? 0) === max)
    .map((s) => s.player.name);
}
