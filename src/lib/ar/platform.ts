export type Platform = 'ios' | 'android' | 'desktop'

export function detectPlatform(
  ua = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  maxTouchPoints = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints,
  platform = typeof navigator === 'undefined' ? '' : navigator.platform,
): Platform {
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  // iPadOS reports itself as a Mac; touch support gives it away.
  if (platform === 'MacIntel' && maxTouchPoints > 1) return 'ios'
  return 'desktop'
}
