export default {
  formatCurrency(val) {
    if (val === undefined || val === null || isNaN(Number(val))) return '€0,00';
    return '€' + Number(val).toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },

  // Signed 24h move with its percentage, e.g. "+€12,34 (+1.23%)". Expects a raw
  // holding row (dayChange / dayChangePct).
  formatChange(row) {
    if (!row) return '';
    const chg = Number(row.dayChange) || 0;
    const pct = Number(row.dayChangePct) || 0;
    const chgSign = chg >= 0 ? '+' : '';
    const pctSign = pct >= 0 ? '+' : '';
    return `${chgSign}${this.formatCurrency(chg)} (${pctSign}${pct.toFixed(2)}%)`;
  },

  // Rows for the mobile table. All formatting happens here so the table columns
  // stay plain pass-throughs (currentRow["key"]); calling a JS object from a
  // column's computedValue triggers an Appsmith cyclic dependency. The query
  // already returns holdings ordered by 24h change ascending, so the list keeps
  // that order.
  getRows() {
    return (GetHoldings.data || []).map(r => ({
      name: r.name || r.symbol || '',
      change24: this.formatChange(r),
      value: this.formatCurrency(r.currentValue),
    }));
  },

  getTotalValue() {
    return (GetHoldings.data || []).reduce((sum, h) => sum + (Number(h.currentValue) || 0), 0);
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
