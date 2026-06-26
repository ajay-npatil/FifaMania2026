import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { fetchWorldCupScorers } from "@/lib/footballData";
import {
  PREDICT_WINNER_POINTS,
  predictWinnerLockAt,
  isPredictWinnerLocked,
} from "@/lib/predictWinner";

interface ScorerOption {
  name: string;
  team: string;
  goals: number;
}

async function loadScorers(): Promise<ScorerOption[]> {
  try {
    const fd = await fetchWorldCupScorers(50);
    return fd.map((s) => ({
      name: s.player.name,
      team: s.team?.name ?? "",
      goals: s.goals ?? 0,
    }));
  } catch {
    // API may be unavailable / rate-limited; the page still works for the
    // country pick and shows existing scorer picks.
    return [];
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = getSupabaseAdmin();

  const { data: matches } = await supabase
    .from("matches")
    .select("home_team, away_team");
  const countries = Array.from(
    new Set((matches ?? []).flatMap((m) => [m.home_team, m.away_team]))
  ).sort();

  const scorers = await loadScorers();

  const { data: pick } = await supabase
    .from("tournament_predictions")
    .select("top_country, top_scorer, country_points, scorer_points")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: results } = await supabase
    .from("tournament_results")
    .select("top_country, top_scorer, settled_at")
    .eq("id", 1)
    .maybeSingle();

  const lockAt = await predictWinnerLockAt(supabase);

  return NextResponse.json({
    countries,
    scorers,
    pick: pick ?? null,
    results: results ?? null,
    points: PREDICT_WINNER_POINTS,
    lockAt: lockAt.toISOString(),
    locked: Date.now() >= lockAt.getTime(),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = getSupabaseAdmin();

  if (await isPredictWinnerLocked(supabase)) {
    return NextResponse.json(
      { error: "Predictions are locked and can no longer be changed." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const top_country =
    typeof body.top_country === "string" && body.top_country.trim()
      ? body.top_country.trim()
      : null;
  const top_scorer =
    typeof body.top_scorer === "string" && body.top_scorer.trim()
      ? body.top_scorer.trim()
      : null;

  if (!top_country && !top_scorer) {
    return NextResponse.json(
      { error: "Pick a country and/or a top scorer." },
      { status: 400 }
    );
  }

  // Validate the country against the actual list of teams.
  if (top_country) {
    const { data: matches } = await supabase
      .from("matches")
      .select("home_team, away_team");
    const teams = new Set(
      (matches ?? []).flatMap((m) => [m.home_team, m.away_team])
    );
    if (!teams.has(top_country)) {
      return NextResponse.json(
        { error: "Unknown country." },
        { status: 400 }
      );
    }
  }

  // Validate the scorer against the live scorers list when we can fetch it.
  if (top_scorer) {
    const scorers = await loadScorers();
    if (scorers.length > 0 && !scorers.some((s) => s.name === top_scorer)) {
      return NextResponse.json(
        { error: "Pick a player from the top-scorers list." },
        { status: 400 }
      );
    }
  }

  const { error } = await supabase.from("tournament_predictions").upsert(
    {
      user_id: user.id,
      top_country,
      top_scorer,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json(
      { error: "Could not save your picks." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
