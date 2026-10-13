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

  // Goal (purpose) buckets, e.g. Y-balloon, retirement.
  getGoalOptions() {
    const list = GetPortfolioOverview.data?.[0]?.availableGoals || ['retirement', 'Y-balloon'];
    const options = [{ label: "All Goals", value: "ALL" }];
    list.forEach(g => options.push({ label: g, value: g }));
    return options;
  },

  // Portfolio (owner/currency) buckets, e.g. EUR, USD, Samarth.
  getPortfolioOptions() {
    const list = GetPortfolioOverview.data?.[0]?.availablePortfolios || ['EUR', 'USD'];
    const options = [{ label: "All Portfolios", value: "ALL" }];
    list.forEach(p => options.push({ label: p, value: p }));
    return options;
  }
}
