import type { AnalyticsRow, ChannelMetric, DailyMetric, MetricSummary } from "./types";

export function summarize(rows: AnalyticsRow[]): MetricSummary {
  const totals = rows.reduce(
    (result, row) => ({
      revenue: result.revenue + row.revenue,
      sessions: result.sessions + row.sessions,
      conversions: result.conversions + row.conversions,
    }),
    { revenue: 0, sessions: 0, conversions: 0 },
  );
  return {
    ...totals,
    conversionRate: totals.sessions ? (totals.conversions / totals.sessions) * 100 : 0,
    averageOrderValue: totals.conversions ? totals.revenue / totals.conversions : 0,
  };
}

export function groupDaily(rows: AnalyticsRow[]): DailyMetric[] {
  const days = new Map<string, DailyMetric>();
  for (const row of rows) {
    const metric = days.get(row.date) ?? { date: row.date, revenue: 0, sessions: 0 };
    metric.revenue += row.revenue;
    metric.sessions += row.sessions;
    days.set(row.date, metric);
  }
  return [...days.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function groupChannels(rows: AnalyticsRow[]): ChannelMetric[] {
  const channels = new Map<string, ChannelMetric>();
  for (const row of rows) {
    const metric = channels.get(row.channel) ?? {
      channel: row.channel,
      revenue: 0,
      sessions: 0,
      conversions: 0,
    };
    metric.revenue += row.revenue;
    metric.sessions += row.sessions;
    metric.conversions += row.conversions;
    channels.set(row.channel, metric);
  }
  return [...channels.values()].sort((left, right) => right.revenue - left.revenue);
}

export function filterRows(
  rows: AnalyticsRow[],
  options: { days?: number; channel?: string; search?: string; now?: Date } = {},
): AnalyticsRow[] {
  const cutoff = options.days
    ? new Date((options.now ?? new Date()).getTime() - (options.days - 1) * 86_400_000)
        .toISOString()
        .slice(0, 10)
    : undefined;
  const endDate = (options.now ?? new Date()).toISOString().slice(0, 10);
  const search = options.search?.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (!cutoff || row.date >= cutoff) &&
      row.date <= endDate &&
      (!options.channel || options.channel === "all" || row.channel === options.channel) &&
      (!search || `${row.channel} ${row.campaign}`.toLowerCase().includes(search)),
  );
}
