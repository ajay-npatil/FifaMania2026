"use client";

import { useState } from "react";
import MatchPredictor from "@/components/MatchPredictor";
import PredictWinner from "@/components/PredictWinner";

type Tab = "match" | "winner";

export default function PredictionsPage() {
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("tab") === "winner"
        ? "winner"
        : "match";
    }
    return "match";
  });

  function select(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "winner") url.searchParams.set("tab", "winner");
    else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url.toString());
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${
      tab === t
        ? "border-accent text-accent font-medium"
        : "border-transparent text-zinc-500 hover:text-accent"
    }`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800 mb-6">
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
      </div>

      {tab === "match" ? <MatchPredictor /> : <PredictWinner />}
    </div>
  );
}
