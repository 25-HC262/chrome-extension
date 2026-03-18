function safeRandomId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  } catch {
    // ignore
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function getMeetingKey(href: string): string {
  try {
    const url = new URL(href)
    const path = url.pathname.replace(/\//g, '_')
    const authuser = url.searchParams.get('authuser') ?? '0'
    return `${path}__authuser_${authuser}`
  } catch {
    return 'unknown_meeting'
  }
}

// Meet 탭(회의) 단위로 안정적인 사용자 ID를 생성합니다.
// 새로고침해도 동일하게 유지되며, 다른 회의/탭에서는 분리됩니다.
export function getStableUserId(href: string = window.location.href): string {
  const meetingKey = getMeetingKey(href)
  const storageKey = `st_user_id__${meetingKey}`

  try {
    const existing = sessionStorage.getItem(storageKey)
    if (existing) return existing

    const created = `user_${safeRandomId()}`
    sessionStorage.setItem(storageKey, created)
    return created
  } catch {
    return `user_${safeRandomId()}`
  }
}

