import { describe, expect, it } from "vitest";
import { calculateTradeMetrics } from "../shared/tradeMetrics";

describe("dashboard trade metrics", () => {
  it("starts with zero values for a new journal", () => {
    expect(calculateTradeMetrics([])).toMatchObject({ count: 0, net: 0, winRate: 0, profitFactor: 0, average: 0 });
  });

  it("tallies net P&L, wins, losses, win rate, and profit factor", () => {
    const metrics = calculateTradeMetrics([{ result: "+$200.00" }, { result: "-$50.00" }, { result: "+$100.00" }]);

    expect(metrics.count).toBe(3);
    expect(metrics.net).toBe(250);
    expect(metrics.wins).toBe(2);
    expect(metrics.losses).toBe(1);
    expect(metrics.winRate).toBeCloseTo(66.6667, 3);
    expect(metrics.profitFactor).toBe(6);
    expect(metrics.average).toBeCloseTo(83.3333, 3);
  });

  it("keeps an open entry out of the completed performance totals", () => {
    const metrics = calculateTradeMetrics([{ result: "Open" }, { result: "+$100.00" }]);

    expect(metrics.count).toBe(1);
    expect(metrics.open).toBe(1);
    expect(metrics.net).toBe(100);
  });
});
