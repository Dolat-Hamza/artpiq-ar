'use client'
import { useEffect, useState } from 'react'
import { Download, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import {
  bulkDeleteContacts,
  createContact,
  deleteContact,
  downloadContactsCsv,
  listContacts,
  updateContactRow,
} from '@/lib/db/contacts'
import { Contact } from '@/types'
import LoginForm from './LoginForm'

const CATEGORIES = ['Prospect', 'Lead', 'Client', 'Press', 'Other']

export default function ContactsAdmin() {
  const { user, loading } = useAuth()
  const [list, setList] = useState<Contact[]>([])
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function refresh() {
    if (!user) return
    setBusy(true)
    try {
      setList(await listContacts(user.id))
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
    refresh()
  }

  async function bulkDelete() {
    if (!selected.size) return
    if (!confirm(`Delete ${selected.size} contacts?`)) return
    await bulkDeleteContacts([...selected])
    refresh()
  }

  async function changeCategory(id: string, category: string) {
    await updateContactRow(id, { category })
    refresh()
  }

  if (loading) return <div className="p-8 text-[13px] text-ink-muted">Loading…</div>
  if (!user)
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <LoginForm />
      </div>
    )

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-line">
        <div className="max-w-content mx-auto px-6 md:px-12 py-5 flex items-center gap-3 flex-wrap">
          <div className="flex-1">
            <p className="text-[11px] tracking-[0.22em] uppercase text-ink-muted">Contacts</p>
            <h1 className="font-display text-[22px] tracking-tight">{list.length} total</h1>
          </div>
          {selected.size > 0 && (
            <button
              onClick={bulkDelete}
              className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase text-red-600 border border-red-300"
            >
              Delete {selected.size}
            </button>
          )}
          <button
            onClick={() => downloadContactsCsv(list)}
            disabled={!list.length}
            className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line inline-flex items-center gap-2 disabled:opacity-40"
          >
            <Download size={13} /> CSV
          </button>
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase bg-ink text-paper inline-flex items-center gap-2"
          >
            <Plus size={13} /> Add contact
          </button>
        </div>
      </header>

      <main className="max-w-content mx-auto px-6 md:px-12 py-8">
        {!list.length && !busy && (
          <p className="text-[13px] text-ink-muted py-12 text-center">
            No contacts yet. Capture leads from your viewing rooms or add manually.
          </p>
        )}
        <table className="w-full text-[13px]">
          <thead className="border-b border-line text-[10px] tracking-[0.16em] uppercase text-ink-muted">
            <tr>
              <th className="w-8 text-left py-2">
                <input
                  type="checkbox"
                  checked={list.length > 0 && selected.size === list.length}
                  onChange={e =>
                    setSelected(e.target.checked ? new Set(list.map(c => c.id)) : new Set())
                  }
                />
              </th>
              <th className="text-left py-2">Name</th>
              <th className="text-left py-2">Email</th>
              <th className="text-left py-2">Country</th>
              <th className="text-left py-2">Category</th>
              <th className="text-left py-2">Source</th>
              <th className="text-left py-2">Created</th>
              <th className="text-right py-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map(c => (
              <tr key={c.id} className="border-b border-line/60 hover:bg-line/20">
                <td className="py-2">
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
                <td className="py-2">{c.name || <span className="text-ink-muted">—</span>}</td>
                <td className="py-2 text-ink-muted">{c.email}</td>
                <td className="py-2 text-ink-muted">{c.country || '—'}</td>
                <td className="py-2">
                  <select
                    value={c.category || 'Prospect'}
                    onChange={e => changeCategory(c.id, e.target.value)}
                    className="border border-line bg-paper px-1 h-7 text-[11px]"
                  >
                    {CATEGORIES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td className="py-2 text-ink-muted text-[11px] tracking-[0.12em] uppercase">{c.source}</td>
                <td className="py-2 text-ink-muted text-[11px]">
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}
                </td>
                <td className="py-2 text-right">
                  <button onClick={() => remove(c.id)} className="text-red-600">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>

      {adding && (
        <AddContactModal
          onCancel={() => setAdding(false)}
          onSave={add}
        />
      )}
    </div>
  )
}

function AddContactModal({
  onCancel,
  onSave,
}: {
  onCancel: () => void
  onSave: (c: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [category, setCategory] = useState('Prospect')
  const [notes, setNotes] = useState('')
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onCancel}>
      <div
        className="bg-paper border border-line p-6 w-full max-w-[480px]"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-display text-[18px] mb-4">Add contact</h2>
        <div className="grid gap-3 text-[13px]">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="border border-line px-2 py-1.5" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="border border-line px-2 py-1.5" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="border border-line px-2 py-1.5" />
          <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" className="border border-line px-2 py-1.5" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="border border-line bg-paper px-2 py-1.5">
            {CATEGORIES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" rows={3} className="border border-line px-2 py-1.5" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={onCancel} className="px-3 py-1.5 text-[11px] tracking-[0.16em] uppercase border border-line">Cancel</button>
            <button
              onClick={() => onSave({ name, email, phone, country, category, notes, source: 'Manual' })}
              disabled={!email}
              className="px-3 py-1.5 text-[11px] tracking-[0.16em] uppercase bg-ink text-paper disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
