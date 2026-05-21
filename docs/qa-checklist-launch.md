# ArtPiq launch QA checklist

The complete manual sweep to run before flipping the prod URL to a real
customer. Tick each box. File findings against `docs/qa-findings-2026-05.md`
with severity (P0 blocker / P1 next week / P2 backlog).

Last refreshed: 2026-05-21.

---

## 0. Pre-flight

- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npx next build` exits 0.
- [ ] `npm run test:e2e` (Playwright smoke) passes against the staging URL.
- [ ] Vercel preview build for the latest `main` is green.
- [ ] `RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`, `NEWSLETTER_FROM_EMAIL` are set in Vercel
      (production scope).

---

## 1. Auth

- [ ] Magic-link sign-in delivers the email within 30 s.
- [ ] Magic-link click lands on `/admin` with a session.
- [ ] Password sign-in (if used) works.
- [ ] Google OAuth (if used) works + writes a row to `contacts` / `app_admins`
      as expected.
- [ ] Sign-out clears the Supabase session AND redirects out of `/admin`.

## 2. Super-admin

- [ ] `/admin/superadmin` is gated — non-super-admin gets a friendly empty state.
- [ ] Users panel lists every user with their plan + feature flags + counts.
- [ ] Toggling a feature flag updates the underlying `user_features` row.
- [ ] Stock rooms — search, category filter, pagination all work past 24 rooms.
- [ ] Stock rooms — CSV import: 5 valid rows + 1 missing column → succeeds + clear error for missing column.
- [ ] Stock rooms — Upload photos: 12 MB photo rejected. 4 MB accepted.
- [ ] Demo content — "Seed for me" populates the social calendar with 12 rows.
- [ ] Demo content — "Wipe" clears the same rows back to nothing.

## 3. CRM (`/admin/contacts`)

- [ ] List loads ≤ 500 ms for a reasonable account.
- [ ] Search + lifecycle / category / org filters all apply.
- [ ] Saved views — create, load, delete.
- [ ] Add contact → minimum (email only) succeeds.
- [ ] Open contact detail — all 6 tabs (Details, Interests, Activity, Deals,
      Artworks, Presentations) render without errors.
- [ ] **Interests tab** — add 3 mediums (use suggestion chips), 2 styles, 3
      favourite artists, set €5k–€50k budget → reload → all persist.
- [ ] **Artist toggle** — mark a contact as artist → that name appears in
      other contacts' Favourite-artists suggestions.
- [ ] Activity log — note / call / email / meeting / viewing / offer all save.
- [ ] AI Summary — generates within ~5 s. Friendly error if API key missing.
- [ ] Delete contact → confirm dialog → row + linked activities removed.
- [ ] Bulk delete → confirm dialog → many rows removed.
- [ ] CSV export — includes the new interests + budget columns.

## 4. Artworks (`/admin/artworks`)

- [ ] New artwork — required: title, widthCm, heightCm. Optional fields all editable.
- [ ] Upload image — JPEG, PNG, WebP all accepted. HEIC converted by `heic2any`.
- [ ] Ownership panel — toggle dealer / artist / collector. Conditional fields appear.
- [ ] Bulk CSV import — open ImportPreviewModal first.
- [ ] CSV with bad row → preview marks it Blocked with a per-row error.
- [ ] CSV with valid `ownerContactEmail` → row resolves to a contact + `ownership_status`.
- [ ] CSV template download → `artpiq-artwork-import-template.csv` with all 27 cols.
- [ ] Collections — create, rename, delete, add/remove members.
- [ ] PDF exports — single artwork sheet, collection sheet, inventory report.
- [ ] Squarespace CSV export — opens correctly in Excel + matches SQSP product-import format.

## 5. Deals (`/admin/deals`)

- [ ] Pipeline columns render with correct counts per stage.
- [ ] Drag a deal between stages → autosaves.
- [ ] Open a deal → add 3 lines (2 sale + 1 rent) → totals update.
- [ ] Per-line offer rounds — add a counter-offer → history persists.
- [ ] **Ownership-aware totals** — sidebar splits dealer / artist net /
      collector net / sales rep payout when the deal has mixed owners.
- [ ] Swap-in line gets the correct ownership badge.
- [ ] Convert "won" deal — artwork updates (sold flag + sold_price + ownership transfer).
- [ ] Sales commission % per line writes to the latest `offer_rounds[]` entry.

## 6. Social / Marketing

### `/admin/social`
- [ ] All 5 views (platforms / campaigns / calendar / kanban / list) render without errors.
- [ ] + New post / reel / blog / newsletter / event_promo all open the composer.
- [ ] **Composer images** — upload 3 photos → thumbnails appear → first becomes cover.
- [ ] Composer images — drag to reorder, Set as cover works.
- [ ] 10-image cap surfaced if user tries to add an 11th.
- [ ] 6 MB photo rejected with the size error.
- [ ] Composer status pipeline — all 8 statuses selectable.
- [ ] Hashtag suggestions — `#testtag` in caption → chip appears next to char count.
- [ ] Per-platform char count limits surface red over the cap.
- [ ] AI draft — generates within ~10 s. Friendly error if API key missing.
- [ ] Duplicate-to-platforms icon always visible on platform / kanban / list cards.
- [ ] Save → returns to list, shows on calendar / kanban with correct status.

