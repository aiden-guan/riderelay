# RideRelay

Community board for Lime and Veo referral invites. Listing is free. Rank is
real shares of RideRelay — your own clicks don’t count.

Creator listings sit at the top of each board as a way to tip the creator.

## Run locally

```bash
npm install
npm run dev
```

The app uses embedded Postgres (PGLite) when `DATABASE_URL` is unset. Set
`DATABASE_URL` to a Postgres URL for a persistent database.

```bash
npm test
npm run typecheck
```

## How it works

- List a Lime invite link or Veo code for free.
- Copy or open a listing to use it in the provider app.
- Share your RideRelay invite. Rank climbs when someone else actually arrives.
- Self-claims and repeat visitors from the same browser don’t count as shares.
