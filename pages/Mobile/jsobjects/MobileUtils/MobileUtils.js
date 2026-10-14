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
  // Escape the few characters that would break the markup. Written with
  // split/join rather than a regex literal: Appsmith's JS-object parser rejects
  // `replace(/.../g, ...)`, which made the whole collection fail to evaluate.
  // Everything below sticks to constructs already used elsewhere in this app.
  getHoldingsHtml() {
    const esc = (v) =>
      String(v === undefined || v === null ? '' : v)
        .split('&').join('&amp;')
        .split('<').join('&lt;')
        .split('>').join('&gt;');

    const list = GetHoldings.data || [];

    let html =
      '<div style="width:100%;font-family:inherit;">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;' +
      'padding:0 2px 6px;border-bottom:1px solid #E2E8F0;color:#94A3B8;' +
      'font-size:0.68rem;font-weight:600;letter-spacing:.04em;' +
      'text-transform:uppercase;"><span>Holding</span><span>24h &middot; Value</span></div>';

    for (let i = 0; i < list.length; i++) {
      const h = list[i];
      const chg = Number(h.dayChange) || 0;
      const pct = Number(h.dayChangePct) || 0;
      const color = chg >= 0 ? '#10b981' : '#ef4444';
      const chgText = (chg >= 0 ? '+' : '') + this.formatCurrency(chg);
      const pctText = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';

      html +=
        '<div style="display:flex;justify-content:space-between;align-items:center;' +
        'gap:8px;width:100%;padding:6px 2px;border-bottom:1px solid #F1F5F9;">' +
        '<div style="flex:1 1 auto;min-width:0;width:auto;overflow:hidden;">' +
        '<div style="font-weight:600;font-size:0.8rem;color:#0F172A;' +
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
        esc(h.symbol || '') +
        '</div>' +
        '<div style="font-size:0.7rem;color:#64748B;white-space:nowrap;' +
        'overflow:hidden;text-overflow:ellipsis;">' +
        esc(h.name || '') +
        '</div>' +
        '</div>' +
        '<div style="flex:0 0 auto;width:auto;text-align:right;white-space:nowrap;">' +
        '<div style="font-weight:600;font-size:0.8rem;color:' +
        color +
        ';">' +
        chgText +
        ' &middot; ' +
        pctText +
        '</div>' +
        '<div style="font-size:0.72rem;color:#334155;">' +
        esc(this.formatCurrency(h.currentValue)) +
        '</div>' +
        '</div>' +
        '</div>';
    }

    html += '</div>';
    return html;
  }
}
