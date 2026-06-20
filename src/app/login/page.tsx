"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [display_name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name, pin }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push("/predictions");
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Log in</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Display name
          <input
            className="border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 bg-transparent focus:outline-none focus:border-accent"
            value={display_name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          PIN
          <input
            className="border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 bg-transparent focus:outline-none focus:border-accent"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            type="password"
            inputMode="numeric"
            required
          />
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="text-sm mt-4">
        No account yet?{" "}
        <Link href="/signup" className="text-accent underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
