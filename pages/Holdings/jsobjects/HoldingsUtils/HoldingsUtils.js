export default {
  formatCurrency(val) {
    if (val === undefined || val === null || isNaN(Number(val))) return '€0,00';
    return '€' + Number(val).toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },

  // Source data for the Holdings table. Each visible money/change column shows a
  // formatted string (e.g. "€2.640,00" or "+€12,34 (+1.23%)"), which the table
  // would otherwise sort lexicographically. Appsmith's client-side sort compares
  // the raw value at the column's alias, so we expose hidden numeric "twins" here
  // and point those columns' aliases at them. The display still comes from the
  // column's formatted computedValue.
  getTableData() {
    const rows = GetHoldings.data || [];
    return rows.map((row) => ({
      ...row,
      // The "Value" column is bound to `nativeValue` but displays `currentValue`
      // (base currency). Point its sort key at the value it shows.
      nativeValue: Number(row.currentValue) || 0,
      _sortCost: Number(row.avgPurchasePrice) || 0,
      _sortCurrentPrice: Number(row.currentPrice) || 0,
      _sort24Hr: Number(row.dayChange) || 0,
      _sortWeekly: Number(row.weekChange) || 0,
      _sortGain: Number(row.unrealizedPnL) || 0,
    }));
  },

  // Goal (purpose) buckets, e.g. Y-balloon, education, retirement. Reads only the
  // summary query; GetHoldings depends on the goal filter widget, so reading
  // GetHoldings.data here would create a cycle.
  getGoalOptions() {
    const fromSummary = GetPortfolioOverview.data?.[0]?.availableGoals || [];
    const list = fromSummary.length ? fromSummary : ['Y-balloon', 'education', 'retirement'];
    const options = [{ label: "All Goals", value: "ALL" }];
    list.forEach(g => options.push({ label: g, value: g }));
    return options;
  },

  // Owner/currency portfolios, e.g. EUR, USD, Samarth. Reads only the summary
  // query; GetHoldings depends on the portfolio filter widget, so reading
  // GetHoldings.data here would create a cycle.
  getPortfolioOptions() {
    const fromSummary = GetPortfolioOverview.data?.[0]?.availablePortfolios || [];
    const list = fromSummary.length ? fromSummary : ['EUR', 'Samarth', 'USD'];
    const options = [{ label: "All Portfolios", value: "ALL" }];
    list.forEach(p => options.push({ label: p, value: p }));
    return options;
  },

  // Totals for the summary bar. They follow the table filter because they read
  // the same (already filtered) GetHoldings result.
  getTotalValue() {
    return (GetHoldings.data || []).reduce((sum, h) => sum + (Number(h.currentValue) || 0), 0);
  },

  getTotalInvested() {
    return (GetHoldings.data || []).reduce((sum, h) => sum + (Number(h.totalInvested) || 0), 0);
  },

  getTotalPnL() {
    return this.getTotalValue() - this.getTotalInvested();
  },

  getTotalPnLPct() {
    const inv = this.getTotalInvested();
    return inv > 0 ? ((this.getTotalPnL() / inv) * 100) : 0;
  },

  getTotalPnLText() {
    const pnl = this.getTotalPnL();
    const pct = this.getTotalPnLPct();
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}${this.formatCurrency(pnl)} (${sign}${pct.toFixed(2)}%)`;
  },

  getDayPnL() {
    return (GetHoldings.data || []).reduce((sum, h) => sum + (Number(h.dayChange) || 0), 0);
  },

  getDayPnLPct() {
    const val = this.getTotalValue();
    const day = this.getDayPnL();
    return (val - day) > 0 ? ((day / (val - day)) * 100) : 0;
  },

  getDayPnLText() {
    const day = this.getDayPnL();
    const pct = this.getDayPnLPct();
    const sign = day >= 0 ? '+' : '';
    return `${sign}${this.formatCurrency(day)} (${sign}${pct.toFixed(2)}%)`;
  },

  getPnLColor(value) {
    return Number(value) >= 0 ? '#10b981' : '#ef4444';
  }
}
