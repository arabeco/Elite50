# ELITE 2050

Football management in a cyberpunk future.

ELITE 2050 is a browser-based football management game built with React, TypeScript, Vite and Supabase. You manage a franchise in a futuristic district league: create or join worlds, draft players, tune tactics, train the squad and simulate seasons.

## Current Status

The project is runnable locally and has basic automated coverage for the game engine, calendar and player card UI.

```bash
cmd /c npm run lint
cmd /c npm run test
cmd /c npm run build
```

All three commands should pass on Windows. Running through `cmd /c` avoids the common PowerShell `npm.ps1` execution policy block.

## Requirements

- Node.js 18 or newer
- A Supabase project for authentication and cloud saves

## Setup

```bash
npm install
copy .env.example .env
```

Fill `.env` with your Supabase URL and anon key.

## Development

```bash
cmd /c npm run dev -- --host 127.0.0.1
```

The app runs at:

```text
http://127.0.0.1:3000
```

The default `dev` script binds to port `3000`.

## Auth And Saves

The app uses Supabase Auth and stores game progress in `public.games`. Game saves do not use localStorage. Supabase Auth may keep the browser session in its own client-side storage for a static Vite app; moving auth sessions to HTTP-only cookies would require a backend/SSR layer.

Supported login methods:

- Email and password
- New account signup
- Google OAuth
- Password recovery email

Required Supabase project settings:

- Enable Email provider in Authentication > Providers.
- Enable Google provider in Authentication > Providers.
- Add local and production URLs in Authentication > URL Configuration.

Redirect URLs to add before launch:

```text
http://localhost:3000/**
http://127.0.0.1:3000/**
https://YOUR-VERCEL-DOMAIN.vercel.app/**
https://YOUR-CUSTOM-DOMAIN/**
```

Required Vercel environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

For Google OAuth, configure the Supabase Google provider with the callback URL shown by Supabase for your project.

## Vercel Deploy

This is a Vite SPA. Vercel should use:

```text
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

`vercel.json` rewrites all routes to `index.html`, so direct visits to `/login`, `/worlds`, and `/dashboard` work.

## Production Build

```bash
cmd /c npm run build
```

The generated files are written to `dist/`.

## Useful Scripts

```bash
cmd /c npm run dev
cmd /c npm run lint
cmd /c npm run test
cmd /c npm run build
cmd /c npm run clean
```

## Project Map

```text
src/
  components/          React UI components
  components/dashboard Dashboard tabs
  constants/           Game constants and trait descriptions
  docs/                Architecture and game design notes
  engine/              Match engine, generation, calendar and season logic
  hooks/               Feature hooks for dashboard flows
  lib/                 Supabase integration
  store/               Game context and reducer
  test/                Vitest tests
  types.ts            Shared TypeScript types
supabase/
  functions/           Supabase Edge Functions
  migrations/          Database migrations
public/
  assetas/             Avatar and static visual assets
```

## Known Cleanup Targets

- Several old audit and simulation output files still live in the repository root.
- Some UI strings in source files are mojibake from a past encoding issue.
- The production bundle is large and would benefit from route or tab-level code splitting.
