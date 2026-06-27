"use client";

import { useEffect, useState } from "react";
import MatchPredictor from "@/components/MatchPredictor";
import PredictWinner from "@/components/PredictWinner";
import EveryonesPicks from "@/components/EveryonesPicks";

type Tab = "match" | "winner" | "everyone";

export default function PredictionsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const t = new URLSearchParams(window.location.search).get("tab");
      if (t === "winner") return "winner";
      if (t === "everyone") return "everyone";
    }
    return "match";
  });

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(!!d.user?.is_admin))
      .catch(() => {});
  }, []);

  function select(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "match") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${
      tab === t
        ? "border-accent text-accent font-medium"
        : "border-transparent text-zinc-500 hover:text-accent"
    }`;

  // Non-admins can't use the Everyone's Picks tab even via ?tab=everyone.
  const activeTab = tab === "everyone" && !isAdmin ? "match" : tab;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800 mb-6">
        <button onClick={() => select("match")} className={tabClass("match")}>
          Match Predictor
        </button>
        <button
          onClick={() => select("winner")}
          className={`${tabClass("winner")} flex items-center gap-1.5 ${
            tab === "winner" ? "" : "text-accent"
          }`}
        >
          Predict a Winner
          <span className="rounded-full bg-accent text-accent-foreground text-[10px] font-bold leading-none px-1.5 py-0.5 animate-pulse">
            NEW
          </span>
        </button>
        {isAdmin && (
          <button
            onClick={() => select("everyone")}
            className={tabClass("everyone")}
          >
            Everyone&apos;s Picks
          </button>
        )}
      </div>

      {activeTab === "match" && <MatchPredictor />}
      {activeTab === "winner" && <PredictWinner />}
      {activeTab === "everyone" && <EveryonesPicks />}
    </div>
  );
}
