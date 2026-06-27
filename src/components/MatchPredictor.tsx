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

function LockIcon({ locked }: { locked: boolean }) {
  return locked ? (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      className="text-zinc-400 dark:text-zinc-500"
      aria-label="Locked"
    >
      <title>Locked</title>
      <path
        d="M7 10V7a5 5 0 0 1 10 0v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      className="text-green-500"
      aria-label="Open for predictions"
    >
      <title>Open for predictions</title>
      <path
        d="M7 10V7a5 5 0 0 1 9.5-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor" />
    </svg>
  );
}

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

  // Compact time-until-lock, e.g. "12H 15M" (top two units only).
  function compactCountdown(kickoff_at: string) {
    const ms = lockTime(kickoff_at) - now;
    if (ms <= 0) return "";
    const total = Math.floor(ms / 1000);
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (d > 0) return `${d}D ${h}H`;
    if (h > 0) return `${h}H ${m}M`;
    if (m > 0) return `${m}M ${s}S`;
    return `${s}S`;
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

  // Group the (already date-sorted) upcoming matches by calendar day.
  const groupedByDay = useMemo(() => {
    const groups: { key: string; label: string; matches: Match[] }[] = [];
    for (const m of upcoming) {
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
  }, [upcoming]);

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
                const existing = predictions[m.id];
                const locked = isLocked(m.kickoff_at);
                // Red once kickoff is within 2h (until lock at -15m); green before.
                const urgent =
                  !locked &&
                  new Date(m.kickoff_at).getTime() - now <= 2 * 60 * 60 * 1000;
                const d = draft[m.id] ?? {
                  home: existing ? String(existing.predicted_home_score) : "",
                  away: existing ? String(existing.predicted_away_score) : "",
                };
                const time = new Date(m.kickoff_at).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const inputClass =
                  "w-10 border border-zinc-300 dark:border-zinc-700 rounded-md px-1.5 py-1 bg-transparent text-center text-sm focus:outline-none focus:border-accent disabled:opacity-50";
                return (
                  <div key={m.id} className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-12 shrink-0 text-xs tabular-nums text-zinc-500">
                        {time}
                      </span>
                      <span className="shrink-0 flex items-center">
                        <LockIcon locked={locked} />
                      </span>
                      <span className="flex-1 min-w-0 text-sm">
                        {flagFor(m.home_team)} {m.home_team}{" "}
                        <span className="text-zinc-400">v</span> {m.away_team}{" "}
                        {flagFor(m.away_team)}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min={0}
                          aria-label={`${m.home_team} score`}
                          className={inputClass}
                          value={d.home}
                          disabled={locked}
                          onChange={(e) =>
                            setDraft((s) => ({ ...s, [m.id]: { ...d, home: e.target.value } }))
                          }
                        />
                        <span className="text-zinc-400">-</span>
                        <input
                          type="number"
                          min={0}
                          aria-label={`${m.away_team} score`}
                          className={inputClass}
                          value={d.away}
                          disabled={locked}
                          onChange={(e) =>
                            setDraft((s) => ({ ...s, [m.id]: { ...d, away: e.target.value } }))
                          }
                        />
                      </div>
                      <span
                        className={`w-16 shrink-0 text-right text-xs tabular-nums ${
                          urgent
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {locked ? "" : compactCountdown(m.kickoff_at)}
                      </span>
                    </div>

                    {locked && !existing && (
                      <p className="text-[11px] text-zinc-400 mt-1 pl-[3.625rem]">
                        No prediction submitted
                      </p>
                    )}
                    {locked && (
                      <div className="pl-[3.625rem]">
                        <AllPredictions matchId={m.id} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
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
