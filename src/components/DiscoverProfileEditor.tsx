'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Eye, Save, Upload } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import {
  getMyDiscoverProfile,
  upsertDiscoverProfile,
  uploadHero,
} from '@/lib/db/discover'
import { DiscoverProfile } from '@/types'
import { slugify } from '@/lib/db/collections'
import LoginForm from './LoginForm'

const EMPTY: Omit<DiscoverProfile, 'ownerId'> = {
  slug: '',
  displayName: '',
  bio: '',
  heroImageUrl: '',
  contactEmail: '',
  social: { instagram: '', twitter: '', website: '' },
  theme: { accent: '#0a0a0a', bg: '#ffffff' },
  published: false,
}

export default function DiscoverProfileEditor() {
  const { user, loading } = useAuth()
  const [p, setP] = useState<Omit<DiscoverProfile, 'ownerId'>>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    getMyDiscoverProfile(user.id)
      .then(prof => {
        if (prof) {
          setP({
            slug: prof.slug,
            displayName: prof.displayName,
            bio: prof.bio ?? '',
            heroImageUrl: prof.heroImageUrl ?? '',
            contactEmail: prof.contactEmail ?? '',
            social: prof.social ?? {},
            theme: prof.theme ?? {},
            published: prof.published,
          })
        } else {
          setP({ ...EMPTY, contactEmail: user.email ?? '', displayName: user.email?.split('@')[0] ?? '' })
        }
      })
      .catch(() => {})
  }, [user])

  async function save() {
    if (!user) return
    if (!p.slug.trim() || !p.displayName.trim()) {
      setMsg('Slug and display name required')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      await upsertDiscoverProfile({ ownerId: user.id, ...p })
      setMsg('Saved')
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function onHeroFile(f: File | undefined) {
    if (!f || !user) return
    setBusy(true)
    try {
      const url = await uploadHero(user.id, f)
      setP(s => ({ ...s, heroImageUrl: url }))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="p-8 text-[13px] text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  const publicUrl =
    p.slug && typeof window !== 'undefined' ? `${window.location.origin}/discover/${p.slug}` : ''

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-line">
        <div className="max-w-content mx-auto px-6 md:px-12 py-5 flex items-center gap-3 flex-wrap">
          <div className="flex-1">
            <p className="text-[11px] tracking-[0.22em] uppercase text-ink-muted">Discover Profile</p>
            <h1 className="font-display text-[22px] tracking-tight">
              Public artist landing page
            </h1>
          </div>
          {p.slug && p.published && (
            <Link
              href={`/discover/${p.slug}`}
              target="_blank"
              className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line inline-flex items-center gap-2"
            >
              <Eye size={13} /> View public
            </Link>
          )}
          <button
            onClick={save}
            disabled={busy}
            className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase bg-ink text-paper inline-flex items-center gap-2 disabled:opacity-40"
          >
            <Save size={13} /> {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      <main className="max-w-content mx-auto px-6 md:px-12 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <section className="grid gap-4 text-[13px]">
          <Field label="Display name *">
            <input value={p.displayName} onChange={e => setP(s => ({ ...s, displayName: e.target.value }))} className="input" />
          </Field>
          <Field label="Slug (URL) *">
            <div className="flex items-center gap-1 text-[12px]">
              <span className="text-ink-muted">/discover/</span>
              <input value={p.slug} onChange={e => setP(s => ({ ...s, slug: slugify(e.target.value) }))} className="input flex-1" />
              {publicUrl && (
                <button
                  onClick={() => navigator.clipboard.writeText(publicUrl)}
                  className="text-[10px] tracking-[0.14em] uppercase underline"
                >
                  Copy
                </button>
              )}
            </div>
          </Field>
          <Field label="Bio">
            <textarea
              value={p.bio || ''}
              onChange={e => setP(s => ({ ...s, bio: e.target.value }))}
              rows={5}
              maxLength={1500}
              className="input"
            />
          </Field>
          <Field label="Contact email">
            <input
              type="email"
              value={p.contactEmail || ''}
              onChange={e => setP(s => ({ ...s, contactEmail: e.target.value }))}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Instagram URL">
              <input value={p.social?.instagram || ''} onChange={e => setP(s => ({ ...s, social: { ...s.social, instagram: e.target.value } }))} className="input" />
            </Field>
            <Field label="Twitter / X URL">
              <input value={p.social?.twitter || ''} onChange={e => setP(s => ({ ...s, social: { ...s.social, twitter: e.target.value } }))} className="input" />
            </Field>
            <Field label="Website URL">
              <input value={p.social?.website || ''} onChange={e => setP(s => ({ ...s, social: { ...s.social, website: e.target.value } }))} className="input" />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Field label="Accent color">
              <input
                type="color"
                value={p.theme?.accent || '#0a0a0a'}
                onChange={e => setP(s => ({ ...s, theme: { ...s.theme, accent: e.target.value } }))}
                className="w-12 h-9 border border-line"
              />
            </Field>
            <Field label="Background color">
              <input
                type="color"
                value={p.theme?.bg || '#ffffff'}
                onChange={e => setP(s => ({ ...s, theme: { ...s.theme, bg: e.target.value } }))}
                className="w-12 h-9 border border-line"
              />
            </Field>
          </div>
          <label className="inline-flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={p.published}
              onChange={e => setP(s => ({ ...s, published: e.target.checked }))}
            />
            <span className="text-[12px] tracking-[0.14em] uppercase">
              Publish (make page live at /discover/{p.slug || '<slug>'})
            </span>
          </label>
          {msg && <p className="text-[12px] text-emerald-700">{msg}</p>}
        </section>

        <aside className="text-[13px] space-y-3">
          <p className="text-[11px] tracking-[0.20em] uppercase text-ink-muted">Hero image</p>
          {p.heroImageUrl ? (
            <img src={p.heroImageUrl} alt="hero" className="w-full aspect-[3/2] object-cover border border-line" />
          ) : (
            <div className="w-full aspect-[3/2] bg-line/30 grid place-items-center text-[11px] text-ink-muted">
              No hero image
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => onHeroFile(e.target.files?.[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-full px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line inline-flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Upload size={13} /> {busy ? 'Uploading…' : 'Upload hero'}
          </button>
          {p.heroImageUrl && (
            <button
              onClick={() => setP(s => ({ ...s, heroImageUrl: '' }))}
              className="w-full text-[11px] tracking-[0.14em] uppercase text-ink-muted underline"
            >
              Remove hero
            </button>
          )}
        </aside>
      </main>
      <style jsx global>{`
        .input { width: 100%; border: 1px solid var(--line, #e5e5e5); padding: 6px 10px; font-size: 13px; background: white; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] tracking-[0.16em] uppercase text-ink-muted mb-1">{label}</span>
      {children}
    </label>
  )
}
