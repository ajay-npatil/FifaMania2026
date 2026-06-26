"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Row {
  display_name: string;
  points: number;
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

  if (loading) return <p className="max-w-3xl mx-auto px-4 py-10">Loading...</p>;

  const locked = !signedIn;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className={hasSnapshot ? "text-2xl font-bold mb-1" : "text-2xl font-bold mb-6"}>
        Leaderboard
      </h1>
      {hasSnapshot && (
        <p className="text-xs text-zinc-500 mb-5">
          ▲▼ shows movement since the last round.
        </p>
      )}

      <div className="relative">
        <div
          className={
            locked ? "flex flex-col blur-sm select-none pointer-events-none" : "flex flex-col"
          }
          aria-hidden={locked}
        >
          {rows.map((r, i) => (
            <div
              key={r.display_name}
              className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 py-3"
            >
              <span className="flex items-center gap-3">
                <span className={i < 3 ? "text-accent font-semibold w-6" : "text-zinc-500 w-6"}>
                  {i + 1}
                </span>
                <span className="font-medium">{r.display_name}</span>
              </span>
              <span className="flex items-center gap-3">
                <Mover row={r} />
                <span className="font-semibold">{r.points} pts</span>
              </span>
            </div>
          ))}
          {rows.length === 0 && (
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
