import { supabase } from './client'
import type { Database } from './types'
import type { DealArtwork, DealLineDirection, DealLineMode, DealLineStatus } from '@/types'

type Upd = Database['public']['Tables']['deal_artworks']['Update']

function row(r: Record<string, unknown>): DealArtwork {
  return {
    id: r.id as string,
    dealId: r.deal_id as string,
    artworkId: r.artwork_id as string,
    direction: r.direction as DealLineDirection,
    mode: r.mode as DealLineMode,
    listPrice: (r.list_price as number | null) ?? null,
    offerPrice: (r.offer_price as number | null) ?? null,
    counterOffer: (r.counter_offer as number | null) ?? null,
    agreedPrice: (r.agreed_price as number | null) ?? null,
    commissionPct: (r.commission_pct as number | null) ?? null,
    rentTermMonths: (r.rent_term_months as number | null) ?? null,
    rentMonthly: (r.rent_monthly as number | null) ?? null,
    swapValue: (r.swap_value as number | null) ?? null,
    lineStatus: (r.line_status as DealLineStatus) ?? 'pending',
    notes: (r.notes as string | null) ?? null,
    position: (r.position as number) ?? 0,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

export async function listDealArtworks(dealId: string): Promise<DealArtwork[]> {
  const { data, error } = await supabase()
    .from('deal_artworks')
    .select('*')
    .eq('deal_id', dealId)
    .order('position', { ascending: true })
  if (error) throw error
  return (data ?? []).map(r => row(r as Record<string, unknown>))
}

export async function addDealArtwork(input: {
  dealId: string
  artworkId: string
  direction?: DealLineDirection
  mode?: DealLineMode
  listPrice?: number | null
  offerPrice?: number | null
  commissionPct?: number | null
}): Promise<DealArtwork> {
  const { data, error } = await supabase()
    .from('deal_artworks')
    .insert({
      deal_id: input.dealId,
      artwork_id: input.artworkId,
      direction: input.direction ?? 'out',
      mode: input.mode ?? 'sale',
      list_price: input.listPrice ?? null,
      offer_price: input.offerPrice ?? null,
      commission_pct: input.commissionPct ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return row(data as Record<string, unknown>)
}

export async function updateDealArtwork(id: string, patch: Partial<DealArtwork>): Promise<void> {
  const r: Upd = { updated_at: new Date().toISOString() }
  if (patch.direction !== undefined) r.direction = patch.direction
  if (patch.mode !== undefined) r.mode = patch.mode
  if (patch.listPrice !== undefined) r.list_price = patch.listPrice
  if (patch.offerPrice !== undefined) r.offer_price = patch.offerPrice
  if (patch.counterOffer !== undefined) r.counter_offer = patch.counterOffer
  if (patch.agreedPrice !== undefined) r.agreed_price = patch.agreedPrice
  if (patch.commissionPct !== undefined) r.commission_pct = patch.commissionPct
  if (patch.rentTermMonths !== undefined) r.rent_term_months = patch.rentTermMonths
  if (patch.rentMonthly !== undefined) r.rent_monthly = patch.rentMonthly
  if (patch.swapValue !== undefined) r.swap_value = patch.swapValue
  if (patch.lineStatus !== undefined) r.line_status = patch.lineStatus
  if (patch.notes !== undefined) r.notes = patch.notes
  if (patch.position !== undefined) r.position = patch.position
  const { error } = await supabase().from('deal_artworks').update(r).eq('id', id)
  if (error) throw error
}

export async function deleteDealArtwork(id: string): Promise<void> {
  const { error } = await supabase().from('deal_artworks').delete().eq('id', id)
  if (error) throw error
}

// ----- Helpers: financial math for a deal -----

export interface DealTotals {
  grossOut: number          // sum of agreed/offer prices on 'out' lines
  swapInValue: number       // sum of swap_value on 'swap_in' lines (offsets gross)
  buyerNet: number          // grossOut - swapInValue (what buyer actually pays in cash)
  commission: number        // sum of commission per line
  costBasis: number         // sum of artwork.cost_basis for 'out' lines (gallery cost)
  netProfit: number         // grossOut - commission - costBasis - swapInValue (gallery margin)
  marginPct: number         // netProfit / grossOut * 100
}

export function computeDealTotals(
  lines: DealArtwork[],
  artworksById: Map<string, { costBasis?: number | null }>,
): DealTotals {
  let grossOut = 0
  let swapInValue = 0
  let commission = 0
  let costBasis = 0

  for (const l of lines) {
    const price = l.agreedPrice ?? l.counterOffer ?? l.offerPrice ?? l.listPrice ?? 0
    if (l.direction === 'out') {
      const linePrice = l.mode === 'rent' && l.rentMonthly && l.rentTermMonths
        ? l.rentMonthly * l.rentTermMonths
        : (price ?? 0)
      grossOut += linePrice
      const pct = (l.commissionPct ?? 0) / 100
      commission += linePrice * pct
      const cb = artworksById.get(l.artworkId)?.costBasis ?? 0
      costBasis += cb ?? 0
    } else if (l.direction === 'swap_in') {
      swapInValue += l.swapValue ?? 0
    }
  }

  const buyerNet = Math.max(0, grossOut - swapInValue)
  const netProfit = grossOut - commission - costBasis - swapInValue
  const marginPct = grossOut > 0 ? (netProfit / grossOut) * 100 : 0

  return { grossOut, swapInValue, buyerNet, commission, costBasis, netProfit, marginPct }
}
