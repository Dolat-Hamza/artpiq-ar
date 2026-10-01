'use client'
import { sceneViewerIntent } from '@/lib/ar/urls'
import type { Platform } from '@/lib/ar/platform'

interface Props {
  platform: Platform
  usdzUrl: string
  glbUrl: string
  fallbackUrl: string
  title: string
  thumb?: string | null
  label?: string
}

const BUTTON = 'w-full h-14 bg-ink text-paper text-[15px] font-medium tracking-wide hover:bg-black active:scale-[.98] transition flex items-center justify-center gap-3'

export default function ArLaunchButton({
  platform, usdzUrl, glbUrl, fallbackUrl, title, thumb, label = 'Place on your wall',
}: Props) {
  if (platform === 'ios') {
    // Quick Look requires the <img> to be the anchor's only child, so the label lives in ::after.
    return (
      <a rel="ar" href={usdzUrl} data-label={label} aria-label={label} className={`${BUTTON} after:content-[attr(data-label)]`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb ?? '/transparent.png'} alt="" className="w-6 h-6 object-cover" />
      </a>
    )
  }
  if (platform === 'android') {
    return (
      <a href={sceneViewerIntent({ glbUrl, fallbackUrl, title })} className={BUTTON}>
        {label}
      </a>
    )
  }
  return null
}
