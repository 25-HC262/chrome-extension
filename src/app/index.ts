import { isMeetLandingUrl } from '@/shared/lib/url/isMeetLanding'
import { logger } from '@/shared/lib/debug/logger'
import { createCaptionOverlay } from '@/widgets/captionOverlay'
import { createMeetCapturePanel } from '@/widgets/meetCapturePanel'
import { StreamController } from '@/features/streaming'

// Meet 페이지에서 콘텐츠 스크립트를 초기화합니다.
// 랜딩 페이지에서는 UI가 없어 실행을 건너뜁니다.
export function bootstrapContent() {
  logger.debug('bootstrap:start', { href: window.location.href })
  ;(window as any).__SIGN_TRANSLATOR__ = { bootedAt: Date.now() }

  if (isMeetLandingUrl()) {
    logger.debug('bootstrap:skip:landing')
    return
  }

  try {
    const caption = createCaptionOverlay()
    caption.setText('')
    logger.debug('bootstrap:caption:ok')

    const panel = createMeetCapturePanel()
    panel.start()
    logger.debug('bootstrap:panel:ok')

    const stream = new StreamController()
    void stream.connect()
    logger.debug('bootstrap:stream:connect-called')

    // 선택된 사용자 목록을 주기적으로 동기화합니다.
    // 선택/해제에 맞춰 프레임 전송을 시작/중지합니다.
    let prev = new Set<string>()
    window.setInterval(() => {
      const now = new Set(panel.getSelectedUserIds())

      for (const userId of now) {
        if (!prev.has(userId)) {
          stream.startUserStreaming(userId, () => panel.getUserVideo(userId))
        }
      }
      for (const userId of prev) {
        if (!now.has(userId)) {
          stream.stopUserStreaming(userId)
        }
      }

      prev = now
    }, 500)
  } catch (error) {
    logger.error('bootstrap:failed', error)
  }
}

bootstrapContent()