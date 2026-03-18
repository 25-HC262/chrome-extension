import { createCaptionOverlay } from '@/widgets/captionOverlay'
import { logger } from '@/shared/lib/debug/logger'

type StreamControllerOptions = {
  userId?: string
  serverUrl?: string
}

type ServerMessage =
  | { type: 'stream_started'; userId?: string }
  | { type: 'stream_stopped'; userId?: string }
  | { type: 'model_response'; text: string }
  | { type: 'error'; error: string }
  | { type: string; [key: string]: unknown }

// 스트리밍 서버와 연결하고 메시지를 처리합니다.
// 모델 응답을 받으면 캡션 오버레이를 갱신합니다.
export class StreamController {
  private streamingServer: WebSocket | null = null
  private userId: string
  private caption = createCaptionOverlay()
  private serverUrl: string

  constructor(options: StreamControllerOptions = {}) {
    this.userId = options.userId ?? 'user_0'
    this.serverUrl = options.serverUrl ?? `ws://localhost:3000/stream?userId=${this.userId}`
  }

  async connect() {
    if (!this.userId) return

    // 스트리밍 서버에 웹소켓으로 연결합니다.
    // 연결 실패해도 UI 초기화는 계속 진행되도록 합니다.
    try {
      this.streamingServer = new WebSocket(this.serverUrl)
    } catch (error) {
      logger.error('stream:ws:constructor-failed', { serverUrl: this.serverUrl, error })
      return
    }
    this.streamingServer.binaryType = 'arraybuffer'

    this.streamingServer.onopen = () => {
      logger.debug('stream:ws:open', { serverUrl: this.serverUrl })
      this.sendSubscribeMessage(this.userId)
    }

    this.streamingServer.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const message = JSON.parse(event.data) as ServerMessage
          this.handleServerMessage(message)
        } catch {
          // ignore malformed payloads
        }
      }
    }

    this.streamingServer.onerror = () => {
      logger.warn('stream:ws:error')
    }

    this.streamingServer.onclose = () => {
      logger.warn('stream:ws:close:reconnect-soon')
      setTimeout(() => void this.connect(), 5000)
    }
  }

  private handleServerMessage(message: ServerMessage) {
    switch (message.type) {
      case 'model_response': {
        const text = (message as { text: string }).text
        logger.debug('stream:model_response', { textPreview: text?.slice?.(0, 50) })
        this.caption.setText(text)
        this.caption.appendScriptLine(text)
        void chrome.runtime.sendMessage({ action: 'readCaption', captionText: text }).catch(() => {})
        break
      }
      case 'error':
      default:
        break
    }
  }

  private sendSubscribeMessage(userId: string) {
    if (this.streamingServer && this.streamingServer.readyState === WebSocket.OPEN) {
      this.streamingServer.send(JSON.stringify({ type: 'subscribe', userId }))
    }
  }
}

