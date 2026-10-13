export default {
  formatCurrency(val) {
    if (val === undefined || val === null || isNaN(Number(val))) return '€0,00';
    return '€' + Number(val).toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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
