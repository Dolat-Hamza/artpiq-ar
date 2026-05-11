import { supabase } from './client'
import type { ContactPresentation, SavedPresentation } from '@/types'

function row(r: Record<string, unknown>): SavedPresentation {
  return {
    id: r.id as string,
    ownerId: r.owner_id as string,
    title: r.title as string,
    layout: r.layout as string,
    artworkIds: (r.artwork_ids as string[] | null) ?? [],
    showPrice: (r.show_price as boolean | null) ?? true,
    rentalTiers: (r.rental_tiers as Record<string, { rent12?: number | null; rent24?: number | null; rent36?: number | null }>) ?? {},
    pdfUrl: (r.pdf_url as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

export async function listPresentations(ownerId: string): Promise<SavedPresentation[]> {
  const { data, error } = await supabase()
    .from('presentations')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => row(r as Record<string, unknown>))
}

export async function createPresentation(input: Omit<SavedPresentation, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedPresentation> {
  const { data, error } = await supabase()
    .from('presentations')
    .insert({
      owner_id: input.ownerId,
      title: input.title,
      layout: input.layout,
      artwork_ids: input.artworkIds,
      show_price: input.showPrice,
      rental_tiers: input.rentalTiers ?? {},
      pdf_url: input.pdfUrl ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return row(data as Record<string, unknown>)
}

export async function deletePresentation(id: string): Promise<void> {
  const { error } = await supabase().from('presentations').delete().eq('id', id)
  if (error) throw error
}

// ----- Contact ↔ Presentation junction -----
const cpRow = (r: Record<string, unknown>): ContactPresentation => ({
  id: r.id as string,
  contactId: r.contact_id as string,
  presentationId: r.presentation_id as string,
  sentAt: (r.sent_at as string | null) ?? null,
  notes: (r.notes as string | null) ?? null,
  createdAt: r.created_at as string,
})

export async function listPresentationsForContact(contactId: string): Promise<ContactPresentation[]> {
  const { data, error } = await supabase()
    .from('contact_presentations')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => cpRow(r as Record<string, unknown>))
}

export async function attachPresentationToContact(
  contactId: string,
  presentationId: string,
  opts?: { sentAt?: string; notes?: string },
): Promise<ContactPresentation> {
  const { data, error } = await supabase()
    .from('contact_presentations')
    .insert({
      contact_id: contactId,
      presentation_id: presentationId,
      sent_at: opts?.sentAt ?? null,
      notes: opts?.notes ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return cpRow(data as Record<string, unknown>)
}

export async function detachPresentationFromContact(id: string): Promise<void> {
  const { error } = await supabase().from('contact_presentations').delete().eq('id', id)
  if (error) throw error
}
