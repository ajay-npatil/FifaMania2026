const RULES: { scenario: string; points: number }[] = [
  { scenario: "Exact score correct (winner + both scores match)", points: 50 },
  { scenario: "Draw predicted, draw happened, exact score matches", points: 65 },
  { scenario: "Correct winner + that team's score also matches (either side)", points: 35 },
  { scenario: "Correct winner only (scores wrong)", points: 25 },
  { scenario: "Draw predicted, draw happened, score didn't match", points: 25 },
  {
    scenario: "Draw predicted, no draw happened, but predicted number matches the actual loser's score",
    points: 10,
  },
  { scenario: "Anything else", points: 0 },
];

export default function ScoringRules() {
  return (
    <details className="mb-6 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-background/70 backdrop-blur-sm">
      <summary className="cursor-pointer font-medium text-sm text-accent">
        How points are scored
      </summary>
      <table className="w-full mt-3 text-sm">
        <thead>
          <tr className="text-left text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-1.5 pr-2">Scenario</th>
            <th className="py-1.5 text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {RULES.map((r) => (
            <tr key={r.scenario} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-1.5 pr-2">{r.scenario}</td>
              <td className="py-1.5 text-right font-medium text-accent">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
