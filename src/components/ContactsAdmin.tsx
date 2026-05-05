'use client'
import { useEffect, useState } from 'react'
import {
  Building2,
  Calendar,
  ChevronRight,
  Download,
  Link2,
  Mail,
  Phone,
  Plus,
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
import type { Activity, Contact, Deal, Organization } from '@/types'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'

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

  useEffect(() => {
    if (!user) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function refresh() {
    if (!user) return
    setBusy(true)
    try {
      const [contacts, organizations] = await Promise.all([
        listContacts(user.id),
        listOrganizations(user.id),
      ])
      setList(contacts)
      setOrgs(organizations)
      setSelected(new Set())
    } finally {
      setBusy(false)
    }
  }

  async function add(input: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>) {
    if (!user) return
    await createContact({ ownerId: user.id, ...input })
    setAdding(false)
    refresh()
  }

  async function remove(id: string) {
    if (!confirm('Delete contact?')) return
    await deleteContact(id)
    if (active?.id === id) setActive(null)
    refresh()
  }

  async function bulkDelete() {
    if (!selected.size) return
    if (!confirm(`Delete ${selected.size} contacts?`)) return
    await bulkDeleteContacts([...selected])
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

  const filtered = search.trim()
    ? list.filter(c =>
        [c.name, c.email, c.country, c.category].join(' ').toLowerCase().includes(search.toLowerCase())
      )
    : list

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
          <div className="px-6 md:px-10 py-3 border-b border-line bg-paper">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, country…"
              className="input max-w-sm"
            />
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
                      <th className="text-left py-2 px-3">Name</th>
                      <th className="text-left py-2 px-3 hidden md:table-cell">Email</th>
                      <th className="text-left py-2 px-3 hidden lg:table-cell">Stage</th>
                      <th className="text-left py-2 px-3 hidden lg:table-cell">Category</th>
                      <th className="text-left py-2 px-3 hidden xl:table-cell">Source</th>
                      <th className="text-right py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr
                        key={c.id}
                        className={`border-b border-line/60 hover:bg-bg cursor-pointer ${active?.id === c.id ? 'bg-accent-soft' : ''}`}
                        onClick={() => setActive(c)}
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
                          <p className="font-bold">{c.name || <span className="text-ink-muted italic">No name</span>}</p>
                          <p className="text-meta text-ink-muted md:hidden">{c.email}</p>
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
  const [tab, setTab] = useState<'details' | 'activity' | 'deals'>('details')

  useEffect(() => {
    listDeals(userId).then(all => setDeals(all.filter(d => d.contactId === contact.id)))
    listActivities(userId, { contactId: contact.id }).then(setActivities)
  }, [contact.id, userId])

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
      <div className="flex border-b border-line shrink-0">
        {(['details', 'activity', 'deals'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            data-active={tab === t}
            className="dock-tab !text-ink-muted data-[active=true]:!text-ink data-[active=true]:after:!bg-ink !h-10 flex-1 !text-[11px]"
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'activity' && activities.length > 0 && (
              <span className="ml-1 text-meta text-ink-muted">· {activities.length}</span>
            )}
            {t === 'deals' && deals.length > 0 && (
              <span className="ml-1 text-meta text-ink-muted">· {deals.length}</span>
            )}
          </button>
        ))}
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
