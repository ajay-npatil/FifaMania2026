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
  const [openPicks, setOpenPicks] = useState<Set<string>>(() => new Set());

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

  // Group finished matches by day (most recent day first).
  const groupedByDay = useMemo(() => {
    const groups: { key: string; label: string; matches: Match[] }[] = [];
    for (const m of finished) {
      const date = new Date(m.kickoff_at);
      const key = date.toDateString();
      const label = date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.matches.push(m);
      else groups.push({ key, label, matches: [m] });
    }
    return groups;
  }, [finished]);

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
        Your prediction vs the actual result for every finished match. Total so
        far: <span className="font-semibold text-accent">{totalPoints} points</span>.
      </p>

      {finished.length === 0 && (
        <p className="text-sm text-zinc-500">No finished matches yet.</p>
      )}

      <div className="flex flex-col gap-4">
        {groupedByDay.map((group) => (
          <section
            key={group.key}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-background/70 backdrop-blur-sm overflow-hidden"
          >
            <h2 className="px-3 py-2 text-sm font-semibold bg-zinc-100/70 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
              {group.label}
            </h2>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {group.matches.map((m) => {
                const p = predictions[m.id];
                const time = new Date(m.kickoff_at).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const pts = p?.points_awarded;
                const pointsLabel = !p
                  ? "—"
                  : pts == null
                  ? "…"
                  : pts > 0
                  ? `+${pts}`
                  : "0";
                const pointsClass =
                  pts && pts > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-zinc-500";
                return (
                  <div key={m.id} className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-12 shrink-0 text-xs tabular-nums text-zinc-500">
                        {time}
                      </span>
                      <span className="flex-1 min-w-0 text-sm">
                        {flagFor(m.home_team)} {m.home_team}{" "}
                        <strong className="tabular-nums">
                          {m.home_score} – {m.away_score}
                        </strong>{" "}
                        {m.away_team} {flagFor(m.away_team)}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500 tabular-nums">
                        You{" "}
                        {p
                          ? `${p.predicted_home_score}-${p.predicted_away_score}`
                          : "—"}
                      </span>
                      <span
                        className={`w-10 shrink-0 text-right text-sm font-semibold tabular-nums ${pointsClass}`}
                      >
                        {pointsLabel}
                      </span>
                    </div>

                    <details
                      className="mt-1 pl-[3.625rem]"
                      onToggle={(e) =>
                        setOpenPicks((s) => {
                          const next = new Set(s);
                          if (e.currentTarget.open) next.add(m.id);
                          else next.delete(m.id);
                          return next;
                        })
                      }
                    >
                      <summary className="text-[11px] text-zinc-500 cursor-pointer hover:text-accent select-none">
                        Everyone&apos;s picks
                      </summary>
                      {openPicks.has(m.id) && (
                        <div className="mt-1">
                          <AllPredictions matchId={m.id} />
                        </div>
                      )}
                    </details>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
