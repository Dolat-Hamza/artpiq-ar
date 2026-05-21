# ArtPiq architecture + scope — May 2026

Three deliverables in one doc, per Thomas's brief.

1. **Dev-time estimates** for everything currently on the launch plan.
2. **Simple architecture options** for the current stack.
3. **Honest assessment of the Next.js + FastAPI split** he's considering.

All estimates assume one focused developer (me), 6-hour productive days, no
interruptions. Calendar time is roughly 1.5× engineering days because the
launch is mid-week with normal CRs and deploys.

---

## 1. Dev-time estimates

| Item | Eng-days | Calendar | Status | Notes |
|---|---|---|---|---|
| **Iframe admin in Squarespace** — frame headers, popup-based magic-link, postMessage session bridge, Safari ITP workarounds | 1.5–2 | 2.5–3 | Not started | Hardest part: Safari + ITP (third-party storage access). Need a real Safari device for testing. |
| **One-way Squarespace sync** — replace CSV export with live SQSP Commerce API push (idempotent SKU upsert + price/stock sync) | 1 | 1.5 | Reuses `src/lib/sqspExport.ts`. Needs SQSP Commerce API token from Thomas's store + a Vercel cron. |
| **Two-way Squarespace sync** — webhook receiver, inbound stock/price reconciliation, sale-event auto-marks artwork sold | 2–3 | 3–4 | Squarespace Commerce webhooks are documented but their reliability is uneven; needs retry + dedup layer. |
| **Structured Interests taxonomy** — migration (new `interest_options` table), wire dropdowns into existing ChipInput, migrate the free-text data shipped today | 0.5–1 | 1 | Schema work small; UI already mostly there. |
| **Room library scale** — curate 50 royalty-free rooms (Pexels/Unsplash), bulk-import via the CSV path shipped in PR #57, add wall-quads | 0.5 | 1 | Manual curation work. Quality varies; budget 30 min per room to find + calibrate the wall quad. |
| **Lighthouse perf pass** — webp conversion at upload, Next/Image responsive variants, bundle-size audit, viewing-room ISR caching | 1 | 1.5 | Mostly Vercel config + a few `<Image>` swaps. |
| **OG / social card images** — auto-generate per artwork + viewing-room for link previews | 0.5 | 1 | Vercel `@vercel/og` library, ~5 small components. |
| **Onboarding / first-run improvements** — extend the tour I shipped (PR #58) with sample-data prompts | 0.5 | 1 | Cosmetic / educational, defer if tight. |
| **QA pass + bug fixes** from the manual checklist | 1–2 | 2–3 | Depends on findings. Budget 30 min per P1, 1 h per P0. |
| **Total** | **8.5–11.5 days** | **13–16 days** | | ~2.5 weeks of calendar time. |

Critical-path items if launch is tight: iframe admin + Squarespace one-way + QA. ~5 eng-days, ~1 week calendar.

---

## 2. Architecture options

### Option A — Keep current stack, ship as-is (recommended for next 6 months)

```
┌─────────────────────────┐    ┌──────────────────────┐
│  Browser                │───→│  Vercel              │
│  (Squarespace iframe or │    │  Next.js 15 App      │
│   artpiq.com directly)  │    │  Router (full-stack) │
└─────────────────────────┘    └──────────┬───────────┘
                                          │
                                          ↓
                               ┌──────────────────────┐
                               │  Supabase            │
                               │  Postgres + Storage  │
                               │  + Auth + RLS        │
                               └──────────────────────┘
```

- **Cost today:** ~$0 (Vercel Hobby + Supabase Free).
- **Cost at 10 paying galleries:** ~$45/mo (Vercel Pro $20 + Supabase Pro $25).
- **Cost at 100 paying galleries:** ~$200–300/mo (Vercel Pro + Supabase Pro + storage overage for room library + image hosting).
- **Scaling ceiling:** comfortably handles ~10k MAU with current code. Beyond that, see Option B.
- **Migration cost:** zero — this is what we have.
- **Recommendation:** stay here through the first 50 galleries. Ship features instead of moving boxes.

### Option B — Same stack, scale-ready optimizations (recommended once first 5 customers onboard)

Same diagram, plus:

- **Vercel Edge cache** on `/v/[slug]` viewing rooms + `/discover/[slug]` profiles. These are read-heavy and rarely change. Static-revalidate every 60 s → TTFB drops from ~400 ms to ~50 ms globally.
- **Supabase read replicas** if CRM queries on a single account grow past ~5k contacts (none yet).
- **Image pipeline** — convert uploads to WebP server-side via `sharp` (already a dep), serve through Next/Image responsive variants.
- **Background jobs** — Vercel cron for Squarespace sync + scheduled-post publisher + nightly QA-fixture cleanup. Optionally Inngest for retryable jobs.
- **Observability** — `@vercel/analytics` (already shipped) + Supabase Log Drain for query-time histograms.

Engineering cost: 3–5 days spread across the first month after launch. Cost of inaction: minor TTFB regressions on public surfaces.

### Option C — Split Next.js + FastAPI (recommend NOT to pursue)

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Browser     │───→│  Next.js     │───→│  FastAPI     │
│              │    │  (Vercel)    │    │  (Render /   │
│              │    │  frontend +  │    │   Railway)   │
│              │    │  SSR shell   │    │  Python API  │
└──────────────┘    └──────┬───────┘    └──────┬───────┘
                           │                   │
                           ↓                   ↓
                    ┌──────────────────────────────────┐
                    │  Supabase (shared)               │
                    └──────────────────────────────────┘
```

See the full pros/cons in §3. Short version: don't.

---

## 3. FastAPI split — honest assessment

You asked specifically about a Next.js front + FastAPI back split. Here's what I'd actually do if you were paying me out of pocket.

### What the split buys you

- **Python ML / CV ecosystem** if you ever need:
  - On-upload image colour palette extraction (Vibrant.js works in JS, so not really)
  - Object detection in artwork photos (PyTorch is much better than JS equivalents)
  - OCR for invoices / receipts (Tesseract works in JS; better in Python)
  - Heavy data pipelines (Pandas, NumPy)
- **GIL-free compute on a separate box** so a heavy job doesn't degrade browser-facing requests.
- **Team scaling** if you eventually hire a Python-only ML engineer.

### What it costs

| Cost | Magnitude |
|---|---|
| Migration eng-days | ~10 days minimum — separate repo, CORS, auth bridge (Supabase JWT → FastAPI), DB connection pool sharing, dual deploy pipeline, dual env-var sprawl. |
| Ongoing infra | +$20–80/mo Render/Railway + DB egress between two providers + monitoring × 2. |
| Latency | +20–80 ms per request that bridges the gap. Server Components can no longer hit Postgres directly — every read needs a network hop. |
| Auth complexity | Doubles: Supabase JWT validation needs to happen in FastAPI too. Easy to misconfigure. |
| Ship speed | Roughly halves for cross-cutting features. Every endpoint touches two repos. |
| Single-developer cost | You're paying for two systems to do what one was doing fine. |

### When the split is actually justified

When all three are true:
1. You have a Python-only workload (CV / ML / heavy data) you can't reasonably do in JS / Edge functions.
2. That workload is large enough to slow down the rest of the app.
3. You have a Python developer who'd own it.

Today: zero out of three. You don't have a Python workload, the app isn't slow, and there's no Python developer.

### Recommendation

**Don't split.** Stay on Next.js + Supabase for the next ~6 months. Re-evaluate when one of:

- You add an AI/ML feature that doesn't fit in `/api/*` serverless functions.
- A specific endpoint is provably the bottleneck (P95 > 1 s for an interactive page).
- You hire a backend engineer who'd own a separate service.

If we do split later, the right cut is **not** front/back — it's **specific batch jobs** (e.g. nightly Squarespace reconciliation, AI artwork analysis) into a Python service, with the user-facing app staying on Next.js. That gets the Python benefit without the latency tax.

---

## 4. Squarespace iframe — engineering plan

The "embed admin into Squarespace via iframe" path you picked. Hardest of the lot, so worth scoping properly.

### What works out of the box

- Supabase JS SDK stores sessions in `localStorage` by default — survives inside an iframe.
- Next.js can serve any route with relaxed `frame-ancestors` via `next.config.ts` (we already do this for `/embed/*`).

### What needs new work

1. **Frame headers for `/admin/*`** — add to `next.config.ts`. ~1 hour.
2. **Magic-link auth** — clicking the email link escapes the iframe by default (browser opens it in a new tab). Two options:
   - **Popup OAuth** — open Google / GitHub OAuth in a `window.open` popup. Auth completes in the popup, posts the session back via `postMessage`. Most reliable.
   - **Magic-link with same-window navigation** — Supabase `emailRedirectTo` set to `https://artpiq.com/admin`. User clicks email link, new tab opens, session is set in localStorage, user closes the tab and the iframe (same origin) reads the session. Works but UX is confusing.
   - **Recommendation:** popup OAuth as primary, magic-link as fallback.
3. **Safari ITP / Brave third-party blocking** — Safari's Intelligent Tracking Prevention treats iframes as third-party. Storage access can be partitioned. Mitigation: `document.requestStorageAccess()` API. Needs a user gesture (one-time click). I'd add a "Sign in to ArtPiq" button shown in the iframe that triggers the storage-access prompt on first load.
4. **postMessage parent ↔ iframe bridge** — for things like: "tell the Squarespace parent to scroll to top", "open this AR view in a popup so the camera permission works". Small.
5. **CSP on Squarespace side** — Squarespace allows arbitrary iframes via Code Blocks, no work there.

### Risks

- Browser vendors keep tightening 3rd-party storage. Whatever we build today may need re-engineering in 12 months if Apple/Google push further.
- Some galleries' clients use Safari heavily (collectors on iPads). Test there before declaring done.
- `popup-window` blockers in browsers — the popup auth flow needs a direct user click; can't trigger from a hook.

### Total eng cost: 1.5–2 days.

---

## 5. Implementation order (recommended)

If everything above gets greenlit, here's the order I'd ship in. Each row is a PR.

| Order | Item | Days | Why this position |
|---|---|---|---|
| 1 | Structured Interests taxonomy migration + dropdowns | 1 | Unblocks customer onboarding; depends on Thomas's taxonomy file. |
| 2 | Iframe admin (frame headers + popup OAuth + postMessage) | 2 | Unlocks the Squarespace embed Thomas wants. |
| 3 | One-way Squarespace live sync (replaces manual CSV) | 1 | Core integration. |
| 4 | Room library — 50 curated rooms | 0.5 | Makes visualiser usable in demos. |
| 5 | Lighthouse perf pass + OG images | 1.5 | Polish before customer onboarding. |
| 6 | QA pass + bug fixes from the checklist | 2 | Final guard. |
| 7 | Two-way Squarespace sync (if needed) | 2–3 | Defer if first customers don't ask for it. |

**Total: ~10 eng-days, ~2.5 weeks calendar.**

If the launch date is tighter, drop items 6 (two-way sync) and 4 (perf pass) to backlog. Critical path is 1 + 2 + 3 + room curation + minimal QA = ~6 eng-days.

---

## 6. What I need from Thomas

To start now:

- **Interests taxonomy file.** Draft in `docs/interests-taxonomy-v1.md` (this PR). Review + edits welcome.
- **Squarespace Commerce API credentials.** Needed for items 2 + 3 + 7. Read about scoping the token to a single store + read-only permissions for safety.
- **Apple ID / iPad** for Safari testing the iframe-admin path. I can use BrowserStack as a fallback.
- **Decision on the QA-pass scope.** Do you want me to walk the whole `qa-checklist-launch.md`, or just the customer-facing surfaces?

To re-evaluate in 3 months:

- Customer count + traffic numbers — drives Option A → B transition.
- Whether anyone asks for two-way Squarespace sync.
- Whether any feature genuinely needs Python (so far: no).
