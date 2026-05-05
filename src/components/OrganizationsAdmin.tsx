'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import {
  createOrganization,
  deleteOrganization,
  listOrganizations,
  updateOrganization,
} from '@/lib/db/crm'
import type { Organization, OrganizationType } from '@/types'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'

const TYPES: OrganizationType[] = ['gallery', 'collector', 'press', 'institution', 'vendor', 'other']

export default function OrganizationsAdmin() {
  const { user, loading } = useAuth()
  const [list, setList] = useState<Organization[]>([])
  const [adding, setAdding] = useState(false)

  useEffect(() => { if (user) refresh() }, [user])
  async function refresh() { if (user) setList(await listOrganizations(user.id)) }

  async function add(input: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>) {
    await createOrganization(input)
    setAdding(false)
    refresh()
  }
  async function rm(id: string) {
    if (!confirm('Delete organization?')) return
    await deleteOrganization(id)
    refresh()
  }

  if (loading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AdminPageHeader
        title="Organizations"
        actions={
          <button onClick={() => setAdding(true)} className="btn-primary">
            <Plus size={14} strokeWidth={2.5} /> Add organization
          </button>
        }
        subBar={<span>Total: <span className="text-ink font-bold">{list.length}</span></span>}
      />
      <main className="px-6 md:px-10 py-6">
        {!list.length ? (
          <div className="py-20 text-center">
            <p className="text-body text-ink-muted">No organizations yet.</p>
            <button onClick={() => setAdding(true)} className="btn-primary mt-4">
              <Plus size={14} strokeWidth={2.5} /> Add your first
            </button>
          </div>
        ) : (
          <div className="bg-paper border border-line rounded-md overflow-hidden">
            <table className="w-full text-body">
              <thead className="border-b border-line bg-bg text-meta uppercase tracking-[0.14em] text-ink-muted">
                <tr>
                  <th className="text-left py-2 px-3">Name</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-left py-2 px-3">Country</th>
                  <th className="text-left py-2 px-3">Website</th>
                  <th className="text-right py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {list.map(o => (
                  <tr key={o.id} className="border-b border-line/60 hover:bg-bg">
                    <td className="py-2 px-3 font-bold">
                      <input
                        defaultValue={o.name}
                        onBlur={e => e.target.value !== o.name && updateOrganization(o.id, { name: e.target.value }).then(refresh)}
                        className="bg-transparent w-full"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        defaultValue={o.type}
                        onChange={e => updateOrganization(o.id, { type: e.target.value as OrganizationType }).then(refresh)}
                        className="bg-transparent text-meta tracking-[0.12em] uppercase text-ink-muted"
                      >
                        {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-3 text-ink-muted">{o.country || '—'}</td>
                    <td className="py-2 px-3 text-ink-muted truncate max-w-[260px]">
                      {o.website ? <a href={o.website} target="_blank" rel="noreferrer" className="underline">{o.website}</a> : '—'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={() => rm(o.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      {adding && <AddOrgModal ownerId={user.id} onCancel={() => setAdding(false)} onSave={add} />}
    </div>
  )
}

function AddOrgModal({
  ownerId,
  onCancel,
  onSave,
}: {
  ownerId: string
  onCancel: () => void
  onSave: (o: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>) => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<OrganizationType>('gallery')
  const [country, setCountry] = useState('')
  const [website, setWebsite] = useState('')
  const [notes, setNotes] = useState('')
  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onCancel}>
      <div className="bg-paper rounded-md shadow-pop p-6 w-full max-w-[480px]" onClick={e => e.stopPropagation()}>
        <h2 className="font-display text-[14px] tracking-[0.18em] uppercase mb-4">Add organization</h2>
        <div className="grid gap-3">
          <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="input" />
          <select value={type} onChange={e => setType(e.target.value as OrganizationType)} className="input">
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} className="input" />
          <input placeholder="Website" value={website} onChange={e => setWebsite(e.target.value)} className="input" />
          <textarea placeholder="Notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="input" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={onCancel} className="btn-outline">Cancel</button>
            <button
              onClick={() => onSave({ ownerId, name, type, country, website, notes })}
              disabled={!name}
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
