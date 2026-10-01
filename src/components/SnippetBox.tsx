'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'

export default function SnippetBox({ snippet, children }: { snippet: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(t)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
    } catch {
      // Clipboard blocked (non-https): the textarea stays selectable.
    }
  }

  return (
    <div>
      <span className="block text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-1.5">Snippet</span>
      {children && <p className="text-[11px] text-ink-muted mb-2 leading-relaxed">{children}</p>}
      <textarea
        className="input w-full font-mono text-[11px] min-h-[180px]"
        readOnly
        value={snippet}
        onFocus={e => e.currentTarget.select()}
      />
      <div className="flex justify-end mt-2">
        <button onClick={copy} className="btn-outline flex items-center gap-1.5">
          {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy snippet</>}
        </button>
      </div>
    </div>
  )
}
