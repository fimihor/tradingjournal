export type TradeResult = { result: string };

export function hasCompletedResult(result: string) {
  return /[+-]?\$?\d/.test(result.trim());
}

export function resultAmount(result: string) {
  const value = Number(result.replace(/[^\d.-]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

export function calculateTradeMetrics(entries: TradeResult[]) {
  const completed = entries.filter((entry) => hasCompletedResult(entry.result));
  const amounts = completed.map((entry) => resultAmount(entry.result));
  const net = amounts.reduce((total, amount) => total + amount, 0);
  const wins = amounts.filter((amount) => amount > 0);
  const losses = amounts.filter((amount) => amount < 0);
  const grossProfit = wins.reduce((total, amount) => total + amount, 0);
  const grossLoss = Math.abs(losses.reduce((total, amount) => total + amount, 0));
  const winRate = completed.length ? (wins.length / completed.length) * 100 : 0;
  const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0;
  const average = completed.length ? net / completed.length : 0;
  return { count: completed.length, open: entries.length - completed.length, net, winRate, profitFactor, average, wins: wins.length, losses: losses.length };
}
