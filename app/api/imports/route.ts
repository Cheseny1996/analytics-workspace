import { NextResponse } from "next/server";
import { CsvValidationError, MAX_FILE_BYTES, MAX_ROWS } from "@/lib/analytics/csv";
import { csvConnector } from "@/lib/analytics/connectors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable private imports." },
      { status: 503 },
    );
  }

  const requestOrigin = request.headers.get("origin");
  if (requestOrigin) {
    try {
      if (new URL(requestOrigin).origin !== new URL(request.url).origin) {
        return NextResponse.json({ error: "Cross-origin imports are not allowed." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    return NextResponse.json({ error: "Unable to verify your sign-in. Refresh the page and try again." }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "Sign in before importing private data." }, { status: 401 });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILE_BYTES + 64_000) {
    return NextResponse.json({ error: "CSV files must be 2 MB or smaller." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send a multipart form with one CSV file." }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a CSV file to import." }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ error: "The selected file is empty." }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "CSV files must be 2 MB or smaller." }, { status: 413 });
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Only .csv files are supported." }, { status: 415 });
  }

  let rows;
  try {
    rows = csvConnector.parse(await file.text());
  } catch (error) {
    if (error instanceof CsvValidationError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return NextResponse.json({ error: "The CSV could not be read." }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `CSV exceeds the ${MAX_ROWS.toLocaleString()} row limit.` }, { status: 422 });
  }

  const name = file.name.replace(/\.csv$/i, "").slice(0, 100) || "CSV import";
  const { data, error } = await supabase
    .from("analytics_imports")
    .upsert(
      { owner_id: user.id, name, row_count: rows.length, records: rows },
      { onConflict: "owner_id" },
    )
    .select("id, name, records, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Import could not be saved. Confirm the database migration is applied and try again." }, { status: 500 });
  }
  return NextResponse.json({ import: data }, { status: 201 });
}
