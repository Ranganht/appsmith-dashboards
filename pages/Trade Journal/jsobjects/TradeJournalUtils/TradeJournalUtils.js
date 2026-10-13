export default {
  formatCurrency(value) {
    if (value === undefined || value === null || isNaN(Number(value))) return '€0,00';
    return '€' + Number(value).toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },

  getTotalVolume() {
    const raw = GetTransactions.data || [];
    return raw.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  },

  getMostTradedSymbol() {
    const raw = GetTransactions.data || [];
    if (raw.length === 0) return 'N/A';
    const counts = {};
    for (const t of raw) {
      if (t.symbol) counts[t.symbol] = (counts[t.symbol] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? `${sorted[0][0]} (${sorted[0][1]} trades)` : 'N/A';
  },

  getLatestDate() {
    const raw = GetTransactions.data || [];
    if (raw.length === 0 || !raw[0].date) return 'N/A';
    return new Date(raw[0].date).toLocaleDateString();
  }
}