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
  //
  // Row = 4 columns, each two lines tall:
  //   [symbol / name] [price / qty] [24h € / 24h %] [value / overall %]
  // The numeric columns use an explicit flex-basis so the header lines up with
  // them; `width:auto` neutralises the `.sc-... div { width:100% }` rule the
  // Text widget injects, which would otherwise make the first cell claim the
  // whole row. line-height is pinned so the row height, and therefore the fixed
  // widget height in List_Mobile.json, stays predictable.
  getHoldingsHtml() {
    const esc = (v) =>
      String(v === undefined || v === null ? '' : v)
        .split('&').join('&amp;')
        .split('<').join('&lt;')
        .split('>').join('&gt;');

    const list = GetHoldings.data || [];

    const CELL = 'width:auto;text-align:right;white-space:nowrap;overflow:hidden;';

    let html =
      '<div style="width:100%;font-family:inherit;">' +
      '<div style="display:flex;align-items:center;gap:6px;width:100%;' +
      'padding:0 2px 4px;border-bottom:1px solid #E2E8F0;color:#94A3B8;' +
      'font-size:0.68rem;font-weight:600;letter-spacing:.04em;' +
      'text-transform:uppercase;line-height:1.15;">' +
      '<div style="flex:1 1 auto;min-width:0;width:auto;overflow:hidden;">Holding</div>' +
      '<div style="flex:0 0 68px;' + CELL + '">Price</div>' +
      '<div style="flex:0 0 74px;' + CELL + '">24h</div>' +
      '<div style="flex:0 0 78px;' + CELL + '">Value</div>' +
      '</div>';

    for (let i = 0; i < list.length; i++) {
      const h = list[i];
      const chg = Number(h.dayChange) || 0;
      const pct = Number(h.dayChangePct) || 0;
      const color = chg >= 0 ? '#10b981' : '#ef4444';
      const money = this.formatCurrency(Math.abs(chg));
      const chgText = chg >= 0 ? '+' + money : '-' + money;
      const pctText = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
      const qty = Number(h.totalShares) || 0;
      const qtyText = String(parseFloat(qty.toFixed(4)));
      const pnlPct = Number(h.unrealizedPnLPct) || 0;
      const pnlColor = pnlPct >= 0 ? '#10b981' : '#ef4444';
      const pnlPctText = (pnlPct >= 0 ? '+' : '') + pnlPct.toFixed(2) + '%';

      html +=
        '<div style="display:flex;align-items:center;gap:6px;width:100%;' +
        'padding:3px 2px;border-bottom:1px solid #F1F5F9;line-height:1.15;">' +
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
        '<div style="flex:0 0 68px;' + CELL + '">' +
        '<div style="font-size:0.72rem;color:#334155;">' +
        esc(this.formatCurrency(h.currentPrice)) +
        '</div>' +
        '<div style="font-size:0.7rem;color:#94A3B8;">' +
        esc(qtyText) +
        '</div>' +
        '</div>' +
        '<div style="flex:0 0 74px;' + CELL + '">' +
        '<div style="font-weight:600;font-size:0.76rem;color:' +
        color +
        ';">' +
        chgText +
        '</div>' +
        '<div style="font-size:0.7rem;color:' +
        color +
        ';">' +
        pctText +
        '</div>' +
        '</div>' +
        '<div style="flex:0 0 78px;' + CELL + '">' +
        '<div style="font-weight:600;font-size:0.76rem;color:#0F172A;">' +
        esc(this.formatCurrency(h.currentValue)) +
        '</div>' +
        '<div style="font-size:0.7rem;color:' +
        pnlColor +
        ';">' +
        pnlPctText +
        '</div>' +
        '</div>' +
        '</div>';
    }

    html += '</div>';
    return html;
  }
}
