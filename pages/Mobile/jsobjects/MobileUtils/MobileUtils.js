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
  },

  // The full holdings list rendered as HTML for the mobile page. A table widget
  // forces fixed column widths and scrolls sideways on a phone, so the list is
  // rendered as a flexbox instead: it always fits the screen width, long names
  // ellipsize, and only the page scrolls (vertically). The query already
  // returns holdings ordered by 24h change ascending.
  getHoldingsHtml() {
    const esc = (v) =>
      String(v === undefined || v === null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const money = (v) => this.formatCurrency(v);
    const fmtChg = (v) => `${Number(v) >= 0 ? '+' : ''}${esc(money(v))}`;

    const list = GetHoldings.data || [];

    const head =
      '<div style="display:flex;justify-content:space-between;gap:8px;' +
      'padding:0 2px 6px;border-bottom:1px solid #E2E8F0;color:#94A3B8;' +
      'font-size:0.68rem;font-weight:600;letter-spacing:.04em;' +
      'text-transform:uppercase;"><span>Holding</span><span>24h &middot; Value</span></div>';

    const body = list
      .map((h) => {
        const color = Number(h.dayChange) >= 0 ? '#10b981' : '#ef4444';
        const pct = Number(h.dayChangePct) || 0;
        const pctText = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
        return (
          '<div style="display:flex;justify-content:space-between;align-items:center;' +
          'gap:8px;padding:7px 2px;border-bottom:1px solid #f1f5f9;">' +
          '<div style="min-width:0;flex:1 1 auto;overflow:hidden;">' +
          '<div style="font-weight:600;font-size:0.8rem;color:#0f172a;' +
          'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
          esc(h.symbol || '') +
          '</div>' +
          '<div style="font-size:0.7rem;color:#64748b;white-space:nowrap;' +
          'overflow:hidden;text-overflow:ellipsis;">' +
          esc(h.name || '') +
          '</div>' +
          '</div>' +
          '<div style="flex:0 0 auto;text-align:right;white-space:nowrap;">' +
          '<div style="font-weight:600;font-size:0.8rem;color:' +
          color +
          ';">' +
          fmtChg(h.dayChange) +
          ' &middot; ' +
          pctText +
          '</div>' +
          '<div style="font-size:0.72rem;color:#334155;">' +
          esc(money(h.currentValue)) +
          '</div>' +
          '</div>' +
          '</div>'
        );
      })
      .join('\n');

    return (
      '<div style="width:100%;font-family:inherit;">' + head + body + '</div>'
    );
  }
}
