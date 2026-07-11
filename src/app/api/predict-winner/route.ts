import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { fetchWorldCupScorers } from "@/lib/footballData";
import {
  PREDICT_WINNER_POINTS,
  predictWinnerLockAt,
  isPredictWinnerLocked,
  predictWinnerBracketLockAt,
  isPredictWinnerBracketLocked,
} from "@/lib/predictWinner";
import {
  BRACKET_POINTS,
  BRACKET_SLOTS,
  computeBracketActuals,
  computeAliveTeams,
  scoreBracket,
  emptyBracket,
} from "@/lib/bracket";
import {
  GOLDEN_BALL_CANDIDATES,
  GOLDEN_GLOVE_CANDIDATES,
  isCandidate,
} from "@/lib/awards";
// Candidate lists are static and imported directly by the client; only the
// validation helpers are needed here.

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

async function teamSet(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<Set<string>> {
  const { data } = await supabase.from("matches").select("home_team, away_team");
  return new Set((data ?? []).flatMap((m) => [m.home_team, m.away_team]));
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = getSupabaseAdmin();

  const countries = [...(await teamSet(supabase))].sort();
  const scorers = await loadScorers();

  const { data: pick } = await supabase
    .from("tournament_predictions")
    .select(
      "top_country, top_scorer, country_points, scorer_points, bracket, golden_ball, golden_glove, golden_ball_points, golden_glove_points"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: results } = await supabase
    .from("tournament_results")
    .select("top_country, top_scorer, golden_ball, golden_glove, settled_at")
    .eq("id", 1)
    .maybeSingle();

  const lockAt = await predictWinnerLockAt(supabase);
  const bracketLockAt = await predictWinnerBracketLockAt(supabase);
  const bracketActuals = await computeBracketActuals(supabase);
  const bracketPoints = scoreBracket(pick?.bracket ?? null, bracketActuals);
  const aliveTeams = await computeAliveTeams(supabase);

  return NextResponse.json({
    countries,
    aliveTeams,
    scorers,
    pick: pick ?? null,
    results: results ?? null,
    points: PREDICT_WINNER_POINTS,
    lockAt: lockAt.toISOString(),
    locked: Date.now() >= lockAt.getTime(),
    bracketLockAt: bracketLockAt.toISOString(),
    bracketLocked: Date.now() >= bracketLockAt.getTime(),
    bracket: pick?.bracket ?? emptyBracket(),
    bracketActuals: {
      qf: bracketActuals.qf,
      sf: bracketActuals.sf,
      final: bracketActuals.final,
      winner: bracketActuals.winner,
      third: bracketActuals.third,
    },
    bracketReveal: bracketActuals.revealed,
    bracketPoints,
    bracketConfig: BRACKET_POINTS,
    bracketSlots: BRACKET_SLOTS,
  });
}

function sanitizeTeams(
  value: unknown,
  max: number,
  teams: Set<string>
): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of value) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (!t || !teams.has(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function validTeam(value: unknown, teams: Set<string>): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t && teams.has(t) ? t : null;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const awardsLocked = await isPredictWinnerLocked(supabase);
  const bracketLocked = await isPredictWinnerBracketLocked(supabase);

  if (awardsLocked && bracketLocked) {
    return NextResponse.json(
      { error: "Predictions are locked and can no longer be changed." },
      { status: 403 }
    );
  }

  const body = await req.json();

  // Only fields whose window is still open are updated; the upsert leaves the
  // rest untouched (so frozen award picks are preserved).
  const update: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };

  // Awards (country / scorer / golden ball / glove) — only while still open.
  if (!awardsLocked) {
    const teams = await teamSet(supabase);

    const top_country = validTeamOrError(body.top_country, teams);
    if (top_country === INVALID) {
      return NextResponse.json({ error: "Unknown country." }, { status: 400 });
    }

    const top_scorer =
      typeof body.top_scorer === "string" && body.top_scorer.trim()
        ? body.top_scorer.trim()
        : null;
    if (top_scorer) {
      const scorers = await loadScorers();
      if (scorers.length > 0 && !scorers.some((s) => s.name === top_scorer)) {
        return NextResponse.json(
          { error: "Pick a player from the top-scorers list." },
          { status: 400 }
        );
      }
    }

    const golden_ball =
      typeof body.golden_ball === "string" && body.golden_ball.trim()
        ? body.golden_ball.trim()
        : null;
    if (golden_ball && !isCandidate(GOLDEN_BALL_CANDIDATES, golden_ball)) {
      return NextResponse.json(
        { error: "Pick a Golden Ball candidate from the list." },
        { status: 400 }
      );
    }

    const golden_glove =
      typeof body.golden_glove === "string" && body.golden_glove.trim()
        ? body.golden_glove.trim()
        : null;
    if (golden_glove && !isCandidate(GOLDEN_GLOVE_CANDIDATES, golden_glove)) {
      return NextResponse.json(
        { error: "Pick a Golden Glove candidate from the list." },
        { status: 400 }
      );
    }

    update.top_country = top_country;
    update.top_scorer = top_scorer;
    update.golden_ball = golden_ball;
    update.golden_glove = golden_glove;
  }

  // Knockout picks — Finalists (2), Winner (a finalist), Third (a still-alive
  // team that isn't a finalist). Only while the bracket window is open.
  if (!bracketLocked) {
    const alive = new Set(await computeAliveTeams(supabase));
    const b = body.bracket ?? {};
    const finalists = sanitizeTeams(b.final, BRACKET_SLOTS.final, alive);
    const finalistSet = new Set(finalists);
    const thirdAllowed = new Set([...alive].filter((t) => !finalistSet.has(t)));
    update.bracket = {
      qf: [],
      sf: [],
      final: finalists,
      winner: validTeam(b.winner, finalistSet),
      third: validTeam(b.third, thirdAllowed),
    };
  }

  const { error } = await supabase
    .from("tournament_predictions")
    .upsert(update, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json(
      { error: "Could not save your picks." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

// Sentinel for an explicitly-provided-but-invalid country (vs. simply omitted).
const INVALID = Symbol("invalid");
function validTeamOrError(
  value: unknown,
  teams: Set<string>
): string | null | typeof INVALID {
  if (typeof value !== "string" || !value.trim()) return null;
  const t = value.trim();
  return teams.has(t) ? t : INVALID;
}
