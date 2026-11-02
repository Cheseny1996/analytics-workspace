import { describe, expect, it } from "vitest";
import { CsvValidationError, MAX_ROWS, parseAnalyticsCsv } from "../lib/analytics/csv";

describe("CSV validation and parsing", () => {
  it("parses supported fields, BOM, escaped quotes, and defaults", () => {
    const result = parseAnalyticsCsv(
      '\uFEFFdate,revenue,sessions,conversions,channel,campaign\r\n2026-05-01,124.50,300,12,"Paid, social","Summer ""launch"""',
    );
    expect(result).toEqual([{
      date: "2026-05-01",
      revenue: 124.5,
      sessions: 300,
      conversions: 12,
      channel: "Paid, social",
      campaign: 'Summer "launch"',
    }]);
    expect(parseAnalyticsCsv("date,revenue,sessions\n2026-05-01,1,2")[0]).toMatchObject({
      conversions: 0,
      channel: "Unattributed",
      campaign: "All campaigns",
    });
  });

  it.each([
    ["missing required header", "date,revenue\n2026-05-01,1", /Missing required column/],
    ["unsupported header", "date,revenue,sessions,customer_email\n2026-05-01,1,2,a@example.com", /Unsupported column/],
    ["duplicate header", "date,revenue,sessions,sessions\n2026-05-01,1,2,3", /duplicate/],
    ["non-ISO date", "date,revenue,sessions\n05/01/2026,1,2", /YYYY-MM-DD/],
    ["invalid calendar date", "date,revenue,sessions\n2026-02-30,1,2", /valid calendar date/],
    ["negative value", "date,revenue,sessions\n2026-05-01,-1,2", /non-negative/],
    ["unclosed quote", 'date,revenue,sessions\n2026-05-01,1,"2', /unclosed/],
    ["characters after a quoted field", 'date,revenue,sessions\n2026-05-01,1,"2"x', /unexpected characters/],
    ["quote inside an unquoted field", 'date,revenue,sessions\n2026-05-01,1"x,2', /quotes must begin/],
    ["excessive numeric value", `date,revenue,sessions\n2026-05-01,${"9".repeat(17)},2`, /must not exceed/],
    ["ragged row", "date,revenue,sessions\n2026-05-01,1,2,extra", /expected 3 columns/],
  ])("rejects %s", (_label, csv, message) => {
    expect(() => parseAnalyticsCsv(csv)).toThrow(message);
  });

  it("enforces the row limit before processing an oversized dataset", () => {
    const lines = ["date,revenue,sessions", ...Array.from({ length: MAX_ROWS + 1 }, () => "2026-05-01,1,2")];
    expect(() => parseAnalyticsCsv(lines.join("\n"))).toThrow(CsvValidationError);
    expect(() => parseAnalyticsCsv(lines.join("\n"))).toThrow(/row limit/);
  });

  it("rejects empty files and data without rows", () => {
    expect(() => parseAnalyticsCsv(" \n")).toThrow(/empty/);
    expect(() => parseAnalyticsCsv("date,revenue,sessions\n")).toThrow(/at least one data row/);
  });
});
