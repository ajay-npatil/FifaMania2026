import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

const LOCK_MINUTES_BEFORE_KICKOFF = 15;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = getSupabaseAdmin();

  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff_at, home_score, away_score, status, stage")
    .order("kickoff_at", { ascending: true });

  const { data: predictions } = await supabase
    .from("predictions")
    .select("match_id, predicted_home_score, predicted_away_score, predicted_penalty_winner, points_awarded")
    .eq("user_id", user.id);

  return NextResponse.json({ matches: matches ?? [], predictions: predictions ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { match_id, predicted_home_score, predicted_away_score, predicted_penalty_winner } =
    await req.json();

  if (
    typeof match_id !== "string" ||
    !Number.isInteger(predicted_home_score) ||
    !Number.isInteger(predicted_away_score) ||
    predicted_home_score < 0 ||
    predicted_away_score < 0
  ) {
    return NextResponse.json({ error: "Invalid prediction." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: match } = await supabase
    .from("matches")
    .select("id, kickoff_at, stage")
    .eq("id", match_id)
    .single();

  if (!match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  const lockTime = new Date(match.kickoff_at).getTime() - LOCK_MINUTES_BEFORE_KICKOFF * 60 * 1000;
  if (Date.now() >= lockTime) {
    return NextResponse.json(
      { error: "Predictions are locked 15 minutes before kickoff." },
      { status: 403 }
    );
  }

  // A penalty-shootout winner only applies to a predicted DRAW in a knockout
  // match (group-stage matches can end level, so no shootout there).
  const isKnockout = !!match.stage && match.stage !== "GROUP_STAGE";
  const isDraw = predicted_home_score === predicted_away_score;
  const penaltyWinner =
    isKnockout && isDraw && (predicted_penalty_winner === "HOME" || predicted_penalty_winner === "AWAY")
      ? predicted_penalty_winner
      : null;

  // A knockout match can't end level — a predicted draw must say who advances.
  if (isKnockout && isDraw && !penaltyWinner) {
    return NextResponse.json(
      { error: "Pick who advances on penalties for a knockout draw." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("predictions").upsert(
    {
      user_id: user.id,
      match_id,
      predicted_home_score,
      predicted_away_score,
      predicted_penalty_winner: penaltyWinner,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,match_id" }
  );

  if (error) {
    return NextResponse.json({ error: "Could not save prediction." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
