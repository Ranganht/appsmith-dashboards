export default {
  // ---- helpers -----------------------------------------------------------

  // Mongo dates arrive as ISO strings (or {$date: ...}), normalise to a Date.
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

  _day(v) {
    const d = this._toDate(v);
    return d ? d.toISOString().slice(0, 10) : null;
  },

  _txs() {
    return (typeof GetXirrTransactions !== 'undefined' && GetXirrTransactions.data)
      ? GetXirrTransactions.data
      : [];
  },

  _holdings() {
    return (typeof GetXirrHoldings !== 'undefined' && GetXirrHoldings.data)
      ? GetXirrHoldings.data
      : [];
  },

  // Ticker upper-cased — mirrors the sync fold.
  _sym(row) {
    return String(row.symbol || '').toUpperCase();
  },

  // Portfolio bucket — mirrors the sync fold's "Main" default.
  _port(row) {
    return row.portfolio ? String(row.portfolio).trim() : 'Main';
  },

  // Instruments with an open position, keyed by upper-cased ticker.
  _openSymbols() {
    const open = {};
    this._holdings().forEach((h) => {
      open[this._sym(h)] = true;
    });
    return open;
  },

  _scopeType() {
    return (typeof SelectScopeType !== 'undefined' && SelectScopeType.selectedOptionValue)
      ? SelectScopeType.selectedOptionValue
      : 'HOLDINGS';
  },

  _scopeValue() {
    return (typeof SelectScopeValue !== 'undefined' && SelectScopeValue.selectedOptionValue)
      ? SelectScopeValue.selectedOptionValue
      : '';
  },

  // ---- widget-facing helpers --------------------------------------------

  // Options for the second selector, driven by the scope type.
  getScopeValueOptions() {
    const type = this._scopeType();
    if (type === 'HOLDINGS') {
      return [{ label: 'All open positions', value: 'ALL' }];
    }

    const txs = this._txs();
    if (type === 'PORTFOLIO') {
      const counts = {};
      txs.forEach((t) => {
        const p = this._port(t);
        counts[p] = (counts[p] || 0) + 1;
      });
      const options = [{ label: '— select —', value: '' }];
      Object.keys(counts).sort().forEach((p) => {
        options.push({ label: p + ' · ' + counts[p] + ' trades', value: p });
      });
      return options;
    }

    // INVESTMENT: every ticker ever traded, marked when the position is closed.
    const open = this._openSymbols();
    const counts = {};
    txs.forEach((t) => {
      const s = this._sym(t);
      counts[s] = (counts[s] || 0) + 1;
    });
    const options = [{ label: '— select —', value: '' }];
    Object.keys(counts).sort().forEach((s) => {
      options.push({
        label: s + (open[s] ? '' : ' (closed)') + ' · ' + counts[s],
        value: s,
      });
    });
    return options;
  },

  formatCurrency(val) {
    if (val === undefined || val === null || isNaN(Number(val))) return '₹0.00';
    return '₹' + Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },

  _pctText(rate) {
    if (rate === null || rate === undefined) return '—';
    const p = rate * 100;
    const sign = p >= 0 ? '+' : '';
    return sign + p.toFixed(2) + '% p.a.';
  },

  xirrText() {
    return this._pctText(this.compute().xirr);
  },

  investedText() {
    return this.formatCurrency(this.compute().invested);
  },

  returnedText() {
    return this.formatCurrency(this.compute().returned);
  },

  gainText() {
    const gain = this.compute().gain;
    return (gain >= 0 ? '+' : '-') + this.formatCurrency(Math.abs(gain));
  },

  getXirrColor() {
    const xirr = this.compute().xirr;
    if (xirr === null || xirr === undefined) return '#64748B';
    return xirr >= 0 ? '#16A34A' : '#DC2626';
  },

  getGainColor() {
    return this.compute().gain >= 0 ? '#16A34A' : '#DC2626';
  },

  getPeriodLabel() {
    const c = this.compute();
    if (!c.since) return 'no cashflows';
    return c.since + ' → ' + c.until + ' · ' + c.flows + ' cashflows';
  },

  getGainSub() {
    const c = this.compute();
    if (!c.invested) return '—';
    const pct = (c.gain / c.invested) * 100;
    return (pct >= 0 ? '+' : '') + pct.toFixed(2) + '% of invested';
  },

  // ---- the maths --------------------------------------------------------

  // NPV of dated cashflows at annual rate `rate`, actual/365, discounted from
  // the FIRST flow's date. `flows` must be sorted ascending by date.
  _xnpv(rate, flows) {
    if (flows.length === 0) return 0;
    const t0 = Date.parse(flows[0].date + 'T00:00:00.000Z');
    let sum = 0;
    for (let i = 0; i < flows.length; i++) {
      const t = (Date.parse(flows[i].date + 'T00:00:00.000Z') - t0) / (365 * 24 * 60 * 60 * 1000);
      sum += flows[i].amount / Math.pow(1 + rate, t);
    }
    return sum;
  },

  // XIRR by bisection. Bracket: −99.9999% up to +10^30 so that even a doubling
  // inside a week (≈4.7·10^15 annualized) is bracketed; a wide bracket also
  // keeps the iteration from diverging on same-day twins and write-offs.
  // Mirrors `solveXirr` in the backend's src/services/xirr.ts — keep in sync.
  _solve(flows) {
    if (flows.length < 2) return null;

    let hasNeg = false;
    let hasPos = false;
    for (let i = 0; i < flows.length; i++) {
      if (flows[i].amount < 0) hasNeg = true;
      else if (flows[i].amount > 0) hasPos = true;
    }
    if (!hasNeg || !hasPos) return null;

    let lo = -0.99999;
    let hi = 1e30;
    let fLo = this._xnpv(lo, flows);
    const fHi = this._xnpv(hi, flows);
    if (fLo === 0) return lo;
    if (fHi === 0) return hi;
    if ((fLo > 0) === (fHi > 0)) return null;

    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (hi - lo < 1e-12) return mid;
      const fMid = this._xnpv(mid, flows);
      if (fMid === 0) return mid;
      if ((fMid > 0) === (fLo > 0)) {
        lo = mid;
        fLo = fMid;
      } else {
        hi = mid;
      }
    }
    return (lo + hi) / 2;
  },

  // XIRR for the selected scope: every trade in scope as a signed cashflow in
  // INR (BUY −, SELL plus the current market value of the scope's open
  // positions as a closing inflow "today"). Rupee trades use their native
  // totalAmount — exact by construction; every other cashflow and the closing
  // value convert from the base currency at the rate of the day, using the
  // INREUR series each sync persists to fx_rates (query GetXirrFx).
  compute() {
    const type = this._scopeType();
    const value = this._scopeValue();
    const txs = this._txs();
    const holdings = this._holdings();
    const until = new Date().toISOString().slice(0, 10);
    const symbolScope = type === 'INVESTMENT' ? String(value || '').toUpperCase() : null;

    // fx_rates stores pairs as loaded against the base currency: INREUR is
    // EUR per 1 INR. Find the rupee series once for this computation.
    const fxRows = (typeof GetXirrFx !== 'undefined' && GetXirrFx.data) ? GetXirrFx.data : [];
    let inrSeries = null;
    for (let i = 0; i < fxRows.length; i++) {
      if (fxRows[i].pair === 'INREUR' && fxRows[i].points && fxRows[i].points.length > 0) {
        inrSeries = fxRows[i].points;
        break;
      }
    }
    // Last EUR-per-INR rate at or before `day`: FX markets close at weekends
    // and holidays, so an exact hit is not guaranteed; dates before the series
    // reuse the earliest observation (same rule as the backend's FxService).
    const eurPerInrOn = (day) => {
      if (!inrSeries) return null;
      let lo = 0;
      let hi = inrSeries.length - 1;
      let idx = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (inrSeries[mid][0] <= day) {
          idx = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      const rate = Number(idx >= 0 ? inrSeries[idx][1] : inrSeries[0][1]);
      return rate > 0 ? rate : null;
    };
    const latestEurPerInr = inrSeries
      ? Number(inrSeries[inrSeries.length - 1][1]) || null
      : null;

    let trades = [];
    if (type === 'HOLDINGS') {
      const open = this._openSymbols();
      trades = txs.filter((t) => open[this._sym(t)]);
    } else if (type === 'PORTFOLIO') {
      trades = value ? txs.filter((t) => this._port(t) === value) : [];
    } else {
      trades = symbolScope ? txs.filter((t) => this._sym(t) === symbolScope) : [];
    }

    // Closing inflow: the scope's holdings currentValue is in the base
    // currency, so it converts at the latest rate rather than a trade date.
    let terminalBase = 0;
    holdings.forEach((h) => {
      if (type === 'HOLDINGS') terminalBase += Number(h.currentValue) || 0;
      else if (type === 'PORTFOLIO') {
        if (this._port(h) === value) terminalBase += Number(h.currentValue) || 0;
      } else if (this._sym(h) === symbolScope) {
        terminalBase += Number(h.currentValue) || 0;
      }
    });
    let terminalUnconverted = false;
    let terminal = terminalBase;
    if (terminalBase > 0) {
      if (latestEurPerInr) terminal = terminalBase / latestEurPerInr;
      else terminalUnconverted = true;
    }

    let unconverted = 0;
    const flows = [];
    trades.forEach((t) => {
      const day = this._day(t.date);
      if (!day) return;
      const cur = String(t.currency || '').toUpperCase();
      let inr = null;
      if (cur === 'INR' && t.totalAmount !== undefined && t.totalAmount !== null) {
        inr = Number(t.totalAmount);
      } else if (t.amountBase !== undefined && t.amountBase !== null) {
        const rate = eurPerInrOn(day);
        if (rate) inr = Number(t.amountBase) / rate;
      }
      if (inr === null || isNaN(inr)) {
        unconverted++;
        inr = Number(t.totalAmount) || 0;
      }
      flows.push({ date: day, amount: t.type === 'SELL' ? inr : -inr });
    });
    if (terminal > 0) flows.push({ date: until, amount: terminal });
    flows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    let invested = 0;
    let returned = 0;
    for (let i = 0; i < flows.length; i++) {
      if (flows[i].amount < 0) invested += -flows[i].amount;
      else returned += flows[i].amount;
    }

    const xirr = this._solve(flows);

    let note =
      "Trades only — dividends are not tracked. The open position is valued at today's price as a closing inflow.";
    if (trades.length === 0) {
      note = 'No trades in this scope. Pick a portfolio or an investment above.';
    } else if (unconverted > 0) {
      note =
        unconverted + ' of ' + trades.length +
        ' trades could not be converted to INR yet — run a sync so fx_rates carries their rate series.';
    } else if (terminalUnconverted) {
      note =
        'fx_rates has no INR series yet, so the closing value is shown unconverted. Run a sync to fix.';
    } else if (xirr === null) {
      note =
        'No annualized rate: the cashflows do not bracket a solution (e.g. an investment that only ever had outflows — a write-off).';
    }

    return {
      ok: xirr !== null,
      xirr: xirr,
      flows: flows.length,
      invested: invested,
      returned: returned,
      gain: returned - invested,
      since: flows.length ? flows[0].date : null,
      until: until,
      unconverted: unconverted,
      scopeType: type,
      scopeValue: value,
      note: note,
    };
  },
};
