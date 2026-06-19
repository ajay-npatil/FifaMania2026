import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { fetchWorldCupMatches, mapFdStatus } from "@/lib/footballData";
import { scorePrediction } from "@/lib/scoring";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const fdMatches = await fetchWorldCupMatches();

  let upserted = 0;
  let scored = 0;

  for (const m of fdMatches) {
    const status = mapFdStatus(m.status);
    const home_score = m.score.fullTime.home;
    const away_score = m.score.fullTime.away;

    const { data: match, error } = await supabase
      .from("matches")
      .upsert(
        {
          external_id: String(m.id),
          home_team: m.homeTeam.name,
          away_team: m.awayTeam.name,
          kickoff_at: m.utcDate,
          home_score,
          away_score,
          status,
        },
        { onConflict: "external_id" }
      )
      .select("id, home_score, away_score, status")
      .single();

    if (error || !match) continue;
    upserted += 1;

    // If the match just finished, score every prediction for it that
    // hasn't been scored yet.
    if (
      status === "FINISHED" &&
      match.home_score !== null &&
      match.away_score !== null
    ) {
      const { data: preds } = await supabase
        .from("predictions")
        .select("id, predicted_home_score, predicted_away_score, points_awarded")
        .eq("match_id", match.id)
        .is("points_awarded", null);

      for (const p of preds ?? []) {
        const points = scorePrediction(
          { home: p.predicted_home_score, away: p.predicted_away_score },
          { home: match.home_score, away: match.away_score }
        );
        await supabase
          .from("predictions")
          .update({ points_awarded: points })
          .eq("id", p.id);
        scored += 1;
      }
    }
  }

  return NextResponse.json({ upserted, scored });
}
