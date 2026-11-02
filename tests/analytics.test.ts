import { describe, expect, it } from "vitest";
import { filterRows, groupChannels, groupDaily, summarize } from "../lib/analytics/metrics";
import type { AnalyticsRow } from "../lib/analytics/types";

const rows: AnalyticsRow[] = [
  { date: "2026-03-01", revenue: 120, sessions: 100, conversions: 5, channel: "Search", campaign: "Brand" },
  { date: "2026-03-02", revenue: 80, sessions: 50, conversions: 4, channel: "Email", campaign: "Welcome" },
  { date: "2026-03-02", revenue: 40, sessions: 50, conversions: 1, channel: "Search", campaign: "Brand" },
];

describe("analytics calculations", () => {
  it("calculates totals, conversion rate and average order value", () => {
    expect(summarize(rows)).toEqual({
      revenue: 240,
      sessions: 200,
      conversions: 10,
      conversionRate: 5,
      averageOrderValue: 24,
    });
  });

  it("aggregates dates and sorts channels by revenue", () => {
    expect(groupDaily(rows)).toEqual([
      { date: "2026-03-01", revenue: 120, sessions: 100 },
      { date: "2026-03-02", revenue: 120, sessions: 100 },
    ]);
    expect(groupChannels(rows).map(({ channel }) => channel)).toEqual(["Search", "Email"]);
  });

  it("filters by inclusive date range and channel", () => {
    expect(filterRows(rows, { days: 2, channel: "Search", now: new Date("2026-03-02T12:00:00Z") })).toHaveLength(2);
    expect(filterRows(rows, { days: 1, now: new Date("2026-03-02T12:00:00Z") })).toHaveLength(2);
    expect(filterRows(rows, { days: 1, now: new Date("2026-03-01T12:00:00Z") })).toHaveLength(1);
  });

  it("searches campaign and channel names without case sensitivity", () => {
    expect(filterRows(rows, { search: "welcome", now: new Date("2026-03-02T12:00:00Z") })).toHaveLength(1);
    expect(filterRows(rows, { search: "missing", now: new Date("2026-03-02T12:00:00Z") })).toHaveLength(0);
  });

  it("returns zero rates for empty values", () => {
    expect(summarize([])).toEqual({
      revenue: 0,
      sessions: 0,
      conversions: 0,
      conversionRate: 0,
      averageOrderValue: 0,
    });
  });
});
