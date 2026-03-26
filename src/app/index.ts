import { isMeetLandingUrl } from "@/shared/lib/url/isMeetLanding";
import { logger } from "@/shared/lib/debug/logger";
import { createCaptionOverlay } from "@/widgets/captionOverlay";
import { createMeetCapturePanel } from "@/widgets/meetCapturePanel";
import { StreamController } from "@/features/streaming";

export function bootstrapContent() {
  if (isMeetLandingUrl()) return;

  try {
    const caption = createCaptionOverlay();
    caption.setText("");

    const panel = createMeetCapturePanel();
    panel.start();

    panel.onScriptToggle = (enabled: boolean) => {
      caption.setVisibility(enabled);
    };

    // 활성화된 스트림 컨트롤러 인스턴스 보관함
    const controllers = new Map<string, StreamController>();

    /**
     * 체크박스에 체크된 ID들을 받아와서 스트리밍을 한꺼번에 시작
     */
    (panel as any).onStart = (selectedIds: string[]) => {
      logger.info("bootstrap:capture_start_clicked", { selectedIds });

      selectedIds.forEach((meetId) => {
        if (!controllers.has(meetId)) {
          logger.debug("bootstrap:starting_stream", { meetId });

          const stream = new StreamController(meetId);

          // 연결 후 스트리밍 시작
          void stream.connect().then(() => {
            stream.startStreaming(() => panel.getUserVideo(meetId));
          });

          controllers.set(meetId, stream);
        }
      });
    };

    /**
     * 현재 동작 중인 모든 스트림을 중단하고 목록에서 삭제합니다.
     */
    (panel as any).onStop = () => {
      logger.info("bootstrap:capture_stop_clicked");

      for (const [meetId, controller] of controllers.entries()) {
        logger.debug("bootstrap:stopping_stream", { meetId });
        controller.stopStreaming();
        controllers.delete(meetId);
      }

      // 혹시 남아있을지 모를 모든 컨트롤러 강제 종료 및 비우기
      controllers.clear();
    };
  } catch (error) {
    logger.error("bootstrap:failed", error);
  }
}

bootstrapContent();
