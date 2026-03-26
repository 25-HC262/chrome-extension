import "./MeetCapturePanel.css";
import { qsa } from "@/shared/lib/dom/query";

export type MeetUser = {
  id: string;
  name: string | null;
  video: HTMLVideoElement;
  videoSize: string;
  type: string;
};

export type MeetCapturePanelApi = {
  start: () => void;
  getSelectedUserIds: () => string[];
  getUserVideo: (userId: string) => HTMLVideoElement | null;
  onStart?: (selectedIds: string[]) => void;
  onStop?: () => void;
  onScriptToggle?: (enabled: boolean) => void;
};

/**
 * 비디오 엘리먼트 탐색 함수
 */
const findAllVideoElements = (): HTMLVideoElement[] => {
  const selectors = [
    "video[autoplay]",
    'video[src*="blob:"]',
    "[data-allocation-index] video",
    "div[data-participant-id] video",
    'video:not([src=""])',
    "[jsname] video",
  ];

  const videos = selectors.flatMap((selector) =>
    qsa<HTMLVideoElement>(selector),
  );

  return videos.filter((video, idx, self) => {
    const unique = self.indexOf(video) === idx;
    const ready = video.readyState >= 2;
    const hasSize =
      (video.videoWidth > 0 || video.clientWidth > 0) &&
      (video.videoHeight > 0 || video.clientHeight > 0);
    return unique && ready && hasSize;
  });
};

/**
 * 참가자 ID 추출 함수
 */
const extractParticipantId = (
  container: Element | null,
  video: HTMLVideoElement,
  index: number,
): string => {
  if (container) {
    const dataId =
      container.getAttribute("data-participant-id") ||
      container.getAttribute("data-allocation-index") ||
      container.getAttribute("jsname");
    if (dataId) return dataId;
  }

  const videoId =
    video.getAttribute("data-participant-id") ||
    video.id ||
    (typeof video.className === "string" ? video.className : "");
  return videoId || `user_${index}`;
};

/**
 * 참가자 이름 추출 함수
 */
const extractUserName = (container: Element | null): string | null => {
  if (!container) return null;

  const nameSelectors = [
    "[data-self-name]",
    '[aria-label*="님"]',
    ".zWGUib",
    ".VfPpkd-Bz112c",
    'div[role="button"][aria-label]',
  ];
  for (const selector of nameSelectors) {
    const el = container.querySelector(selector) as HTMLElement | null;
    if (!el) continue;
    const name = el.textContent || el.getAttribute("aria-label");
    if (name && name.trim()) return name.replace(/님$/, "").trim();
  }
  return null;
};

/**
 * 비디오 타입 판별 함수
 */
const determineVideoType = (video: HTMLVideoElement): string => {
  const width = video.videoWidth || video.clientWidth;
  const height = video.videoHeight || video.clientHeight;
  const area = width * height;
  if (area > 300_000) return "메인 화면";
  if (area > 50_000) return "일반 참가자";
  return "소형 화면";
};

/**
 * 참가자 감지 로직
 */
function detectUsers(): MeetUser[] {
  const users: MeetUser[] = [];
  const videoElements = findAllVideoElements();

  videoElements.forEach((video, index) => {
    const container = video.closest(
      "[data-participant-id], [data-allocation-index], [jsname]",
    );
    const id = extractParticipantId(container, video, index);
    const name = extractUserName(container);
    const videoSize = `${video.videoWidth || video.clientWidth}x${video.videoHeight || video.clientHeight}`;
    const type = determineVideoType(video);
    users.push({ id, name, video, videoSize, type });
  });

  return users;
}

/**
 * 패널 루트 생성 및 DOM 구성
 */
function ensurePanelRoot(): HTMLElement {
  const existing = document.getElementById("meet-capture-panel");
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.id = "meet-capture-panel";
  panel.className = "meet-capture-panel";
  panel.style.cssText = `
    position: fixed; right: 20px; top: 20px; z-index: 10001;
    background: white; border: 1px solid #ccc; border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); width: 320px;
  `;

  document.body.appendChild(panel);
  return panel;
}

function createPanelDom(root: HTMLElement) {
  // 제목 및 드래그 핸들
  const title = document.createElement("h3");
  title.textContent = "사용자별 화면 캡처";
  title.className = "meet-capture-title";
  title.style.cursor = "move";

  const minimizeBtn = document.createElement("button");
  minimizeBtn.textContent = "−";
  minimizeBtn.className = "meet-capture-minimize";
  title.appendChild(minimizeBtn);

  const panelContent = document.createElement("div");
  panelContent.className = "meet-capture-panel-content";

  const scriptToggleContainer = document.createElement("div");
  scriptToggleContainer.style.padding = "10px 15px";
  scriptToggleContainer.style.borderBottom = "1px solid #eee";
  scriptToggleContainer.innerHTML = `
    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;">
      <input type="checkbox" id="script-visible-checkbox" checked>
      자막 스크립트 표시
    </label>
  `;

  const userListContainer = document.createElement("div");
  userListContainer.className = "user-list-container";
  userListContainer.innerHTML = `
    <div class="user-list-title">참가자 목록:</div>
    <div id="user-list" class="user-list"></div>
  `;

  const controls = document.createElement("div");
  controls.className = "controls";

  const startBtn = document.createElement("button");
  startBtn.id = "start-capture-btn";
  startBtn.textContent = "캡처 시작";

  const stopBtn = document.createElement("button");
  stopBtn.id = "stop-capture-btn";
  stopBtn.textContent = "캡처 중지";
  stopBtn.disabled = true;

  const refreshBtn = document.createElement("button");
  refreshBtn.textContent = "새로고침";

  const status = document.createElement("div");
  status.id = "capture-status";
  status.className = "status-idle";
  status.textContent = "대기 중";

  controls.append(startBtn, stopBtn, refreshBtn);
  panelContent.append(
    scriptToggleContainer,
    userListContainer,
    controls,
    status,
  );
  root.append(title, panelContent);

  return {
    title,
    minimizeBtn,
    panelContent,
    startBtn,
    stopBtn,
    refreshBtn,
    status,
    scriptCheckbox: scriptToggleContainer.querySelector(
      "#script-visible-checkbox",
    ) as HTMLInputElement,
  };
}

