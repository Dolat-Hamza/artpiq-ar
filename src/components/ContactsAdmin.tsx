'use client'
import { useEffect, useState } from 'react'
import {
  Building2,
  Calendar,
  ChevronRight,
  Download,
  FileText,
  Frame,
  Link2,
  Mail,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import {
  bulkDeleteContacts,
  createContact,
  deleteContact,
  downloadContactsCsv,
  listContacts,
  updateContactRow,
} from '@/lib/db/contacts'
import {
  createActivity,
  listActivities,
  listDeals,
} from '@/lib/db/crm'
import { listOrganizations } from '@/lib/db/crm'
import {
  attachPresentationToContact,
  detachPresentationFromContact,
  listPresentations,
  listPresentationsForContact,
} from '@/lib/db/presentations'
import { listMyArtworks } from '@/lib/db/artworks'
import type { Activity, Artwork, Contact, ContactPresentation, Deal, Organization, SavedPresentation } from '@/types'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'
import { useConfirm } from './ui/ConfirmDialog'
import { useToast } from './ui/toast'
import { trackView } from '@/lib/recentlyViewed'
import { createCrmView, deleteCrmView, listCrmViews, type CrmView } from '@/lib/db/crmViews'
import { Bookmark } from 'lucide-react'

const CATEGORIES = ['Prospect', 'Lead', 'Client', 'Press', 'Collector', 'Gallery', 'Institution', 'Other']
const LIFECYCLE = ['lead', 'prospect', 'qualified', 'client', 'lost'] as const
const ACTIVITY_TYPES = ['note', 'call', 'email', 'meeting', 'viewing', 'offer'] as const

const LIFECYCLE_COLOR: Record<string, string> = {
  lead: 'bg-line text-ink-muted',
  prospect: 'bg-blue-100 text-blue-700',
  qualified: 'bg-amber-100 text-amber-700',
  client: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
}

export default function ContactsAdmin() {
  const { user, loading } = useAuth()
  const [list, setList] = useState<Contact[]>([])
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [active, setActive] = useState<Contact | null>(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  // HubSpot-style filters + sort
  const [filterLifecycle, setFilterLifecycle] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterOrg, setFilterOrg] = useState<string>('all')
  const [sortKey, setSortKey] = useState<'name' | 'email' | 'created' | 'lifecycle'>('created')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const confirm = useConfirm()
  const toast = useToast()
  // Saved views
  const [savedViews, setSavedViews] = useState<CrmView[]>([])
  const [activeViewId, setActiveViewId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function refresh() {
    if (!user) return
    setBusy(true)
    try {
      const [contacts, organizations, views] = await Promise.all([
        listContacts(user.id),
        listOrganizations(user.id),
        listCrmViews(user.id).catch(() => []),
      ])
      setList(contacts)
      setOrgs(organizations)
      setSavedViews(views)
      setSelected(new Set())
    } finally {
      setBusy(false)
    }
  }

  async function saveCurrentView() {
    if (!user) return
    const name = window.prompt('Name this view (e.g. "Hot leads in EU")')
    if (!name?.trim()) return
    const view = await createCrmView({
      ownerId: user.id,
      name: name.trim(),
      filters: { filterLifecycle, filterCategory, filterOrg, search },
      sortBy: sortKey,
      sortDir,
      visibleColumns: null,
      isDefault: false,
    })
    setSavedViews(v => [view, ...v])
    setActiveViewId(view.id)
    toast.success('View saved')
  }

  function loadView(v: CrmView) {
    const f = v.filters as Record<string, string | undefined>
    setFilterLifecycle(f.filterLifecycle ?? 'all')
    setFilterCategory(f.filterCategory ?? 'all')
    setFilterOrg(f.filterOrg ?? 'all')
    setSearch(f.search ?? '')
    if (v.sortBy) setSortKey(v.sortBy as 'name' | 'email' | 'created' | 'lifecycle')
    if (v.sortDir) setSortDir(v.sortDir as 'asc' | 'desc')
    setActiveViewId(v.id)
  }

  async function removeView(id: string) {
    const ok = await confirm({ title: 'Delete this view?', destructive: true, confirmLabel: 'Delete' })
    if (!ok) return
    await deleteCrmView(id)
    setSavedViews(v => v.filter(x => x.id !== id))
    if (activeViewId === id) setActiveViewId(null)
    toast.success('View deleted')
  }

  async function add(input: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>) {
    if (!user) return
    await createContact({ ownerId: user.id, ...input })
    setAdding(false)
    refresh()
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: 'Delete contact?',
      description: 'All linked activities and presentations will lose this contact.',
      destructive: true,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    await deleteContact(id)
    if (active?.id === id) setActive(null)
    toast.success('Contact deleted')
    refresh()
  }

  async function bulkDelete() {
    if (!selected.size) return
    const ok = await confirm({
      title: `Delete ${selected.size} contacts?`,
      description: 'This cannot be undone.',
      destructive: true,
      confirmLabel: `Delete ${selected.size}`,
    })
    if (!ok) return
    await bulkDeleteContacts([...selected])
    toast.success(`${selected.size} contacts deleted`)
    refresh()
  }

  async function updateContact(id: string, patch: Partial<Contact>) {
    await updateContactRow(id, patch)
    setActive(a => a ? { ...a, ...patch } : a)
    setList(l => l.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  if (loading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user)
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <LoginForm />
      </div>
    )

  const filtered = list.filter(c => {
    if (search.trim()) {
      const hay = [c.name, c.email, c.country, c.category].join(' ').toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    if (filterLifecycle !== 'all' && c.lifecycleStage !== filterLifecycle) return false
    if (filterCategory !== 'all' && c.category !== filterCategory) return false
    if (filterOrg !== 'all' && c.organizationId !== filterOrg) return false
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let av: string | number = ''
    let bv: string | number = ''
    if (sortKey === 'name') { av = a.name ?? ''; bv = b.name ?? '' }
    else if (sortKey === 'email') { av = a.email ?? ''; bv = b.email ?? '' }
    else if (sortKey === 'created') { av = a.createdAt ?? ''; bv = b.createdAt ?? '' }
    else if (sortKey === 'lifecycle') { av = a.lifecycleStage ?? ''; bv = b.lifecycleStage ?? '' }
    const cmp = String(av).localeCompare(String(bv))
    return sortDir === 'asc' ? cmp : -cmp
  })

  function toggleSort(k: typeof sortKey) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  const stageCounts = {
    lead: list.filter(c => c.lifecycleStage === 'lead').length,
    prospect: list.filter(c => c.lifecycleStage === 'prospect').length,
    qualified: list.filter(c => c.lifecycleStage === 'qualified').length,
    client: list.filter(c => c.lifecycleStage === 'client').length,
    lost: list.filter(c => c.lifecycleStage === 'lost').length,
  }

  return (
    <div className="min-h-dvh bg-bg text-ink flex flex-col">
      <AdminPageHeader
        title="Contacts"
        actions={
          <>
            {selected.size > 0 && (
              <button onClick={bulkDelete} className="btn-outline !text-red-600 !border-red-200">
                Delete {selected.size}
              </button>
            )}
            <button
              onClick={() => downloadContactsCsv(list)}
              disabled={!list.length}
              className="btn-outline disabled:opacity-40"
            >
              <Download size={13} /> CSV
            </button>
            <button onClick={() => setAdding(true)} className="btn-primary">
              <Plus size={14} strokeWidth={2.5} /> Add contact
            </button>
          </>
        }
        subBar={
          <>
            <span>Total: <span className="text-ink font-bold">{list.length}</span></span>
            <span className="text-ink-muted">·</span>
            <span>Clients: <span className="text-ink font-bold">{list.filter(c => c.category === 'Client').length}</span></span>
            {selected.size > 0 && (
              <span className="text-ink-muted">· {selected.size} selected</span>
            )}
          </>
        }
      />

      <div className="flex flex-1 min-h-0">
        {/* Contact list */}
        <section className={`flex-1 min-w-0 flex flex-col ${active ? 'hidden lg:flex' : ''}`}>
          <div className="px-6 md:px-10 py-3 border-b border-line bg-paper flex items-center gap-2 flex-wrap">
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, email, country…"
                className="input !pl-9"
              />
            </div>
            <select
              value={filterLifecycle}
              onChange={e => setFilterLifecycle(e.target.value)}
              className="input !w-auto"
            >
              <option value="all">All stages</option>
              <option value="lead">Lead</option>
              <option value="prospect">Prospect</option>
              <option value="qualified">Qualified</option>
              <option value="client">Client</option>
              <option value="lost">Lost</option>
            </select>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="input !w-auto"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {orgs.length > 0 && (
              <select
                value={filterOrg}
                onChange={e => setFilterOrg(e.target.value)}
                className="input !w-auto max-w-[160px]"
              >
                <option value="all">All organisations</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            )}
            {(filterLifecycle !== 'all' || filterCategory !== 'all' || filterOrg !== 'all') && (
              <button
                onClick={() => { setFilterLifecycle('all'); setFilterCategory('all'); setFilterOrg('all') }}
                className="text-meta uppercase tracking-[0.14em] text-ink-muted underline hover:text-ink"
              >
                Clear filters
              </button>
            )}
            <span className="ml-auto text-meta text-ink-muted">{sorted.length} of {list.length}</span>
          </div>
          {/* Saved views */}
          {(savedViews.length > 0 || true) && (
            <div className="px-6 md:px-10 py-2 border-b border-line bg-paper flex gap-1 flex-wrap items-center text-meta">
              <span className="text-meta uppercase tracking-[0.14em] text-ink-muted mr-1 inline-flex items-center gap-1">
                <Bookmark size={11} /> Views:
              </span>
              {savedViews.map(v => (
                <span
                  key={v.id}
                  className={`inline-flex items-center gap-1 rounded-xs border ${
                    activeViewId === v.id
                      ? 'bg-accent text-paper border-accent'
                      : 'border-line text-ink-muted hover:text-ink hover:border-ink'
                  }`}
                >
                  <button onClick={() => loadView(v)} className="px-2 py-0.5">
                    {v.name}
                  </button>
                  <button onClick={() => removeView(v.id)} className="px-1 opacity-60 hover:opacity-100" aria-label="Delete view">
                    ×
                  </button>
                </span>
              ))}
              <button
                onClick={saveCurrentView}
                className="text-meta tracking-[0.14em] uppercase text-accent underline hover:text-accent/80 ml-1"
              >
                + Save current as view
              </button>
            </div>
          )}
          {/* Lifecycle quick segments */}
          <div className="px-6 md:px-10 py-2 border-b border-line bg-paper flex gap-1 flex-wrap text-meta">
            <SegmentPill label={`All · ${list.length}`} active={filterLifecycle === 'all'} onClick={() => setFilterLifecycle('all')} />
            <SegmentPill label={`Leads · ${stageCounts.lead}`} active={filterLifecycle === 'lead'} onClick={() => setFilterLifecycle('lead')} />
            <SegmentPill label={`Prospects · ${stageCounts.prospect}`} active={filterLifecycle === 'prospect'} onClick={() => setFilterLifecycle('prospect')} />
            <SegmentPill label={`Qualified · ${stageCounts.qualified}`} active={filterLifecycle === 'qualified'} onClick={() => setFilterLifecycle('qualified')} />
            <SegmentPill label={`Clients · ${stageCounts.client}`} active={filterLifecycle === 'client'} onClick={() => setFilterLifecycle('client')} />
            <SegmentPill label={`Lost · ${stageCounts.lost}`} active={filterLifecycle === 'lost'} onClick={() => setFilterLifecycle('lost')} />
          </div>
          <div className="flex-1 overflow-y-auto">
            {!list.length && !busy && (
              <div className="py-20 text-center">
                <p className="text-body text-ink-muted">No contacts yet.</p>
                <button onClick={() => setAdding(true)} className="btn-primary mt-4">
                  <Plus size={14} strokeWidth={2.5} /> Add contact
                </button>
              </div>
            )}
            {filtered.length > 0 && (
              <div className="bg-paper border-b border-line overflow-hidden">
                <table className="w-full text-body">
                  <thead className="border-b border-line bg-bg text-meta uppercase tracking-[0.14em] text-ink-muted sticky top-0 z-10">
                    <tr>
                      <th className="w-8 text-left py-2 px-3">
                        <input
                          type="checkbox"
                          checked={list.length > 0 && selected.size === list.length}
                          onChange={e => setSelected(e.target.checked ? new Set(list.map(c => c.id)) : new Set())}
                        />
                      </th>
                      <th className="text-left py-2 px-3 cursor-pointer hover:text-ink" onClick={() => toggleSort('name')}>
                        Name{sortKey === 'name' && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                      </th>
                      <th className="text-left py-2 px-3 hidden md:table-cell cursor-pointer hover:text-ink" onClick={() => toggleSort('email')}>
                        Email{sortKey === 'email' && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                      </th>
                      <th className="text-left py-2 px-3 hidden lg:table-cell cursor-pointer hover:text-ink" onClick={() => toggleSort('lifecycle')}>
                        Stage{sortKey === 'lifecycle' && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                      </th>
                      <th className="text-left py-2 px-3 hidden lg:table-cell">Category</th>
                      <th className="text-left py-2 px-3 hidden xl:table-cell">Source</th>
                      <th className="text-right py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(c => (
                      <tr
                        key={c.id}
                        className={`border-b border-line/60 hover:bg-bg cursor-pointer ${active?.id === c.id ? 'bg-accent-soft' : ''}`}
                        onClick={() => {
                          setActive(c)
                          trackView({
                            id: c.id,
                            kind: 'contact',
                            label: c.name || c.email || 'Contact',
                            sublabel: c.email ?? undefined,
                            href: '/admin/contacts',
                          })
                        }}
                      >
                        <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(c.id)}
                            onChange={e => {
                              const n = new Set(selected)
                              if (e.target.checked) n.add(c.id); else n.delete(c.id)
                              setSelected(n)
                            }}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {/* Avatar with deterministic colour from name */}
                            <span
                              className="w-8 h-8 rounded-full grid place-items-center text-paper text-[11px] font-bold uppercase shrink-0"
                              style={{ background: avatarColour(c.name || c.email || c.id) }}
                              aria-hidden="true"
                            >
                              {(c.name?.[0] || c.email?.[0] || '?').toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold truncate">{c.name || <span className="text-ink-muted italic">No name</span>}</p>
                              <p className="text-meta text-ink-muted md:hidden truncate">{c.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-ink-muted hidden md:table-cell">{c.email}</td>
                        <td className="py-2 px-3 hidden lg:table-cell">
                          {c.lifecycleStage && (
                            <span className={`text-meta tracking-[0.12em] uppercase px-2 py-0.5 rounded-xs ${LIFECYCLE_COLOR[c.lifecycleStage] ?? 'bg-line text-ink-muted'}`}>
                              {c.lifecycleStage}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-ink-muted text-meta uppercase tracking-[0.12em] hidden lg:table-cell">{c.category || '—'}</td>
                        <td className="py-2 px-3 text-ink-muted text-meta uppercase tracking-[0.12em] hidden xl:table-cell">{c.source}</td>
                        <td className="py-2 px-3 text-right" onClick={e => e.stopPropagation()}>
                          <button className="text-ink-muted hover:text-ink mr-1">
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Detail panel — Artlogic-style */}
        {active && (
          <ContactDetail
            contact={active}
            orgs={orgs}
            userId={user.id}
            onChange={patch => updateContact(active.id, patch)}
            onDelete={() => remove(active.id)}
            onClose={() => setActive(null)}
          />
        )}
      </div>

      {adding && (
        <AddContactModal
          orgs={orgs}
          onCancel={() => setAdding(false)}
          onSave={add}
        />
      )}
    </div>
  )
}

// ============================================================
// Artlogic-style contact detail drawer
// ============================================================
function ContactDetail({
  contact,
  orgs,
  userId,
  onChange,
  onDelete,
  onClose,
}: {
  contact: Contact
  orgs: Organization[]
  userId: string
  onChange: (patch: Partial<Contact>) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [logType, setLogType] = useState<Activity['type']>('note')
  const [logBody, setLogBody] = useState('')
  const [logBusy, setLogBusy] = useState(false)
  const [tab, setTab] = useState<'details' | 'activity' | 'deals' | 'artworks' | 'presentations'>('details')
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  // Artworks attached (via interested_artwork_ids)
  const [allArtworks, setAllArtworks] = useState<Artwork[]>([])
  const [artworkSearch, setArtworkSearch] = useState('')
  // Presentations
  const [allPresentations, setAllPresentations] = useState<SavedPresentation[]>([])
  const [contactPres, setContactPres] = useState<ContactPresentation[]>([])

  useEffect(() => {
    listDeals(userId).then(all => setDeals(all.filter(d => d.contactId === contact.id)))
    listActivities(userId, { contactId: contact.id }).then(setActivities)
    listMyArtworks(userId).then(setAllArtworks).catch(() => {})
    listPresentations(userId).then(setAllPresentations).catch(() => {})
    listPresentationsForContact(contact.id).then(setContactPres).catch(() => {})
    setAiSummary(null)
  }, [contact.id, userId])

  function toggleInterest(awId: string) {
    const ids = new Set(contact.interestedArtworkIds ?? [])
    if (ids.has(awId)) ids.delete(awId); else ids.add(awId)
    onChange({ interestedArtworkIds: [...ids] })
  }

  async function attachPres(presentationId: string) {
    try {
      const cp = await attachPresentationToContact(contact.id, presentationId, { sentAt: new Date().toISOString() })
      setContactPres(prev => [cp, ...prev])
    } catch {}
  }

  async function detachPres(id: string) {
    await detachPresentationFromContact(id)
    setContactPres(prev => prev.filter(p => p.id !== id))
  }

  const interestedArtworks = allArtworks.filter(a => (contact.interestedArtworkIds ?? []).includes(a.id))
  const filteredArtworkPicker = artworkSearch.trim()
    ? allArtworks.filter(a => [a.title, a.artist].join(' ').toLowerCase().includes(artworkSearch.toLowerCase()))
    : allArtworks

  async function generateSummary() {
    setAiLoading(true)
    setAiSummary(null)
    try {
      const res = await fetch('/api/ai/summarise-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: contact.id, ownerId: userId }),
      })
      const json = await res.json()
      if (res.ok) setAiSummary(json.summary)
      else setAiSummary('Error: ' + json.error)
    } catch {
      setAiSummary('Failed to generate summary.')
    } finally {
      setAiLoading(false)
    }
  }

  async function addActivity() {
    if (!logBody.trim()) return
    setLogBusy(true)
    try {
      await createActivity({
        ownerId: userId,
        contactId: contact.id,
        type: logType,
        body: logBody,
        occurredAt: new Date().toISOString(),
      })
      setLogBody('')
      const updated = await listActivities(userId, { contactId: contact.id })
      setActivities(updated)
    } finally {
      setLogBusy(false)
    }
  }

  const org = orgs.find(o => o.id === contact.organizationId)

  return (
    <aside className="w-full lg:w-[420px] border-l border-line bg-paper flex flex-col h-[calc(100vh-128px)] lg:sticky lg:top-[128px] overflow-hidden">
      {/* Drawer header */}
      <div className="h-14 border-b border-line flex items-center px-4 gap-2 shrink-0">
        <div className="w-9 h-9 rounded-full bg-ink text-paper grid place-items-center text-[12px] font-bold uppercase shrink-0">
          {(contact.name?.[0] || contact.email?.[0] || '?').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-body truncate">{contact.name || contact.email || '—'}</p>
          {org && <p className="text-meta text-ink-muted truncate">{org.name}</p>}
        </div>
        <button onClick={onClose} className="w-8 h-8 grid place-items-center text-ink-muted hover:text-ink">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line shrink-0 overflow-x-auto no-scrollbar">
        {(['details', 'activity', 'deals', 'artworks', 'presentations'] as const).map(t => {
          const count = t === 'activity' ? activities.length
            : t === 'deals' ? deals.length
            : t === 'artworks' ? (contact.interestedArtworkIds?.length ?? 0)
            : t === 'presentations' ? contactPres.length
            : 0
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              data-active={tab === t}
              className="dock-tab !text-ink-muted data-[active=true]:!text-ink data-[active=true]:after:!bg-ink !h-10 flex-1 !text-[11px] whitespace-nowrap"
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {count > 0 && (
                <span className="ml-1 text-meta text-ink-muted">· {count}</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Details tab */}
        {tab === 'details' && (
          <div className="p-4 grid gap-3">
            <ContactField
              label="Name"
              icon={<User size={13} />}
              value={contact.name ?? ''}
              onSave={v => onChange({ name: v })}
            />
            <ContactField
              label="Email"
              icon={<Mail size={13} />}
              value={contact.email ?? ''}
              onSave={v => onChange({ email: v })}
            />
            <ContactField
              label="Phone"
              icon={<Phone size={13} />}
              value={contact.phone ?? ''}
              onSave={v => onChange({ phone: v })}
            />
            <ContactField
              label="Country"
              icon={<Link2 size={13} />}
              value={contact.country ?? ''}
              onSave={v => onChange({ country: v })}
            />
            <div>
              <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1 flex items-center gap-1">
                <Building2 size={12} /> Organization
              </label>
              <select
                value={contact.organizationId ?? ''}
                onChange={e => onChange({ organizationId: e.target.value || null })}
                className="input"
              >
                <option value="">None</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Role / Title</label>
              <input
                defaultValue={contact.role ?? ''}
                onBlur={e => onChange({ role: e.target.value })}
                className="input"
                placeholder="Collector, Director…"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Lifecycle</label>
                <select
                  value={contact.lifecycleStage ?? 'lead'}
                  onChange={e => onChange({ lifecycleStage: e.target.value })}
                  className="input"
                >
                  {LIFECYCLE.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Category</label>
                <select
                  value={contact.category ?? 'Prospect'}
                  onChange={e => onChange({ category: e.target.value })}
                  className="input"
                >
                  {CATEGORIES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Notes</label>
              <textarea
                defaultValue={contact.notes ?? ''}
                onBlur={e => onChange({ notes: e.target.value })}
                rows={4}
                className="input"
                placeholder="Internal notes…"
              />
            </div>
            <div className="pt-3 border-t border-line">
              <button
                onClick={onDelete}
                className="text-red-600 hover:text-red-700 text-meta uppercase tracking-[0.14em] underline"
              >
                Delete contact
              </button>
            </div>
          </div>
        )}

        {/* Activity tab */}
        {tab === 'activity' && (
          <div className="p-4 flex flex-col gap-3">
            {/* AI summary */}
            <div className="bg-bg border border-line rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold inline-flex items-center gap-1">
                  <Sparkles size={11} /> AI Summary
                </p>
                <button
                  onClick={generateSummary}
                  disabled={aiLoading}
                  className="text-meta uppercase tracking-[0.12em] text-accent underline disabled:opacity-40"
                >
                  {aiLoading ? 'Generating…' : 'Generate'}
                </button>
              </div>
              {aiSummary ? (
                <p className="text-body text-ink-soft leading-relaxed">{aiSummary}</p>
              ) : (
                <p className="text-body text-ink-muted italic">Click Generate for an AI summary of this contact.</p>
              )}
            </div>
            {/* Log form */}
            <div className="bg-bg border border-line rounded-md p-3 grid gap-2">
              <div className="flex gap-1 flex-wrap">
                {ACTIVITY_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setLogType(t)}
                    className={`text-meta uppercase tracking-[0.14em] px-2 py-0.5 rounded-xs border transition-colors ${
                      logType === t ? 'bg-ink text-paper border-ink' : 'border-line text-ink-muted hover:border-ink'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <textarea
                value={logBody}
                onChange={e => setLogBody(e.target.value)}
                rows={3}
                className="input"
                placeholder="Log a note, call outcome, meeting summary…"
              />
              <button
                onClick={addActivity}
                disabled={!logBody.trim() || logBusy}
                className="btn-primary self-end disabled:opacity-40"
              >
                {logBusy ? 'Saving…' : 'Add'}
              </button>
            </div>

            {/* Timeline */}
            {!activities.length && (
              <p className="text-body text-ink-muted text-center py-8">No activity yet.</p>
            )}
            <ol className="relative border-l border-line ml-2">
              {activities.map(a => (
                <li key={a.id} className="mb-4 ml-4">
                  <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-ink/20 border border-line" />
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-meta uppercase tracking-[0.14em] font-bold text-ink">{a.type}</span>
                    <span className="text-meta text-ink-muted">
                      {new Date(a.occurredAt).toLocaleDateString('en', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-body text-ink-soft whitespace-pre-line">{a.body}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Deals tab */}
        {tab === 'deals' && (
          <div className="p-4">
            {!deals.length ? (
              <p className="text-body text-ink-muted py-8 text-center">No deals linked.</p>
            ) : (
              <ul className="grid gap-2">
                {deals.map(d => (
                  <li key={d.id} className="border border-line rounded-md p-3">
                    <p className="font-bold text-body">{d.title}</p>
                    <div className="flex gap-3 mt-1 text-meta text-ink-muted uppercase tracking-[0.12em]">
                      <span>{d.stage}</span>
                      {d.amount != null && <span>€ {d.amount.toLocaleString()}</span>}
                      {d.expectedCloseDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={10} /> {d.expectedCloseDate}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Artworks tab — interested artworks */}
        {tab === 'artworks' && (
          <div className="p-4 grid gap-3">
            {interestedArtworks.length > 0 && (
              <div>
                <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold mb-2">
                  Interested in · {interestedArtworks.length}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {interestedArtworks.map(a => (
                    <div key={a.id} className="relative group">
                      <div className="aspect-[4/5] bg-bg border border-line/60 overflow-hidden">
                        {a.thumb && <img src={a.thumb} alt={a.title} className="w-full h-full object-cover" />}
                      </div>
                      <p className="text-meta font-bold truncate mt-1">{a.title}</p>
                      <p className="text-meta text-ink-muted truncate">{a.artist}</p>
                      <button
                        onClick={() => toggleInterest(a.id)}
                        className="absolute top-1 right-1 w-5 h-5 grid place-items-center bg-paper/90 backdrop-blur rounded-full text-red-600 opacity-0 group-hover:opacity-100"
                        title="Remove"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t border-line pt-3">
              <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold mb-2">
                Attach artworks
              </p>
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  value={artworkSearch}
                  onChange={e => setArtworkSearch(e.target.value)}
                  placeholder="Search artworks…"
                  className="input !pl-8"
                />
              </div>
              <div className="max-h-[260px] overflow-y-auto border border-line rounded-sm divide-y divide-line">
                {filteredArtworkPicker.slice(0, 30).map(a => {
                  const linked = (contact.interestedArtworkIds ?? []).includes(a.id)
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleInterest(a.id)}
                      className={`flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-bg ${linked ? 'bg-accent-soft' : ''}`}
                    >
                      {a.thumb && <img src={a.thumb} alt="" className="w-8 h-8 object-cover rounded-xs shrink-0" />}
                      <span className="flex-1 min-w-0">
                        <span className="text-body font-bold truncate block">{a.title}</span>
                        <span className="text-meta text-ink-muted truncate block">{a.artist}</span>
                      </span>
                      {linked && <span className="text-accent text-meta">✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Presentations tab — sent PDFs */}
        {tab === 'presentations' && (
          <div className="p-4 grid gap-3">
            {contactPres.length > 0 ? (
              <div>
                <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold mb-2">
                  Sent · {contactPres.length}
                </p>
                <ul className="grid gap-2">
                  {contactPres.map(cp => {
                    const p = allPresentations.find(x => x.id === cp.presentationId)
                    return (
                      <li key={cp.id} className="border border-line rounded-md p-3 flex items-start gap-2">
                        <FileText size={14} className="text-ink-muted shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-body truncate">{p?.title ?? 'Unknown'}</p>
                          <p className="text-meta text-ink-muted">
                            {p?.layout} · {p?.artworkIds.length ?? 0} artworks
                            {cp.sentAt && <> · sent {new Date(cp.sentAt).toLocaleDateString()}</>}
                          </p>
                        </div>
                        <button
                          onClick={() => detachPres(cp.id)}
                          className="text-red-600 hover:text-red-700 shrink-0"
                          title="Remove"
                        >
                          <Trash2 size={13} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-body text-ink-muted text-center py-4">No presentations sent yet.</p>
            )}
            <div className="border-t border-line pt-3">
              <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold mb-2">
                Attach a saved presentation
              </p>
              {allPresentations.length === 0 ? (
                <p className="text-meta text-ink-muted">
                  No saved presentations yet. Generate one from <span className="underline">Presentations</span> page.
                </p>
              ) : (
                <div className="grid gap-1.5 max-h-[260px] overflow-y-auto">
                  {allPresentations
                    .filter(p => !contactPres.some(cp => cp.presentationId === p.id))
                    .map(p => (
                      <button
                        key={p.id}
                        onClick={() => attachPres(p.id)}
                        className="border border-line rounded-sm px-2 py-1.5 text-left hover:border-ink"
                      >
                        <p className="text-body font-bold truncate">{p.title}</p>
                        <p className="text-meta text-ink-muted">{p.layout} · {p.artworkIds.length} artworks</p>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

// Inline-editable field
function ContactField({
  label,
  icon,
  value,
  onSave,
}: {
  label: string
  icon: React.ReactNode
  value: string
  onSave: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1 flex items-center gap-1">
        {icon} {label}
      </label>
      <input
        defaultValue={value}
        onBlur={e => { if (e.target.value !== value) onSave(e.target.value) }}
        className="input"
      />
    </div>
  )
}

function AddContactModal({
  orgs,
  onCancel,
  onSave,
}: {
  orgs: Organization[]
  onCancel: () => void
  onSave: (c: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [category, setCategory] = useState('Prospect')
  const [notes, setNotes] = useState('')
  const [orgId, setOrgId] = useState('')
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onCancel}>
      <div
        className="bg-paper rounded-md shadow-pop p-6 w-full max-w-[480px]"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-display text-[14px] tracking-[0.18em] uppercase mb-4">Add contact</h2>
        <div className="grid gap-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="input" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="input" />
          <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" className="input" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="input">
            {CATEGORIES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          {orgs.length > 0 && (
            <select value={orgId} onChange={e => setOrgId(e.target.value)} className="input">
              <option value="">No organization</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" rows={3} className="input" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={onCancel} className="btn-outline">Cancel</button>
            <button
              onClick={() => onSave({ name, email, phone, country, category, notes, source: 'Manual', organizationId: orgId || null })}
              disabled={!email && !name}
              className="btn-primary disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Deterministic colour for contact avatars (HubSpot-style colourful pills).
 * Uses a fixed-size palette + hashed-string index so same name = same colour.
 */
const AVATAR_PALETTE = [
  '#2563EB', // indigo accent
  '#1EAC99', // teal
  '#E0233C', // red
  '#7C3AED', // violet
  '#F59E0B', // amber
  '#0EA5E9', // sky
  '#EC4899', // pink
  '#10B981', // emerald
  '#6366F1', // indigo lighter
  '#F97316', // orange
]
function avatarColour(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

function SegmentPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded-xs tracking-[0.12em] uppercase transition-colors ${
        active ? 'bg-ink text-paper' : 'text-ink-muted hover:text-ink border border-line hover:border-ink'
      }`}
    >
      {label}
    </button>
  )
}
