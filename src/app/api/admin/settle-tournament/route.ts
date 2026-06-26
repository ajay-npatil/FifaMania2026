import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { fetchWorldCupScorers } from "@/lib/footballData";
import {
  PREDICT_WINNER_POINTS,
  computeTopCountries,
  topScorers,
  normalizeName,
} from "@/lib/predictWinner";

/**
 * Settles the Predict-a-Winner side bets: figures out the actual top-scoring
 * country (from finished match scores) and the actual top scorer (from the
 * scorers API), then awards 175 points for each correct pick. Run once at the
 * end of the tournament. Idempotent — safe to re-run if results change.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();

  const { leaders: countryLeaders } = await computeTopCountries(supabase);
  const scorerLeaders = topScorers(await fetchWorldCupScorers(50));

  const countrySet = new Set(countryLeaders.map(normalizeName));
  const scorerSet = new Set(scorerLeaders.map(normalizeName));

  const { data: preds } = await supabase
    .from("tournament_predictions")
    .select("user_id, top_country, top_scorer");

  let countryWinners = 0;
  let scorerWinners = 0;

  for (const p of preds ?? []) {
    const country_points =
      p.top_country && countrySet.has(normalizeName(p.top_country))
        ? PREDICT_WINNER_POINTS
        : 0;
    const scorer_points =
      p.top_scorer && scorerSet.has(normalizeName(p.top_scorer))
        ? PREDICT_WINNER_POINTS
        : 0;

    if (country_points) countryWinners += 1;
    if (scorer_points) scorerWinners += 1;

    await supabase
      .from("tournament_predictions")
      .update({ country_points, scorer_points })
      .eq("user_id", p.user_id);
  }

  await supabase.from("tournament_results").upsert({
    id: 1,
    top_country: countryLeaders.join(", "),
    top_scorer: scorerLeaders.join(", "),
    settled_at: new Date().toISOString(),
  });

  return NextResponse.json({
    settled: preds?.length ?? 0,
    countryLeaders,
    scorerLeaders,
    countryWinners,
    scorerWinners,
  });
}
