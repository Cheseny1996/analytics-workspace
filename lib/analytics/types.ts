export type AnalyticsRow = {
  date: string;
  revenue: number;
  sessions: number;
  conversions: number;
  channel: string;
  campaign: string;
};

export type MetricSummary = {
  revenue: number;
  sessions: number;
  conversions: number;
  conversionRate: number;
  averageOrderValue: number;
};

export type DailyMetric = {
  date: string;
  revenue: number;
  sessions: number;
};

export type ChannelMetric = {
  channel: string;
  revenue: number;
  sessions: number;
  conversions: number;
};
