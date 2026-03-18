// Detects Meet landing page where in-call UI is absent.
export function isMeetLandingUrl(href: string = window.location.href): boolean {
  return href.includes('landing')
}

