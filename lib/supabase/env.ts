const REQUIRED_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

export function getSupabaseEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing required Supabase environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  try {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("invalid protocol");
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid http or https URL.");
  }
  return {
    url,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
  };
}

export function isSupabaseConfigured() {
  return REQUIRED_ENV.every((key) => Boolean(process.env[key]?.trim()));
}
