"use client";

import { useState } from "react";

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/admin/sync-fixtures", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setResult(data.error ?? "Sync failed.");
      return;
    }
    setResult(`Synced ${data.upserted} matches, scored ${data.scored} predictions.`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Admin</h1>
      <p className="text-sm text-zinc-500 mb-4">
        Pulls fixtures and results from football-data.org and re-scores any
        newly finished matches. Run this periodically (e.g. once a day, or
        after matches finish). Only visible to admin accounts.
      </p>
      <button
        onClick={sync}
        disabled={loading}
        className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Syncing..." : "Sync World Cup fixtures"}
      </button>
      {result && <p className="mt-4 text-sm">{result}</p>}
    </div>
  );
}
