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

    // Meet ID별로 독립적인 컨트롤러 인스턴스 보관
    const controllers = new Map<string, StreamController>();

    window.setInterval(() => {
      const nowIds = panel.getSelectedUserIds();
      const nowSet = new Set(nowIds);

      // 신규 선택된 참가자 처리
      for (const meetId of nowIds) {
        if (!controllers.has(meetId)) {
          logger.debug("bootstrap:start_new_stream", { meetId });
          
          const stream = new StreamController(meetId);
          void stream.connect().then(() => {
            stream.startStreaming(() => panel.getUserVideo(meetId));
          });
          
          controllers.set(meetId, stream);
        }
      }

      // 선택 해제된 참가자 처리
      for (const [meetId, controller] of controllers.entries()) {
        if (!nowSet.has(meetId)) {
          logger.debug("bootstrap:stop_stream", { meetId });
          controller.stopStreaming();
          controllers.delete(meetId);
        }
      }
    }, 500);

  } catch (error) {
    logger.error("bootstrap:failed", error);
  }
}

bootstrapContent();