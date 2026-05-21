# ArtPiq end-to-end smoke tests

Lightweight Playwright suite that catches the worst surprises before a deploy.

## Running

Against the local dev server (auto-starts):

```bash
npx playwright test
```

Against a specific deploy:

```bash
BASE_URL=https://artpiq-ar.vercel.app npx playwright test
```

Open the HTML report after a failure:

```bash
npx playwright show-report
```

## Environment

| Env var | Purpose | Required |
|---|---|---|
| `BASE_URL` | Where to point the suite. Defaults to `http://localhost:3005`. | optional |
| `ARTPIQ_TEST_EMAIL` | Login email for auth-gated tests (skipped if absent). | optional |
| `ARTPIQ_TEST_PASSWORD` | Login password for the same. | optional |
| `ARTPIQ_TEST_OWNER_ID` | A real owner id whose `/v/[slug]` exists, for the viewing-room test. | optional |

The first-pass suite focuses on **public surfaces** so it can run in any
preview environment without seeding fixtures. Login-gated flows live in
`tests/e2e/auth/*` and are conditionally skipped when creds are missing.

## What's covered (smoke)

- Landing page renders.
- Sign-in page renders + shows the magic-link form.
- Embed script returns the right Content-Type + CORS headers.
- `/api/subscribe` returns 400 without an owner, 200 with one (uses a fixed
  test owner id).

## What's NOT covered yet

- Authenticated CRM / Deals / Social flows. Need seeded test data.
- Stripe / billing. Not wired yet.
- Image-upload happy path. Needs Storage RLS-aware test owner.

Track findings + bug reports in `docs/qa-findings-2026-05.md`.
