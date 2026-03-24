const CHECK_INTERVAL_MINUTES = 1;

class TtsController {
  constructor() {}
  readCaption(text: string) {
    if (!text || text.trim() === "") {
      console.log("TTS Controller: Text is empty, skipping read.");
      return;
    }
    if (typeof chrome.tts === "undefined") {
      console.error("TTS API not available. Check permissions.");
      return;
    }
    chrome.tts.speak(
      text,
      {
        rate: 1.0, // 속도
        pitch: 1.0, // 음높이
        volume: 1.0, // 볼륨
        lang: "ko-KR", // 한국어 설정
      },
      function () {
        // TTS 실행 후 오류 확인
        if (chrome.runtime.lastError) {
          console.error("TTS Speak Error: " + chrome.runtime.lastError.message);
        } else {
          console.log("TTS playback finished successfully.");
        }
      },
    );
  }
}

const ttsController = new TtsController();

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "readCaption" && request.captionText) {
    ttsController.readCaption(request.captionText);
    return true;
  }
});

export default ttsController;
