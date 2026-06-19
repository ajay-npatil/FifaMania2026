"use client";

import { useEffect, useState } from "react";

interface Row {
  display_name: string;
  points: number;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setRows(d.leaderboard ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="max-w-3xl mx-auto px-4 py-10">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>
      <div className="flex flex-col">
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
    </div>
  );
}
