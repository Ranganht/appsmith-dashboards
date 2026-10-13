export default {
  formatCurrency(value) {
    if (value === undefined || value === null || isNaN(Number(value))) return '€0,00';
    return '€' + Number(value).toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },

  getHoldings() {
    return GetEquitiesHoldings.data || [];
  },

  getTotalEquityValue() {
    return this.getHoldings().reduce((sum, h) => sum + (h.currentValue || 0), 0);
  },

  getTotalEquityInvested() {
    return this.getHoldings().reduce((sum, h) => sum + (h.totalInvested || 0), 0);
  },

  getTotalEquityPnL() {
    return this.getTotalEquityValue() - this.getTotalEquityInvested();
  },

  getTotalEquityPnLPct() {
    const inv = this.getTotalEquityInvested();
    return inv > 0 ? ((this.getTotalEquityPnL() / inv) * 100).toFixed(2) : '0.00';
  },

  getEtfSharePct() {
    const tot = this.getTotalEquityValue();
    if (tot === 0) return '0.0';
    const etfVal = this.getHoldings()
      .filter(h => h.assetType === 'ETF')
      .reduce((s, h) => s + (h.currentValue || 0), 0);
    return ((etfVal / tot) * 100).toFixed(1);
  },

  getStockSharePct() {
    const tot = this.getTotalEquityValue();
    if (tot === 0) return '0.0';
    const stkVal = this.getHoldings()
      .filter(h => h.assetType === 'STOCK')
      .reduce((s, h) => s + (h.currentValue || 0), 0);
    return ((stkVal / tot) * 100).toFixed(1);
  },

  getTopPerformer() {
    const list = [...this.getHoldings()].sort((a, b) => (b.unrealizedPnLPct || 0) - (a.unrealizedPnLPct || 0));
    if (list.length === 0) return 'N/A';
    const top = list[0];
    const sign = (top.unrealizedPnLPct || 0) >= 0 ? '+' : '';
    return `${top.symbol} (${sign}${top.unrealizedPnLPct?.toFixed(1)}%)`;
  },
	
	  // 1. Bar Chart: Top 15 Holdings Concentration
  getBarChartData() {
    const list = this.getHoldings();
    if (!list || list.length === 0) return [];
    return list.slice(0, 15).map(h => ({
      x: h.symbol,
      y: Math.round(h.currentValue || 0)
    }));
  },

  // 2. Pie Chart: ETF vs Individual Stock Split
  getEtfVsStockPieData() {
    const list = this.getHoldings();
    if (!list || list.length === 0) return [];
    const etfVal = list.filter(h => h.assetType === 'ETF').reduce((s, h) => s + (h.currentValue || 0), 0);
    const stockVal = list.filter(h => h.assetType === 'STOCK').reduce((s, h) => s + (h.currentValue || 0), 0);
    return [
      { x: "ETFs (Funds)", y: Math.round(etfVal) },
      { x: "Individual Stocks", y: Math.round(stockVal) }
    ];
  },

  // Helpers that handle empty dropdown gracefully on load
  getTickerShares(symbol) {
    if (!symbol) return 0;
    const matched = this.getHoldings().filter(h => h.symbol === symbol);
    return matched.reduce((s, h) => s + (h.totalShares || 0), 0);
  },

  getTickerInvested(symbol) {
    if (!symbol) return 0;
    const matched = this.getHoldings().filter(h => h.symbol === symbol);
    return matched.reduce((s, h) => s + (h.totalInvested || 0), 0);
  },

  getTickerValue(symbol) {
    if (!symbol) return 0;
    const matched = this.getHoldings().filter(h => h.symbol === symbol);
    return matched.reduce((s, h) => s + (h.currentValue || 0), 0);
  },

  async refresh() {
    await GetEquitiesHoldings.run();
    await GetTickerPrice.run();
    await GetTickerTransactions.run();
  }
}