/**
 * 메인 패널 생성 함수
 */
export function createMeetCapturePanel(): MeetCapturePanelApi {
  const root = ensurePanelRoot();
  const {
    title,
    minimizeBtn,
    panelContent,
    startBtn,
    stopBtn,
    refreshBtn,
    status,
    scriptCheckbox,
  } = createPanelDom(root);

  const selected = new Set<string>();
  let latestUsersById = new Map<string, MeetUser>();
  let isCapturing = false;

  // API 객체 정의
  const api: MeetCapturePanelApi = {
    start: () => {
      const update = () => renderUserList(detectUsers());
      update();
      window.setInterval(update, 3000);
    },
    getSelectedUserIds: () => Array.from(selected),
    getUserVideo: (userId: string) =>
      latestUsersById.get(userId)?.video ?? null,
  };

  // const updateStatus = (message: string, capturing: boolean) => {
  //   status.textContent = message;
  //   status.className = capturing ? "status-capturing" : "status-idle";
  // };

  // 스크립트 토글 이벤트
  scriptCheckbox.addEventListener("change", (e) => {
    const isChecked = (e.target as HTMLInputElement).checked;
    api.onScriptToggle?.(isChecked);
  });

  const updateStatus = (message: string, capturing: boolean) => {
    status.textContent = message;
    status.className = capturing ? "status-capturing" : "status-idle";
    status.style.background = capturing ? "#e8f5e9" : "#f1f3f4";
  };

  const renderUserList = (users: MeetUser[]) => {
    latestUsersById = new Map(users.map((u) => [u.id, u]));
    const userListEl = document.getElementById("user-list");
    if (!userListEl) return;

    if (users.length === 0) {
      userListEl.innerHTML = `<div class="user-list-loading">참가자를 감지하는 중...</div>`;
      return;
    }

    userListEl.innerHTML = "";
    users.forEach((user, idx) => {
      const userItem = document.createElement("div");
      userItem.className = "user-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `user-${user.id}`;
      checkbox.checked = selected.has(user.id);
      if (isCapturing) checkbox.disabled = true;

      const toggle = (checked: boolean) => {
        if (checked) selected.add(user.id);
        else selected.delete(user.id);
      };

      checkbox.addEventListener("change", (e) =>
        toggle((e.target as HTMLInputElement).checked),
      );

      const label = document.createElement("label");
      label.htmlFor = `user-${user.id}`;
      label.className = "user-label";
      label.innerHTML = `
        <div class="user-info">
          <div>${user.name || `참가자 ${idx + 1}`}</div>
          <div class="user-info-details">${user.videoSize} • ${user.type}</div>
        </div>
      `;

      userItem.append(checkbox, label);
      userListEl.appendChild(userItem);
    });
  };

  // 버튼 이벤트 바인딩
  startBtn.addEventListener("click", () => {
    if (selected.size === 0) return alert("사용자를 선택해주세요.");
    isCapturing = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    updateStatus(`${selected.size}명 캡처 중...`, true);
    if (api.onStart) api.onStart(Array.from(selected));
    renderUserList(detectUsers());
  });

  stopBtn.addEventListener("click", () => {
    isCapturing = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    updateStatus("대기 중", false);
    if (api.onStop) api.onStop();
    renderUserList(detectUsers());
  });

  refreshBtn.addEventListener("click", () => renderUserList(detectUsers()));

  // 최소화/최대화
  minimizeBtn.addEventListener("click", () => {
    const isMinimized = panelContent.style.display === "none";
    panelContent.style.display = isMinimized ? "block" : "none";
    minimizeBtn.textContent = isMinimized ? "−" : "+";
  });

  // 드래그 로직
  let isDragging = false;
  let offsetX = 0,
    offsetY = 0;
  title.onmousedown = (e) => {
    isDragging = true;
    offsetX = e.clientX - root.getBoundingClientRect().left;
    offsetY = e.clientY - root.getBoundingClientRect().top;
    document.onmousemove = (ev) => {
      if (!isDragging) return;
      root.style.left = `${ev.clientX - offsetX}px`;
      root.style.top = `${ev.clientY - offsetY}px`;
      root.style.right = "unset";
    };
    document.onmouseup = () => (isDragging = false);
  };

  return api;
}
