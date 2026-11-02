import type { AnalyticsRow } from "./types";

const channels = [
  { name: "Organic search", weight: 0.39, rate: 0.042, order: 118 },
  { name: "Paid social", weight: 0.28, rate: 0.031, order: 96 },
  { name: "Email", weight: 0.21, rate: 0.067, order: 132 },
  { name: "Direct", weight: 0.12, rate: 0.049, order: 110 },
];

export function createSampleRows(now = new Date()): AnalyticsRow[] {
  const rows: AnalyticsRow[] = [];
  for (let offset = 89; offset >= 0; offset -= 1) {
    const date = new Date(now.getTime() - offset * 86_400_000).toISOString().slice(0, 10);
    channels.forEach((channel, index) => {
      const weekdayFactor = new Date(`${date}T00:00:00`).getDay() === 0 ? 0.78 : 1;
      const rhythm = 0.87 + ((offset * 13 + index * 17) % 29) / 100;
      const sessions = Math.round((510 + index * 95 + (89 - offset) * 2) * channel.weight * 4 * weekdayFactor * rhythm);
      const conversions = Math.round(sessions * channel.rate * rhythm);
      rows.push({
        date,
        revenue: Math.round(conversions * channel.order * (0.9 + rhythm / 5) * 100) / 100,
        sessions,
        conversions,
        channel: channel.name,
        campaign: `${channel.name} · evergreen`,
      });
    });
  }
  return rows;
}
