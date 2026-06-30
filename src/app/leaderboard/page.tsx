"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type SortKey = "total" | "match" | "knockout" | "bonus";

const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: "total", label: "Total" },
  { key: "match", label: "Matches" },
  { key: "knockout", label: "Knockouts" },
  { key: "bonus", label: "Bonus" },
];

interface Row {
  display_name: string;
  points: number;
  match: number;
  knockout: number;
  bonus: number;
  rank: number;
  rankDelta: number | null;
  pointsGained: number | null;
  isNew: boolean;
}

function Mover({ row }: { row: Row }) {
  if (row.isNew) {
    return <span className="text-xs font-medium text-accent">NEW</span>;
  }
  if (row.rankDelta === null) return null;

  const gained =
    row.pointsGained && row.pointsGained > 0 ? ` +${row.pointsGained}` : "";

  if (row.rankDelta > 0) {
    return (
      <span className="text-xs font-medium text-green-600 dark:text-green-400">
        ▲{row.rankDelta}
        {gained && <span className="text-zinc-400">{gained}</span>}
      </span>
    );
  }
  if (row.rankDelta < 0) {
    return (
      <span className="text-xs font-medium text-red-600 dark:text-red-400">
        ▼{Math.abs(row.rankDelta)}
        {gained && <span className="text-zinc-400">{gained}</span>}
      </span>
    );
  }
  // Same rank — still surface points gained since the snapshot.
  return (
    <span className="text-xs text-zinc-400">{gained ? gained.trim() : "–"}</span>
  );
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("total");

  useEffect(() => {
    Promise.all([
      fetch("/api/leaderboard").then((r) => r.json()),
      fetch("/api/me").then((r) => r.json()),
    ])
      .then(([leaderboardData, meData]) => {
        setRows(leaderboardData.leaderboard ?? []);
        setHasSnapshot(!!leaderboardData.hasSnapshot);
        setSignedIn(!!meData.user);
      })
      .finally(() => setLoading(false));
  }, []);

  // The API returns rows sorted by total; re-sort client-side for the other
  // views so newcomers can see who's strongest in each category.
  const sortedRows = useMemo(() => {
    if (sortBy === "total") return rows;
    return [...rows].sort((a, b) => b[sortBy] - a[sortBy]);
  }, [rows, sortBy]);

  if (loading) return <p className="max-w-3xl mx-auto px-4 py-10">Loading...</p>;

  const locked = !signedIn;
  const metricOf = (r: Row) => (sortBy === "total" ? r.points : r[sortBy]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1">Leaderboard</h1>
      <p className="text-xs text-zinc-500 mb-1">
        Matches = group-stage predictions · Knockout = knockout-match predictions
        + bracket · Bonus = Predict-a-Winner awards.
      </p>
      {hasSnapshot && sortBy === "total" && (
        <p className="text-xs text-zinc-500 mb-1">
          ▲▼ shows movement since the last round.
        </p>
      )}

      {/* Sort/organise by category */}
      <div className="flex flex-wrap gap-1.5 mt-3 mb-5">
        {SORT_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSortBy(t.key)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              sortBy === t.key
                ? "border-accent bg-accent text-accent-foreground font-medium"
                : "border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:border-accent hover:text-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <div
          className={
            locked ? "flex flex-col blur-sm select-none pointer-events-none" : "flex flex-col"
          }
          aria-hidden={locked}
        >
          {sortedRows.map((r, i) => (
            <div
              key={r.display_name}
              className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 py-3"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className={i < 3 ? "text-accent font-semibold w-6" : "text-zinc-500 w-6"}>
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="font-medium">{r.display_name}</span>
                  {sortBy === "total" ? (
                    r.points > 0 && (
                      <span className="block text-xs text-zinc-500">
                        Matches {r.match} · Knockout {r.knockout} · Bonus {r.bonus}
                      </span>
                    )
                  ) : (
                    <span className="block text-xs text-zinc-500">
                      {SORT_TABS.find((t) => t.key === sortBy)?.label} only
                    </span>
                  )}
                </span>
              </span>
              <span className="flex items-center gap-3 shrink-0">
                {sortBy === "total" && <Mover row={r} />}
                <span className="font-semibold">{metricOf(r)} pts</span>
              </span>
            </div>
          ))}
          {sortedRows.length === 0 && (
            <p className="text-sm text-zinc-500">No scored predictions yet.</p>
          )}
        </div>

        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-4">
            <p className="font-medium">Sign in to see the leaderboard</p>
            <Link
              href="/login"
              className="rounded-full bg-accent text-accent-foreground px-5 py-2 text-sm font-medium hover:opacity-90"
            >
              Log in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
