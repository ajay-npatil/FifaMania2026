"use client";

import { useEffect, useMemo, useState } from "react";

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

const LOCK_MINUTES = 15;

export default function PredictionsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [draft, setDraft] = useState<Record<string, { home: string; away: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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

  function isLocked(kickoff_at: string) {
    // eslint-disable-next-line react-hooks/purity -- intentional: lock state is time-based
    return Date.now() >= new Date(kickoff_at).getTime() - LOCK_MINUTES * 60 * 1000;
  }

  async function save(matchId: string) {
    const d = draft[matchId];
    if (!d || d.home === "" || d.away === "") return;
    setSavingId(matchId);
    setMessage(null);
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_id: matchId,
        predicted_home_score: Number(d.home),
        predicted_away_score: Number(d.away),
      }),
    });
    const data = await res.json();
    setSavingId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Could not save prediction.");
      return;
    }
    await load();
    setMessage("Saved!");
  }

  const sorted = useMemo(
    () => [...matches].sort((a, b) => +new Date(a.kickoff_at) - +new Date(b.kickoff_at)),
    [matches]
  );

  if (loading) return <p className="max-w-3xl mx-auto px-4 py-10">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Your predictions</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Predictions lock {LOCK_MINUTES} minutes before kickoff. Once locked, they can&apos;t be changed.
      </p>
      {message && <p className="mb-4 text-sm">{message}</p>}
      {sorted.length === 0 && (
        <p className="text-sm text-zinc-500">
          No matches yet. An admin needs to sync fixtures from the Admin page.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {sorted.map((m) => {
          const existing = predictions[m.id];
          const locked = isLocked(m.kickoff_at);
          const d = draft[m.id] ?? {
            home: existing ? String(existing.predicted_home_score) : "",
            away: existing ? String(existing.predicted_away_score) : "",
          };
          return (
            <div
              key={m.id}
              className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-medium">
                  {m.home_team} vs {m.away_team}
                </p>
                <p className="text-xs text-zinc-500">
                  {new Date(m.kickoff_at).toLocaleString()} · {m.status}
                  {m.status === "FINISHED" && ` · Final: ${m.home_score}-${m.away_score}`}
                  {existing?.points_awarded != null && ` · You scored ${existing.points_awarded} pts`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  className="w-14 border border-zinc-300 dark:border-zinc-700 rounded-md px-2 py-1 bg-transparent text-center"
                  value={d.home}
                  disabled={locked}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, [m.id]: { ...d, home: e.target.value } }))
                  }
                />
                <span>-</span>
                <input
                  type="number"
                  min={0}
                  className="w-14 border border-zinc-300 dark:border-zinc-700 rounded-md px-2 py-1 bg-transparent text-center"
                  value={d.away}
                  disabled={locked}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, [m.id]: { ...d, away: e.target.value } }))
                  }
                />
                <button
                  onClick={() => save(m.id)}
                  disabled={locked || savingId === m.id}
                  className="rounded-full bg-foreground text-background px-4 py-1.5 text-xs font-medium disabled:opacity-40"
                >
                  {locked ? "Locked" : savingId === m.id ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
