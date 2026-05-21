# Customer Interests taxonomy v1

Draft taxonomy for the structured-dropdown version of the Interests tab.
Replaces the free-text arrays shipped in PR #55.

Five categories: **Mediums**, **Styles**, **Periods / movements**, **Subjects**,
**Price brackets**. Plus a per-account-curated **Favourite artists** list
(populated from each gallery's own `contacts` where `isArtist=true`, so no
hard-coded global list needed).

Each entry has a stable `slug` (used in the DB) and a `label` (shown in the
dropdown). Slugs lowercase, dash-separated, never renamed once shipped —
labels can be edited freely.

---

## Mediums

Grouped into families so the dropdown can show subgroup headings.

### Painting
- `oil` — Oil
- `acrylic` — Acrylic
- `watercolor` — Watercolour
- `gouache` — Gouache
- `ink` — Ink
- `mixed-media` — Mixed media
- `encaustic` — Encaustic
- `tempera` — Tempera
- `spray-paint` — Spray paint
- `pastel-painting` — Pastel (painted)

### Drawing
- `pencil` — Pencil
- `charcoal` — Charcoal
- `pen-ink` — Pen and ink
- `pastel-drawing` — Pastel (drawn)
- `conte` — Conté
- `chalk` — Chalk
- `silverpoint` — Silverpoint

### Print
- `lithograph` — Lithograph
- `screen-print` — Screen print / serigraph
- `etching` — Etching
- `woodcut` — Woodcut
- `linocut` — Linocut
- `monotype` — Monotype
- `giclee` — Giclée
- `engraving` — Engraving
- `aquatint` — Aquatint

### Photography
- `analog-photo` — Analogue / film
- `digital-photo` — Digital
- `large-format` — Large format
- `polaroid` — Polaroid / instant
- `gelatin-silver` — Gelatin silver
- `c-print` — C-print
- `cyanotype` — Cyanotype

### Sculpture
- `bronze` — Bronze
- `stone` — Stone (marble, limestone, granite)
- `wood` — Wood
- `ceramic` — Ceramic
- `metal` — Metal (steel, iron, copper)
- `found-object` — Found object / assemblage
- `kinetic` — Kinetic
- `resin` — Resin
- `inflatable` — Inflatable / soft

### Mixed media + installation
- `assemblage` — Assemblage
- `collage` — Collage
- `installation` — Installation
- `relief` — Relief / wall-mounted mixed

### Digital + time-based
- `video-art` — Video art
- `nft` — NFT
- `generative` — Generative / code
- `ai-assisted` — AI-assisted
- `vr-ar` — VR / AR
- `light-art` — Light installation

### Textile + craft
- `tapestry` — Tapestry
- `weaving` — Weaving
- `embroidery` — Embroidery
- `fiber-art` — Fibre art
- `quilt` — Quilt

### Glass + ceramic standalone
- `blown-glass` — Blown glass
- `stained-glass` — Stained glass
- `studio-ceramic` — Studio ceramic
- `porcelain` — Porcelain

---

## Styles

Single-level list. A collector can pick multiple.

- `abstract` — Abstract
- `abstract-geometric` — Abstract (geometric)
- `abstract-lyrical` — Abstract (lyrical / gestural)
- `abstract-expressionism` — Abstract expressionism
- `minimalism` — Minimalism
- `colour-field` — Colour field
- `op-art` — Op art / optical
- `figurative` — Figurative
- `realism` — Realism
- `hyperrealism` — Hyperrealism
- `portraiture` — Portraiture
- `narrative` — Narrative / storytelling
- `allegorical` — Allegorical
- `surrealism` — Surrealism
- `dreamlike` — Dreamlike / oneiric
- `pop-art` — Pop art
- `street-art` — Street / urban / graffiti
- `conceptual` — Conceptual
- `outsider` — Outsider / self-taught
- `folk` — Folk / vernacular
- `indigenous` — Indigenous
- `photorealism` — Photorealism
- `land-art` — Land / environmental
- `performance` — Performance / time-based
- `expressionism` — Expressionism
- `impressionism` — Impressionism
- `post-impressionism` — Post-impressionism
- `cubism` — Cubism
- `futurism` — Futurism
- `dadaism` — Dadaism
- `art-brut` — Art brut
- `documentary` — Documentary
- `political` — Political / social commentary

