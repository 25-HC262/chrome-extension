import { createCaptionOverlay } from '@/widgets/captionOverlay'
import { logger } from '@/shared/lib/debug/logger'
import { getStableUserId } from '@/shared/lib/user/getStableUserId'

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
  private frameTimers = new Map<string, number>()
  private frameCanvases = new Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }>()
  private fps = 10

  constructor(options: StreamControllerOptions = {}) {
    this.userId = options.userId ?? getStableUserId()
    // 스트리밍 서버 URL에 userId를 실제로 삽입합니다.
    // 따옴표 실수로 템플릿이 깨지지 않도록 백틱을 사용합니다.
    this.serverUrl = options.serverUrl ?? `ws://localhost:3000/stream?userId=${this.userId}`
    logger.debug('stream:init', { userId: this.userId, serverUrl: this.serverUrl })
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

  // 선택된 사용자별로 프레임 전송을 시작합니다.
  // JPEG로 인코딩해 10fps로 서버에 전송합니다.
  startUserStreaming(userId: string, getVideo: () => HTMLVideoElement | null) {
    if (this.frameTimers.has(userId)) return
    if (!this.streamingServer || this.streamingServer.readyState !== WebSocket.OPEN) return

    const intervalMs = Math.round(1000 / this.fps)
    this.notifyServerOfStart(userId)

    const timer = window.setInterval(() => {
      const video = getVideo()
      if (!video) return
      void this.sendCurrentFrame(video, userId)
    }, intervalMs)

    this.frameTimers.set(userId, timer)
    logger.debug('stream:frame:start', { userId, fps: this.fps })
  }

  // 사용자별 프레임 전송을 중지합니다.
  // setInterval을 해제해 전송을 끝냅니다.
  stopUserStreaming(userId: string) {
    const timer = this.frameTimers.get(userId)
    if (timer == null) return
    clearInterval(timer)
    this.frameTimers.delete(userId)
    this.frameCanvases.delete(userId)
    this.sendStopStream(userId)
    logger.debug('stream:frame:stop', { userId })
  }

  private notifyServerOfStart(userId: string) {
    if (!this.streamingServer || this.streamingServer.readyState !== WebSocket.OPEN) return
    this.streamingServer.send(
      JSON.stringify({
        type: 'start_stream',
        userId,
        fps: this.fps,
        mimeType: 'image/jpeg',
      }),
    )
  }

  private sendStopStream(userId: string) {
    if (!this.streamingServer || this.streamingServer.readyState !== WebSocket.OPEN) return
    this.streamingServer.send(JSON.stringify({ type: 'stop_stream', userId }))
  }

  private async sendCurrentFrame(video: HTMLVideoElement, userId: string) {
    if (!this.streamingServer || this.streamingServer.readyState !== WebSocket.OPEN) return
    const width = video.videoWidth || video.clientWidth
    const height = video.videoHeight || video.clientHeight
    if (width <= 0 || height <= 0) return

    const canvasPair = this.getCanvasForUser(userId, width, height)
    if (!canvasPair) return
    const { canvas, ctx } = canvasPair

    ctx.drawImage(video, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.7))
    if (!blob) return
    const buffer = await blob.arrayBuffer()

    // 바이너리 프레임 앞에 userId 헤더를 붙여 전송합니다.
    // [4 bytes length][N bytes UTF-8 userId][JPEG bytes]
    const payload = this.packFrameWithUserId(userId, new Uint8Array(buffer))
    this.streamingServer.send(payload)
    logger.debug('stream:frame:sent', { userId, bytes: buffer.byteLength })
  }

  private getCanvasForUser(userId: string, width: number, height: number) {
    const existing = this.frameCanvases.get(userId)
    if (existing) {
      if (existing.canvas.width !== width) existing.canvas.width = width
      if (existing.canvas.height !== height) existing.canvas.height = height
      return existing
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const pair = { canvas, ctx }
    this.frameCanvases.set(userId, pair)
    return pair
  }

  // userId와 JPEG 바이트를 프로토콜 형태로 합칩니다.
  // 서버가 사용자별로 시퀀스를 분리할 수 있게 합니다.
  private packFrameWithUserId(userId: string, jpegBytes: Uint8Array): ArrayBuffer {
    const userIdBytes = new TextEncoder().encode(userId)
    const header = new ArrayBuffer(4)
    new DataView(header).setUint32(0, userIdBytes.byteLength, false)

    const out = new Uint8Array(4 + userIdBytes.byteLength + jpegBytes.byteLength)
    out.set(new Uint8Array(header), 0)
    out.set(userIdBytes, 4)
    out.set(jpegBytes, 4 + userIdBytes.byteLength)
    return out.buffer
  }

  private handleServerMessage(message: ServerMessage) {
    switch (message.type) {
      case 'model_response': {
        const { text, userId } = message as { text: string; userId?: string }
        logger.debug('stream:model_response', { userId, textPreview: text?.slice?.(0, 50) })
        this.caption.setText(text)
        this.caption.appendScriptLine(userId ? `[${userId}] ${text}` : text)
        void chrome.runtime.sendMessage({ action: 'readCaption', captionText: text, userId }).catch(() => {})
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

