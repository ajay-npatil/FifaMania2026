"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  display_name: string;
  is_admin: boolean;
}

export default function Nav() {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .finally(() => setLoaded(true));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="w-full border-b border-zinc-200 dark:border-zinc-800 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-lg">
          <span className="text-accent">⚽</span> FifaMania
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/predictions" className="hover:text-accent">
            Predictions
          </Link>
          <Link href="/results" className="hover:text-accent">
            Results
          </Link>
          <Link href="/leaderboard" className="hover:text-accent">
            Leaderboard
          </Link>
          {loaded && user?.is_admin && (
            <Link href="/admin" className="hover:text-accent">
              Admin
            </Link>
          )}
          {loaded && user ? (
            <>
              <span className="text-zinc-500">Hi, {user.display_name}</span>
              <Link href="/account" className="hover:text-accent">
                Account
              </Link>
              <button onClick={logout} className="underline hover:text-accent">
                Log out
              </button>
            </>
          ) : (
            loaded && (
              <Link href="/login" className="hover:text-accent">
                Log in
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
