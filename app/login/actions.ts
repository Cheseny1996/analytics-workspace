"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/login?error=invalid-email");
  if (!isSupabaseConfigured()) redirect("/login?error=missing-env");

  const requestHeaders = await headers();
  const originHeader = requestHeaders.get("origin");
  const hostHeader = requestHeaders.get("x-forwarded-host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const origin = originHeader ?? (hostHeader ? `${protocol}://${hostHeader}` : "http://localhost:3000");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect("/login?error=send-failed");
  redirect("/login?sent=1");
}

export async function signOut() {
  if (!isSupabaseConfigured()) redirect("/");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Unable to sign out: ${error.message}`);
  redirect("/");
}
