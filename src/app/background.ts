class TtsController {
  constructor() {}

  readCaption(text: string): void {
    if (!text || text.trim() === "") {
      console.log("TTS Controller: Text is empty, skipping read.");
      return;
    }

    if (typeof chrome.tts === "undefined") {
      console.error(
        "TTS API not available. Check permissions in manifest.json.",
      );
      return;
    }

    chrome.tts.speak(
      text,
      {
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        lang: "ko-KR",
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error("TTS Speak Error: " + chrome.runtime.lastError.message);
        } else {
          console.log("TTS playback finished successfully.");
        }
      },
    );
  }
}

const ttsControl = new TtsController();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const action = request?.action;

  // 캡처 요청 처리
  if (action === "requestDesktopCapture") {
    chrome.desktopCapture.chooseDesktopMedia(
      ["screen", "window", "tab"],
      sender.tab!,
      (streamId) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message,
          });
        } else if (streamId) {
          sendResponse({ success: true, streamId });
        } else {
          sendResponse({
            success: false,
            error: "Desktop capture denied by user",
          });
        }
      },
    );
    return true;
  }

  // TTS 읽기 요청 처리
  if (action === "readCaption" && request.captionText) {
    console.log("Background: TTS 요청 수신 -", request.captionText);
    ttsControl.readCaption(request.captionText);
    sendResponse({ success: true });
    return true;
  }

  // 실패 응답
  if (action) {
    sendResponse({ success: false, error: `Unknown action: ${action}` });
  }

  return false;
});
