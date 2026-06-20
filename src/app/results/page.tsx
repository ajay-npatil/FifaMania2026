"use client";

import { useEffect, useMemo, useState } from "react";
import AllPredictions from "@/components/AllPredictions";
import { flagFor } from "@/lib/flags";

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

interface Prediction {
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  points_awarded: number | null;
}

export default function ResultsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/predictions");
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await res.json();
    setMatches(data.matches ?? []);
    const map: Record<string, Prediction> = {};
    for (const p of data.predictions ?? []) map[p.match_id] = p;
    setPredictions(map);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    void load();
  }, []);

  const finished = useMemo(
    () =>
      [...matches]
        .filter((m) => m.status === "FINISHED")
        .sort((a, b) => +new Date(b.kickoff_at) - +new Date(a.kickoff_at)),
    [matches]
  );

  const totalPoints = useMemo(
    () =>
      finished.reduce((sum, m) => {
        const p = predictions[m.id];
        return sum + (p?.points_awarded ?? 0);
      }, 0),
    [finished, predictions]
  );

  if (loading) return <p className="max-w-3xl mx-auto px-4 py-10">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Your results</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Your prediction vs the actual result for every finished match. Total so far:{" "}
        <span className="font-semibold text-accent">{totalPoints} points</span>.
      </p>

      {finished.length === 0 && (
        <p className="text-sm text-zinc-500">No finished matches yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {finished.map((m) => {
          const p = predictions[m.id];
          return (
            <div
              key={m.id}
              className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-background/70 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {m.home_team} {flagFor(m.home_team)} vs {m.away_team} {flagFor(m.away_team)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {new Date(m.kickoff_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-xs text-zinc-500">Your prediction</p>
                    <p className="font-medium">
                      {p ? `${p.predicted_home_score} - ${p.predicted_away_score}` : "—"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-zinc-500">Actual result</p>
                    <p className="font-medium">
                      {m.home_score} - {m.away_score}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-zinc-500">Points</p>
                    <p className="font-semibold">
                      {p ? p.points_awarded ?? "pending" : "—"}
                    </p>
                  </div>
                </div>
              </div>
              <AllPredictions matchId={m.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
