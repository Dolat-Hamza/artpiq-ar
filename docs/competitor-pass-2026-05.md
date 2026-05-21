# ArtPiq competitor pass — May 2026

Thomas — quick read before launch. Five products, what they ship that we don't, what we ship that they don't, and a short list of things worth copying. Honest about what I couldn't verify from public pages.

Note on **GalleryConnect**: there is no standalone gallery-management SaaS by that name. The Google/App Store hits are a barcode order-tracking app (Micazen) and Singulart's "Gallery Connect", which is a paid curator-feedback marketplace inside Singulart (15 EUR per portfolio review). Neither is a like-for-like competitor. I've included Singulart's Gallery Connect in the snapshot for completeness but graded it as out-of-category. If you meant a different product, tell me and I'll redo that column.

## 1. Snapshot

Legend: Y = shipped on the public site, P = partial / limited, — = not visible, ? = needs verification.

### CRM depth

| Capability | Artplacer | Artlogic | Artcloud | Masterpiece | Singulart GC | ArtPiq |
|---|---|---|---|---|---|---|
| Contacts + tags / notes | Y | Y | Y | Y | — | Y |
| Lifecycle stages | ? | Y | Y | P | — | Y |
| Deals with multi-artwork lines | — | Y | Y | P | — | Y |
| Sale **and** rent on same deal | — | ? | — | — | — | Y |
| Offer rounds + counter-offers | — | ? | ? | — | — | Y |
| Ownership-aware totals (dealer / artist / collector splits) | — | ? | P (commissions) | P (consignment) | — | Y |
| Customer interests (medium / style / artists / budget) | — | ? | P (collector reports) | — | P (matching) | Y |
| Bulk artwork CSV import with ownership | — | ? | Y (migration) | Y | — | Y |

### AR / room previews

| Capability | Artplacer | Artlogic | Artcloud | Masterpiece | Singulart GC | ArtPiq |
|---|---|---|---|---|---|---|
| In-browser AR (phone camera) | Y | — | — | — | — | Y |
| Sample-room mockups (2800+ stock rooms) | Y | — | — | — | — | P (stock-room gallery, smaller library) |
| Upload-your-own-room visualisation | Y | — | — | — | — | Y (draggable wall-quad editor) |
| 3D virtual exhibitions | Y | — | — | — | — | — |
| Art-fair / booth wall planner | Y | — | — | — | — | — |

### Sales pipeline

| Capability | Artplacer | Artlogic | Artcloud | Masterpiece | Singulart GC | ArtPiq |
|---|---|---|---|---|---|---|
| Opportunity / deal tracker | P | Y | Y | P | — | Y |
| Invoicing | — | Y | Y | Y | — | — |
| In-product payments (Stripe) | — | ? | Y | Y | Y (payouts only) | — |
| POS / in-person sales | — | — | Y | Y | — | — |
| Consignment / commission accounting | — | Y | Y | Y | — | P (split totals, no invoice yet) |

### Content scheduling

| Capability | Artplacer | Artlogic | Artcloud | Masterpiece | Singulart GC | ArtPiq |
|---|---|---|---|---|---|---|
| Email newsletter sender | — | Y | Y (add-on) | Y | — | Y (Resend) |
| Drag-and-drop email builder | — | Y | Y | ? | — | — |
| Social-media composer | — | — | — | — | — | Y |
| Multi-view scheduler (platforms / campaigns / calendar / kanban / list) | — | — | — | — | — | Y |
| Per-platform character limits + hashtag suggestions | — | — | — | — | — | Y |
| AI draft generation | — | — | — | — | — | Y |
| Approval workflow (draft → review → approved → scheduled → published) | — | ? | — | — | — | Y |
| External blog publishing | — | Y | Y | Y | — | P (external URLs only) |

### Public surfaces

| Capability | Artplacer | Artlogic | Artcloud | Masterpiece | Singulart GC | ArtPiq |
|---|---|---|---|---|---|---|
| Viewing rooms (private share link) | Y | Y | — | — | — | Y (`/v/[slug]`) |
| Discover / public profile | Y | — | — | — | Y (marketplace) | — |
| Embeddable widgets | Y (AR + room) | — | — | — | — | Y (newsletter signup script) |
| Full gallery website / CMS | — | Y | Y | Y (add-on) | — | — |

### Pricing model

| | Artplacer | Artlogic | Artcloud | Masterpiece | Singulart GC | ArtPiq |
|---|---|---|---|---|---|---|
| Lowest gallery tier (monthly, billed annually) | $40 | ~£156 (~$200) | $99/user | $139 | n/a (rev-share) | TBD |
| Top published tier | $144 | "contact us" | $193/user + add-ons | $239 | n/a | TBD |
| Setup fees | None visible | None visible | None visible | $500–$3,000 | — | None |
| Public website add-on | included | included | $77–$303/mo separate | $19–$99/mo separate | n/a | n/a |
| Marketing add-on | included | included | $30–$528/mo separate | included | n/a | included |

### Hosting

All five are cloud SaaS. Masterpiece Manager explicitly says "nothing to download or install"; the rest are also browser-based. None offer self-hosted. ArtPiq is cloud (Supabase + Vercel) — same model.

### Integrations

