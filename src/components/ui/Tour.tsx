'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'

/**
 * Lightweight in-app guided tour. Steps target a CSS selector;
 * a spotlight + tooltip points at it. Auto-resumes on the same route.
 *
 * Add `data-tour="<id>"` to elements you want to spotlight.
 */
export interface TourStep {
  id: string
  title: string
  body: string
  target?: string         // CSS selector — if omitted, tooltip floats center
  route?: string          // navigate to this path before showing this step
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  action?: { label: string; href?: string }
}

export interface TourSpec {
  id: string
  version: number          // bump to re-run on existing users
  steps: TourStep[]
}

interface TourCtx {
  start: (spec: TourSpec) => void
  startById: (id: keyof typeof TOURS) => void
  stop: () => void
}

const TourContext = createContext<TourCtx | null>(null)
export function useTour(): TourCtx {
  return useContext(TourContext) ?? { start: () => {}, startById: () => {}, stop: () => {} }
}

// ============================================================
// Tour definitions — keyed registry
// ============================================================
export const TOURS = {
  welcome: {
    id: 'welcome',
    version: 1,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to artpiq',
        body:
          'A two-minute tour to show you around. You can replay this anytime from the help menu (press ? on your keyboard).',
        route: '/admin',
      },
      {
        id: 'search',
        title: 'Find anything fast',
        body:
          'Press ⌘K (or click here) to search artworks, contacts, deals, organisations, or jump to any page.',
        target: '[data-tour="cmd-k"]',
        placement: 'bottom',
      },
      {
        id: 'presentations',
        title: 'Build presentations',
        body:
          'Generate branded PDFs — Portfolio, Catalogue, Price list, Rental proposal, Press kit. Select artworks, choose layout, download.',
        target: '[data-tour="nav-presentations"]',
        placement: 'right',
        action: { label: 'Open Presentations', href: '/admin/presentations' },
      },
      {
        id: 'crm',
        title: 'CRM built for art',
        body:
          'Contacts include artists, collectors, press. Deals support multiple artworks, sale or rent, offers, counter-offers, and swap-in part-exchange. Drag cards between stages.',
        target: '[data-tour="nav-contacts"]',
        placement: 'right',
        action: { label: 'Open CRM', href: '/admin/contacts' },
      },
      {
        id: 'marketing',
        title: 'Marketing portal',
        body:
          'Plan a month of content across every platform. Brand pillars, funnel stages, KPIs — all tracked. The dashboard scores how balanced your month is.',
        target: '[data-tour="nav-marketing"]',
        placement: 'right',
        action: { label: 'Open Marketing', href: '/admin/marketing' },
      },
      {
        id: 'shortcuts',
        title: 'Keyboard shortcuts',
        body:
          'Press ? to see all shortcuts. g d = Dashboard, g a = Artworks, g p = Presentations, g c = Contacts, g s = Social.',
      },
      {
        id: 'done',
        title: 'You’re set',
        body: 'That’s the gist. Explore. Press ⌘K to navigate anywhere.',
      },
    ],
  },
  crm: {
    id: 'crm',
    version: 1,
    steps: [
      {
        id: 'crm-intro',
        title: 'Contacts overview',
        body:
          'Every contact in one place. Colour avatars, lifecycle stages, linked deals, pipeline value, and last activity all visible on the row.',
        route: '/admin/contacts',
      },
      {
        id: 'crm-filters',
        title: 'Filter + segment',
        body:
          'Search, filter by stage / category / organisation, or click a segment pill to focus on Leads, Prospects, Clients, and so on.',
        target: '[data-tour="contacts-filters"]',
        placement: 'bottom',
      },
      {
        id: 'crm-views',
        title: 'Save views',
        body:
          'Set up a filter combination once — "Hot leads in EU", "Press contacts" — and save it as a view. Reload with one click.',
        target: '[data-tour="contacts-views"]',
        placement: 'bottom',
      },
      {
        id: 'crm-row',
        title: 'Click any contact',
        body:
          'Click a row to open the detail drawer. Five tabs: Details, Activity (with AI summary), Deals, Artworks, Presentations.',
      },
    ],
  },
  deals: {
    id: 'deals',
    version: 1,
    steps: [
      {
        id: 'deals-board',
        title: 'Deal pipeline',
        body:
          'Drag any card between stages. Stage updates auto-save. Card shows linked artworks at a glance.',
        route: '/admin/deals',
      },
      {
        id: 'deal-add',
        title: 'New deal',
        body: 'Hit "+ New deal" to open the deal creator. You can also create a deal from any contact’s Deals tab.',
        target: '[data-tour="new-deal"]',
        placement: 'left',
      },
      {
        id: 'deal-lines',
        title: 'Multi-artwork deals',
        body:
          'Open any deal — add multiple artworks for sale or rent, set offer / counter / agreed price per line, choose sale or rent mode, and add swap-in artworks for part-exchange. Totals + margin update live.',
      },
    ],
  },
  marketing: {
    id: 'marketing',
    version: 1,
    steps: [
      {
        id: 'mkt-intro',
        title: 'Marketing portal',
        body:
          'Propose, review, and approve a full month of content here — posts, blogs, newsletters, events.',
        route: '/admin/marketing',
      },
      {
        id: 'mkt-approval',
        title: 'Approval queue',
        body:
          'Items submitted for review show at the top. One click to approve or request changes.',
        target: '[data-tour="approval-queue"]',
        placement: 'top',
      },
      {
        id: 'mkt-score',
        title: 'Distribution scorecard',
        body:
          'See how balanced the month is across brand pillars, funnel stages, formats. Higher score = healthier mix.',
        target: '[data-tour="distribution-score"]',
        placement: 'top',
      },
      {
        id: 'mkt-platforms',
        title: 'Per-platform view',
        body:
          'Tabs filter by Instagram, Facebook, X, LinkedIn, TikTok, YouTube, Pinterest, Threads.',
        target: '[data-tour="platform-tabs"]',
        placement: 'top',
      },
    ],
  },
  social: {
    id: 'social',
    version: 1,
    steps: [
      {
        id: 'social-intro',
        title: 'Content calendar',
        body:
          'Plan and publish every post, blog and newsletter from one workspace. Five views to look at it: platforms, campaigns, calendar, kanban, list.',
        route: '/admin/social',
      },
      {
        id: 'social-views',
        title: 'Five views, same posts',
        body:
          'Switch between Platforms (Instagram / X / etc.), Campaigns (group by launch), Calendar, Kanban (drag by status), List. Pick the lens that fits today\'s task.',
        target: '[data-tour="social-views"]',
        placement: 'bottom',
      },
      {
        id: 'social-new',
        title: 'New post',
        body:
          'Open the composer. Hook, caption, platform, schedule + photo upload — everything an approver needs to sign off.',
        target: '[data-tour="social-new"]',
        placement: 'left',
      },
      {
        id: 'social-statuses',
        title: 'Status pipeline',
        body:
          'Draft → In progress → Submitted for review → Approved → Scheduled → Published. Every step is auditable.',
      },
      {
        id: 'social-duplicate',
        title: 'Reuse across platforms',
        body:
          'Every post card has a duplicate icon — clone the same caption + images to Instagram, X, LinkedIn at once, each as its own draft.',
        target: '[data-tour="social-duplicate"]',
        placement: 'right',
      },
    ],
  },
} satisfies Record<string, TourSpec>

