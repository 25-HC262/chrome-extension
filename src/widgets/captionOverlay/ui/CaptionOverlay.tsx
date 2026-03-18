import './CaptionOverlay.css'

type CaptionOverlayApi = {
  setText: (text: string) => void
  appendScriptLine: (text: string) => void
}

function ensureCaptionEl(): HTMLElement {
  const existing = document.getElementById('sign-caption')
  if (existing) return existing

  const el = document.createElement('div')
  el.id = 'sign-caption'
  el.textContent = ''
  document.body.appendChild(el)
  return el
}

function ensureScriptBoxEl(): HTMLElement {
  const existing = document.getElementById('caption-script')
  if (existing) return existing

  const el = document.createElement('div')
  el.id = 'caption-script'
  el.textContent = ''
  document.body.appendChild(el)
  return el
}

// 화면 하단에 캡션 오버레이와 기록 박스를 생성합니다.
// 캡션 텍스트를 갱신할 수 있는 API를 반환합니다.
export function createCaptionOverlay(): CaptionOverlayApi {
  const captionEl = ensureCaptionEl()
  const scriptBoxEl = ensureScriptBoxEl()
  const script: string[] = []

  const setText = (text: string) => {
    captionEl.textContent = text
  }

  const appendScriptLine = (text: string) => {
    script.push(text)
    scriptBoxEl.innerHTML = script.map((line) => `<div>${line}</div>`).join('')
  }

  return { setText, appendScriptLine }
}

