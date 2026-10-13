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

  // Donut/Pie Chart: Top 10 Holdings Allocation
  getAllocationData() {
    const raw = this.getHoldings();
    if (!raw || raw.length === 0) return [];
    return raw.slice(0, 10).map(item => ({
      x: item.symbol,
      y: Math.round(item.currentValue || 0)
    }));
  },

  async refreshAll() {
    await GetPortfolioSummary.run();
    await GetHoldings.run();
    await GetHistory.run();
  }
}