import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { computeBracketActuals, scoreBracket } from "@/lib/bracket";

export interface Standing {
  user_id: string;
  display_name: string;
  /** Match-by-match prediction points. */
  match: number;
  /** Knockout bracket (stage prediction) points. */
  knockout: number;
  /** Predict-a-Winner bonuses: top country + scorer + golden ball + glove. */
  bonus: number;
  /** Grand total (match + knockout + bonus). */
  points: number;
  rank: number;
}

/**
 * Computes the current leaderboard with a per-category breakdown, sorted by
 * total points with a 1-based rank. Used by both the leaderboard API and the
 * snapshot endpoint so the two can never disagree.
 */
export async function computeStandings(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<Standing[]> {
  const { data: users } = await supabase
    .from("users")
    .select("id, display_name");
  const { data: predictions } = await supabase
    .from("predictions")
    .select("user_id, points_awarded")
    .not("points_awarded", "is", null);
  const { data: tournament } = await supabase
    .from("tournament_predictions")
    .select(
      "user_id, country_points, scorer_points, golden_ball_points, golden_glove_points, bracket"
    );
  const bracketActuals = await computeBracketActuals(supabase);

  const match = new Map<string, number>();
  const knockout = new Map<string, number>();
  const bonus = new Map<string, number>();
  for (const u of users ?? []) {
    match.set(u.id, 0);
    knockout.set(u.id, 0);
    bonus.set(u.id, 0);
  }

  for (const p of predictions ?? []) {
    match.set(p.user_id, (match.get(p.user_id) ?? 0) + (p.points_awarded ?? 0));
  }

  for (const t of tournament ?? []) {
    // Knockout bracket points only include stages already revealed.
    knockout.set(
      t.user_id,
      (knockout.get(t.user_id) ?? 0) + scoreBracket(t.bracket, bracketActuals).total
    );
    bonus.set(
      t.user_id,
      (bonus.get(t.user_id) ?? 0) +
        (t.country_points ?? 0) +
        (t.scorer_points ?? 0) +
        (t.golden_ball_points ?? 0) +
        (t.golden_glove_points ?? 0)
    );
  }

  return (users ?? [])
    .map((u) => {
      const m = match.get(u.id) ?? 0;
      const k = knockout.get(u.id) ?? 0;
      const b = bonus.get(u.id) ?? 0;
      return {
        user_id: u.id,
        display_name: u.display_name,
        match: m,
        knockout: k,
        bonus: b,
        points: m + k + b,
      };
    })
    .sort((a, b) => b.points - a.points)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}
