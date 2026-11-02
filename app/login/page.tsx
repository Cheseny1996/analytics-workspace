import Link from "next/link";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { requestMagicLink } from "./actions";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "invalid-email": "Enter a valid email address.",
  "missing-env": "Connect Supabase first by setting both required environment variables.",
  "send-failed": "We couldn't send that link. Check your Supabase Auth email settings and try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  return (
    <main className="login-shell">
      <section className="login-card">
        <Link className="back-link" href="/"><ArrowLeft size={16} /> Back to workspace</Link>
        <div className="login-mark"><KeyRound size={21} /></div>
        <span className="eyebrow">NORTHSTAR WORKSPACE</span>
        <h1>Welcome back.</h1>
        <p className="login-description">Sign in to connect your data and keep your imports private.</p>
        {params.sent ? (
          <div className="notice success"><Mail size={18} /><span>Check your inbox for a secure sign-in link.</span></div>
        ) : (
          <form action={requestMagicLink} className="login-form">
            <label htmlFor="email">Work email</label>
            <input id="email" name="email" type="email" placeholder="you@company.com" required autoComplete="email" />
            {params.error && <p className="form-error">{errorMessages[params.error] ?? "Something went wrong. Please try again."}</p>}
            <button type="submit" className="primary-button" disabled={!configured}>Email me a sign-in link</button>
            {!configured && (
              <p className="setup-note">
                Demo mode is open. To enable sign-in, add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>.
              </p>
            )}
          </form>
        )}
        <p className="login-footnote">Passwordless and secure. Your data stays in your Supabase project.</p>
      </section>
    </main>
  );
}
