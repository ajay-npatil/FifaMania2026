import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold mb-4">⚽ FifaMania</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-8">
        Predict World Cup scores, earn points, and climb the leaderboard with
        your friends. Predictions lock 15 minutes before kickoff.
      </p>
      <div className="flex justify-center gap-4">
        <Link
          href="/signup"
          className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium"
        >
          Create an account
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
