# SPEDUMAP — Web App

Next.js 15 + TypeScript + Tailwind CSS + Supabase

## Setup

```bash
npm install
cp .env.local.example .env.local
# Fill in .env.local with your Supabase keys
npm run dev
```

## Deploy to Vercel

```bash
npx vercel --prod
# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Folder Structure

```
app/
  auth/login/         Login page (public)
  admin/              Admin panel (role: admin)
  head/dashboard/     Head therapist dashboard (role: head_therapist, admin)
  therapist/
    baseline/         Baseline Setting
    goal/             Goal Setting
    cycle/            Cycle Open
    session/          Daily Session
    report/           Progress Report
lib/
  supabase/
    client.ts         Browser Supabase client
    server.ts         Server Supabase client
types/
  spedumap.ts         Canonical TypeScript types
middleware.ts         Role-based auth routing
```

## Auth Roles

| Role | Access |
|---|---|
| `admin` | /admin + /therapist + /head |
| `head_therapist` | /head + /therapist |
| `senior_therapist` | /therapist |
| `junior_therapist` | /therapist |
