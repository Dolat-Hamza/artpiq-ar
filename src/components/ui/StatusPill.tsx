'use client'
import { ArtworkStatus } from '@/types'

const LABEL: Record<ArtworkStatus, string> = {
  for_sale: 'For Sale',
  sale_pending: 'Sale Pending',
  for_rent: 'For Rent',
  rented: 'Rented',
  reserved: 'Reserved',
  sold: 'Sold',
  not_for_sale: 'Not for Sale',
}

const CLS: Record<ArtworkStatus, string> = {
  for_sale: 'pill pill-sale',
  sale_pending: 'pill pill-reserved',
  for_rent: 'pill pill-rented',
  rented: 'pill pill-rented',
  reserved: 'pill pill-reserved',
  sold: 'pill pill-sold',
  not_for_sale: 'pill pill-sold',
}

export default function StatusPill({ status }: { status?: ArtworkStatus | null }) {
  const s = status ?? 'for_sale'
  return <span className={CLS[s]}>{LABEL[s]}</span>
}