### `/admin/marketing`
- [ ] Approval queue lists submitted-for-review items.
- [ ] KPI tiles act as filter chips (click → status filter applied).
- [ ] Approve / Request changes / View buttons all work on a queue card.
- [ ] Distribution scorecard renders + reflects current month.

### `/admin/inbox`
- [ ] Subscribers list renders with count.
- [ ] Send campaign — Dry-run toggle returns recipient sample, no Resend hit.
- [ ] Send without `RESEND_API_KEY` → friendly 503 error, no crash.
- [ ] Newsletter send with key → email lands in test inbox within 60 s.
- [ ] Embed snippet — paste on a static HTML page → form renders, submit creates a `subscribers` row.

### `/admin/blog`
- [ ] New blog post — title + markdown body + cover URL + tags + publishedUrl.
- [ ] Preview link opens external `publishedUrl` in a new tab (only when set).
- [ ] Status pipeline mirrors the social composer.

## 7. Visualisation / Rooms

- [ ] `/sample-room` — pick an artwork, swap rooms, lighting controls.
- [ ] My Wall — upload a wall photo, place artwork, save design.
- [ ] Saved designs — listed in `/admin/designs`, openable, deletable.
- [ ] Stock rooms with edited wall_quad render with the new quad in Sample Room.

## 8. Public surfaces

- [ ] `/v/[slug]` — viewing room loads, artwork grid + detail modal both work.
- [ ] `/discover/[slug]` — discover profile loads.
- [ ] `/exhibition/[slug]` — exhibition loads.
- [ ] `/embed/view`, `/embed/sample-room`, `/embed/my-wall` — all iframeable from a third-party origin (test with a static HTML page).
- [ ] `/embed/newsletter.js` — serves with correct Content-Type. POST from a third-party origin succeeds (CORS works).
- [ ] AR demo (`/api/ar/painting/[id]`, `/api/ar/sculpture/[id]`) — opens iOS Quick Look + Android Scene Viewer.

## 9. Tutorials

- [ ] First-time user sees the Welcome tour ~1.2 s after landing on /admin.
- [ ] HelpFab on /admin/contacts → "CRM tour" is the primary option.
- [ ] HelpFab on /admin/social → "Social calendar tour" is the primary option.
- [ ] HelpFab on /admin (root) → "Welcome tour" is the primary option.
- [ ] All tours navigate between pages correctly (route + spotlight find target).

## 10. Edge cases + accessibility

- [ ] 100-character unicode contact name → renders without overflow.
- [ ] 100-row CSV artwork import → preview modal stays usable (scroll works).
- [ ] Empty states (no contacts, no deals, no posts, no subscribers) — all
      show a helpful CTA, not a blank page.
- [ ] Keyboard-only navigation works on the admin shell (cmd-k + tab navigation).
- [ ] Mobile viewport (iPhone 14 = 390×844) — admin shell collapses cleanly; key flows usable.
- [ ] Dark-mode (if available) doesn't break contrast on chip inputs / status pills.

## 11. Performance smoke

- [ ] Lighthouse on `/admin` ≥ 70 perf score on a clean cache.
- [ ] First load JS ≤ 200 kB for `/admin/*` routes (check `next build` output).
- [ ] `/v/[slug]` Largest Contentful Paint ≤ 2.5 s on Vercel preview.

---

## How to run this checklist

Block out ~2 hours. Walk top-to-bottom with the prod URL and a test owner
that has at least 5 artworks + 3 contacts + 1 deal + 5 social posts seeded.

Use `Super-admin → Demo content → Seed for me` to spin up the social half of
that fixture in one click.

When something fails:

1. Note the file path + the exact reproduction in `docs/qa-findings-2026-05.md`.
2. Tag P0 / P1 / P2.
3. If P0 — stop the launch, fix, re-run from the top of the affected section.