---

## Periods / movements

Pick at most one or two.

- `contemporary` — Contemporary (2000–today)
- `late-20th` — Late 20th century (1980–2000)
- `mid-20th` — Mid 20th century (1945–1980)
- `early-20th` — Early 20th century (1900–1945)
- `19th-century` — 19th century
- `pre-19th` — Pre-19th century (Old Masters and earlier)

---

## Subjects

Multi-select.

- `portrait` — Portrait
- `self-portrait` — Self-portrait
- `figure` — Figure / nude
- `landscape` — Landscape
- `seascape` — Seascape
- `cityscape` — Cityscape / architecture
- `still-life` — Still life
- `floral` — Floral / botanical
- `animals` — Animals / wildlife
- `abstract-subject` — Abstract (no subject)
- `religious` — Religious / mythological
- `historical` — Historical
- `interior` — Interior
- `objects` — Objects / everyday
- `text` — Text / typography
- `protest` — Protest / political
- `domestic` — Domestic / home life
- `industrial` — Industrial
- `nature` — Nature / organic forms
- `night` — Night / nocturne

---

## Price brackets (EUR)

- `under-1k` — Under €1,000
- `1k-5k` — €1,000–5,000
- `5k-25k` — €5,000–25,000
- `25k-100k` — €25,000–100,000
- `100k-500k` — €100,000–500,000
- `over-500k` — Over €500,000

Currency picker on the contact already supports EUR / USD / GBP / CHF / AED / AUD / CAD —
we'd store brackets as EUR-equivalent under the hood and convert for display.

---

## Favourite artists

**Not a global list.** Each gallery has its own roster.

Source: `contacts` table where `is_artist = true` AND `owner_id` matches the
current account. The dropdown should be a typeahead that searches across the
gallery's artist contacts, with an "Add new artist" affordance that creates a
new `contacts` row with `is_artist = true` if the name doesn't exist yet.

This keeps the taxonomy gallery-specific (Thomas's artists ≠ another
gallery's artists) without us needing to curate a global database.

---

## Schema implementation

Two new tables. Migration sketch:

```sql
-- Global, read-only vocabulary. We ship the rows above as seed data.
create table interest_options (
  slug text primary key,
  category text not null check (category in ('medium','style','period','subject','price_bracket')),
  label text not null,
  parent_slug text references interest_options(slug),  -- for "Painting > Oil" hierarchy on mediums
  sort_order integer not null default 0,
  active boolean not null default true
);

-- Many-to-many join from a contact to the options they've picked.
create table contact_interests (
  contact_id uuid not null references contacts(id) on delete cascade,
  option_slug text not null references interest_options(slug),
  created_at timestamptz not null default now(),
  primary key (contact_id, option_slug)
);

create index contact_interests_contact_idx on contact_interests(contact_id);
create index contact_interests_option_idx on contact_interests(option_slug);
```

The existing free-text columns (`interests_mediums`, `interests_styles`,
`interests_artists`) stay as-is for backward compatibility and as a fallback
for anything the gallery wants to type that's not in the controlled list.

A data migration job converts existing free-text values to the controlled
vocab where possible (fuzzy match on `lower(label)`) and leaves the rest in
the legacy column.

UI: existing `<ChipInput>` component grows a `suggestions` prop tied to the
controlled vocab + an "Add custom value" affordance that writes to the
legacy free-text column.

---

## Open questions for Thomas

1. Anything missing from these lists for your gallery's actual workflow?
2. Should we hard-cap the number of selections per contact (e.g. "max 5
   mediums") to keep the data clean?
3. Currency for price brackets — keep EUR-as-source-of-truth, or auto-convert
   per-contact based on `preferred_currency`?
4. Do you want a public "shopper" version of the Interests dropdown (so a
   collector visiting a viewing room can self-tag), or strictly internal?
