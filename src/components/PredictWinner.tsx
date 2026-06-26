"use client";

import { useEffect, useState, type ReactNode } from "react";
import { flagFor } from "@/lib/flags";
import {
  GOLDEN_BALL_CANDIDATES,
  GOLDEN_GLOVE_CANDIDATES,
} from "@/lib/awards";

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
  golden_ball: string | null;
  golden_glove: string | null;
  golden_ball_points: number | null;
  golden_glove_points: number | null;
}

interface Results {
  top_country: string | null;
  top_scorer: string | null;
  golden_ball: string | null;
  golden_glove: string | null;
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

// One stage of the tournament. The picks are a set of teams — order and
// pairing don't matter, only whether a team reaches the stage.
function StageCard({
  title,
  subtitle,
  points,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  points?: number | null;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-lg p-4 ${
        accent
          ? "border-2 border-accent/60"
          : "border border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-zinc-500">
          {subtitle}
          {points != null && points > 0 && (
            <span className="ml-2 font-medium text-green-600 dark:text-green-400">
              +{points}
            </span>
          )}
        </span>
      </div>
      {children}
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

export default function PredictWinner() {
  const [data, setData] = useState<Data | null>(null);
  const [country, setCountry] = useState("");
  const [scorer, setScorer] = useState("");
  const [qf, setQf] = useState<string[]>(() => Array(8).fill(""));
  const [sf, setSf] = useState<string[]>(() => Array(4).fill(""));
  const [fin, setFin] = useState<string[]>(() => Array(2).fill(""));
  const [winner, setWinner] = useState("");
  const [third, setThird] = useState("");
  const [goldenBall, setGoldenBall] = useState("");
  const [goldenGlove, setGoldenGlove] = useState("");
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
    setGoldenBall(d.pick?.golden_ball ?? "");
    setGoldenGlove(d.pick?.golden_glove ?? "");
    // Prune saved picks down the cascade so a stage never shows a team that
    // isn't eligible from the stage before it.
    const loadedQf = pad(d.bracket?.qf, 8);
    const allowedQf = new Set(loadedQf.filter(Boolean));
    const loadedSf = pad(d.bracket?.sf, 4).map((t) => (allowedQf.has(t) ? t : ""));
    const allowedSf = new Set(loadedSf.filter(Boolean));
    const loadedFin = pad(d.bracket?.final, 2).map((t) =>
      allowedSf.has(t) ? t : ""
    );
    const allowedFin = new Set(loadedFin.filter(Boolean));
    setQf(loadedQf);
    setSf(loadedSf);
    setFin(loadedFin);
    setWinner(d.bracket?.winner && allowedFin.has(d.bracket.winner) ? d.bracket.winner : "");
    setThird(
      d.bracket?.third &&
        allowedSf.has(d.bracket.third) &&
        !allowedFin.has(d.bracket.third)
        ? d.bracket.third
        : ""
    );
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
        golden_ball: goldenBall,
        golden_glove: goldenGlove,
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

  if (loading || !data) return <p>Loading...</p>;

  const lockMs = new Date(data.lockAt).getTime() - now;
  const locked = data.locked || lockMs <= 0;
  const settled = !!data.results?.settled_at;

  // Each stage can only choose from the teams picked in the previous stage,
  // so nobody can advance a team they didn't put through. Changing an upstream
  // pick prunes any downstream picks that are no longer eligible.
  const qfPicks = [...new Set(qf.filter(Boolean))];
  const sfPicks = [...new Set(sf.filter(Boolean))];
  const finPicks = [...new Set(fin.filter(Boolean))];
  // Third place is decided between the losing semi-finalists, so a finalist
  // can't also be third — third place comes from semi-finalists not in the final.
  const finSet = new Set(finPicks);
  const thirdOptions = sfPicks.filter((t) => !finSet.has(t));

  const changeQf = (i: number, v: string) => {
    const nextQf = qf.map((x, idx) => (idx === i ? v : x));
    const allowedQf = new Set(nextQf.filter(Boolean));
    const nextSf = sf.map((t) => (allowedQf.has(t) ? t : ""));
    const allowedSf = new Set(nextSf.filter(Boolean));
    const nextFin = fin.map((t) => (allowedSf.has(t) ? t : ""));
    const allowedFin = new Set(nextFin.filter(Boolean));
    setQf(nextQf);
    setSf(nextSf);
    setFin(nextFin);
    setWinner((w) => (w && allowedFin.has(w) ? w : ""));
    setThird((t) => (t && allowedSf.has(t) && !allowedFin.has(t) ? t : ""));
  };

  const changeSf = (i: number, v: string) => {
    const nextSf = sf.map((x, idx) => (idx === i ? v : x));
    const allowedSf = new Set(nextSf.filter(Boolean));
    const nextFin = fin.map((t) => (allowedSf.has(t) ? t : ""));
    const allowedFin = new Set(nextFin.filter(Boolean));
    setSf(nextSf);
    setFin(nextFin);
    setWinner((w) => (w && allowedFin.has(w) ? w : ""));
    setThird((t) => (t && allowedSf.has(t) && !allowedFin.has(t) ? t : ""));
  };

  const changeFin = (i: number, v: string) => {
    const nextFin = fin.map((x, idx) => (idx === i ? v : x));
    const allowedFin = new Set(nextFin.filter(Boolean));
    setFin(nextFin);
    setWinner((w) => (w && allowedFin.has(w) ? w : ""));
    // A newly-named finalist can no longer be the third-place pick.
    setThird((t) => (t && !allowedFin.has(t) ? t : ""));
  };

  // A team already chosen in another slot of the same stage drops out of the
  // remaining dropdowns, so the same team can't be picked twice in one stage.
  const without = (base: string[], stage: string[], i: number) =>
    base.filter((t) => t === stage[i] || !stage.some((v, idx) => idx !== i && v === t));

  const qfSlot = (i: number) => (
    <TeamSelect
      value={qf[i]}
      disabled={locked}
      teams={without(data.countries, qf, i)}
      mark={hitMark(qf[i], data.bracketReveal.qf, data.bracketActuals.qf)}
      onChange={(v) => changeQf(i, v)}
    />
  );
  const sfSlot = (i: number) => (
    <TeamSelect
      value={sf[i]}
      disabled={locked}
      teams={without(qfPicks, sf, i)}
      mark={hitMark(sf[i], data.bracketReveal.sf, data.bracketActuals.sf)}
      onChange={(v) => changeSf(i, v)}
    />
  );
  const finSlot = (i: number) => (
    <TeamSelect
      value={fin[i]}
      disabled={locked}
      teams={without(sfPicks, fin, i)}
      mark={hitMark(fin[i], data.bracketReveal.final, data.bracketActuals.final)}
      onChange={(v) => changeFin(i, v)}
    />
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Predict a Winner</h1>
      <p className="text-sm text-zinc-500 mb-1">
        Tournament-long calls, each worth{" "}
        <strong>{data.points} points</strong> if you nail it: the{" "}
        <strong>country</strong> that scores the most goals, the{" "}
        <strong>golden boot</strong> (top scorer), the{" "}
        <strong>Golden Ball</strong> (best player) and the{" "}
        <strong>Golden Glove</strong> (best goalkeeper).
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
          <p className="text-sm">
            Golden Ball: <strong>{data.results?.golden_ball || "—"}</strong>
          </p>
          <p className="text-sm">
            Golden Glove: <strong>{data.results?.golden_glove || "—"}</strong>
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

        {/* Golden Ball pick */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <label className="block font-medium mb-2">
            Golden Ball (best player)
          </label>
          <select
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 bg-transparent focus:outline-none focus:border-accent disabled:opacity-60"
            value={goldenBall}
            disabled={locked}
            onChange={(e) => setGoldenBall(e.target.value)}
          >
            <option value="">— Pick a player —</option>
            {GOLDEN_BALL_CANDIDATES.map((c) => (
              <option key={c.name} value={c.name}>
                {flagFor(c.country)} {c.name}
              </option>
            ))}
          </select>
          {settled && data.pick && (
            <p className="text-xs mt-2 font-medium">
              {data.pick.golden_ball_points
                ? `✅ Correct — +${data.pick.golden_ball_points} pts`
                : "❌ Not this time — 0 pts"}
            </p>
          )}
        </div>

        {/* Golden Glove pick */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <label className="block font-medium mb-2">
            Golden Glove (best goalkeeper)
          </label>
          <select
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 bg-transparent focus:outline-none focus:border-accent disabled:opacity-60"
            value={goldenGlove}
            disabled={locked}
            onChange={(e) => setGoldenGlove(e.target.value)}
          >
            <option value="">— Pick a goalkeeper —</option>
            {GOLDEN_GLOVE_CANDIDATES.map((c) => (
              <option key={c.name} value={c.name}>
                {flagFor(c.country)} {c.name}
              </option>
            ))}
          </select>
          {settled && data.pick && (
            <p className="text-xs mt-2 font-medium">
              {data.pick.golden_glove_points
                ? `✅ Correct — +${data.pick.golden_glove_points} pts`
                : "❌ Not this time — 0 pts"}
            </p>
          )}
        </div>
      </div>

      {/* Stage predictions */}
      <div className="mt-12">
        <h2 className="text-lg font-semibold mb-1">Stage predictions</h2>
        <p className="text-sm text-zinc-500 mb-1">
          Pick which teams reach each stage — it doesn&apos;t matter who plays
          whom or which side of the draw they&apos;re on, only whether a team
          makes it. Each stage can only use teams from the stage before it (your
          semi-finalists must be among your quarter-finalists, and so on). Points
          per correct team:{" "}
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
            Stage points so far:{" "}
            <span className="text-accent">{data.bracketPoints.total}</span>
          </p>
        )}

        <div className="flex flex-col gap-4">
          <StageCard
            title="Quarter-finalists"
            subtitle={`pick up to 8 · ${data.bracketConfig.qf} pts each`}
            points={data.bracketReveal.qf ? data.bracketPoints.qf : null}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i}>{qfSlot(i)}</div>
              ))}
            </div>
          </StageCard>

          <StageCard
            title="Semi-finalists"
            subtitle={`pick 4 of your quarter-finalists · ${data.bracketConfig.sf} pts each`}
            points={data.bracketReveal.sf ? data.bracketPoints.sf : null}
          >
            {qfPicks.length === 0 ? (
              <p className="text-xs text-zinc-400">
                Pick your quarter-finalists above first.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i}>{sfSlot(i)}</div>
                ))}
              </div>
            )}
          </StageCard>

          <StageCard
            title="Finalists"
            subtitle={`pick 2 of your semi-finalists · ${data.bracketConfig.final} pts each`}
            points={data.bracketReveal.final ? data.bracketPoints.final : null}
          >
            {sfPicks.length === 0 ? (
              <p className="text-xs text-zinc-400">
                Pick your semi-finalists above first.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {[0, 1].map((i) => (
                  <div key={i}>{finSlot(i)}</div>
                ))}
              </div>
            )}
          </StageCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StageCard
              title="🏆 Winner"
              subtitle={`one of your finalists · ${data.bracketConfig.winner} pts`}
              points={data.bracketReveal.winner ? data.bracketPoints.winner : null}
              accent
            >
              {finPicks.length === 0 ? (
                <p className="text-xs text-zinc-400">Pick your finalists first.</p>
              ) : (
                <TeamSelect
                  value={winner}
                  disabled={locked}
                  teams={finPicks}
                  mark={hitMark(
                    winner,
                    data.bracketReveal.winner,
                    data.bracketActuals.winner ? [data.bracketActuals.winner] : []
                  )}
                  onChange={setWinner}
                />
              )}
            </StageCard>

            <StageCard
              title="🥉 Third place"
              subtitle={`one of your semi-finalists · ${data.bracketConfig.third} pts`}
              points={data.bracketReveal.third ? data.bracketPoints.third : null}
            >
              {thirdOptions.length === 0 ? (
                <p className="text-xs text-zinc-400">
                  Pick semi-finalists who aren&apos;t your finalists first.
                </p>
              ) : (
                <TeamSelect
                  value={third}
                  disabled={locked}
                  teams={thirdOptions}
                  mark={hitMark(
                    third,
                    data.bracketReveal.third,
                    data.bracketActuals.third ? [data.bracketActuals.third] : []
                  )}
                  onChange={setThird}
                />
              )}
            </StageCard>
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
