"use client";

import { useState } from "react";

export default function AccountPage() {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPin !== confirmPin) {
      setError("New PIN and confirmation don't match.");
      return;
    }
    if (!/^\d{4,8}$/.test(newPin)) {
      setError("New PIN must be 4-8 digits.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/account/change-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_pin: currentPin, new_pin: newPin }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Could not change PIN.");
      return;
    }

    setMessage("PIN changed. Use your new PIN next time you log in.");
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Your account</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Change your PIN here at any time — for example, after an admin has
        given you a temporary one.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Current PIN
          <input
            type="password"
            inputMode="numeric"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value)}
            className="border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 bg-transparent"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          New PIN (4-8 digits)
          <input
            type="password"
            inputMode="numeric"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            className="border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 bg-transparent"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Confirm new PIN
          <input
            type="password"
            inputMode="numeric"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            className="border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 bg-transparent"
            required
          />
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Change PIN"}
        </button>
      </form>
    </div>
  );
}
