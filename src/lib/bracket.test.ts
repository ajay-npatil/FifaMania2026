import { describe, it, expect } from "vitest";
import { scoreBracket, type BracketActuals, type BracketPicks } from "./bracket";

const allRevealed = { qf: true, sf: true, final: true, winner: true, third: true };

function actuals(partial: Partial<BracketActuals>): BracketActuals {
  return {
    qf: [],
    sf: [],
    final: [],
    winner: null,
    third: null,
    revealed: allRevealed,
    ...partial,
  };
}

function picks(partial: Partial<BracketPicks>): BracketPicks {
  return { qf: [], sf: [], final: [], winner: null, third: null, ...partial };
}

describe("scoreBracket", () => {
  it("awards 50 per correct quarter-finalist", () => {
    const score = scoreBracket(
      picks({ qf: ["Brazil", "France", "Spain"] }),
      actuals({ qf: ["Brazil", "France", "Argentina"] })
    );
    expect(score.qf).toBe(100); // Brazil + France
    expect(score.total).toBe(100);
  });

  it("escalates points by stage", () => {
    const score = scoreBracket(
      picks({
        sf: ["Brazil"],
        final: ["Brazil"],
        winner: "Brazil",
        third: "France",
      }),
      actuals({
        sf: ["Brazil"],
        final: ["Brazil"],
        winner: "Brazil",
        third: "France",
      })
    );
    expect(score.sf).toBe(100);
    expect(score.final).toBe(175);
    expect(score.winner).toBe(250);
    expect(score.third).toBe(250);
    expect(score.total).toBe(775);
  });

  it("does not count a stage until it is revealed", () => {
    const score = scoreBracket(
      picks({ qf: ["Brazil"] }),
      actuals({ qf: ["Brazil"], revealed: { ...allRevealed, qf: false } })
    );
    expect(score.qf).toBe(0);
  });

  it("matches names case- and accent-insensitively", () => {
    const score = scoreBracket(
      picks({ winner: "cote d'ivoire" }),
      actuals({ winner: "Côte d'Ivoire" })
    );
    expect(score.winner).toBe(250);
  });

  it("does not double-count a duplicated pick", () => {
    const score = scoreBracket(
      picks({ qf: ["Brazil", "Brazil"] }),
      actuals({ qf: ["Brazil"] })
    );
    expect(score.qf).toBe(50);
  });

  it("awards nothing for wrong picks", () => {
    const score = scoreBracket(
      picks({ winner: "Germany", third: "Italy" }),
      actuals({ winner: "Brazil", third: "France" })
    );
    expect(score.total).toBe(0);
  });
});
