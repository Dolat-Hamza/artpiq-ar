'use client'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useStore } from '@/store'
import { arLandingPath, arModelPath, canPlaceInAr } from '@/lib/ar/urls'
import { detectPlatform, type Platform } from '@/lib/ar/platform'
import ModelViewer from '@/components/atoms/ModelViewer'
import ArtworkMeta from '@/components/molecules/ArtworkMeta'
import ArLaunchButton from '@/components/molecules/ArLaunchButton'

export default function ArSheet() {
  const { arOpen, current, closeAR, openMyWall } = useStore()
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setPlatform(detectPlatform())
    setOrigin(window.location.origin)
  }, [])

  if (!current) return null

  const placeable = canPlaceInAr(current)
  const isDesktop = platform === 'desktop'
  const image = current.image ?? current.thumb

  return (
    <AnimatePresence>
      {arOpen && (
        <motion.div
          className="fixed inset-0 z-[300] bg-paper flex flex-col"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center h-[56px] px-6 md:px-12 border-b border-line">
            <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted flex-1">
              Augmented reality
            </p>
            <button
              onClick={closeAR}
              className="h-10 w-10 border border-line flex items-center justify-center hover:border-ink"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-content mx-auto px-6 md:px-12 lg:px-20 py-10 md:py-16 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
              <div className="md:col-span-7">
                <div className="aspect-[4/5] bg-slate-100 overflow-hidden">
                  {isDesktop && placeable ? (
                    <ModelViewer src={arModelPath(current, 'glb')} poster={current.thumb ?? undefined} />
                  ) : image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt={current.title}
                      referrerPolicy="no-referrer-when-downgrade"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-display text-[80px] text-ink-muted">
                      {current.title[0]}
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-5">
                <ArtworkMeta
                  artwork={current}
                  eyebrow={current.type === 'sculpture' ? 'Sculpture' : 'Painting'}
                />

                <div className="mt-10 flex flex-col gap-3">
                  {!placeable ? (
                    <p className="text-[13px] text-ink-muted leading-relaxed border border-line p-5">
                      AR preview is available for paintings with an image and dimensions.
                    </p>
                  ) : isDesktop ? (
                    <p className="text-[13px] text-ink-muted leading-relaxed border border-line p-5">
                      Open this page on an iPhone, iPad or recent Android device to place the work in your room.
                    </p>
                  ) : platform && origin ? (
                    <ArLaunchButton
                      platform={platform}
                      usdzUrl={origin + arModelPath(current, 'usdz')}
                      glbUrl={origin + arModelPath(current, 'glb')}
                      fallbackUrl={`${origin}${arLandingPath(current)}?noar=1`}
                      title={current.title}
                      thumb={current.thumb}
                    />
                  ) : null}
                  {current.type === 'painting' && (
                    <button
                      onClick={() => { closeAR(); openMyWall([current.id]) }}
                      className="h-12 bg-transparent text-ink border border-ink text-[14px] hover:bg-ink hover:text-paper transition-colors"
                    >
                      Try on My Wall
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
