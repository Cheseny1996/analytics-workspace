# Northstar Analytics Workspace

A standalone, server-rendered analytics app built with Next.js 16, React, TypeScript, and Supabase. It opens in **Demo mode** with synthetic data and can be connected to private, per-user CSV imports with Supabase Auth and Postgres. It is designed to deploy as a regular Next.js app on Vercel; routes are dynamic and there is no static export.

## What’s included

- Public synthetic analytics dashboard with date/channel filters, revenue trend, acquisition mix, and channel metrics.
- CSV import with a 2 MB file limit, 10,000-row limit, 20-column limit, strict header/type/date checks, and actionable errors.
- Passwordless email sign-in, server-side session verification, and per-user Postgres persistence protected by RLS.
- Supabase session-cookie refresh in the Next.js 16 `proxy.ts` convention, with static assets excluded.
- CSV is the initial provider-neutral connector. The connector interface in `lib/analytics/connectors.ts` maps supported sources into the shared analytics row shape; other providers can be added without changing metric calculations or the dashboard.
- Unit tests for CSV parsing/validation and analytics calculations.

## Run locally

Requirements: Node.js 20.9+ (Node 22 recommended) and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Supabase environment variables, the dashboard is an explicitly labeled, read-only synthetic preview. Login and private imports are not available in Demo mode; those endpoints report a configuration/authentication error rather than pretending data was saved.

## Connect Supabase

1. Create a free Supabase project.
2. In the Supabase SQL Editor, run [`supabase/migrations/20261101000000_create_analytics_imports.sql`](supabase/migrations/20261101000000_create_analytics_imports.sql). This creates the import table, enables RLS, and grants authenticated users only read/replace access to their own row.
3. Copy `.env.example` to `.env.local` and set values from **Project Settings → API**:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
   ```

   Only the public project URL and public anon/publishable key are used. **Never put a service-role key in the browser or this project.** Keep `.env.local` out of version control.
4. In Supabase **Authentication → URL Configuration**, set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the redirect allow list. Enable email sign-in and configure SMTP for production delivery.
5. Restart `npm run dev`, select **Sign in**, and follow the emailed magic link. After signing in, import a CSV. The app keeps one active import per user; a replacement is atomic, private, and shown on your dashboard.

### CSV format

Required headers: `date`, `revenue`, `sessions`. Optional headers: `conversions`, `channel`, `campaign`. Headers are case-insensitive; dates must be real calendar dates in `YYYY-MM-DD`; numeric fields must be finite and non-negative. Missing conversions default to zero, missing channel/campaign values are labeled. Unknown or duplicate columns, malformed rows, and unsupported file sizes are rejected.

Example:

```csv
date,revenue,sessions,conversions,channel,campaign
2026-10-28,1480.25,930,42,Organic search,Brand terms
2026-10-28,870,510,21,Email,October newsletter
```

## Free Vercel deployment

1. Push this standalone folder to a new Git repository and import it into Vercel. Use the default Next.js build and output settings; do not enable static export.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as Vercel project environment variables for Preview and Production. Redeploy after adding or changing them.
3. In Supabase Auth URL Configuration, set the deployed app URL as the Site URL and allow the exact `https://your-domain/auth/callback` callback URL. Add the Vercel preview callback URL too if you use preview sign-in.
4. Confirm the migration has run and test both an unauthenticated demo visit and an authenticated import. The CSV limit is below the request payload limit of standard Vercel functions.

Free-tier limits, email delivery quotas, and provider features can change. Review the current Vercel and Supabase plan limits before production use.

## Checks

```bash
npm run lint
npm test
npm run typecheck
npm run build
```

## Connector and data notes

The CSV connector normalizes source rows into a vendor-independent `AnalyticsRow` type. New sources should validate input and produce the same type, then use an authenticated server-side persistence adapter. Keep provider secrets server-only, never bypass Supabase RLS, and keep provider credentials out of `NEXT_PUBLIC_*` variables. The current import is stored as JSONB per user and replaces that user's previous dataset on successful import; avoid uploading sensitive personal data unless you have an appropriate retention and access policy.
