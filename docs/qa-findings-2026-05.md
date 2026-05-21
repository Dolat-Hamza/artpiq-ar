# ArtPiq QA findings — May 2026 launch pass

Running list of bugs and UX nits surfaced while walking `qa-checklist-launch.md`.
File new findings at the top of the relevant section. Move resolved items to
the bottom under "Resolved".

Severity:
- **P0** — launch blocker. Fix before customer.
- **P1** — should fix in the first week after launch.
- **P2** — backlog. Track but don't gate.

---

## Open

### Authentication
_None yet._

### CRM
_None yet._

### Artworks
_None yet._

### Deals
_None yet._

### Social / Marketing
_None yet._

### Visualisation / Rooms
_None yet._

### Public surfaces
_None yet._

### Tutorials
_None yet._

### Performance
_None yet._

---

## Resolved

| Date | Severity | Area | Issue | PR |
|---|---|---|---|---|
| 2026-05-21 | P0 | Social | Newsletter send 500'd silently without `RESEND_API_KEY`. Returns 503 with friendly message + dry-run toggle. | #56 |
| 2026-05-21 | P0 | Social | Composer required pasted URLs for media — no real upload path. Now uploads to `content-media` Supabase Storage. | #56 |
| 2026-05-21 | P1 | Embeds | `public/embed/newsletter.js` referenced but missing. Shipped + CORS for /api/(subscribe|leads). | #56 |
| 2026-05-21 | P1 | CRM | Contact mapper silently dropped `organization_id` / `role` / `lifecycle_stage` / `is_artist` / `artist_contact_ids` / `interested_artwork_ids` on read. Round-trip restored. | #55 |
| 2026-05-21 | P1 | CRM | Bulk artwork import silently skipped bad rows. Now shows per-row validation modal before commit. | #55 |
| 2026-05-21 | P1 | CRM | No way to record collector preferences. Added Interests tab + budget range + currency. | #55 |
| 2026-05-21 | P2 | Rooms | Stock-rooms gallery lacked search + pagination — would lag past a few hundred rooms. Added search + 24/page. | #57 |
| 2026-05-21 | P2 | Rooms | No way to upload room photos from a device — required external host. Added Storage upload + CSV import. | #57 |
| 2026-05-21 | P2 | Tutorials | Social calendar had no guided tour. Added social tour + route-aware HelpFab. | #58 |

---

## How to add a finding

Use this shape, top of the section:

```
**P0/P1/P2 — short title**

- Repro: 1-2 lines. URL + the exact click path.
- Expected: what should happen.
- Actual: what happens. Console error if any.
- Notes: anything that helps the fixer (which file, which RPC, etc.).
```
