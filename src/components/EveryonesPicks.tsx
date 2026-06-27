"use client";

import { useEffect, useState } from "react";
import { flagFor } from "@/lib/flags";
import {
  GOLDEN_BALL_CANDIDATES,
  GOLDEN_GLOVE_CANDIDATES,
} from "@/lib/awards";

interface BracketPicks {
  qf: string[];
  sf: string[];
  final: string[];
  winner: string | null;
  third: string | null;
}

interface PlayerPicks {
  display_name: string;
  top_country: string | null;
  top_scorer: string | null;
  golden_ball: string | null;
  golden_glove: string | null;
  bracket: BracketPicks;
}

interface Data {
  locked: boolean;
  lockAt: string;
  picks: PlayerPicks[];
}

const ballCountry = new Map(
  GOLDEN_BALL_CANDIDATES.map((c) => [c.name, c.country])
);
const gloveCountry = new Map(
  GOLDEN_GLOVE_CANDIDATES.map((c) => [c.name, c.country])
);

function countdownLabel(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h until picks are revealed`;
  if (h > 0) return `${h}h ${m}m until picks are revealed`;
  if (m > 0) return `${m}m ${sec}s until picks are revealed`;
  return `${sec}s until picks are revealed`;
}

function TeamChip({ team }: { team: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 text-xs">
      {flagFor(team)} {team}
    </span>
  );
}

function Field({
  label,
  value,
  flag,
}: {
  label: string;
  value: string | null;
  flag?: string;
}) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-right">
        {value ? `${flag ? flag + " " : ""}${value}` : "—"}
      </span>
    </div>
  );
}

function ChipRow({ label, teams }: { label: string; teams: string[] }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      {teams.length === 0 ? (
        <p className="text-xs text-zinc-400">—</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {teams.map((t, i) => (
            <TeamChip key={`${t}-${i}`} team={t} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function EveryonesPicks() {
  const [data, setData] = useState<Data | null>(null);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetch("/api/predict-winner/all")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return null;
        }
        if (r.status === 403) {
          setDenied(true);
          return null;
        }
        return r.json();
      })
      .then((d: Data | null) => d && setData(d))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <p>Loading...</p>;

  if (denied)
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">Everyone&apos;s Picks</h1>
        <p className="text-sm text-zinc-500">This page is for admins only.</p>
      </div>
    );

  if (!data) return <p>Loading...</p>;

  if (!data.locked) {
    const ms = new Date(data.lockAt).getTime() - now;
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">Everyone&apos;s Picks</h1>
        <p className="text-sm text-zinc-500 mb-4">
          To keep things fair, everyone&apos;s Predict-a-Winner picks stay hidden
          until predictions freeze.
        </p>
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          🔒 {ms > 0 ? countdownLabel(ms) : "Revealing..."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Everyone&apos;s Picks</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Predictions are frozen — here&apos;s what everyone went with.
      </p>

      {data.picks.length === 0 ? (
        <p className="text-sm text-zinc-500">No picks were submitted.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {data.picks.map((p) => (
            <div
              key={p.display_name}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-background/70 backdrop-blur-sm p-4"
            >
              <h2 className="font-semibold mb-3">{p.display_name}</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mb-4">
                <Field
                  label="Most goals"
                  value={p.top_country}
                  flag={p.top_country ? flagFor(p.top_country) : undefined}
                />
                <Field label="Golden Boot" value={p.top_scorer} />
                <Field
                  label="Golden Ball"
                  value={p.golden_ball}
                  flag={
                    p.golden_ball
                      ? flagFor(ballCountry.get(p.golden_ball) ?? "")
                      : undefined
                  }
                />
                <Field
                  label="Golden Glove"
                  value={p.golden_glove}
                  flag={
                    p.golden_glove
                      ? flagFor(gloveCountry.get(p.golden_glove) ?? "")
                      : undefined
                  }
                />
              </div>

              <div className="flex flex-col gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                <ChipRow label="Quarter-finalists" teams={p.bracket.qf} />
                <ChipRow label="Semi-finalists" teams={p.bracket.sf} />
                <ChipRow label="Finalists" teams={p.bracket.final} />
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">🏆 Winner</p>
                    {p.bracket.winner ? (
                      <TeamChip team={p.bracket.winner} />
                    ) : (
                      <p className="text-xs text-zinc-400">—</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">🥉 Third place</p>
                    {p.bracket.third ? (
                      <TeamChip team={p.bracket.third} />
                    ) : (
                      <p className="text-xs text-zinc-400">—</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
