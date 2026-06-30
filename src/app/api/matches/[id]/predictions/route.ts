import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

const LOCK_MINUTES = 15;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, kickoff_at, status, home_team, away_team")
    .eq("id", id)
    .single();

  if (matchError || !match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  const lockTime = new Date(match.kickoff_at).getTime() - LOCK_MINUTES * 60 * 1000;
  const locked = match.status === "FINISHED" || Date.now() >= lockTime;

  if (!locked) {
    return NextResponse.json(
      { error: "Predictions for this match aren't locked yet." },
      { status: 403 }
    );
  }

  const { data: predictions, error } = await supabase
    .from("predictions")
    .select(
      "predicted_home_score, predicted_away_score, predicted_penalty_winner, points_awarded, users(display_name)"
    )
    .eq("match_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (predictions ?? [])
    .map((p) => {
      const userRel = p.users as unknown as { display_name: string } | { display_name: string }[] | null;
      const display_name = Array.isArray(userRel) ? userRel[0]?.display_name : userRel?.display_name;
      // The team the user backed to advance on penalties (for a draw pick).
      const penalty_team =
        p.predicted_penalty_winner === "HOME"
          ? match.home_team
          : p.predicted_penalty_winner === "AWAY"
          ? match.away_team
          : null;
      return {
        display_name: display_name ?? "Unknown",
        predicted_home_score: p.predicted_home_score,
        predicted_away_score: p.predicted_away_score,
        penalty_team,
        points_awarded: p.points_awarded,
      };
    })
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  return NextResponse.json({ predictions: result });
}
