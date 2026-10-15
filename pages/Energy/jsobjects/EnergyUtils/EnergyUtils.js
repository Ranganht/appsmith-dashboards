export default {
  // ---- helpers -----------------------------------------------------------

  // Mongo dates arrive as ISO strings (or {$date: ...}); normalise to a Date.
  _toDate(v) {
    if (v === undefined || v === null) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v === 'object' && v.$date) {
      const d = new Date(v.$date);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  },

  _dayKey(v) {
    const d = this._toDate(v);
    return d ? d.toISOString().slice(0, 10) : null;
  },

  // GetEnergyDaily rows indexed by calendar day (UTC). One document per day.
  _byDay() {
    const rows = (typeof GetEnergyDaily !== 'undefined' && GetEnergyDaily.data) ? GetEnergyDaily.data : [];
    const map = {};
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const key = this._dayKey(r.date);
      if (!key) continue;
      map[key] = {
        imported: Number(r.import_to_grid_kwh) || 0,
        exported: Number(r.export_to_grid_kwh) || 0,
        generated: Number(r.solar_generated_kwh) || 0,
        month: key.slice(0, 7),
      };
    }
    return map;
  },

  // Newest day present in the data. Anchoring "today" to real data keeps the
  // window populated even if today's document has not been written yet.
  _anchor() {
    const keys = Object.keys(this._byDay()).sort();
    return keys.length ? new Date(keys[keys.length - 1] + 'T00:00:00.000Z') : new Date();
  },

  _recentDays(n) {
    const anchor = this._anchor().getTime();
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      out.push(new Date(anchor - i * 86400000).toISOString().slice(0, 10));
    }
    return out;
  },

  _range() {
    return (typeof SelectEnergyTimeframe !== 'undefined' && SelectEnergyTimeframe.selectedOptionValue)
      ? SelectEnergyTimeframe.selectedOptionValue
      : '7D';
  },

  _monthLabel(d) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[d.getUTCMonth()] + ' ' + String(d.getUTCFullYear()).slice(2);
  },

  // ---- period buckets ----------------------------------------------------

  // Buckets for the selected range: one per day for 7D/1M, one per calendar
  // month for 1Y. Each bucket -> { label, imported, exported, generated,
  // usage, days }. "usage" is household consumption, derived from the energy
  // balance: imported + generated - exported.
  getBuckets() {
    const map = this._byDay();
    const range = this._range();
    const out = [];

    if (range === '1Y') {
      const anchor = this._anchor();
      const keys = Object.keys(map);
      for (let i = 11; i >= 0; i--) {
        const d = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1));
        const month = d.toISOString().slice(0, 7);
        let imported = 0;
        let exported = 0;
        let generated = 0;
        let days = 0;
        for (let k = 0; k < keys.length; k++) {
          const row = map[keys[k]];
          if (row.month === month) {
            imported += row.imported;
            exported += row.exported;
            generated += row.generated;
            days++;
          }
        }
        out.push({
          label: this._monthLabel(d),
          imported: imported,
          exported: exported,
          generated: generated,
          usage: imported + generated - exported,
          days: days,
        });
      }
      // Drop leading months that predate the data so the chart has no empty tail.
      while (out.length && out[0].days === 0) out.shift();
      return out;
    }

    const days = this._recentDays(range === '1M' ? 30 : 7);
    for (let i = 0; i < days.length; i++) {
      const row = map[days[i]];
      const imported = row ? row.imported : 0;
      const exported = row ? row.exported : 0;
      const generated = row ? row.generated : 0;
      out.push({
        label: days[i].slice(5),
        imported: imported,
        exported: exported,
        generated: generated,
        usage: imported + generated - exported,
        days: 1,
      });
    }
    return out;
  },

  _round(v) {
    return Math.round((Number(v) || 0) * 100) / 100;
  },

  _points(metric) {
    return this.getBuckets().map(b => ({ x: b.label, y: this._round(b[metric]) }));
  },

  getImportData() {
    return this._points('imported');
  },

  getExportData() {
    return this._points('exported');
  },

  getGenerationData() {
    return this._points('generated');
  },

  // ---- trailing 12-month area chart (usage vs generation) ----------------

  // Fixed 12-month daily window, independent of the range selector. Leading
  // days before the first record are trimmed so the chart starts with real data.
  _yearPoints() {
    const map = this._byDay();
    const days = this._recentDays(365);
    const out = [];
    let started = false;
    for (let i = 0; i < days.length; i++) {
      const row = map[days[i]];
      if (!row && !started) continue;
      started = true;
      const imported = row ? row.imported : 0;
      const exported = row ? row.exported : 0;
      const generated = row ? row.generated : 0;
      out.push({
        label: days[i].slice(5),
        usage: this._round(imported + generated - exported),
        generated: this._round(generated),
      });
    }
    return out;
  },

  getYearUsageData() {
    return this._yearPoints().map(b => ({ x: b.label, y: b.usage }));
  },

  getYearGenerationData() {
    return this._yearPoints().map(b => ({ x: b.label, y: b.generated }));
  },

  // ---- stat cards --------------------------------------------------------

  getTotals() {
    const buckets = this.getBuckets();
    const t = { imported: 0, exported: 0, generated: 0, usage: 0 };
    for (let i = 0; i < buckets.length; i++) {
      t.imported += buckets[i].imported;
      t.exported += buckets[i].exported;
      t.generated += buckets[i].generated;
      t.usage += buckets[i].usage;
    }
    return t;
  },

  formatKwh(v) {
    const n = Number(v) || 0;
    return n.toLocaleString('en-GB', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + ' kWh';
  },

  getImportedText() {
    return this.formatKwh(this.getTotals().imported);
  },

  getExportedText() {
    return this.formatKwh(this.getTotals().exported);
  },

  getGeneratedText() {
    return this.formatKwh(this.getTotals().generated);
  },

  getPeriodLabel() {
    const range = this._range();
    if (range === '1M') return 'Last 30 days';
    if (range === '1Y') return 'Last 12 months';
    return 'Last 7 days';
  },

  getBarTitle() {
    return 'Grid import · Grid export · Solar generation — ' + this.getPeriodLabel().toLowerCase();
  },

  getLatestDay() {
    const keys = Object.keys(this._byDay()).sort();
    return keys.length ? keys[keys.length - 1] : '—';
  }
}
