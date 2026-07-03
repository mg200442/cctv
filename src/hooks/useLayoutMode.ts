import { useState, useEffect } from 'react'

// Standard matchMedia-backed hook — re-renders on viewport/orientation
// changes (rotating a tablet, resizing a window), not just on mount.
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = () => setMatches(mql.matches)
    handler()
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])
  return matches
}

export type LayoutMode = 'mobile' | 'tablet' | 'desktop'

// Three tiers, not a single mobile/desktop split:
//  - mobile   (<768px): phones, and tablets held in portrait — the fixed
//    84px sidebar + flexible grid + fixed 360px RightRail simply doesn't
//    fit, so this tier gets a genuinely different shell (bottom nav,
//    RightRail as a full-screen overlay, camera grid forced to 1 column).
//  - tablet   (768–1099px): iPad-class portrait/smaller landscape widths.
//    Keeps the desktop shell (left sidebar still reads fine at 84px here)
//    but RightRail defaults to collapsed and the camera grid caps at 2
//    columns, since the fixed-width panels eat proportionally more of a
//    tablet's screen than a laptop's.
//  - desktop  (>=1100px): unchanged from before this responsive pass —
//    this is the width the original fixed-width layout was designed for.
export function useLayoutMode(): LayoutMode {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1099px)')
  if (isMobile) return 'mobile'
  if (isTablet) return 'tablet'
  return 'desktop'
}
