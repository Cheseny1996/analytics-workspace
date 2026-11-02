import { redirect } from "next/navigation";
import AnalyticsDashboard from "@/components/analytics-dashboard";
import { createSampleRows } from "@/lib/analytics/sample-data";
import type { AnalyticsRow } from "@/lib/analytics/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sampleRows = createSampleRows();
  if (!isSupabaseConfigured()) {
    return (
      <AnalyticsDashboard
        initialRows={sampleRows}
        mode="demo"
        userEmail={null}
        importName={null}
      />
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`Unable to verify your session: ${authError.message}`);

  if (!user) {
    return (
      <AnalyticsDashboard
        initialRows={sampleRows}
        mode="demo"
        userEmail={null}
        importName={null}
      />
    );
  }

  const { data: latestImport, error: importError } = await supabase
    .from("analytics_imports")
    .select("name, records")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (importError) throw new Error(`Unable to load saved analytics: ${importError.message}`);
  const savedRows = latestImport?.records as AnalyticsRow[] | undefined;
  return (
    <AnalyticsDashboard
      initialRows={savedRows?.length ? savedRows : sampleRows}
      mode={savedRows?.length ? "connected" : "empty"}
      userEmail={user.email ?? null}
      importName={savedRows?.length ? latestImport?.name ?? null : null}
    />
  );
}
