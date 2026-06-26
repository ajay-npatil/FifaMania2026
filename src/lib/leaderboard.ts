import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { computeBracketActuals, scoreBracket } from "@/lib/bracket";

export interface Standing {
  user_id: string;
  display_name: string;
  points: number;
  rank: number;
}

/**
 * Computes the current leaderboard: every user's total awarded points,
 * sorted high-to-low, with a 1-based rank. Used by both the leaderboard
 * API and the snapshot endpoint so the two can never disagree.
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

  // Predict-a-Winner bonuses (top country / top scorer, plus the knockout
  // bracket) count toward the same leaderboard total. Bracket points only
  // include stages that are already revealed.
  const { data: tournament } = await supabase
    .from("tournament_predictions")
    .select("user_id, country_points, scorer_points, bracket");
  const bracketActuals = await computeBracketActuals(supabase);

  const totals = new Map<string, number>();
  for (const u of users ?? []) totals.set(u.id, 0);
  for (const p of predictions ?? []) {
    totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + (p.points_awarded ?? 0));
  }
  for (const t of tournament ?? []) {
    const bonus =
      (t.country_points ?? 0) +
      (t.scorer_points ?? 0) +
      scoreBracket(t.bracket, bracketActuals).total;
    totals.set(t.user_id, (totals.get(t.user_id) ?? 0) + bonus);
  }

  return (users ?? [])
    .map((u) => ({
      user_id: u.id,
      display_name: u.display_name,
      points: totals.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}
