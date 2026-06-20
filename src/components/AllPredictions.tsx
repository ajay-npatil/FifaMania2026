"use client";

import { useState } from "react";

interface PredictionRow {
  display_name: string;
  predicted_home_score: number;
  predicted_away_score: number;
  points_awarded: number | null;
}

export default function AllPredictions({ matchId }: { matchId: string }) {
  const [rows, setRows] = useState<PredictionRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (rows || loading) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/matches/${matchId}/predictions`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't load predictions.");
      return;
    }
    setRows(data.predictions ?? []);
  }

  return (
    <details className="mt-2" onToggle={(e) => e.currentTarget.open && load()}>
      <summary className="cursor-pointer text-xs underline text-zinc-500">
        See everyone&apos;s predictions
      </summary>
      <div className="mt-2 text-sm">
        {loading && <p className="text-zinc-500">Loading...</p>}
        {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
        {rows && rows.length === 0 && (
          <p className="text-zinc-500">No one predicted this match.</p>
        )}
        {rows && rows.length > 0 && (
          <ul className="flex flex-col gap-1">
            {rows.map((r) => (
              <li key={r.display_name} className="flex items-center justify-between gap-4">
                <span>{r.display_name}</span>
                <span className="font-medium">
                  {r.predicted_home_score} - {r.predicted_away_score}
                  {r.points_awarded !== null && (
                    <span className="text-zinc-500"> · {r.points_awarded} pts</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
