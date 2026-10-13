export default {
  formatCurrency(val) {
    if (val === undefined || val === null || isNaN(Number(val))) return '€0,00';
    return '€' + Number(val).toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },

  getBucketOptions() {
    const list = GetPortfolioOverview.data?.[0]?.availablePortfolios || ['Main', 'Y-balloon'];
    const options = [{ label: "All Buckets", value: "ALL" }];
    list.forEach(b => options.push({ label: b, value: b }));
    return options;
  }
}