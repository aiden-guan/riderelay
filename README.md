# RideRelay

RideRelay is a community referral board for Lime and Veo. List a referral link
or code for free, help another rider get credit, and climb the board through
real visits to RideRelay—not by clicking your own listing.

![RideRelay branded social preview](public/og.jpg)

## What it does

- Browse provider-specific boards and receive a referral link or code.
- Submit and manage your own listing after signing in.
- Route visitors through referral assignments and record copy, open, and
  outcome activity.
- Count shares from other visitors while excluding the inviter's account,
  device, and own listing.
- Use rate limits and outcome reports to adjust listing confidence and
  quarantine referrals that repeatedly fail.

## How it works

```text
Browser
  -> TanStack Router loaders and server functions
  -> referral allocation, trust, and auth helpers
  -> SQL data layer
       -> embedded PGLite locally
       -> Postgres-compatible DATABASE_URL when configured
```

Provider boards and referral state live in SQL migrations under `migrations/`.
The local path uses embedded PGLite when `DATABASE_URL` is unset; setting that
variable switches the data layer to Postgres through `pg`. Better Auth handles
the signed-in listing and dashboard flows.

## Getting started

Prerequisites: Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:8080](http://localhost:8080). The development server
uses port `8080` by design.

Without `DATABASE_URL`, the app starts with an embedded PGLite database. To
use a persistent Postgres-compatible database, set the variable in your shell
before starting the app:

```bash
DATABASE_URL="postgres://user:password@host/database" npm run dev
```

Never commit a real connection string or other credentials.

## Verify the repository

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

`npm run build` runs the Vite build and then the migration script. If
`DATABASE_URL` is not set, the migration step reports that it is skipping the
remote database.

When a development server is already running, the auth invariant check can
compare the server's resolved auth mode with the build configuration:

```bash
npm run check:auth -- --dev-url http://127.0.0.1:8080
```

## Repository map

- `src/routes/` — public boards, referral flows, account pages, and legal pages.
- `src/components/` — board, referral, navigation, and form UI.
- `src/lib/referrals/` — allocation, share attribution, validation, and trust
  scoring.
- `src/lib/auth/` — Better Auth integration and session gates.
- `src/lib/server/` — server functions and database-backed application logic.
- `migrations/` — application schema and seed data.
- `scripts/` — migrations, environment handling, auth checks, and browser-smoke
  helpers.

## Status and limits

The repository contains the referral-board implementation and its local
verification commands. Deployment configuration, production database state,
provider referral eligibility, and live external-provider behavior must be
verified separately. Referral benefits and eligibility are controlled by Lime
and Veo, not by RideRelay.

There is currently no license or contribution guide in this repository.
