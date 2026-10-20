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

  // Goal (purpose) buckets for the filter dropdown, e.g. Y-balloon, education,
  // retirement. Reads only the summary query: GetHoldings depends on the filter
  // widget, so reading GetHoldings.data here would create a cyclic dependency.
  getGoalOptions() {
    const fromSummary = GetPortfolioOverview.data?.[0]?.availableGoals || [];
    const list = fromSummary.length ? fromSummary : ['Y-balloon', 'education', 'retirement'];
    const options = [{ label: 'All Goals', value: 'ALL' }];
    list.forEach((g) => options.push({ label: g, value: g }));
    return options;
  },

  // Owner/currency portfolios for the filter dropdown, e.g. EUR, Samarth, USD.
  // Same cycle-avoidance note as getGoalOptions above.
  getPortfolioOptions() {
    const fromSummary = GetPortfolioOverview.data?.[0]?.availablePortfolios || [];
    const list = fromSummary.length ? fromSummary : ['EUR', 'Samarth', 'USD'];
    const options = [{ label: 'All Portfolios', value: 'ALL' }];
    list.forEach((p) => options.push({ label: p, value: p }));
    return options;
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
  // ellipsize, and only the page scrolls (vertically).
  //
  // The header row itself lives in four HdrSort_* buttons above this widget
  // (Appsmith Text widgets cannot receive clicks); tapping any of them toggles
  // getSortMode. Rows are then sorted client-side: 'today' by dayChangePct —
  // the order GetHoldings returns, worst first — 'overall' by the total
  // unrealized % gain/loss, same direction. Ties fall back to the symbol so
  // the order is stable across re-renders.
  // Escape the few characters that would break the markup. Written with
  // split/join rather than a regex literal: Appsmith's JS-object parser rejects
  // `replace(/.../g, ...)`, which made the whole collection fail to evaluate.
  // Everything below sticks to constructs already used elsewhere in this app.
  //
  // Row = 4 columns, each two lines tall:
  //   [symbol / name] [price / qty] [24h € / 24h %] [value / overall %]
  //
  // The numeric columns use a flex-basis expressed as a percentage of the row:
  // 17.1875% / 18.75% / 20.3125% are exactly the header buttons' grid spans
  // (cols 28..39, 39..51, 51..64 of 64). Grid columns and percentage basis are
  // both fractions of the widget width, so cells stay under their header
  // buttons at any viewport width — a fixed `px` basis would only line up at
  // one width. There is no row `gap`: padding inside the cells replaces it,
  // because a fixed gap would drift the boundaries off the grid lines as the
  // viewport resizes. `width:auto` neutralises the `.sc-... div { width:100% }`
  // rule the Text widget injects, which would otherwise make the first cell
  // claim the whole row. line-height is pinned so the row height, and therefore
  // the fixed widget height in List_Mobile.json, stays predictable.
  getHoldingsHtml() {
    const esc = (v) =>
      String(v === undefined || v === null ? '' : v)
        .split('&').join('&amp;')
        .split('<').join('&lt;')
        .split('>').join('&gt;');

    const mode = this.getSortMode();
    const key = mode === 'overall' ? 'unrealizedPnLPct' : 'dayChangePct';
    const list = (GetHoldings.data || []).slice();
    list.sort((a, b) => {
      const d = (Number(a[key]) || 0) - (Number(b[key]) || 0);
      if (d !== 0) return d;
      return String(a.symbol || '').localeCompare(String(b.symbol || ''));
    });

    const CELL = 'width:auto;text-align:right;white-space:nowrap;overflow:hidden;padding-right:10px;';

    let html = '<div style="width:100%;font-family:inherit;">';

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
        '<div style="display:flex;align-items:center;width:100%;' +
        'padding:3px 0;border-bottom:1px solid #F1F5F9;line-height:1.15;">' +
        '<div style="flex:1 1 auto;min-width:0;width:auto;overflow:hidden;padding-left:10px;">' +
        '<div style="font-weight:600;font-size:0.8rem;color:#0F172A;' +
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
        esc(h.symbol || '') +
        '</div>' +
        '<div style="font-size:0.7rem;color:#64748B;white-space:nowrap;' +
        'overflow:hidden;text-overflow:ellipsis;">' +
        esc(h.name || '') +
        '</div>' +
        '</div>' +
        '<div style="flex:0 0 17.1875%;' + CELL + '">' +
        '<div style="font-size:0.72rem;color:#334155;">' +
        esc(this.formatCurrency(h.currentPrice)) +
        '</div>' +
        '<div style="font-size:0.7rem;color:#94A3B8;">' +
        esc(qtyText) +
        '</div>' +
        '</div>' +
        '<div style="flex:0 0 18.75%;' + CELL + '">' +
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
        '<div style="flex:0 0 20.3125%;' + CELL + '">' +
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
  },

  // ---- header-row sort --------------------------------------------------
  // 'today' sorts by today's gain/loss % (dayChangePct, worst first — the
  // order GetHoldings itself returns); 'overall' by the total unrealized %
  // gain/loss, same direction. Stored in appsmith.store so both the HdrSort_*
  // labels and this list re-evaluate when it changes; before the first tap
  // there is no stored value and the mode defaults to 'today', i.e. the view
  // everyone is used to.
  getSortMode() {
    return (typeof appsmith !== 'undefined' && appsmith.store &&
      appsmith.store.mobileSortMode === 'overall') ? 'overall' : 'today';
  },

  // Invoked by every HdrSort_* header button. storeValue pushes the new mode
  // to appsmith.store (dependents re-evaluate); the GetHoldings re-run is a
  // second, already-proven re-render trigger — the refresh button uses it and
  // the list follows.
  toggleSort() {
    const next = this.getSortMode() === 'overall' ? 'today' : 'overall';
    storeValue('mobileSortMode', next, false);
    GetHoldings.run();
  },

  // Label for one header cell; the column currently driving the sort carries
  // a ▲ marker. which: 'holding' | 'price' | '24h' | 'value'.
  sortHdrLabel(which) {
    if (which === 'holding') return 'HOLDING';
    if (which === 'price') return 'PRICE';
    const active = which === '24h'
      ? this.getSortMode() !== 'overall'
      : this.getSortMode() === 'overall';
    const base = which === '24h' ? '24H' : 'VALUE';
    return active ? base + ' ▲' : base;
  }
}
