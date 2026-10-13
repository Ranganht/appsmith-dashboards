export default {
  formatCurrency(value) {
    if (value === undefined || value === null || isNaN(Number(value))) return '€0,00';
    return '€' + Number(value).toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },

  getBucketData() {
    const raw = GetGoalBuckets.data || [];
    const map = {};
    for (const h of raw) {
      const b = h.portfolio || 'Main';
      if (!map[b]) map[b] = { val: 0, inv: 0, pnl: 0 };
      map[b].val += (h.currentValue || 0);
      map[b].inv += (h.totalInvested || 0);
      map[b].pnl += (h.unrealizedPnL || 0);
    }
    return map;
  },

  getGoalOptions() {
    const buckets = Object.keys(this.getBucketData());
    const options = [{ label: "All Buckets", value: "ALL" }];
    buckets.forEach(b => options.push({ label: b, value: b }));
    return options;
  },

  getGoalVal(goal) {
    const map = this.getBucketData();
    return this.formatCurrency(map[goal]?.val || 0);
  },

  getGoalInv(goal) {
    const map = this.getBucketData();
    return this.formatCurrency(map[goal]?.inv || 0);
  },

  getGoalPnL(goal) {
    const map = this.getBucketData();
    const pnl = map[goal]?.pnl || 0;
    const inv = map[goal]?.inv || 0;
    const pct = inv > 0 ? ((pnl / inv) * 100).toFixed(1) : '0.0';
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}${this.formatCurrency(pnl)} (${sign}${pct}%)`;
  },

  getTotalVal() {
    const list = GetGoalBuckets.data || [];
    return this.formatCurrency(list.reduce((sum, h) => sum + (h.currentValue || 0), 0));
  },

  getTotalInv() {
    const list = GetGoalBuckets.data || [];
    return this.formatCurrency(list.reduce((sum, h) => sum + (h.totalInvested || 0), 0));
  },

  getTotalPnL() {
    const list = GetGoalBuckets.data || [];
    const val = list.reduce((sum, h) => sum + (h.currentValue || 0), 0);
    const inv = list.reduce((sum, h) => sum + (h.totalInvested || 0), 0);
    const pnl = val - inv;
    const pct = inv > 0 ? ((pnl / inv) * 100).toFixed(1) : '0.0';
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}${this.formatCurrency(pnl)} (${sign}${pct}%)`;
  },

  getGoalValData() {
    const map = this.getBucketData();
    const goals = Object.keys(map);
    return goals.map(g => ({ x: g, y: Math.round(map[g].val) }));
  },

  getGoalInvData() {
    const map = this.getBucketData();
    const goals = Object.keys(map);
    return goals.map(g => ({ x: g, y: Math.round(map[g].inv) }));
  },

  getGoalDistributionData() {
    const map = this.getBucketData();
    const goals = Object.keys(map);
    return goals.map(g => ({ x: g, y: Math.round(map[g].val) }));
  }
}