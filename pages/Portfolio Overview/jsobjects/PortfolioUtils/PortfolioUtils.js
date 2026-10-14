export default {
  formatCurrency(value) {
    if (value === undefined || value === null || isNaN(Number(value))) return '€0,00';
    return '€' + Number(value).toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },

  formatPercent(value) {
    if (value === undefined || value === null || isNaN(Number(value))) return '0.00%';
    const num = Number(value);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  },

  getPnLColor(value) {
    return Number(value) >= 0 ? '#10b981' : '#ef4444';
  },

  // Owner/currency portfolios, e.g. EUR, USD, Samarth. Reads only the summary
  // query - never GetHoldings - because GetHoldings depends on the widget that
  // consumes these options, so reading GetHoldings.data here creates a cycle.
  getPortfolioOptions() {
    const fromSummary = GetPortfolioSummary.data?.[0]?.availablePortfolios || [];
    const list = fromSummary.length ? fromSummary : ['EUR', 'Samarth', 'USD'];
    const options = [{ label: 'All Portfolios', value: 'ALL' }];
    list.forEach(p => options.push({ label: p, value: p }));
    return options;
  },

  getHoldings() {
    return GetHoldings.data || [];
  },

  getTotalValue() {
    const list = this.getHoldings();
    if (list.length === 0 && GetPortfolioSummary.data?.[0]) return GetPortfolioSummary.data[0].currentValue;
    return list.reduce((sum, h) => sum + (h.currentValue || 0), 0);
  },

  getTotalInvested() {
    const list = this.getHoldings();
    if (list.length === 0 && GetPortfolioSummary.data?.[0]) return GetPortfolioSummary.data[0].totalInvested;
    return list.reduce((sum, h) => sum + (h.totalInvested || 0), 0);
  },

  getTotalPnL() {
    return this.getTotalValue() - this.getTotalInvested();
  },

  getTotalPnLPct() {
    const inv = this.getTotalInvested();
    return inv > 0 ? ((this.getTotalPnL() / inv) * 100) : 0;
  },

  getDayPnL() {
    const list = this.getHoldings();
    if (list.length === 0 && GetPortfolioSummary.data?.[0]) return GetPortfolioSummary.data[0].dayPnL;
    return list.reduce((sum, h) => sum + (h.dayChange || 0), 0);
  },

  getDayPnLPct() {
    const val = this.getTotalValue();
    const day = this.getDayPnL();
    return (val - day) > 0 ? ((day / (val - day)) * 100) : 0;
  },

  getTotalPnLText() {
    const pnl = this.getTotalPnL();
    const pct = this.getTotalPnLPct();
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}${this.formatCurrency(pnl)} (${sign}${pct.toFixed(2)}%)`;
  },

  getDayPnLText() {
    const day = this.getDayPnL();
    const pct = this.getDayPnLPct();
    const sign = day >= 0 ? '+' : '';
    return `${sign}${this.formatCurrency(day)} (${sign}${pct.toFixed(2)}%)`;
  },

 // Line Chart: Series 1 (Portfolio Value)
  getValueChartData() {
    const raw = GetHistory.data || [];
    if (!raw || raw.length === 0) return [];
    return raw.map(item => ({
      x: item.date,
      y: Math.round(item.currentValue || 0)
    }));
  },

  // Line Chart: Series 2 (Invested Capital)
  getInvestedChartData() {
    const raw = GetHistory.data || [];
    if (!raw || raw.length === 0) return [];
    return raw.map(item => ({
      x: item.date,
      y: Math.round(item.totalInvested || 0)
    }));
  },

  // Best/worst performers for the selected timeframe. The portfolio and asset
  // class filters are already applied by GetHoldings; the timeframe chooses
  // which trailing return to rank on ("All Time" compares against cost basis).
  getPerformers() {
    const timeframe = (typeof SelectTimeframe !== 'undefined' && SelectTimeframe.selectedOptionValue)
      ? SelectTimeframe.selectedOptionValue
      : '1M';
    const metric = {
      '1W': 'return1wPct',
      '1M': 'return1mPct',
      '1Y': 'return1yPct',
      'ALL': 'unrealizedPnLPct',
    }[timeframe] || 'unrealizedPnLPct';

    const rows = this.getHoldings().map(row => {
      let pct = Number(row[metric]);
      if (isNaN(pct)) pct = Number(row.unrealizedPnLPct) || 0;
      return {
        symbol: row.symbol || '—',
        name: row.name || row.symbol || '',
        pct: pct,
        color: pct >= 0 ? '#10b981' : '#ef4444',
      };
    }).sort((a, b) => b.pct - a.pct);

    return {
      timeframe: timeframe,
      best: rows.slice(0, 3),
      worst: rows.slice(-3).reverse(),
    };
  }
}