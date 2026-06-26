"use client";

import { useEffect, useMemo, useState } from "react";
import ScoringRules from "@/components/ScoringRules";
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

const LOCK_MINUTES = 15;

export default function MatchPredictor() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [draft, setDraft] = useState<Record<string, { home: string; away: string }>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

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

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  function lockTime(kickoff_at: string) {
    return new Date(kickoff_at).getTime() - LOCK_MINUTES * 60 * 1000;
  }

  function isLocked(kickoff_at: string) {
    return now >= lockTime(kickoff_at);
  }

  function timeLeftLabel(kickoff_at: string) {
    const ms = lockTime(kickoff_at) - now;
    if (ms <= 0) return null;
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (days > 0) return `${days}d ${hours}h left to predict`;
    if (hours > 0) return `${hours}h ${minutes}m left to predict`;
    if (minutes > 0) return `${minutes}m ${seconds}s left to predict`;
    return `${seconds}s left to predict`;
  }

  // Only show matches that haven't finished yet — completed matches move to
  // the Results page instead.
  const upcoming = useMemo(
    () =>
      [...matches]
        .filter((m) => m.status !== "FINISHED")
        .sort((a, b) => +new Date(a.kickoff_at) - +new Date(b.kickoff_at)),
    [matches]
  );

  async function saveAll() {
    setSaving(true);
    setMessage(null);

    const toSave = upcoming.filter((m) => {
      if (isLocked(m.kickoff_at)) return false;
      const d = draft[m.id];
      return d && d.home !== "" && d.away !== "";
    });

    if (toSave.length === 0) {
      setSaving(false);
      setMessage("Nothing to save.");
      return;
    }

    const results = await Promise.all(
      toSave.map((m) => {
        const d = draft[m.id];
        return fetch("/api/predictions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            match_id: m.id,
            predicted_home_score: Number(d.home),
            predicted_away_score: Number(d.away),
          }),
        }).then(async (res) => ({ res, ok: res.ok, m, data: await res.json() }));
      })
    );

    setSaving(false);
    const failed = results.filter((r) => !r.ok);
    await load();

    if (failed.length === 0) {
      setMessage(`Saved ${results.length} prediction${results.length === 1 ? "" : "s"}.`);
    } else {
      setMessage(
        `Saved ${results.length - failed.length} of ${results.length}. ${failed
          .map((f) => `${f.m.home_team} vs ${f.m.away_team}: ${f.data.error ?? "error"}`)
          .join(" ")}`
      );
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Match Predictor</h1>
      <p className="text-sm text-zinc-500 mb-1">
        Predictions lock {LOCK_MINUTES} minutes before kickoff. Once locked, they can&apos;t be changed.
        Enter scores for as many matches as you like, then save them all at once.
      </p>
      <p className="text-sm font-medium text-accent mb-4">
        ⬇ Scroll down and click &quot;Save all predictions&quot; at the bottom to save what you&apos;ve entered.
      </p>

      <ScoringRules />

      {message && <p className="mb-4 text-sm">{message}</p>}

      {upcoming.length === 0 && (
        <p className="text-sm text-zinc-500">
          No upcoming matches. Check the{" "}
          <a href="/results" className="underline">
            Results
          </a>{" "}
          page for finished matches, or an admin may need to sync fixtures.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {upcoming.map((m) => {
          const existing = predictions[m.id];
          const locked = isLocked(m.kickoff_at);
          const countdown = !locked ? timeLeftLabel(m.kickoff_at) : null;
          const urgent = !locked && lockTime(m.kickoff_at) - now <= 60 * 60 * 1000;
          const d = draft[m.id] ?? {
            home: existing ? String(existing.predicted_home_score) : "",
            away: existing ? String(existing.predicted_away_score) : "",
          };
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
                    {new Date(m.kickoff_at).toLocaleString()} · {m.status}
                    {locked && !existing && " · Locked (no prediction submitted)"}
                  </p>
                  {countdown && (
                    <p
                      className={
                        urgent
                          ? "text-xs font-medium text-red-600 dark:text-red-400 mt-0.5"
                          : "text-xs font-medium text-green-600 dark:text-green-400 mt-0.5"
                      }
                    >
                      ⏱ {countdown}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    className="w-14 border border-zinc-300 dark:border-zinc-700 rounded-md px-2 py-1 bg-transparent text-center focus:outline-none focus:border-accent"
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
                    className="w-14 border border-zinc-300 dark:border-zinc-700 rounded-md px-2 py-1 bg-transparent text-center focus:outline-none focus:border-accent"
                    value={d.away}
                    disabled={locked}
                    onChange={(e) =>
                      setDraft((s) => ({ ...s, [m.id]: { ...d, away: e.target.value } }))
                    }
                  />
                  {locked && <span className="text-xs text-zinc-500">Locked</span>}
                </div>
              </div>
              {locked && <AllPredictions matchId={m.id} />}
            </div>
          );
        })}
      </div>

      {upcoming.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={saveAll}
            disabled={saving}
            className="rounded-full bg-accent text-accent-foreground px-6 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save all predictions"}
          </button>
        </div>
      )}
    </div>
  );
}
