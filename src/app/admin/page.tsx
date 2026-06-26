"use client";

import { useEffect, useState } from "react";

interface AdminUser {
  id: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [snapResult, setSnapResult] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);
  const [settleResult, setSettleResult] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState<string | null>(null);

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
    setUsersLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    void loadUsers();
  }, []);

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

  async function snapshot() {
    const confirmed = window.confirm(
      "Freeze the current standings? The leaderboard will show movement (▲/▼ and points gained) relative to this moment. Do this right before a round begins."
    );
    if (!confirmed) return;

    setSnapping(true);
    setSnapResult(null);
    const res = await fetch("/api/admin/snapshot", { method: "POST" });
    const data = await res.json();
    setSnapping(false);
    if (!res.ok) {
      setSnapResult(data.error ?? "Snapshot failed.");
      return;
    }
    setSnapResult(`Captured standings for ${data.captured} players.`);
  }

  async function settleTournament() {
    const confirmed = window.confirm(
      "Settle Predict-a-Winner? This reads the final top-scoring country and top scorer and awards 175 points for each correct pick. Only do this once the tournament is over (it's safe to re-run if results change)."
    );
    if (!confirmed) return;

    setSettling(true);
    setSettleResult(null);
    const res = await fetch("/api/admin/settle-tournament", { method: "POST" });
    const data = await res.json();
    setSettling(false);
    if (!res.ok) {
      setSettleResult(data.error ?? "Settle failed.");
      return;
    }
    setSettleResult(
      `Settled ${data.settled} entries. Top country: ${
        data.countryLeaders?.join(", ") || "—"
      } (${data.countryWinners} winners). Top scorer: ${
        data.scorerLeaders?.join(", ") || "—"
      } (${data.scorerWinners} winners).`
    );
  }

  async function deleteUser(u: AdminUser) {
    const confirmed = window.confirm(
      `Delete ${u.display_name}? This removes their login and every prediction they've made. This can't be undone.`
    );
    if (!confirmed) return;

    setDeletingId(u.id);
    setUserMessage(null);
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    const data = await res.json();
    setDeletingId(null);

    if (!res.ok) {
      setUserMessage(data.error ?? "Failed to delete user.");
      return;
    }
    setUserMessage(`Deleted ${u.display_name} and their predictions.`);
    await loadUsers();
  }

  async function resetPin(u: AdminUser) {
    const pin = window.prompt(
      `Enter a new 4-8 digit PIN for ${u.display_name}:`
    );
    if (pin === null) return;

    if (!/^\d{4,8}$/.test(pin)) {
      setUserMessage("PIN must be 4-8 digits.");
      return;
    }

    setResettingId(u.id);
    setUserMessage(null);
    const res = await fetch(`/api/admin/users/${u.id}/reset-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    setResettingId(null);

    if (!res.ok) {
      setUserMessage(data.error ?? "Failed to reset PIN.");
      return;
    }
    setUserMessage(`PIN reset for ${u.display_name}. Tell them their new PIN.`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Admin</h1>

      <section className="mb-10">
        <p className="text-sm text-zinc-500 mb-4">
          Pulls fixtures and results from football-data.org and re-scores any
          newly finished matches. Run this periodically (e.g. once a day, or
          after matches finish). Only visible to admin accounts.
        </p>
        <button
          onClick={sync}
          disabled={loading}
          className="rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Syncing..." : "Sync World Cup fixtures"}
        </button>
        {result && <p className="mt-4 text-sm">{result}</p>}
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-2">Leaderboard movers</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Freezes the current standings. Afterwards the leaderboard shows each
          player&apos;s rank movement (▲/▼) and points gained since this
          snapshot. Capture one right before a round begins (e.g. before Round
          of 32).
        </p>
        <button
          onClick={snapshot}
          disabled={snapping}
          className="rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {snapping ? "Capturing..." : "Capture standings snapshot"}
        </button>
        {snapResult && <p className="mt-4 text-sm">{snapResult}</p>}
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-2">Settle Predict-a-Winner</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Awards 175 points for each correct tournament-long pick (top-scoring
          country and golden boot). Run once after the final. Re-running is safe
          and just recomputes from the latest results.
        </p>
        <button
          onClick={settleTournament}
          disabled={settling}
          className="rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {settling ? "Settling..." : "Settle Predict-a-Winner"}
        </button>
        {settleResult && <p className="mt-4 text-sm">{settleResult}</p>}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Manage logins</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Deleting a login permanently removes that account and all of its
          predictions.
        </p>
        {userMessage && <p className="mb-3 text-sm">{userMessage}</p>}

        {usersLoading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : (
          <div className="flex flex-col">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 py-3"
              >
                <div>
                  <p className="font-medium">
                    {u.display_name}
                    {u.is_admin && (
                      <span className="ml-2 text-xs text-zinc-500">(admin)</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Joined {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => resetPin(u)}
                    disabled={resettingId === u.id}
                    className="text-sm text-accent underline disabled:opacity-50"
                  >
                    {resettingId === u.id ? "Resetting..." : "Reset PIN"}
                  </button>
                  <button
                    onClick={() => deleteUser(u)}
                    disabled={deletingId === u.id}
                    className="text-sm text-red-600 dark:text-red-400 underline disabled:opacity-50"
                  >
                    {deletingId === u.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-sm text-zinc-500">No users yet.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
