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
  } catch (error) {
    logger.error('bootstrap:failed', error)
  }
}

bootstrapContent()