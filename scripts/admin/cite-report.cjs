// Perplexity citation audit — run periodically to track GEO progress
// Last run: 2026-05-14

const report = {
  date: "2026-05-14",
  totalQueries: 5,
  results: [
    {
      query: "How to open a dispensary in Maine 2026",
      citations: 2,
      total: 8,
      citedUrls: [
        "https://mainedispensaryguide.com",
        "https://mainedispensaryguide.com/blog/maine-cannabis-microbusiness-license-2026"
      ]
    },
    {
      query: "Maine cannabis license cost",
      citations: 0,
      total: 9,
      citedUrls: []
    },
    {
      query: "Portland Maine dispensary zoning rules",
      citations: 1,
      total: 15,
      citedUrls: [
        "https://mainedispensaryguide.com/blog/portland-maine-cannabis-rules-2026"
      ]
    },
    {
      query: "Dispensary ROI calculator Maine",
      citations: 2,
      total: 10,
      citedUrls: [
        "https://mainedispensaryguide.com/roi-calculator",
        "https://mainedispensaryguide.com/market-stats"
      ]
    },
    {
      query: "Maine cannabis excise tax 2026",
      citations: 1,
      total: 8,
      citedUrls: [
        "https://mainedispensaryguide.com/guides/maine-cannabis-taxes-2026"
      ]
    }
  ]
};

const totalCitations = report.results.reduce((sum, r) => sum + r.citations, 0);
const totalSources = report.results.reduce((sum, r) => sum + r.total, 0);
const pct = ((totalCitations / totalSources) * 100).toFixed(1);

console.log(`Citation Rate: ${totalCitations}/${totalSources} (${pct}%)`);
report.results.forEach(r => {
  console.log(`  ${r.citations > 0 ? '✓' : '✗'} "${r.query}" — ${r.citations}/${r.total}`);
});

// Areas to improve: license cost (0%), zoning, taxes
module.exports = report;
