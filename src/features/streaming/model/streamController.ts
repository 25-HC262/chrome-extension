import { createCaptionOverlay } from "@/widgets/captionOverlay";
import { logger } from "@/shared/lib/debug/logger";

/**
 * [핵심] 상대방(MeetID)을 위한 독립적인 난수 ID를 생성/관리합니다.
 * 내 ID와 섞이지 않도록 전용 스토리지 키를 사용합니다.
 */
function getTargetRandomId(meetId: string): string {
  const meetingKey = window.location.pathname.replace(/\//g, "_");
  // 내 ID용 키인 'st_user_id'와 겹치지 않게 'target_map' 키를 사용
  const storageKey = `st_target_map__${meetingKey}__${meetId}`;

  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;

    // 새로운 난수 생성 (UUID 형식)
    const newId = `user_${crypto.randomUUID()}`;
    sessionStorage.setItem(storageKey, newId);
    return newId;
  } catch {
    return `user_tmp_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export class StreamController {
  private streamingServer: WebSocket | null = null;
  private targetRandomId: string; // 상대방을 식별하는 난수 ID
  private meetId: string; // 구글 미트 내부 ID (Nl0j0e 등)
  private caption = createCaptionOverlay();
  private serverUrl: string;

  private frameTimer: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  // private fps = 10;

  private isStreaming = false;
  private requestIds: number[] = [];

  constructor(meetId: string) {
    this.meetId = meetId;
    this.targetRandomId = getTargetRandomId(meetId);
    // this.serverUrl = `ws://localhost:3000/stream?userId=${this.targetRandomId}`;
    this.serverUrl = `https://streaming-server-648489943292.asia-northeast3.run.app/stream?userId=${this.targetRandomId}`;
  }

  async connect() {
    if (this.streamingServer) return;

    try {
      this.streamingServer = new WebSocket(this.serverUrl);
      this.streamingServer.binaryType = "arraybuffer";

      this.streamingServer.onopen = () => {
        logger.debug("stream:ws:open", {
          meetId: this.meetId,
          target: this.targetRandomId,
        });

        this.sendSubscribeMessage(this.targetRandomId);
        this.notifyServerOfStart();
      };

      this.streamingServer.onmessage = (event) => {
        if (typeof event.data === "string") {
          try {
            const message = JSON.parse(event.data);
            this.handleServerMessage(message);
          } catch {}
        }
      };

      this.streamingServer.onclose = () => {
        this.stopStreaming();
        setTimeout(() => void this.connect(), 5000);
      };
    } catch (e) {
      logger.error("connection:failed", e);
    }
  }

  startStreaming(getVideo: () => HTMLVideoElement | null) {
    if (this.frameTimer) return;
    this.isStreaming = true;

    const loop = async () => {
      if (!this.isStreaming) return;

      const video = getVideo();

      if (
        video &&
        !video.paused &&
        !video.ended &&
        this.streamingServer?.readyState === WebSocket.OPEN
      ) {
        await this.sendCurrentFrame(video);
      }

      this.requestIds.push(window.requestAnimationFrame(loop));
    };

    this.requestIds.push(window.requestAnimationFrame(loop));
  }

  stopStreaming() {
    this.isStreaming = false;

    this.requestIds.forEach((id) => window.cancelAnimationFrame(id));
    this.requestIds = [];

    if (this.frameTimer) {
      clearInterval(this.frameTimer);
      this.frameTimer = null;
    }

    this.sendStopStream();
  }

  private notifyServerOfStart() {
    this.streamingServer?.send(
      JSON.stringify({
        type: "start_stream",
        userId: this.targetRandomId,
        mimeType: "image/jpeg",
      }),
    );
  }

  private sendStopStream() {
    if (this.streamingServer?.readyState === WebSocket.OPEN) {
      this.streamingServer.send(
        JSON.stringify({
          type: "stop_stream",
          userId: this.targetRandomId,
        }),
      );
    }
  }

  private async sendCurrentFrame(video: HTMLVideoElement) {
    const width = video.videoWidth || video.clientWidth;
    const height = video.videoHeight || video.clientHeight;
    if (width <= 0 || height <= 0) return;

    if (
      !this.canvas ||
      this.canvas.width !== width ||
      this.canvas.height !== height
    ) {
      this.canvas = document.createElement("canvas");
      this.canvas.width = width;
      this.canvas.height = height;
      this.ctx = this.canvas.getContext("2d");
    }

    this.ctx?.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((res) =>
      this.canvas!.toBlob(res, "image/jpeg", 0.7),
    );
    if (!blob) return;

    const buffer = await blob.arrayBuffer();
    const payload = this.packFrameWithUserId(
      this.targetRandomId,
      new Uint8Array(buffer),
    );
    this.streamingServer?.send(payload);
  }

  private packFrameWithUserId(
    userId: string,
    jpegBytes: Uint8Array,
  ): ArrayBuffer {
    const userIdBytes = new TextEncoder().encode(userId);
    const header = new ArrayBuffer(4);
    new DataView(header).setUint32(0, userIdBytes.byteLength, false);

    const out = new Uint8Array(
      4 + userIdBytes.byteLength + jpegBytes.byteLength,
    );
    out.set(new Uint8Array(header), 0);
    out.set(userIdBytes, 4);
    out.set(jpegBytes, 4 + userIdBytes.byteLength);
    return out.buffer;
  }

  private handleServerMessage(message: any) {
    if (message.type === "info") {
      this.caption.setText(message.message);
    } else if (message.type === "model_response") {
      if (!this.isStreaming) return;

      this.caption.setText(message.text);
      this.caption.appendScriptLine(message.text);
      console.log(
        message.userId ? `[${message.userId}] ${message.text}` : message.text,
      );
    }
  }

  private sendSubscribeMessage(userId: string) {
    this.streamingServer?.send(JSON.stringify({ type: "subscribe", userId }));
  }
}
