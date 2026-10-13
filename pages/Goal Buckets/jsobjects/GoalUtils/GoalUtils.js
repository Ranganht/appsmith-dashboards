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
      const b = h.goal || 'Unassigned';
      if (!map[b]) map[b] = { val: 0, inv: 0, pnl: 0 };
      map[b].val += (h.currentValue || 0);
      map[b].inv += (h.totalInvested || 0);
      map[b].pnl += (h.unrealizedPnL || 0);
    }
    return map;
  },

  formatCurrencyWhole(value) {
    if (value === undefined || value === null || isNaN(Number(value))) return '€0';
    return '€' + Math.round(Number(value)).toLocaleString('de-DE');
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
  },

  // Hardcoded target amount (in base currency, €) per goal bucket.
  // Add or edit buckets here to change the gauges. e.g. 'retirement': 250000
  getTargets() {
    return {
      'retirement': 100000,
      'Y-balloon': 24000,
      'education': 250000,
    };
  },

  // One ECharts gauge per bucket, showing % of target achieved.
  // Each gauge also prints the bucket name and "current / target" beneath it.
  getGaugeOption() {
    const targets = this.getTargets();
    const list = GetGoalBuckets.data || [];

    const byBucket = {};
    list.forEach(h => {
      const b = h.goal || 'Unassigned';
      byBucket[b] = (byBucket[b] || 0) + (h.currentValue || 0);
    });

    const buckets = Object.keys(targets);
    const count = buckets.length || 1;

    const series = buckets.map((bucket, i) => {
      const target = targets[bucket] || 0;
      const current = byBucket[bucket] || 0;
      const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
      const centerX = Number((((i + 0.5) * 100) / count).toFixed(2));

      return {
        type: 'gauge',
        center: [`${centerX}%`, '58%'],
        radius: '60%',
        min: 0,
        max: 100,
        startAngle: 210,
        endAngle: -30,
        splitNumber: 5,
        progress: { show: true, roundCap: true, width: 14 },
        axisLine: { lineStyle: { width: 14 } },
        axisTick: { show: false },
        splitLine: { length: 6, lineStyle: { width: 1 } },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        title: { offsetCenter: [0, '40%'], fontSize: 13, color: '#0F172A' },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '8%'],
          fontSize: 20,
          fontWeight: 'bolder',
          formatter: '{value}%',
          color: '#0F172A',
        },
        data: [
          {
            value: Math.round(pct),
            name: `${bucket}\n${this.formatCurrencyWhole(current)} / ${this.formatCurrencyWhole(target)}`,
          },
        ],
      };
    });

    return { series: series };
  }
}