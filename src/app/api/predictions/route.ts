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
    .select("id, home_team, away_team, kickoff_at, home_score, away_score, status")
    .order("kickoff_at", { ascending: true });

  const { data: predictions } = await supabase
    .from("predictions")
    .select("match_id, predicted_home_score, predicted_away_score, points_awarded")
    .eq("user_id", user.id);

  return NextResponse.json({ matches: matches ?? [], predictions: predictions ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { match_id, predicted_home_score, predicted_away_score } = await req.json();

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
    .select("id, kickoff_at")
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

  const { error } = await supabase.from("predictions").upsert(
    {
      user_id: user.id,
      match_id,
      predicted_home_score,
      predicted_away_score,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,match_id" }
  );

  if (error) {
    return NextResponse.json({ error: "Could not save prediction." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
