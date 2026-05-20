# Graph Report - /Users/dolathamza/Documents/GitHub/artpiq-ar  (2026-05-20)

## Corpus Check
- 140 files · ~93,650 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 574 nodes · 913 edges · 73 communities detected
- Extraction: 63% EXTRACTED · 37% INFERRED · 0% AMBIGUOUS · INFERRED: 335 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]

## God Nodes (most connected - your core abstractions)
1. `supabase()` - 110 edges
2. `DELETE()` - 31 edges
3. `GET()` - 26 edges
4. `Page()` - 17 edges
5. `update()` - 17 edges
6. `update()` - 16 edges
7. `POST()` - 15 edges
8. `captureCurrentRoom()` - 11 edges
9. `add()` - 10 edges
10. `updateContent()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `computeDealTotals()`  [INFERRED]
  /Users/dolathamza/Documents/GitHub/artpiq-ar/src/app/api/ar/painting/[id]/route.ts → /Users/dolathamza/Documents/GitHub/artpiq-ar/src/lib/db/dealArtworks.ts
- `rename()` --calls--> `updateCampaign()`  [INFERRED]
  /Users/dolathamza/Documents/GitHub/artpiq-ar/src/components/SocialCalendar.tsx → /Users/dolathamza/Documents/GitHub/artpiq-ar/src/lib/db/campaigns.ts
- `updateContact()` --calls--> `updateContactRow()`  [INFERRED]
  /Users/dolathamza/Documents/GitHub/artpiq-ar/src/components/ContactsAdmin.tsx → /Users/dolathamza/Documents/GitHub/artpiq-ar/src/lib/db/contacts.ts
- `patchLine()` --calls--> `updateDealArtwork()`  [INFERRED]
  /Users/dolathamza/Documents/GitHub/artpiq-ar/src/components/DealsAdmin.tsx → /Users/dolathamza/Documents/GitHub/artpiq-ar/src/lib/db/dealArtworks.ts
- `rename()` --calls--> `updateCollection()`  [INFERRED]
  /Users/dolathamza/Documents/GitHub/artpiq-ar/src/components/AdminArtworks.tsx → /Users/dolathamza/Documents/GitHub/artpiq-ar/src/lib/db/collections.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (47): updateShow(), addArtworkImage(), deleteArtworkImage(), listArtworkImages(), row(), updateImageCaption(), updateCampaign(), supabase() (+39 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (33): duplicate(), exportCsv(), importCsv(), openEditor(), openNewEditor(), patch(), refresh(), remove() (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (25): newPost(), refresh(), rm(), save(), createCampaign(), deleteCampaign(), listCampaigns(), row() (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (21): add(), set(), fetchAsDataUri(), buildPaintingMesh(), loadTexture(), GET(), addStandardLighting(), buildFramedPainting() (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (16): removeArtworkFromCollection(), match(), onKey(), addFavorite(), listFavorites(), removeFavorite(), isTyping(), rpcError() (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (11): share(), decodeBitmap(), exportImage(), normalizeToBlob(), onFile(), withTimeout(), FakeCanvas, FakeHTMLImageElement (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (21): bulkDeleteContacts(), contactsToCsv(), createContact(), deleteContact(), downloadContactsCsv(), listContacts(), rowToContact(), add() (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (23): addActivity(), activityRow(), createActivity(), createDeal(), createOrganization(), createTask(), dealRow(), deleteDeal() (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.1
Nodes (14): signInWithGoogle(), signInWithMagicLink(), signInWithPassword(), signOut(), signUpWithPassword(), useAuth(), hasSupabase(), useConfirm() (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (18): addWall(), onWallMove(), persist(), placeArtwork(), removePlacement(), removeWall(), uid(), updateWall() (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.1
Nodes (9): addDealArtwork(), computeDealTotals(), deleteDealArtwork(), listDealArtworks(), offerRoundsToJson(), row(), addLine(), patchLine() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (17): createFolder(), deleteFolder(), listFolders(), rowToFolder(), moveDesign(), newFolder(), refresh(), renameFolderPrompt() (+9 more)

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (10): uploadImage(), addArtwork(), bcsToFilter(), captureCurrentRoom(), confirmAndNext(), exportPng(), loadImg(), loadImgViaFetch() (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (1): Page()

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (12): attachPres(), detachPres(), attachPresentationToContact(), cpRow(), createPresentation(), deletePresentation(), detachPresentationFromContact(), listPresentations() (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.24
Nodes (7): openSendPicker(), refresh(), rm(), deleteSubscriber(), downloadSubscribersCsv(), listSubscribers(), subscribersToCsv()

### Community 16 - "Community 16"
Cohesion: 0.36
Nodes (5): authedFetch(), refresh(), remove(), submit(), save()

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (1): ArtworkBoundary

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 0.6
Nodes (5): clearRecent(), getRecent(), read(), trackView(), write()

### Community 21 - "Community 21"
Cohesion: 0.6
Nodes (3): fetchIssue(), fetchPost(), generateMetadata()

### Community 22 - "Community 22"
Cohesion: 0.7
Nodes (4): persist(), placeArtwork(), removeAt(), updateAt()

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (2): artworksToSqspCsv(), downloadSqspCsv()

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 0.67
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 30`** (2 nodes): `EmbedPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `AdminLayout()`, `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `PublicExhibitionPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `NewsletterForm()`, `NewsletterForm.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `AppShell()`, `AppShell.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `Hero()`, `Catalogue.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `handleClick()`, `ArtworkCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `Toast()`, `Toast.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `StatusPill()`, `StatusPill.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `onKey()`, `Dialog.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `fetchWikiImages()`, `artworks.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `groupArtworks()`, `inventoryReport.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `filterRooms()`, `rooms.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `tailwind.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `model-viewer.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `apple-icon.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `icon.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `QROverlay.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `Header.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `TodayPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `SiteNav.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `AdminPageHeader.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `Chip.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `MarketingTabs.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `IconButton.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `Button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `Toggle.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `EmptyState.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `VideoPreview.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `frames.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase()` connect `Community 0` to `Community 1`, `Community 2`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 15`, `Community 16`?**
  _High betweenness centrality (0.370) - this node is a cross-community bridge._
- **Why does `GET()` connect `Community 3` to `Community 10`, `Community 4`, `Community 12`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `DELETE()` connect `Community 4` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 15`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Are the 109 inferred relationships involving `supabase()` (e.g. with `authedFetch()` and `createDesign()`) actually correct?**
  _`supabase()` has 109 INFERRED edges - model-reasoned connections that need verification._
- **Are the 28 inferred relationships involving `DELETE()` (e.g. with `userClient()` and `rpcError()`) actually correct?**
  _`DELETE()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Are the 18 inferred relationships involving `GET()` (e.g. with `rateLimitOk()` and `POST()`) actually correct?**
  _`GET()` has 18 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `update()` (e.g. with `POST()` and `updateDesign()`) actually correct?**
  _`update()` has 16 INFERRED edges - model-reasoned connections that need verification._