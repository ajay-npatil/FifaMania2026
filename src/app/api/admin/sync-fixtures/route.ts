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

    // football-data's fullTime score INCLUDES the penalty-shootout goals
    // (e.g. 1-1 after extra time, 2-3 on pens -> fullTime 3-4). Strip the
    // shootout goals back out so the stored score is the on-pitch result (the
    // draw). Who advanced is tracked separately in winner_team, and
    // penalty-winner predictions are scored against that.
    const pensHome = m.score.penalties?.home ?? null;
    const pensAway = m.score.penalties?.away ?? null;
    const hasShootout = pensHome !== null && pensAway !== null;
    const home_score = hasShootout
      ? (m.score.fullTime.home ?? 0) - pensHome
      : m.score.fullTime.home;
    const away_score = hasShootout
      ? (m.score.fullTime.away ?? 0) - pensAway
      : m.score.fullTime.away;

    // Actual winner (accounts for penalty shootouts), null for draws/unfinished.
    const winner_team =
      m.score.winner === "HOME_TEAM"
        ? m.homeTeam.name
        : m.score.winner === "AWAY_TEAM"
        ? m.awayTeam.name
        : null;

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
          stage: m.stage,
          winner_team,
        },
        { onConflict: "external_id" }
      )
      .select("id, home_team, away_team, home_score, away_score, status, winner_team")
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
      // Who won the shootout, if the match was level on the pitch.
      const actualPenalty: "HOME" | "AWAY" | null =
        match.home_score === match.away_score && match.winner_team
          ? match.winner_team === match.home_team
            ? "HOME"
            : "AWAY"
          : null;

      // Re-score every prediction for a finished match (not just unscored
      // ones), so corrected results/logic are applied to existing scores too.
      const { data: preds } = await supabase
        .from("predictions")
        .select(
          "id, predicted_home_score, predicted_away_score, predicted_penalty_winner, points_awarded"
        )
        .eq("match_id", match.id);

      for (const p of preds ?? []) {
        const points = scorePrediction(
          { home: p.predicted_home_score, away: p.predicted_away_score },
          { home: match.home_score, away: match.away_score },
          {
            predicted: (p.predicted_penalty_winner as "HOME" | "AWAY" | null) ?? null,
            actual: actualPenalty,
          }
        );
        if (points !== p.points_awarded) {
          await supabase
            .from("predictions")
            .update({ points_awarded: points })
            .eq("id", p.id);
          scored += 1;
        }
      }
    }
  }

  return NextResponse.json({ upserted, scored });
}
