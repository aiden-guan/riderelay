# RewardRelay

Invite friends. Spend points. Climb a referral board.

![RewardRelay branded social preview](public/og.jpg)

RewardRelay is a campus referral board for rides, food, money, shopping,
travel, campus tools, and phone plans. Listing is free. Rank on a company
board is the boost you put on that listing — not self-clicks.

The product name is RewardRelay. This repository is still
[`aiden-guan/riderelay`](https://github.com/aiden-guan/riderelay).

## Ranking

1. Sign in and list one referral link or code per company.
2. Share your RewardRelay invite. Each credited friend is worth **10 points**.
3. Spend those points on a listing. That listing’s boost is its rank.
4. Featured pins sit above score. Older listings break remaining ties.

A share only counts when it is a different visitor who arrived through your
invite token and then signed up or copied a listing. Claims from your own
account, device, or listing are ignored. Rate limits and outcome reports
adjust listing confidence and quarantine referrals that repeatedly fail.

Replacing a listing carries its boost. Archiving one zeros the boost.

## Boards

Categories and companies are separate in the UI.

| Category | Companies |
| --- | --- |
| Rides | Lime, Veo, Uber, Lyft, Bird |
| Food | DoorDash, Uber Eats, Grubhub, Instacart, Gopuff, Chipotle, HelloFresh |
| Money | Cash App, Venmo, Robinhood, SoFi, Chime, Coinbase, PayPal |
| Shopping | Amazon, Rakuten |
| Travel | Airbnb, Booking.com |
| Campus | Chegg, Grammarly, Canva, Notion, Dropbox |
| Phone | Mint Mobile, Visible |

Company marks are original letter lockups, not official logos. Names appear
under nominative fair use. Referral benefits and eligibility are controlled
by each provider, not by RewardRelay.

## Stack

- TanStack Start, Vite, React, Tailwind
- Better Auth for email and password, plus Google and X when configured
- SQL migrations under `migrations/`
- Embedded PGLite when `DATABASE_URL` is unset; Postgres through `pg` when it is set

## Repository map

- `src/routes/` — public boards, referral flows, account pages, and legal pages
- `src/components/` — board, referral, navigation, and form UI
- `src/lib/referrals/` — allocation, share attribution, points, and trust
- `src/lib/auth/` — Better Auth integration and session gates
- `src/lib/server/` — server functions and database-backed application logic
- `migrations/` — schema, catalog, points, and the RewardRelay rename
- `scripts/` — migrations, environment handling, and checks
- `public/og.jpg` and `public/x-banner.jpg` — social preview and X banner

## Develop

Node.js 22+ and npm.

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

`npm run build` runs the Vite build, then the migration script. Without
`DATABASE_URL`, the migration step skips the remote database.

To persist data in Postgres instead of the embedded store:

```bash
DATABASE_URL="postgres://user:password@host/database" npm run dev
```

Never commit a real connection string or other credentials.

## Status

This repository is the RewardRelay board. There is no license or contribution
guide. Deployment, production database state, and live provider programs must
be verified separately from the code.
