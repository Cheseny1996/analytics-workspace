import type { AnalyticsRow } from "./types";

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_ROWS = 10_000;
export const MAX_COLUMNS = 20;
const MAX_METRIC_VALUE = 1_000_000_000_000_000;

const REQUIRED_HEADERS = ["date", "revenue", "sessions"];
const ALLOWED_HEADERS = new Set([
  ...REQUIRED_HEADERS,
  "conversions",
  "channel",
  "campaign",
]);

export class CsvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvValidationError";
  }
}

function parseRecords(source: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;

  const finishRecord = () => {
    record.push(field);
    if (record.some((value) => value.trim() !== "")) {
      if (record.length > MAX_COLUMNS) {
        throw new CsvValidationError(`CSV exceeds the ${MAX_COLUMNS} column limit.`);
      }
      if (records.length >= MAX_ROWS + 1) {
        throw new CsvValidationError(`CSV exceeds the ${MAX_ROWS.toLocaleString()} row limit.`);
      }
      records.push(record);
    }
    record = [];
    field = "";
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (closedQuote) {
      if (character === ",") {
        record.push(field);
        field = "";
        closedQuote = false;
        if (record.length >= MAX_COLUMNS) {
          throw new CsvValidationError(`CSV exceeds the ${MAX_COLUMNS} column limit.`);
        }
      } else if (character === "\n" || character === "\r") {
        finishRecord();
        closedQuote = false;
        if (character === "\r" && source[index + 1] === "\n") index += 1;
      } else {
        throw new CsvValidationError("CSV contains unexpected characters after a quoted field.");
      }
    } else if (character === '"') {
      if (field.length !== 0) {
        throw new CsvValidationError("CSV quotes must begin at the start of a field.");
      }
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
      if (record.length >= MAX_COLUMNS) {
        throw new CsvValidationError(`CSV exceeds the ${MAX_COLUMNS} column limit.`);
      }
    } else if (character === "\n" || character === "\r") {
      finishRecord();
      if (character === "\r" && source[index + 1] === "\n") index += 1;
    } else {
      field += character;
    }
  }

  if (quoted) throw new CsvValidationError("CSV contains an unclosed quoted field.");
  finishRecord();
  return records;
}

function parseNumber(value: string, label: string, rowNumber: number): number {
  const normalized = value.trim();
  if (!normalized || !/^(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
    throw new CsvValidationError(`Row ${rowNumber}: ${label} must be a non-negative number.`);
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed > MAX_METRIC_VALUE) {
    throw new CsvValidationError(`Row ${rowNumber}: ${label} must not exceed ${MAX_METRIC_VALUE.toLocaleString()}.`);
  }
  return parsed;
}

export function parseAnalyticsCsv(source: string): AnalyticsRow[] {
  if (!source.trim()) throw new CsvValidationError("The CSV file is empty.");
  const records = parseRecords(source.replace(/^\uFEFF/, ""));
  if (records.length < 2) throw new CsvValidationError("Add a header row and at least one data row.");
  if (records.length - 1 > MAX_ROWS) {
    throw new CsvValidationError(`CSV exceeds the ${MAX_ROWS.toLocaleString()} row limit.`);
  }

  const headers = records[0].map((header) => header.trim().toLowerCase());
  if (headers.length > MAX_COLUMNS) {
    throw new CsvValidationError(`CSV exceeds the ${MAX_COLUMNS} column limit.`);
  }
  if (new Set(headers).size !== headers.length) {
    throw new CsvValidationError("CSV contains duplicate column names.");
  }
  const unknown = headers.filter((header) => !ALLOWED_HEADERS.has(header));
  if (unknown.length) {
    throw new CsvValidationError(`Unsupported column${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}.`);
  }
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) {
    throw new CsvValidationError(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`);
  }

  return records.slice(1).map((record, rowIndex) => {
    const rowNumber = rowIndex + 2;
    if (record.length !== headers.length) {
      throw new CsvValidationError(`Row ${rowNumber}: expected ${headers.length} columns, received ${record.length}.`);
    }
    const values = Object.fromEntries(headers.map((header, index) => [header, record[index].trim()]));
    const date = values.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
      throw new CsvValidationError(`Row ${rowNumber}: date must use YYYY-MM-DD format.`);
    }
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (parsedDate.toISOString().slice(0, 10) !== date) {
      throw new CsvValidationError(`Row ${rowNumber}: date is not a valid calendar date.`);
    }
    const channel = values.channel || "Unattributed";
    const campaign = values.campaign || "All campaigns";
    if (channel.length > 80 || campaign.length > 120) {
      throw new CsvValidationError(`Row ${rowNumber}: channel or campaign exceeds the allowed length.`);
    }
    return {
      date,
      revenue: parseNumber(values.revenue, "revenue", rowNumber),
      sessions: parseNumber(values.sessions, "sessions", rowNumber),
      conversions: values.conversions
        ? parseNumber(values.conversions, "conversions", rowNumber)
        : 0,
      channel,
      campaign,
    };
  });
}
