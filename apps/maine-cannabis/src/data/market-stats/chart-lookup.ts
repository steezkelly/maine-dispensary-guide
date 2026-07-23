/**
 * src/data/market-stats/chart-lookup.ts
 *
 * Typed lookup helper for the §8.1 chart visuals on /market-stats.
 * The page imports chart-sources.json directly; this helper builds a
 * strict typed lookup `chartById(id)` that returns the chart payload as
 * a discriminated union (bar-shape, stacked-bar-shape, or tier-list-shape).
 * Using the helper keeps Astro's TypeScript checker happy without an
 * extra build step.
 *
 * Discriminator: `chart.kind`. The four kinds this card ships are
 * 'bar', 'stacked_bar', 'horizontal_bar', and 'tier_list'. The page only
 * imports ChartBar / ChartStackedBar / ChartTierList, so the discriminated
 * union is what the chart-component props consume.
 */

import chartSources from './chart-sources.json';

export interface BarDataPoint {
  label: string;
  value: number;
  kind: string;
}

export interface BarChart {
  id: string;
  title: string;
  source: string;
  caption: string;
  kind: 'bar';
  observation_period: string;
  y_axis_label: string;
  data: BarDataPoint[];
}

export interface TierListTier {
  label: string;
  status: string;
  covers: string;
  kind: string;
}

export interface TierListChart {
  id: string;
  title: string;
  source: string;
  caption: string;
  kind: 'tier_list';
  observation_period: string;
  tiers: TierListTier[];
}

export interface StackedBarChart {
  id: string;
  title: string;
  source: string;
  caption: string;
  kind: 'stacked_bar';
  observation_period: string;
  y_axis_label: string;
  data: BarDataPoint[];
}

export type AnyChart = BarChart | TierListChart | StackedBarChart;

const CHARTS = (chartSources as { charts: AnyChart[] }).charts;

export function chartById(id: string): AnyChart | undefined {
  return CHARTS.find((chart) => chart.id === id);
}
