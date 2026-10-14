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

  // Hardcoded target year shown at the end of each goal gauge, so the gauges
  // read "where the bucket should be by when".
  getTargetYears() {
    return {
      'retirement': 2051,
      'Y-balloon': 2031,
      'education': 2041,
    };
  },

  // One ECharts gauge per bucket, showing % of target achieved.
  // Layout per gauge:
  //   - centre        : "<pct>%"
  //   - under centre  : "<bucket>" + "<current> / <target>"
  //   - on the arc    : the current value, parked at the achieved percentage
  //   - at the far end: the target year
  // The arc labels are drawn with transparent, label-only gauge series so their
  // positions are expressed relative to the gauge radius and therefore scale
  // with the widget instead of being pinned to fixed pixels.
  getGaugeOption() {
    const targets = this.getTargets();
    const years = this.getTargetYears();
    const list = GetGoalBuckets.data || [];

    const byBucket = {};
    list.forEach(h => {
      const b = h.goal || 'Unassigned';
      byBucket[b] = (byBucket[b] || 0) + (h.currentValue || 0);
    });

    const buckets = Object.keys(targets);
    const n = buckets.length || 1;
    const MAX = 100;
    const START = 210;
    const END = -30;

    // One colour per bucket so the gauges are easy to tell apart.
    const COLORS = {
      'retirement': '#2563EB',
      'Y-balloon': '#F59E0B',
      'education': '#10B981',
    };
    const colorFor = (bucket) => COLORS[bucket] || '#2563EB';

    // [x, y] offset for a value on the arc, in % of the gauge radius. 0 sits at
    // the start angle (lower left), MAX at the end angle (lower right).
    const pointAt = (value, frac) => {
      const t = MAX > 0 ? Math.max(0, Math.min(1, value / MAX)) : 0;
      const rad = ((START - t * (START - END)) * Math.PI) / 180;
      return [
        (frac * Math.cos(rad) * 100).toFixed(1) + '%',
        (-frac * Math.sin(rad) * 100).toFixed(1) + '%',
      ];
    };

    const series = [];
    buckets.forEach((bucket, i) => {
      const target = targets[bucket] || 0;
      const current = byBucket[bucket] || 0;
      const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
      const center = [(((2 * i + 1) / (2 * n)) * 100).toFixed(2) + '%', '58%'];
      const radius = n > 2 ? '78%' : '85%';
      const color = colorFor(bucket);

      // 1. The gauge itself (arc, progress, centre %, bucket + amounts).
      series.push({
        type: 'gauge',
        center,
        radius,
        startAngle: START,
        endAngle: END,
        min: 0,
        max: MAX,
        splitNumber: 5,
        progress: { show: true, roundCap: true, width: 14 },
        axisLine: { lineStyle: { width: 14, color: [[1, '#E2E8F0']] } },
        axisTick: { show: false },
        splitLine: { length: 6, lineStyle: { width: 1, color: '#CBD5E1' } },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        title: { offsetCenter: [0, '40%'], fontSize: 13, lineHeight: 17, color: color },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '8%'],
          fontSize: 22,
          fontWeight: 'bolder',
          formatter: '{value}%',
          color: '#0F172A',
        },
        data: [
          {
            value: Math.round(pct),
            name: `${bucket}\n ${this.formatCurrencyWhole(target)}`,
            itemStyle: { color: color },
          },
        ],
      });

      // 2. Current value, parked on the arc at the achieved percentage.
      series.push({
        type: 'gauge',
        center,
        radius,
        startAngle: START,
        endAngle: END,
        min: 0,
        max: MAX,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        progress: { show: false },
        title: { show: false },
        detail: {
          offsetCenter: pointAt(pct, 0.7),
          fontSize: 11,
          fontWeight: 'bolder',
          color: '#0F172A',
          formatter: this.formatCurrencyWhole(current),
        },
        data: [{ value: pct }],
      });

      // 3. Target year, parked at the end of the arc.
      series.push({
        type: 'gauge',
        center,
        radius,
        startAngle: START,
        endAngle: END,
        min: 0,
        max: MAX,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        progress: { show: false },
        title: { show: false },
        detail: {
          offsetCenter: pointAt(MAX, 1.18),
          fontSize: 11,
          fontWeight: 'bolder',
          color: color,
          formatter: String(years[bucket] || ''),
        },
        data: [{ value: MAX }],
      });
    });

    return { series: series };
  }
}