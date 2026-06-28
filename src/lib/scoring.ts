/**
 * Scoring engine for FifaMania predictions.
 *
 * Rules (agreed point values):
 * 1. Exact score correct, actual result is NOT a draw           -> 50
 * 2. Exact score correct, actual result IS a draw                -> 65
 * 3. Predicted a draw, actual result is a draw, score not exact  -> 25
 * 4. Predicted a draw, actual result has a winner, but the
 *    predicted score matches the actual LOSING team's score      -> 10
 * 5. Correct winner predicted, AND either the winner's or the
 *    loser's score also matches exactly                          -> 35
 * 6. Correct winner predicted only (no score matches)            -> 25
 * 7. Anything else (wrong winner, or predicted winner but
 *    actual was a draw)                                          -> 0
 */

export interface MatchScore {
  home: number;
  away: number;
}

export type PenaltyWinner = "HOME" | "AWAY";

/** Points for correctly calling a knockout penalty-shootout winner. */
export const PENALTY_WINNER_POINTS = 25;

export function scorePrediction(
  predicted: MatchScore,
  actual: MatchScore,
  penalty?: { predicted: PenaltyWinner | null; actual: PenaltyWinner | null }
): number {
  const base = baseScore(predicted, actual);

  // Knockout shootout: a draw on the pitch, decided on penalties. A user who
  // predicted a draw AND called the shootout winner correctly earns a bonus
  // equal to a normal "correct winner" pick.
  if (
    penalty?.actual &&
    actual.home === actual.away &&
    predicted.home === predicted.away &&
    penalty.predicted &&
    penalty.predicted === penalty.actual
  ) {
    return base + PENALTY_WINNER_POINTS;
  }

  return base;
}

function baseScore(predicted: MatchScore, actual: MatchScore): number {
  if (
    !isNonNegativeInteger(predicted.home) ||
    !isNonNegativeInteger(predicted.away) ||
    !isNonNegativeInteger(actual.home) ||
    !isNonNegativeInteger(actual.away)
  ) {
    throw new Error("Scores must be non-negative integers");
  }

  const exactMatch =
    predicted.home === actual.home && predicted.away === actual.away;
  const actualIsDraw = actual.home === actual.away;
  const predictedIsDraw = predicted.home === predicted.away;

  // --- Actual result was a draw ---
  if (actualIsDraw) {
    if (predictedIsDraw) {
      return exactMatch ? 65 : 25;
    }
    // Predicted a winner, but it was actually a draw: no rule grants
    // partial credit for this case.
    return 0;
  }

  // --- Actual result had a winner ---
  const actualHomeWon = actual.home > actual.away;

  if (predictedIsDraw) {
    // Predicted a draw, but there was a winner. Check whether the
    // (single) predicted value matches the actual LOSER's score.
    const actualLoserScore = actualHomeWon ? actual.away : actual.home;
    return predicted.home === actualLoserScore ? 10 : 0;
  }

  // Predicted a winner (not a draw).
  const predictedHomeWon = predicted.home > predicted.away;
  const winnerCorrect = predictedHomeWon === actualHomeWon;

  if (!winnerCorrect) {
    return 0;
  }

  if (exactMatch) {
    return 50;
  }

  const predictedWinnerScore = predictedHomeWon ? predicted.home : predicted.away;
  const actualWinnerScore = actualHomeWon ? actual.home : actual.away;
  const predictedLoserScore = predictedHomeWon ? predicted.away : predicted.home;
  const actualLoserScore = actualHomeWon ? actual.away : actual.home;

  const winnerScoreMatches = predictedWinnerScore === actualWinnerScore;
  const loserScoreMatches = predictedLoserScore === actualLoserScore;

  if (winnerScoreMatches || loserScoreMatches) {
    return 35;
  }

  return 25;
}

function isNonNegativeInteger(n: number): boolean {
  return Number.isInteger(n) && n >= 0;
}
