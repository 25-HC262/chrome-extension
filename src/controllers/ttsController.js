const CHECK_INTERVAL_MINUTES = 1;

class TtsController {
    constructor () {

    }
    readCaption(text) { 
        if (!text || text.trim() === "") {
            console.log("TTS Controller: Text is empty, skipping read.");
            return;
        }
        if (typeof chrome.tts === 'undefined') {
            console.error("TTS API not available. Check permissions.");
            return;
        }
        chrome.tts.speak(text, {
            rate: 1.0,         // 속도
            pitch: 1.0,        // 음높이
            volume: 1.0,       // 볼륨
            lang: 'ko-KR'      // 한국어 설정
        }, function() {
            // TTS 실행 후 오류 확인
            if (chrome.runtime.lastError) {
                console.error('TTS Speak Error: ' + chrome.runtime.lastError.message);
            } else {
                console.log("TTS playback finished successfully.");
            }
        });
    }
}


const ttsController = new TtsController();

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        // 메시지 타입이 'readCaption'일 경우 TTS 실행
        if (request.action === "readCaption" && request.captionText) {
            ttsController.readCaption(request.captionText);
            // 비동기 작업이므로 true를 반환하여 포트를 열어둡니다. (MV3에서는 선택 사항)
            return true; 
        }
    }
);

export default ttsController;