import { NextRequest, NextResponse } from "next/server";
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
 * scorers API). The Golden Ball / Golden Glove winners aren't available from
 * any API, so the admin passes them in. Awards 175 points for each correct
 * pick. Run once at the end of the tournament — idempotent, safe to re-run.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const goldenBall =
    typeof body.goldenBall === "string" && body.goldenBall.trim()
      ? body.goldenBall.trim()
      : null;
  const goldenGlove =
    typeof body.goldenGlove === "string" && body.goldenGlove.trim()
      ? body.goldenGlove.trim()
      : null;

  const supabase = getSupabaseAdmin();

  const { leaders: countryLeaders } = await computeTopCountries(supabase);
  const scorerLeaders = topScorers(await fetchWorldCupScorers(50));

  const countrySet = new Set(countryLeaders.map(normalizeName));
  const scorerSet = new Set(scorerLeaders.map(normalizeName));
  const goldenBallNorm = goldenBall ? normalizeName(goldenBall) : null;
  const goldenGloveNorm = goldenGlove ? normalizeName(goldenGlove) : null;

  const { data: preds } = await supabase
    .from("tournament_predictions")
    .select("user_id, top_country, top_scorer, golden_ball, golden_glove");

  let countryWinners = 0;
  let scorerWinners = 0;
  let ballWinners = 0;
  let gloveWinners = 0;

  for (const p of preds ?? []) {
    const country_points =
      p.top_country && countrySet.has(normalizeName(p.top_country))
        ? PREDICT_WINNER_POINTS
        : 0;
    const scorer_points =
      p.top_scorer && scorerSet.has(normalizeName(p.top_scorer))
        ? PREDICT_WINNER_POINTS
        : 0;
    const golden_ball_points =
      p.golden_ball && goldenBallNorm && normalizeName(p.golden_ball) === goldenBallNorm
        ? PREDICT_WINNER_POINTS
        : 0;
    const golden_glove_points =
      p.golden_glove && goldenGloveNorm && normalizeName(p.golden_glove) === goldenGloveNorm
        ? PREDICT_WINNER_POINTS
        : 0;

    if (country_points) countryWinners += 1;
    if (scorer_points) scorerWinners += 1;
    if (golden_ball_points) ballWinners += 1;
    if (golden_glove_points) gloveWinners += 1;

    await supabase
      .from("tournament_predictions")
      .update({
        country_points,
        scorer_points,
        golden_ball_points,
        golden_glove_points,
      })
      .eq("user_id", p.user_id);
  }

  await supabase.from("tournament_results").upsert({
    id: 1,
    top_country: countryLeaders.join(", "),
    top_scorer: scorerLeaders.join(", "),
    golden_ball: goldenBall,
    golden_glove: goldenGlove,
    settled_at: new Date().toISOString(),
  });

  return NextResponse.json({
    settled: preds?.length ?? 0,
    countryLeaders,
    scorerLeaders,
    goldenBall,
    goldenGlove,
    countryWinners,
    scorerWinners,
    ballWinners,
    gloveWinners,
  });
}
