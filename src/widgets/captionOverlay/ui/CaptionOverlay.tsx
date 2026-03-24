import "./CaptionOverlay.css";

type CaptionOverlayApi = {
  setText: (text: string) => void;
  appendScriptLine: (text: string) => void;
};

function ensureCaptionEl(): HTMLElement {
  const existing = document.getElementById("sign-caption");
  if (existing) return existing;

  const el = document.createElement("div");
  el.id = "sign-caption";
  el.textContent = "";
  document.body.appendChild(el);
  return el;
}

function ensureScriptBoxEl(): HTMLElement {
  const existing = document.getElementById("caption-script");
  if (existing) return existing;

  const el = document.createElement("div");
  el.id = "caption-script";
  el.textContent = "";
  document.body.appendChild(el);
  return el;
}

// 화면 하단에 캡션 오버레이와 기록 박스를 생성
export function createCaptionOverlay(): CaptionOverlayApi {
  const captionEl = ensureCaptionEl();
  const scriptBoxEl = ensureScriptBoxEl();
  const script: string[] = [];

  let lastSpokenText = "";
  let clearTimer: number | null = null;

  const setText = (text: string) => {
    captionEl.textContent = text;

    if (clearTimer) {
      clearTimeout(clearTimer);
      clearTimer = null;
    }

    if (text && text.trim() !== "" && text !== lastSpokenText) {
      lastSpokenText = text;
      appendScriptLine(text);
      chrome.runtime.sendMessage(
        {
          action: "readCaption",
          captionText: text,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "TTS 메시지 전송 실패 (확장 프로그램 컨텍스트 확인 필요):",
              chrome.runtime.lastError.message,
            );
          }
        },
      );
    }

    // 3초 이후 자막 삭제 
    clearTimer = window.setTimeout(() => {
      captionEl.textContent = "";
      clearTimer = null;
    }, 3000);
  };

  const appendScriptLine = (text: string) => {
    script.push(text);
    scriptBoxEl.innerHTML = script.map((line) => `<div>${line}</div>`).join("");
    scriptBoxEl.scrollTop = scriptBoxEl.scrollHeight;
  };

  return { setText, appendScriptLine };
}
