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
  const videos = Array.from(
    document.querySelectorAll<HTMLVideoElement>("[data-participant-id] video"),
  );

  return videos.filter((video) => {
    const ready = video.readyState >= 2;
    const hasSize =
      (video.videoWidth > 0 || video.clientWidth > 0) &&
      (video.videoHeight > 0 || video.clientHeight > 0);

    return ready && hasSize;
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
    const id = container.getAttribute("data-participant-id");
    if (id) return id;
  }

  // fallback
  if (video.src && video.src.startsWith("blob:")) {
    return video.src.split("/").pop() || `stream_${index}`;
  }

  return `v_${index}`;
};

// 이름 뒤의 '님'이나 '(나)' 등 제거
function cleanName(name: string): string {
  let n = name
    .replace(/님$/, "")
    .replace(/\(나\)$/, "")
    .replace(/\(Presentation\)$/i, "")
    .replace(/\(발표\)$/, "")
    .trim();

  // duplicate name fix
  const half = Math.floor(n.length / 2);
  if (n.slice(0, half) === n.slice(half)) {
    n = n.slice(0, half);
  }

  return n;
}

function isValidName(text: string | null): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.length < 2 || t.length > 30) return false;
  if (/^\d+$/.test(t)) return false;
  if (t.includes(":") || t.includes("http")) return false;
  const wordCount = t.split(/\s+/).filter((word) => word.length > 0).length;
  if (wordCount > 2) return false;
  return true;
}

/**
 * 참가자 이름 추출 함수
 */
const extractUserName = (video: HTMLVideoElement): string | null => {
  const container = video.closest("[data-participant-id]");
  if (!container) return null;

  // 가장 정확한 selector
  const nameEl =
    container.querySelector("span.notranslate") ||
    container.querySelector('[role="heading"]') ||
    container.querySelector(".zWGUib");

  if (!nameEl) return null;

  const text = nameEl.textContent?.trim();
  if (!text) return null;

  return cleanName(text);
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
  const seen = new Set<string>();

  const videos = findAllVideoElements();

  videos.forEach((video, index) => {
    const container = video.closest("[data-participant-id]");
    const id = extractParticipantId(container, video, index);

    if (seen.has(id)) return;
    seen.add(id);

    const name = extractUserName(video);

    const videoSize = `${video.videoWidth || video.clientWidth}x${video.videoHeight || video.clientHeight}`;
    const type = determineVideoType(video);

    users.push({
      id,
      name,
      video,
      videoSize,
      type,
    });
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

  // const refreshBtn = document.createElement("button");
  // refreshBtn.textContent = "새로고침";

  const status = document.createElement("div");
  status.id = "capture-status";
  status.className = "status-idle";
  status.textContent = "대기 중";

  // controls.append(startBtn, stopBtn, refreshBtn);
  controls.append(startBtn, stopBtn);
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
    // refreshBtn,
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
    // refreshBtn,
    status,
    scriptCheckbox,
  } = createPanelDom(root);

  const selected = new Set<string>();
  const nameMap = new Map<string, string>();
  let latestUsersById = new Map<string, MeetUser>();
  let isCapturing = false;

  // API 객체 정의
  const api: MeetCapturePanelApi = {
    start: () => {
      const update = () => {
        const detectedUsers = detectUsers();

        detectedUsers.forEach((user) => {
          const cachedName = nameMap.get(user.id);

          if (user.name && user.name.length >= 2) {
            nameMap.set(user.id, user.name);
          } else if (!cachedName && user.name) {
            nameMap.set(user.id, user.name);
          }

          user.name = nameMap.get(user.id) || user.name;
        });

        renderUserList(detectedUsers);
      };
      update();
      window.setInterval(update, 3000);
    },
    getSelectedUserIds: () => Array.from(selected),
    getUserVideo: (userId: string) =>
      latestUsersById.get(userId)?.video ?? null,
  };

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
      const htmlId = `capture-chk-${user.id.replace(/[^a-zA-Z0-9]/g, "_")}`;
      checkbox.id = htmlId;
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
      label.htmlFor = htmlId;
      label.className = "user-label";

      const displayName = user.name || `알 수 없는 참가자 (${idx + 1})`;

      label.innerHTML = `
      <div class="user-info">
        <div class="user-name">${displayName}</div>
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
    updateStatus(`캡처 중...`, true);
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

  // refreshBtn.addEventListener("click", () => renderUserList(detectUsers()));

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
