"use client";

import { useEffect, useState, type ReactNode } from "react";
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

interface BracketPicks {
  qf: string[];
  sf: string[];
  final: string[];
  winner: string | null;
  third: string | null;
}
interface BracketActuals {
  qf: string[];
  sf: string[];
  final: string[];
  winner: string | null;
  third: string | null;
}
interface BracketReveal {
  qf: boolean;
  sf: boolean;
  final: boolean;
  winner: boolean;
  third: boolean;
}
interface BracketScore {
  qf: number;
  sf: number;
  final: number;
  winner: number;
  third: number;
  total: number;
}

interface Data {
  countries: string[];
  scorers: ScorerOption[];
  pick: Pick | null;
  results: Results | null;
  points: number;
  lockAt: string;
  locked: boolean;
  bracket: BracketPicks;
  bracketActuals: BracketActuals;
  bracketReveal: BracketReveal;
  bracketPoints: BracketScore;
  bracketConfig: { qf: number; sf: number; final: number; winner: number; third: number };
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function hitMark(value: string, revealed: boolean, actual: string[]): string | null {
  if (!revealed || !value) return null;
  return actual.some((a) => norm(a) === norm(value)) ? "✅" : "❌";
}

function pad(arr: string[] | undefined, n: number): string[] {
  const r = (arr ?? []).slice(0, n);
  while (r.length < n) r.push("");
  return r;
}

function TeamSelect({
  value,
  onChange,
  disabled,
  teams,
  mark,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  teams: string[];
  mark: string | null;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <select
        className="flex-1 min-w-0 border border-zinc-300 dark:border-zinc-700 rounded-md px-2 py-1.5 bg-transparent text-sm focus:outline-none focus:border-accent disabled:opacity-60"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— team —</option>
        {teams.map((t) => (
          <option key={t} value={t}>
            {flagFor(t)} {t}
          </option>
        ))}
      </select>
      {mark && <span className="text-xs w-4 shrink-0">{mark}</span>}
    </div>
  );
}

function BracketGroup({
  title,
  hint,
  points,
  children,
}: {
  title: string;
  hint?: string;
  points?: number | null;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <p className="text-xs font-semibold text-zinc-500 mb-2">
        {title}
        {hint ? ` · ${hint}` : ""}
        {points != null && points > 0 && (
          <span className="text-green-600 dark:text-green-400"> · +{points}</span>
        )}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
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
  const [qf, setQf] = useState<string[]>(() => Array(8).fill(""));
  const [sf, setSf] = useState<string[]>(() => Array(4).fill(""));
  const [fin, setFin] = useState<string[]>(() => Array(2).fill(""));
  const [winner, setWinner] = useState("");
  const [third, setThird] = useState("");
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
    setQf(pad(d.bracket?.qf, 8));
    setSf(pad(d.bracket?.sf, 4));
    setFin(pad(d.bracket?.final, 2));
    setWinner(d.bracket?.winner ?? "");
    setThird(d.bracket?.third ?? "");
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
      body: JSON.stringify({
        top_country: country,
        top_scorer: scorer,
        bracket: {
          qf: qf.filter(Boolean),
          sf: sf.filter(Boolean),
          final: fin.filter(Boolean),
          winner: winner || null,
          third: third || null,
        },
      }),
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
    <div className="max-w-5xl mx-auto px-4 py-10">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
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

      {/* Knockout bracket */}
      <div className="mt-12">
        <h2 className="text-lg font-semibold mb-1">Knockout bracket</h2>
        <p className="text-sm text-zinc-500 mb-1">
          Predict who reaches each stage. Points per correct team:{" "}
          <strong>
            {data.bracketConfig.qf} QF · {data.bracketConfig.sf} SF ·{" "}
            {data.bracketConfig.final} Final · {data.bracketConfig.winner} Winner ·{" "}
            {data.bracketConfig.third} 3rd
          </strong>
          .
        </p>
        <p className="text-sm text-zinc-500 mb-4">
          Each stage&apos;s points reveal automatically as the tournament reaches
          it (Round of 16 done → QF, quarters done → semis, and so on).
        </p>

        {(data.bracketReveal.qf ||
          data.bracketReveal.sf ||
          data.bracketReveal.final ||
          data.bracketReveal.winner ||
          data.bracketReveal.third) && (
          <p className="mb-4 text-sm font-medium">
            Bracket points so far:{" "}
            <span className="text-accent">{data.bracketPoints.total}</span>
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Left half */}
          <div className="flex flex-col gap-4">
            <BracketGroup
              title="Quarter-finalists"
              hint="left"
              points={data.bracketReveal.qf ? data.bracketPoints.qf : null}
            >
              {[0, 1, 2, 3].map((i) => (
                <TeamSelect
                  key={i}
                  value={qf[i]}
                  disabled={locked}
                  teams={data.countries}
                  mark={hitMark(qf[i], data.bracketReveal.qf, data.bracketActuals.qf)}
                  onChange={(v) =>
                    setQf((s) => s.map((x, idx) => (idx === i ? v : x)))
                  }
                />
              ))}
            </BracketGroup>
            <BracketGroup
              title="Semi-finalists"
              hint="left"
              points={data.bracketReveal.sf ? data.bracketPoints.sf : null}
            >
              {[0, 1].map((i) => (
                <TeamSelect
                  key={i}
                  value={sf[i]}
                  disabled={locked}
                  teams={data.countries}
                  mark={hitMark(sf[i], data.bracketReveal.sf, data.bracketActuals.sf)}
                  onChange={(v) =>
                    setSf((s) => s.map((x, idx) => (idx === i ? v : x)))
                  }
                />
              ))}
            </BracketGroup>
            <BracketGroup
              title="Finalist"
              hint="left"
              points={data.bracketReveal.final ? data.bracketPoints.final : null}
            >
              <TeamSelect
                value={fin[0]}
                disabled={locked}
                teams={data.countries}
                mark={hitMark(fin[0], data.bracketReveal.final, data.bracketActuals.final)}
                onChange={(v) => setFin((s) => s.map((x, idx) => (idx === 0 ? v : x)))}
              />
            </BracketGroup>
          </div>

          {/* Center */}
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border-2 border-accent/50 p-4 text-center">
              <p className="font-semibold mb-2">🏆 Winner</p>
              <TeamSelect
                value={winner}
                disabled={locked}
                teams={data.countries}
                mark={hitMark(
                  winner,
                  data.bracketReveal.winner,
                  data.bracketActuals.winner ? [data.bracketActuals.winner] : []
                )}
                onChange={setWinner}
              />
            </div>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 text-center">
              <p className="font-semibold mb-2">🥉 Third place</p>
              <TeamSelect
                value={third}
                disabled={locked}
                teams={data.countries}
                mark={hitMark(
                  third,
                  data.bracketReveal.third,
                  data.bracketActuals.third ? [data.bracketActuals.third] : []
                )}
                onChange={setThird}
              />
            </div>
          </div>

          {/* Right half */}
          <div className="flex flex-col gap-4">
            <BracketGroup title="Quarter-finalists" hint="right">
              {[4, 5, 6, 7].map((i) => (
                <TeamSelect
                  key={i}
                  value={qf[i]}
                  disabled={locked}
                  teams={data.countries}
                  mark={hitMark(qf[i], data.bracketReveal.qf, data.bracketActuals.qf)}
                  onChange={(v) =>
                    setQf((s) => s.map((x, idx) => (idx === i ? v : x)))
                  }
                />
              ))}
            </BracketGroup>
            <BracketGroup title="Semi-finalists" hint="right">
              {[2, 3].map((i) => (
                <TeamSelect
                  key={i}
                  value={sf[i]}
                  disabled={locked}
                  teams={data.countries}
                  mark={hitMark(sf[i], data.bracketReveal.sf, data.bracketActuals.sf)}
                  onChange={(v) =>
                    setSf((s) => s.map((x, idx) => (idx === i ? v : x)))
                  }
                />
              ))}
            </BracketGroup>
            <BracketGroup title="Finalist" hint="right">
              <TeamSelect
                value={fin[1]}
                disabled={locked}
                teams={data.countries}
                mark={hitMark(fin[1], data.bracketReveal.final, data.bracketActuals.final)}
                onChange={(v) => setFin((s) => s.map((x, idx) => (idx === 1 ? v : x)))}
              />
            </BracketGroup>
          </div>
        </div>
      </div>

      {!locked && (
        <div className="mt-8 flex justify-end">
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
