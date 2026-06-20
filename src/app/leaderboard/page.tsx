"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Row {
  display_name: string;
  points: number;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/leaderboard").then((r) => r.json()),
      fetch("/api/me").then((r) => r.json()),
    ])
      .then(([leaderboardData, meData]) => {
        setRows(leaderboardData.leaderboard ?? []);
        setSignedIn(!!meData.user);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="max-w-3xl mx-auto px-4 py-10">Loading...</p>;

  const locked = !signedIn;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>

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
                <span className="text-zinc-500 w-6">{i + 1}</span>
                <span className="font-medium">{r.display_name}</span>
              </span>
              <span className="font-semibold">{r.points} pts</span>
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
              className="rounded-full bg-foreground text-background px-5 py-2 text-sm font-medium"
            >
              Log in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
