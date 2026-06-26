import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { normalizeName } from "@/lib/predictWinner";

/** Points per correct team at each knockout stage. */
export const BRACKET_POINTS = {
  qf: 50,
  sf: 100,
  final: 175,
  winner: 250,
  third: 250,
} as const;

/** How many teams a user predicts at each stage. */
export const BRACKET_SLOTS = { qf: 8, sf: 4, final: 2 } as const;

export interface BracketPicks {
  qf: string[];
  sf: string[];
  final: string[];
  winner: string | null;
  third: string | null;
}

export interface BracketActuals {
  qf: string[];
  sf: string[];
  final: string[];
  winner: string | null;
  third: string | null;
  revealed: { qf: boolean; sf: boolean; final: boolean; winner: boolean; third: boolean };
}

export function emptyBracket(): BracketPicks {
  return { qf: [], sf: [], final: [], winner: null, third: null };
}

const up = (s: string | null | undefined) => (s ?? "").toUpperCase();
const isGroupStage = (s: string | null) => up(s) === "GROUP_STAGE";
const isQuarterFinal = (s: string | null) =>
  ["QUARTER_FINALS", "QUARTER_FINAL"].includes(up(s));
const isSemiFinal = (s: string | null) =>
  ["SEMI_FINALS", "SEMI_FINAL"].includes(up(s));
const isFinal = (s: string | null) => up(s) === "FINAL";
const isThirdPlace = (s: string | null) =>
  ["THIRD_PLACE", "3RD_PLACE", "THIRD_PLACE_FINAL"].includes(up(s));

interface MatchRow {
  home_team: string;
  away_team: string;
  stage: string | null;
  status: string;
  winner_team: string | null;
}

/**
 * Works out the actual knockout participants from the fixtures, and which
 * stages are fully determined (revealed). A team "reached" a stage if it
 * appears in a match at that stage and is a real tournament team (i.e. was a
 * group-stage participant — this filters out placeholder fixtures whose teams
 * aren't decided yet).
 */
export async function computeBracketActuals(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<BracketActuals> {
  const { data } = await supabase
    .from("matches")
    .select("home_team, away_team, stage, status, winner_team");
  const matches = (data ?? []) as MatchRow[];

  const groupTeams = new Set<string>();
  for (const m of matches) {
    if (isGroupStage(m.stage)) {
      groupTeams.add(m.home_team);
      groupTeams.add(m.away_team);
    }
  }
  const known =
    groupTeams.size > 0
      ? groupTeams
      : new Set(matches.flatMap((m) => [m.home_team, m.away_team]));

  const teamsInStage = (pred: (s: string | null) => boolean): string[] => {
    const teams = new Set<string>();
    for (const m of matches) {
      if (!pred(m.stage)) continue;
      if (known.has(m.home_team)) teams.add(m.home_team);
      if (known.has(m.away_team)) teams.add(m.away_team);
    }
    return [...teams];
  };

  const qf = teamsInStage(isQuarterFinal);
  const sf = teamsInStage(isSemiFinal);
  const final = teamsInStage(isFinal);

  const finishedWinner = (pred: (s: string | null) => boolean): string | null => {
    for (const m of matches) {
      if (pred(m.stage) && m.status === "FINISHED" && m.winner_team) {
        return m.winner_team;
      }
    }
    return null;
  };
  const winner = finishedWinner(isFinal);
  const third = finishedWinner(isThirdPlace);

  return {
    qf,
    sf,
    final,
    winner,
    third,
    revealed: {
      qf: qf.length >= BRACKET_SLOTS.qf,
      sf: sf.length >= BRACKET_SLOTS.sf,
      final: final.length >= BRACKET_SLOTS.final,
      winner: winner !== null,
      third: third !== null,
    },
  };
}

function countHits(picks: string[], actual: string[]): number {
  const actualSet = new Set(actual.map(normalizeName));
  const seen = new Set<string>();
  let hits = 0;
  for (const p of picks) {
    const n = normalizeName(p);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    if (actualSet.has(n)) hits += 1;
  }
  return hits;
}

export interface BracketScore {
  qf: number;
  sf: number;
  final: number;
  winner: number;
  third: number;
  total: number;
}

/**
 * Scores a user's bracket. Only fully-revealed stages contribute, so the
 * leaderboard never leaks points for matches that haven't happened yet.
 */
export function scoreBracket(
  picks: BracketPicks | null,
  actuals: BracketActuals
): BracketScore {
  const p = picks ?? emptyBracket();
  const r = actuals.revealed;

  const qf = r.qf ? countHits(p.qf ?? [], actuals.qf) * BRACKET_POINTS.qf : 0;
  const sf = r.sf ? countHits(p.sf ?? [], actuals.sf) * BRACKET_POINTS.sf : 0;
  const final = r.final
    ? countHits(p.final ?? [], actuals.final) * BRACKET_POINTS.final
    : 0;
  const winner =
    r.winner &&
    p.winner &&
    actuals.winner &&
    normalizeName(p.winner) === normalizeName(actuals.winner)
      ? BRACKET_POINTS.winner
      : 0;
  const third =
    r.third &&
    p.third &&
    actuals.third &&
    normalizeName(p.third) === normalizeName(actuals.third)
      ? BRACKET_POINTS.third
      : 0;

  return { qf, sf, final, winner, third, total: qf + sf + final + winner + third };
}