| Integration | Artplacer | Artlogic | Artcloud | Masterpiece | Singulart GC | ArtPiq |
|---|---|---|---|---|---|---|
| Squarespace embed | Y | ? | ? | — | — | Y (newsletter signup) |
| Shopify | Y | ? | ? | — | — | — |
| WordPress / Wix | Y | ? | ? | — | — | — |
| Mailchimp | ? | ? | ? | ? | — | — |
| Resend | — | — | — | — | — | Y |
| Stripe | — | ? | Y | Y | Y | — |
| QuickBooks | — | ? | ? | ? | — | — |

## 2. Where ArtPiq leads

- **Deal model is genuinely deeper than anyone else's.** Multi-artwork lines, sale + rent on the same deal, offer rounds with counter-offers, and ownership-aware splits (dealer / artist / collector) are not visible on any competitor's public CRM page. Artlogic and Artcloud do consignment accounting, but the offer-round + ownership-split combo is ours.
- **Social composer with 5 views is unique in this category.** No competitor surfaces a calendar + kanban + per-platform scheduler. Galleries currently bolt on Later or Buffer; we eat that line item.
- **Approval workflow on marketing content.** Draft → review → approved → scheduled → published with AI draft generation is not in any of the four real competitors. This is a multi-person-gallery wedge.
- **Customer Interests tab (medium / style / favourite artists / budget).** Artcloud has "collector reports" that infer from purchase history; we capture stated preferences directly. Better for cold leads.
- **Embeddable newsletter signup for Squarespace, free.** Artplacer charges for widgets at the gallery tier ($40+); we ship the script without gating it.

## 3. Where ArtPiq trails

- **AR / room visualisation breadth — Artplacer.** 2,800+ stock rooms, 3D virtual exhibitions, art-fair booth planner, mobile AR app, three flavours of embed widget (client room, sample room, AR). Our stock-room library is smaller and we don't have 3D exhibitions or a booth planner.
- **Invoicing, POS, payments — Artcloud and Masterpiece.** Both let a gallery sell, invoice, and take a card in one place (Stripe in Artcloud's case). We have splits but no invoice document or payment capture.
- **Full gallery website — Artlogic, Artcloud, Masterpiece.** All three host the gallery's public website with inventory sync. We require Squarespace or similar on the side.
- **Drag-and-drop email builder — Artlogic, Artcloud, Masterpiece.** Resend send is fine for plain editions, but for image-heavy newsletters galleries expect a visual builder.
- **Discover / public artist profile — Artplacer, Singulart.** Artplacer has a Discover profile that drives inbound; we have viewing rooms but no public-facing index.

## 4. Steal-worthy quick wins

Ranked. Effort assumes the existing stack (Next.js + Supabase + Resend).

1. **Sample-room mockup library — S effort, L value.** Seed 30–50 royalty-free stock interior photos into the existing wall-quad editor. Same pipeline as user-uploaded rooms; no new code path. Closes the most visible gap with Artplacer for collectors who don't want to upload their lounge.
2. **Newsletter HTML builder (block-based) — M effort, M value.** Five block types: hero image, artwork card, text, two-column, CTA. Output stitched HTML for the existing Resend send. Avoid full drag-drop; pick blocks from a list. ~1.5 days.
3. **Public artist / gallery profile page — S effort, M value.** Reuse `/v/[slug]` layout, point at gallery's full catalogue, mark inventory-public flag per artwork. ~1 day. Buys us the "Discover" surface without building a marketplace.
4. **Simple invoice PDF on a closed deal — M effort, M value.** Take the existing deal totals + ownership splits, render an HTML invoice, print to PDF (React-PDF or wkhtmltopdf). No payment capture yet, just the document. ~1.5 days. Lets a gallery actually close the loop today.
5. **AR widget embed code for Squarespace / Shopify — S effort, M value.** We already have the AR demo route; wrap it in an iframe-embed script the same way the newsletter signup ships. ~half day. Directly competitive with Artplacer's flagship widget.

## 5. Defer or skip

- **3D virtual exhibitions (Artplacer).** Heavy 3D-asset pipeline, niche use case, and Artplacer has a 5-year head start. Skip unless a paying customer asks twice.
- **POS / card-present payments (Artcloud, Masterpiece).** Hardware integration, PCI scope, in-person flows. Galleries already have Square or SumUp. Skip; do the invoice PDF instead.
- **Full website CMS (Artlogic, Artcloud, Masterpiece).** Galleries on Squarespace are not migrating. Our embed-into-Squarespace lane is the right one; competing as a CMS is a multi-quarter project against entrenched incumbents.

## 6. Not covered

- **Artlogic feature pages.** `artlogic.net/features` returns 404. Module-level claims (CRM, OVRs, Marketing) come from the homepage and pricing copy; per-feature depth (offer rounds, integrations list, social composer presence) was not verifiable. Worth a sales-call recon before launch.
- **Artlogic integrations list.** No public integrations page surfaced. Mailchimp / Stripe / QuickBooks support all marked ?.
- **Artcloud viewing rooms / AR.** Public pages do not mention either; could exist inside the product. Tried `artcloud.com` only.
- **Masterpiece Manager integrations.** `masterpiecemanager.com/features` returned no integration list; QuickBooks / Squarespace / Shopify support unconfirmed. The site does confirm in-product email marketing.
- **GalleryConnect identity.** If you meant a different product than Singulart's Gallery Connect or the Micazen barcode app, send me the URL.
- **Promotional pricing.** Artplacer mentions "up to 30% off"; not modelled in the snapshot. Numbers cited are list prices on the public pricing pages as of today.
