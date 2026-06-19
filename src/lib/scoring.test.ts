import { describe, expect, it } from "vitest";
import { scorePrediction } from "./scoring";

describe("scorePrediction", () => {
  it("awards 50 for an exact non-draw score", () => {
    expect(
      scorePrediction({ home: 2, away: 1 }, { home: 2, away: 1 })
    ).toBe(50);
  });

  it("awards 65 for an exact draw score", () => {
    expect(
      scorePrediction({ home: 1, away: 1 }, { home: 1, away: 1 })
    ).toBe(65);
  });

  it("awards 25 for predicting a draw that happened, wrong scoreline", () => {
    expect(
      scorePrediction({ home: 0, away: 0 }, { home: 2, away: 2 })
    ).toBe(25);
  });

  it("awards 10 for predicting a draw when there was a winner, but the score matches the loser's actual score (South Africa vs USA example)", () => {
    // Predicted 1-1, actual 3-1 (home team won, away team is the loser with 1 goal)
    expect(
      scorePrediction({ home: 1, away: 1 }, { home: 3, away: 1 })
    ).toBe(10);
  });

  it("awards 0 for predicting a draw when there was a winner and no number matches the loser's score", () => {
    expect(
      scorePrediction({ home: 2, away: 2 }, { home: 3, away: 1 })
    ).toBe(0);
  });

  it("awards 35 for correct winner + winner's score matching", () => {
    // Predicted 2-0, actual 2-1: winner correct, winner's score (2) matches
    expect(
      scorePrediction({ home: 2, away: 0 }, { home: 2, away: 1 })
    ).toBe(35);
  });

  it("awards 35 for correct winner + loser's score matching", () => {
    // Predicted 2-1, actual 3-1: winner correct, loser's score (1) matches
    expect(
      scorePrediction({ home: 2, away: 1 }, { home: 3, away: 1 })
    ).toBe(35);
  });

  it("awards 25 for correct winner only, no score matches", () => {
    expect(
      scorePrediction({ home: 2, away: 0 }, { home: 4, away: 1 })
    ).toBe(25);
  });

  it("awards 0 for the wrong winner", () => {
    expect(
      scorePrediction({ home: 0, away: 2 }, { home: 2, away: 1 })
    ).toBe(0);
  });

  it("awards 0 for predicting a winner when the actual result was a draw", () => {
    expect(
      scorePrediction({ home: 2, away: 1 }, { home: 1, away: 1 })
    ).toBe(0);
  });

  it("treats home and away symmetrically for the away team winning", () => {
    // Predicted 1-2 (away wins), actual 1-3 (away wins): winner correct,
    // loser's score (1) matches
    expect(
      scorePrediction({ home: 1, away: 2 }, { home: 1, away: 3 })
    ).toBe(35);
  });

  it("rejects negative or non-integer scores", () => {
    expect(() =>
      scorePrediction({ home: -1, away: 0 }, { home: 1, away: 0 })
    ).toThrow();
    expect(() =>
      scorePrediction({ home: 1.5, away: 0 }, { home: 1, away: 0 })
    ).toThrow();
  });
});
