"use client";

import { useEffect, useState } from "react";
import { flagFor } from "@/lib/flags";

interface ScorerOption {
  name: string;
  team: string;
  goals: number;
}

interface Pick {
  top_country: string | null;
  top_scorer: string | null;
  country_points: number | null;
  scorer_points: number | null;
}

interface Results {
  top_country: string | null;
  top_scorer: string | null;
  settled_at: string | null;
}

interface Data {
  countries: string[];
  scorers: ScorerOption[];
  pick: Pick | null;
  results: Results | null;
  points: number;
  lockAt: string;
  locked: boolean;
}

function countdownLabel(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h left to pick`;
  if (hours > 0) return `${hours}h ${minutes}m left to pick`;
  if (minutes > 0) return `${minutes}m ${seconds}s left to pick`;
  return `${seconds}s left to pick`;
}

export default function PredictWinnerPage() {
  const [data, setData] = useState<Data | null>(null);
  const [country, setCountry] = useState("");
  const [scorer, setScorer] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  async function load() {
    const res = await fetch("/api/predict-winner");
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const d: Data = await res.json();
    setData(d);
    setCountry(d.pick?.top_country ?? "");
    setScorer(d.pick?.top_scorer ?? "");
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    void load();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/predict-winner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ top_country: country, top_scorer: scorer }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(d.error ?? "Could not save.");
      return;
    }
    setMessage("Picks saved.");
    await load();
  }

  if (loading || !data)
    return <p className="max-w-3xl mx-auto px-4 py-10">Loading...</p>;

  const lockMs = new Date(data.lockAt).getTime() - now;
  const locked = data.locked || lockMs <= 0;
  const settled = !!data.results?.settled_at;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Predict a Winner</h1>
      <p className="text-sm text-zinc-500 mb-1">
        Two tournament-long calls: which <strong>country</strong> scores the most
        goals across the whole World Cup, and who wins the <strong>golden boot</strong>{" "}
        (top scorer). Worth <strong>{data.points} points each</strong> if you nail
        it.
      </p>
      <p className="text-sm text-zinc-500 mb-6">
        Picks lock 15 minutes before the Round of 32 and{" "}
        <strong>can&apos;t be changed after that.</strong>
      </p>

      {!locked && (
        <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-4">
          ⏱ {countdownLabel(lockMs)}
        </p>
      )}
      {locked && !settled && (
        <p className="text-sm font-medium text-zinc-500 mb-4">
          🔒 Picks are locked. Winners are decided at the end of the tournament.
        </p>
      )}

      {settled && (
        <div className="mb-6 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h2 className="font-semibold mb-2">🏆 Results</h2>
          <p className="text-sm">
            Top-scoring country:{" "}
            <strong>{data.results?.top_country || "—"}</strong>
          </p>
          <p className="text-sm">
            Top scorer: <strong>{data.results?.top_scorer || "—"}</strong>
          </p>
        </div>
      )}

      {message && <p className="mb-4 text-sm">{message}</p>}

      <div className="flex flex-col gap-6">
        {/* Country pick */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <label className="block font-medium mb-2">
            Country to score the most goals
          </label>
          <select
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 bg-transparent focus:outline-none focus:border-accent disabled:opacity-60"
            value={country}
            disabled={locked}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">— Pick a country —</option>
            {data.countries.map((c) => (
              <option key={c} value={c}>
                {flagFor(c)} {c}
              </option>
            ))}
          </select>
          {settled && data.pick && (
            <p className="text-xs mt-2 font-medium">
              {data.pick.country_points
                ? `✅ Correct — +${data.pick.country_points} pts`
                : "❌ Not this time — 0 pts"}
            </p>
          )}
        </div>

        {/* Top scorer pick */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <label className="block font-medium mb-2">Golden boot (top scorer)</label>
          {data.scorers.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Top-scorer list is unavailable right now.
              {scorer && (
                <>
                  {" "}
                  Your current pick: <strong>{scorer}</strong>.
                </>
              )}
            </p>
          ) : (
            <select
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 bg-transparent focus:outline-none focus:border-accent disabled:opacity-60"
              value={scorer}
              disabled={locked}
              onChange={(e) => setScorer(e.target.value)}
            >
              <option value="">— Pick a player —</option>
              {data.scorers.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                  {s.team ? ` ${flagFor(s.team)}` : ""} · {s.goals} goal
                  {s.goals === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          )}
          {settled && data.pick && (
            <p className="text-xs mt-2 font-medium">
              {data.pick.scorer_points
                ? `✅ Correct — +${data.pick.scorer_points} pts`
                : "❌ Not this time — 0 pts"}
            </p>
          )}
        </div>
      </div>

      {!locked && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-accent text-accent-foreground px-6 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save my picks"}
          </button>
        </div>
      )}
    </div>
  );
}
