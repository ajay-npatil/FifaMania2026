/**
 * Thin client for football-data.org's free-tier API.
 * Docs: https://www.football-data.org/documentation/quickstart
 *
 * Free tier covers the FIFA World Cup (competition code "WC"), 10 requests
 * per minute, scores may be delayed by a few minutes.
 */

const BASE_URL = "https://api.football-data.org/v4";

export interface FdMatch {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, etc.
  stage: string; // GROUP_STAGE, LAST_16, QUARTER_FINALS, etc.
  homeTeam: { name: string };
  awayTeam: { name: string };
  score: {
    winner: string | null; // HOME_TEAM | AWAY_TEAM | DRAW | null
    fullTime: { home: number | null; away: number | null };
  };
}

export async function fetchWorldCupMatches(): Promise<FdMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("Missing FOOTBALL_DATA_API_KEY environment variable");
  }

  const res = await fetch(`${BASE_URL}/competitions/WC/matches`, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`football-data.org error ${res.status}: ${body}`);
  }

  const json = await res.json();
  return json.matches as FdMatch[];
}

export interface FdScorer {
  player: { name: string };
  team: { name: string } | null;
  goals: number | null;
}

/**
 * Top scorers for the World Cup, sorted by goals descending. Used both to
 * populate the "top scorer" pick list and to determine the actual golden-boot
 * winner when settling. Cached for an hour to stay well under the free-tier
 * rate limit (10 req/min).
 */
export async function fetchWorldCupScorers(limit = 50): Promise<FdScorer[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("Missing FOOTBALL_DATA_API_KEY environment variable");
  }

  const res = await fetch(
    `${BASE_URL}/competitions/WC/scorers?limit=${limit}`,
    {
      headers: { "X-Auth-Token": apiKey },
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`football-data.org error ${res.status}: ${body}`);
  }

  const json = await res.json();
  return (json.scorers ?? []) as FdScorer[];
}

export function mapFdStatus(status: string): "SCHEDULED" | "LIVE" | "FINISHED" {
  if (status === "FINISHED") return "FINISHED";
  if (status === "IN_PLAY" || status === "PAUSED") return "LIVE";
  return "SCHEDULED";
}
