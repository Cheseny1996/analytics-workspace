import { parseAnalyticsCsv } from "./csv";
import type { AnalyticsRow } from "./types";

export type AnalyticsConnector = {
  id: string;
  label: string;
  acceptedTypes: string[];
  parse(source: string): AnalyticsRow[];
};

export const csvConnector: AnalyticsConnector = {
  id: "csv",
  label: "CSV upload",
  acceptedTypes: ["text/csv", ".csv"],
  parse: parseAnalyticsCsv,
};
