export default {
  formatCurrency(val) {
    if (val === undefined || val === null || isNaN(Number(val))) return '€0,00';
    return '€' + Number(val).toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },

  // Signed 24h move with its percentage, e.g. "-€12,34 (-1.23%)".
  formatChange(row) {
    if (!row) return '';
    const chg = Number(row.dayChange || 0);
    const pct = Number(row.dayChangePct || 0);
    const chgSign = chg >= 0 ? '+' : '-';
    const pctSign = pct >= 0 ? '+' : '';
    return `${chgSign}${this.formatCurrency(Math.abs(chg))} (${pctSign}${pct.toFixed(2)}%)`;
  },

  // Rows for the mobile table. The query already returns holdings ordered by
  // 24h change ascending, so the list keeps that order.
  getRows() {
    return (GetHoldings.data || []).map(r => ({
      symbol: r.symbol,
      name: r.name,
      change24: this.formatChange(r),
      value: this.formatCurrency(r.currentValue),
    }));
  }
}