const STORAGE_KEY = 'artpiq:tours:v1'
function readDone(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}
function writeDone(d: Record<string, number>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
  } catch {}
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [spec, setSpec] = useState<TourSpec | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Trigger first-time welcome
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!pathname?.startsWith('/admin')) return
    const done = readDone()
    if (done[TOURS.welcome.id] !== TOURS.welcome.version) {
      // Defer so providers mount + page paints
      const t = setTimeout(() => setSpec(TOURS.welcome), 1200)
      return () => clearTimeout(t)
    }
  }, [pathname])

  const stop = useCallback(() => {
    if (spec) {
      const done = readDone()
      done[spec.id] = spec.version
      writeDone(done)
    }
    setSpec(null)
    setStepIdx(0)
    setTargetRect(null)
  }, [spec])

  const start = useCallback((s: TourSpec) => {
    setSpec(s)
    setStepIdx(0)
  }, [])

  const startById = useCallback((id: keyof typeof TOURS) => {
    start(TOURS[id])
  }, [start])

  // Resolve target rect when step changes
  const currentStep = spec?.steps[stepIdx]

  useEffect(() => {
    if (!currentStep) return
    // Navigate first if needed
    if (currentStep.route && pathname !== currentStep.route) {
      router.push(currentStep.route)
    }
  }, [currentStep, pathname, router])

  useEffect(() => {
    if (!currentStep) {
      setTargetRect(null)
      return
    }
    if (!currentStep.target) {
      setTargetRect(null)
      return
    }
    let frame: number
    let cancelled = false
    let attempts = 0
    function findTarget() {
      if (cancelled) return
      const el = document.querySelector(currentStep!.target!)
      if (el) {
        setTargetRect(el.getBoundingClientRect())
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (attempts++ < 60) {
        frame = requestAnimationFrame(findTarget)
      } else {
        // give up — show centered tooltip instead of spinning forever
        setTargetRect(null)
      }
    }
    // Wait a tick for route to mount
    const t = setTimeout(findTarget, 200)
    return () => {
      cancelled = true
      clearTimeout(t)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [currentStep, pathname])

  // Update rect on resize/scroll
  useEffect(() => {
    if (!currentStep?.target) return
    function update() {
      const el = currentStep!.target ? document.querySelector(currentStep!.target) : null
      if (el) setTargetRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [currentStep])

  function next() {
    if (!spec) return
    if (stepIdx + 1 >= spec.steps.length) {
      stop()
    } else {
      setStepIdx(stepIdx + 1)
    }
  }
  function prev() {
    if (stepIdx > 0) setStepIdx(stepIdx - 1)
  }

  const tooltipPos = useMemo(() => {
    if (!currentStep) return { top: 0, left: 0 }
    if (!targetRect) {
      // Center
      return { top: '40vh', left: '50vw', transform: 'translate(-50%, -50%)' } as React.CSSProperties
    }
    const margin = 16
    const placement = currentStep.placement ?? 'auto'
    const tooltipW = 340
    const tooltipH = 200

    let top = 0
    let left = 0
    if (placement === 'right') {
      top = targetRect.top + targetRect.height / 2 - tooltipH / 2
      left = targetRect.right + margin
    } else if (placement === 'left') {
      top = targetRect.top + targetRect.height / 2 - tooltipH / 2
      left = targetRect.left - tooltipW - margin
    } else if (placement === 'top') {
      top = targetRect.top - tooltipH - margin
      left = targetRect.left + targetRect.width / 2 - tooltipW / 2
    } else {
      // bottom / auto default
      top = targetRect.bottom + margin
      left = targetRect.left + targetRect.width / 2 - tooltipW / 2
    }
    // Clamp to viewport
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipH - 16))
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipW - 16))
    return { top, left } as React.CSSProperties
  }, [targetRect, currentStep])

  return (
    <TourContext.Provider value={{ start, startById, stop }}>
      {children}
      <AnimatePresence>
        {spec && currentStep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9996] pointer-events-none"
          >
            {/* Overlay with spotlight cutout */}
            <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={stop}>
              <defs>
                <mask id="tour-spotlight">
                  <rect width="100%" height="100%" fill="white" />
                  {targetRect && (
                    <rect
                      x={targetRect.left - 6}
                      y={targetRect.top - 6}
                      width={targetRect.width + 12}
                      height={targetRect.height + 12}
                      rx="8"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(15, 23, 42, 0.55)"
                mask="url(#tour-spotlight)"
              />
            </svg>

            {/* Tooltip */}
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute bg-paper rounded-md shadow-pop p-5 pointer-events-auto"
              style={{ width: 340, ...tooltipPos }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-accent text-paper grid place-items-center">
                  <Sparkles size={12} />
                </span>
                <p className="font-display text-[13px] tracking-[0.04em]">{currentStep.title}</p>
                <button
                  onClick={stop}
                  className="ml-auto text-ink-muted hover:text-ink"
                  aria-label="Close tour"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-body text-ink-soft leading-relaxed">{currentStep.body}</p>
              {currentStep.action && (
                <div className="mt-3">
                  <button
                    onClick={() => {
                      if (currentStep.action?.href) router.push(currentStep.action.href)
                      next()
                    }}
                    className="btn-primary !h-8 text-meta"
                  >
                    {currentStep.action.label}
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-line">
                <div className="flex gap-1">
                  {spec.steps.map((_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${i === stepIdx ? 'bg-accent' : 'bg-line'}`}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={prev}
                    disabled={stepIdx === 0}
                    className="w-7 h-7 grid place-items-center text-ink-muted hover:text-ink disabled:opacity-30"
                    aria-label="Previous"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <button
                    onClick={next}
                    className="inline-flex items-center gap-1 h-7 px-3 bg-ink text-paper rounded-md text-meta tracking-[0.12em] uppercase font-bold"
                  >
                    {stepIdx + 1 < spec.steps.length ? <>Next <ArrowRight size={11} /></> : 'Done'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TourContext.Provider>
  )
}
