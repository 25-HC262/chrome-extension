import "./MeetCapturePanel.css";
import { qsa } from "@/shared/lib/dom/query";

type MeetUser = {
  id: string;
  name: string | null;
  video: HTMLVideoElement;
  videoSize: string;
  type: string;
};

type MeetCapturePanelApi = {
  start: () => void;
  getSelectedUserIds: () => string[];
  getUserVideo: (userId: string) => HTMLVideoElement | null;
};

// 비디오 찾기
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

// 참가자 아이디 추출
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

// 참가자 이름 추출
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

const determineVideoType = (video: HTMLVideoElement): string => {
  const width = video.videoWidth || video.clientWidth;
  const height = video.videoHeight || video.clientHeight;
  const area = width * height;
  if (area > 300_000) return "메인 화면";
  if (area > 50_000) return "일반 참가자";
  return "소형 화면";
};

// Meet DOM에서 참가자 비디오 요소를 찾습니다.
// 선택 UI 렌더링을 위해 목록 형태로 정규화합니다.
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

function ensurePanelRoot(): HTMLElement {
  const existing = document.getElementById("meet-capture-panel");
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.id = "meet-capture-panel";
  panel.className = "meet-capture-panel";
  panel.style.left = "unset";
  panel.style.right = "20px";
  panel.style.top = "20px";
  panel.style.position = "fixed";

  document.body.appendChild(panel);
  return panel;
}

function createPanelDom(root: HTMLElement) {
  const title = document.createElement("h3");
  title.textContent = "사용자별 화면 캡처";
  title.className = "meet-capture-title";

  const minimizeBtn = document.createElement("button");
  minimizeBtn.textContent = "−";
  minimizeBtn.title = "최소화";
  minimizeBtn.className = "meet-capture-minimize";
  title.appendChild(minimizeBtn);

  const panelContent = document.createElement("div");
  panelContent.className = "meet-capture-panel-content";

  const userListContainer = document.createElement("div");
  userListContainer.className = "user-list-container";
  userListContainer.innerHTML = `
    <div class="user-list-title">참가자 목록:</div>
    <div id="user-list" class="user-list">
      <div class="user-list-loading">참가자를 감지하는 중...</div>
    </div>
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
  refreshBtn.className = "refresh";
  refreshBtn.textContent = "새로고침";

  const status = document.createElement("div");
  status.id = "capture-status";
  status.className = "status-idle";
  status.textContent = "대기 중";

  controls.appendChild(startBtn);
  controls.appendChild(stopBtn);
  controls.appendChild(refreshBtn);

  panelContent.appendChild(userListContainer);
  panelContent.appendChild(controls);
  panelContent.appendChild(status);

  root.appendChild(title);
  root.appendChild(panelContent);

  return {
    title,
    minimizeBtn,
    panelContent,
    startBtn,
    stopBtn,
    refreshBtn,
    status,
  };
}

// 사용자 선택이 가능한 캡처 패널을 생성합니다.
// 주기적으로 참가자 목록을 갱신합니다.
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
  } = createPanelDom(root);

  const selected = new Set<string>();
  let latestUsersById = new Map<string, MeetUser>();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  let minimized = false;
  minimizeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    minimized = !minimized;
    panelContent.style.display = minimized ? "none" : "";
    minimizeBtn.textContent = minimized ? "+" : "−";
  });

  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  title.style.cursor = "move";
  title.addEventListener("mousedown", (e) => {
    isDragging = true;
    const rect = root.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    document.body.style.userSelect = "none";
  });
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const rect = root.getBoundingClientRect();
    const newLeft = Math.max(
      0,
      Math.min(e.clientX - dragOffsetX, window.innerWidth - rect.width),
    );
    const newTop = Math.max(
      0,
      Math.min(e.clientY - dragOffsetY, window.innerHeight - rect.height),
    );
    root.style.left = `${newLeft}px`;
    root.style.top = `${newTop}px`;
    root.style.right = "unset";
  });
  document.addEventListener("mouseup", () => {
    isDragging = false;
    document.body.style.userSelect = "";
  });

  const updateStatus = (message: string, capturing: boolean) => {
    status.textContent = message;
    status.classList.remove("status-capturing", "status-idle");
    status.classList.add(capturing ? "status-capturing" : "status-idle");
  };

  const renderUserList = (users: MeetUser[]) => {
    latestUsersById = new Map(users.map((u) => [u.id, u]));
    const userListEl = document.getElementById("user-list");
    if (!userListEl) return;

    if (users.length === 0) {
      userListEl.innerHTML = `
        <div class="user-list-loading">
          참가자를 찾을 수 없습니다.<br>
          <small>비디오가 켜져 있는 참가자만 표시됩니다.</small>
        </div>
      `;
      return;
    }

    userListEl.innerHTML = "";
    users.forEach((user, idx) => {
      const userItem = document.createElement("div");
      userItem.className = "user-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `user-${user.id}`;
      checkbox.value = user.id;
      checkbox.checked = selected.has(user.id);
      checkbox.style.marginRight = "10px";

      const label = document.createElement("label");
      label.htmlFor = `user-${idx}`;
      label.className = "user-label";

      const userInfo = document.createElement("div");
      userInfo.className = "user-info";
      userInfo.innerHTML = `
        <div>${user.name || `참가자 ${idx + 1}`}</div>
        <div class="user-info-details">${user.videoSize} • ${user.type}</div>
      `;

      label.appendChild(userInfo);
      userItem.appendChild(checkbox);
      userItem.appendChild(label);

      const toggle = (checked: boolean) => {
        if (checked) selected.add(user.id);
        else selected.delete(user.id);
      };

      userItem.addEventListener("click", (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          toggle(checkbox.checked);
        }
      });
      checkbox.addEventListener("change", (e) =>
        toggle((e.target as HTMLInputElement).checked),
      );

      userListEl.appendChild(userItem);
    });
  };

  const updateUserList = () => renderUserList(detectUsers());

  let isCapturing = false;
  let captureTimer: number | null = null;
  let captureCount = 0;

  const startCapture = () => {
    if (selected.size === 0) {
      alert("캡처할 사용자를 선택해주세요.");
      return;
    }
    isCapturing = true;
    captureCount = 0;
    startBtn.disabled = true;
    stopBtn.disabled = false;

    // TODO: 여기에 연결 시작 로직 연결
  };

  const stopCapture = () => {
    isCapturing = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;

    if (captureTimer != null) {
      clearInterval(captureTimer);
      captureTimer = null;
    }
    updateStatus(`캡처 중지됨 (총 ${captureCount}회 캡처)`, false);
  };

  startBtn.addEventListener("click", startCapture);
  stopBtn.addEventListener("click", stopCapture);
  refreshBtn.addEventListener("click", () => {
    updateUserList();
    updateStatus("사용자 목록을 새로고침했습니다.", isCapturing);
  });

  const start = () => {
    updateUserList();
    window.setInterval(updateUserList, 3000);
  };

  const getSelectedUserIds = () => Array.from(selected);
  const getUserVideo = (userId: string) =>
    latestUsersById.get(userId)?.video ?? null;

  return { start, getSelectedUserIds, getUserVideo };
}
