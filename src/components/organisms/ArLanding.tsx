'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Artwork } from '@/types'
import { useStore } from '@/store'
import { tellHostOwnClose } from '@/lib/embed/hostMessages'
import { arLandingPath, arModelPath, canPlaceInAr } from '@/lib/ar/urls'
import { detectPlatform, type Platform } from '@/lib/ar/platform'
import ModelViewer from '@/components/atoms/ModelViewer'
import ArtworkMeta from '@/components/molecules/ArtworkMeta'
import ArLaunchButton from '@/components/molecules/ArLaunchButton'
import QrHandoff from '@/components/molecules/QrHandoff'
import Button from '@/components/ui/Button'

const MyWall = dynamic(() => import('@/components/MyWall'), { ssr: false })

interface Props {
  artwork: Artwork
  origin: string
  noAr?: boolean
}

const UNAVAILABLE = 'AR preview is available for paintings with an image and dimensions.'
const PHOTO = 'Use a photo of your wall'

function ArtworkImage({ artwork: aw }: { artwork: Artwork }) {
  const src = aw.image ?? aw.thumb
  return (
    <div className="aspect-[4/5] bg-slate-100 overflow-hidden border border-line">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={aw.title}
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-display text-[60px] text-ink-muted">
          {aw.title[0]}
        </div>
      )}
    </div>
  )
}

export default function ArLanding({ artwork: aw, origin, noAr = false }: Props) {
  // Unknown until mount, so SSR and first client render match and phones never load model-viewer.
  const [platform, setPlatform] = useState<Platform | null>(null)
  useEffect(() => { setPlatform(detectPlatform()) }, [])

  const placeable = canPlaceInAr(aw)
  const landingUrl = origin + arLandingPath(aw)
  const isMobile = platform === 'ios' || platform === 'android'

  // My Wall with only this artwork; inside the Squarespace dialog the host hides its close meanwhile.
  const { myWallOpen, setArtworks, openMyWall } = useStore()
  // Most visitors pick the camera, so My Wall's code only loads on first use.
  const [wallLoaded, setWallLoaded] = useState(false)
  const openPhoto = () => { setWallLoaded(true); setArtworks([aw]); openMyWall([aw.id]) }
  useEffect(() => { tellHostOwnClose(myWallOpen) }, [myWallOpen])
  const photoButton = <Button variant="outline" size="lg" fullWidth onClick={openPhoto}>{PHOTO}</Button>

  useEffect(() => {
    if (!placeable || !isMobile) return
    const url = origin + arModelPath(aw, platform === 'ios' ? 'usdz' : 'glb')
    fetch(url, { priority: 'low' } as RequestInit).catch(() => {})
  }, [placeable, isMobile, platform, origin, aw])

  if (platform === 'desktop') {
    return (
      <div className="min-h-dvh bg-paper text-ink">
        <div className="max-w-content mx-auto px-6 md:px-12 py-10 md:py-14 grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-7">
            {placeable ? (
              <div className="aspect-[4/5] bg-slate-100 overflow-hidden border border-line">
                <ModelViewer src={arModelPath(aw, 'glb')} poster={aw.thumb ?? undefined} />
              </div>
            ) : (
              <ArtworkImage artwork={aw} />
            )}
          </div>
          <div className="md:col-span-5 flex flex-col gap-10">
            <ArtworkMeta artwork={aw} headingLevel={1} eyebrow="ARTPIQ AR" />
            {placeable ? (
              <div className="flex flex-col gap-4">
                <QrHandoff url={landingUrl} title={aw.title} />
                {photoButton}
              </div>
            ) : (
              <p className="text-[13px] text-ink-muted leading-relaxed">{UNAVAILABLE}</p>
            )}
          </div>
        </div>
        {wallLoaded && <MyWall />}
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-paper text-ink flex flex-col">
      <div className="flex-1 flex flex-col justify-between p-6">
        <div className="flex flex-col gap-6">
          <ArtworkImage artwork={aw} />
          <ArtworkMeta artwork={aw} headingLevel={1} eyebrow="ARTPIQ AR" />
        </div>

        <div className="mt-8">
          {!placeable ? (
            <p className="text-[13px] text-ink-muted leading-relaxed">{UNAVAILABLE}</p>
          ) : noAr ? (
            <div className="border border-line p-5 text-[13px] leading-relaxed">
              <p className="text-ink">
                AR could not open on this device. On Android, install &lsquo;Google Play Services for AR&rsquo; then reopen this page.
              </p>
              <a href={arLandingPath(aw)} className="mt-3 inline-block underline text-ink">
                Try again
              </a>
              <div className="mt-4">{photoButton}</div>
            </div>
          ) : platform ? (
            <>
              <ArLaunchButton
                platform={platform}
                usdzUrl={origin + arModelPath(aw, 'usdz')}
                glbUrl={origin + arModelPath(aw, 'glb')}
                fallbackUrl={`${landingUrl}?noar=1`}
                title={aw.title}
                thumb={aw.thumb}
                label="Use your camera"
              />
              <p className="mt-3 text-[11px] text-ink-muted text-center leading-relaxed">
                Opens your camera in {platform === 'ios' ? 'AR Quick Look' : 'Google Scene Viewer'}.
                Point at a wall, tap to place at true size.
              </p>
              <div className="mt-4">{photoButton}</div>
            </>
          ) : null}
          {placeable && (
            <p className="mt-2 text-[11px] text-ink-muted text-center">
              Works in Safari (iOS) and Chrome (Android).
            </p>
          )}
        </div>
      </div>
      {wallLoaded && <MyWall />}
    </div>
  )
}
