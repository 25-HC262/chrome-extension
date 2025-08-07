// Capturing user video 

class MeetUserCapture {
  constructor() {
    this.isCapturing = false;
    this.captureInterval = null;
    this.canvas = null; // convert video into image
    this.ctx = null; // canvas's 2D context
    this.selectedUsers = new Set(); // save selected user id 
    this.userVideos = new Map(); // mapping user and video 
    this.captureCount = 0;
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupExtension();
      });
    } else {
      this.setupExtension();
    }
  }

  // Setting extension program 
  setupExtension() {
    this.createControlPanel(); 
    this.setupCanvas(); 
    this.startUserDetection();
    console.log('Meet User Capture Extension initialized');
  }

  // Create control panel UI 
  createControlPanel() {
    const existingPanel = document.getElementById('meet-capture-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    // Generate main panel
    const panel = document.createElement('div');
    panel.id = 'meet-capture-panel';
    panel.classList.add('meet-capture-panel');
    panel.style.left = 'unset';
    panel.style.right = '20px';
    panel.style.top = '20px';
    panel.style.position = 'fixed';

    // Title
    const title = document.createElement('h3');
    title.textContent = '사용자별 화면 캡처';
    title.classList.add('meet-capture-title');
    title.style.cursor = 'move';
    title.style.display = 'flex';
    title.style.alignItems = 'center';
    title.style.justifyContent = 'space-between';

    // Minimize button
    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '−';
    minimizeBtn.title = '최소화';
    minimizeBtn.style.marginLeft = 'auto';
    minimizeBtn.style.background = 'none';
    minimizeBtn.style.border = 'none';
    minimizeBtn.style.fontSize = '18px';
    minimizeBtn.style.cursor = 'pointer';
    minimizeBtn.style.color = '#1a73e8';
    minimizeBtn.style.padding = '0 6px';
    minimizeBtn.style.lineHeight = '1';

    // Panel content wrapper
    const panelContent = document.createElement('div');
    panelContent.classList.add('meet-capture-panel-content');

    // User list 
    const userListContainer = document.createElement('div');
    userListContainer.classList.add('user-list-container');
    userListContainer.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: 500; color: #333;">
        참가자 목록:
      </div>
      <div id="user-list" class="user-list">
        <div class="user-list-loading">
          참가자를 감지하는 중...
        </div>
      </div>
    `;

    // Action buttons
    const controls = document.createElement('div');
    controls.classList.add('controls');
    
    const startBtn = document.createElement('button');
    startBtn.id = 'start-capture-btn';
    startBtn.textContent = '캡처 시작';

    const stopBtn = document.createElement('button');
    stopBtn.id = 'stop-capture-btn';
    stopBtn.textContent = '캡처 중지';
    stopBtn.disabled = true;

    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '새로고침';
    refreshBtn.classList.add('refresh');

    // Program status
    const status = document.createElement('div');
    status.id = 'capture-status';
    status.classList.add('status-idle');
    status.textContent = '대기 중';

    // Event listener
    startBtn.addEventListener('click', () => this.startCapture());
    stopBtn.addEventListener('click', () => this.stopCapture());
    refreshBtn.addEventListener('click', () => this.refreshUserList());

    // Append buttons to controls
    controls.appendChild(startBtn);
    controls.appendChild(stopBtn);
    controls.appendChild(refreshBtn);

    // Move userListContainer, controls, status into panelContent
    panelContent.appendChild(userListContainer);
    panelContent.appendChild(controls);
    panelContent.appendChild(status);

    // Minimize logic
    let minimized = false;
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      minimized = !minimized;
      panelContent.style.display = minimized ? 'none' : '';
      minimizeBtn.textContent = minimized ? '+' : '−';
    });

    title.appendChild(minimizeBtn);

    // Drag logic
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    title.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const panelRect = panel.getBoundingClientRect();
      const panelWidth = panelRect.width;
      const panelHeight = panelRect.height;
      let newLeft = e.clientX - dragOffsetX;
      let newTop = e.clientY - dragOffsetY;
      // Clamp to window
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - panelWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - panelHeight));
      panel.style.left = newLeft + 'px';
      panel.style.top = newTop + 'px';
      panel.style.right = 'unset';
    });
    document.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.userSelect = '';
    });

    // Assemble panel
    panel.appendChild(title);
    panel.appendChild(panelContent);

    document.body.appendChild(panel);
  }

  setupCanvas() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  startUserDetection() {
    this.userDetectionInterval = setInterval(() => {
      this.updateUserList();
    }, 3000);
    
    setTimeout(() => this.updateUserList(), 1000);
  }

  updateUserList() {
    const users = this.detectUsers();
    const userListEl = document.getElementById('user-list');
    
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

    userListEl.innerHTML = '';
    
    users.forEach((user, index) => {
      const userItem = document.createElement('div');
      userItem.classList.add('user-item');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `user-${user.id}`;
      checkbox.value = user.id;
      checkbox.checked = this.selectedUsers.has(user.id);
      checkbox.style.marginRight = '10px';

      const label = document.createElement('label');
      label.htmlFor = `user-${index}`;
      label.classList.add('user-label');

      // Display user information
      const userInfo = document.createElement('div');
      userInfo.classList.add('user-info');
      userInfo.innerHTML = `
        <div>${user.name || `참가자 ${index + 1}`}</div>
        <div class="user-info-details">${user.videoSize} • ${user.type}</div>
      `;

      label.appendChild(userInfo);
      userItem.appendChild(checkbox);
      userItem.appendChild(label);

      // Event listener
      userItem.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          this.toggleUserSelection(user.id, checkbox.checked);
        }
        
      });
      
      checkbox.addEventListener('change', (e) => {
        console.log('checkbox changed:', user.id, e.target.checked);
        this.toggleUserSelection(user.id, e.target.checked);
      });

      userListEl.appendChild(userItem);
    });
  }

  detectUsers() {
    const users = [];
    const videoElements = this.findAllVideoElements();
    
    videoElements.forEach((video, index) => {
      const container = video.closest('[data-participant-id], [data-allocation-index], [jsname]');
      const participantId = this.extractParticipantId(container, video, index);
      const name = this.extractUserName(container, video);
      const videoSize = `${video.videoWidth || video.clientWidth}x${video.videoHeight || video.clientHeight}`;
      const type = this.determineVideoType(video, container);

      const user = {
        id: participantId,
        name: name,
        video: video,
        container: container,
        videoSize: videoSize,
        type: type,
        index: index
      };

      users.push(user);
      this.userVideos.set(participantId, user);
    });

    return users;
  }

  findAllVideoElements() {
    const selectors = [
      'video[autoplay]',
      'video[src*="blob:"]',
      '[data-allocation-index] video',
      'div[data-participant-id] video',
      'video:not([src=""])',
      '[jsname] video'
    ];

    let videos = [];
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        videos = [...videos, ...Array.from(elements)];
      } catch (error) {
        console.warn('Selector error:', selector, error);
      }
    }

    return videos.filter((video, index, self) => {
      return self.indexOf(video) === index && 
             video.readyState >= 2 && 
             (video.videoWidth > 0 || video.clientWidth > 0) &&
             video.videoHeight > 0;
    });
  }

  extractParticipantId(container, video, index) {
    if (container) {
      const dataId = container.getAttribute('data-participant-id') ||
                    container.getAttribute('data-allocation-index') ||
                    container.getAttribute('jsname');
      if (dataId) return dataId;
    }
    
    // Try to extract ID from video element
    const videoId = video.getAttribute('data-participant-id') || 
                   video.id || 
                   video.className;
    
    return videoId || `user_${index}`;
  }

  extractUserName(container, video) {
    if (!container) return null;
    
    const nameSelectors = [
      '[data-self-name]',
      '[aria-label*="님"]',
      '.zWGUib', // Meet의 이름 표시 클래스 (변경될 수 있음)
      '.VfPpkd-Bz112c', // 또 다른 이름 클래스
      'div[role="button"][aria-label]'
    ];

    for (const selector of nameSelectors) {
      const nameEl = container.querySelector(selector);
      if (nameEl) {
        const name = nameEl.textContent || nameEl.getAttribute('aria-label');
        if (name && name.trim()) {
          return name.replace(/님$/, '').trim();
        }
      }
    }

    return null;
  }

  determineVideoType(video, container) {
    const width = video.videoWidth || video.clientWidth;
    const height = video.videoHeight || video.clientHeight;
    const area = width * height;

    // Determine type by screen size
    if (area > 300000) return '메인 화면';
    if (area > 50000) return '일반 참가자';
    return '소형 화면';
  }

  toggleUserSelection(userId, selected) {
    if (selected) {
      this.selectedUsers.add(userId);
    } else {
      this.selectedUsers.delete(userId);
    }
    
    console.log('Selected users:', Array.from(this.selectedUsers));
  }

  refreshUserList() {
    this.updateUserList();
    this.updateStatus('사용자 목록을 새로고침했습니다.');
  }

  async startCapture() {
    if (this.selectedUsers.size === 0) {
      alert('캡처할 사용자를 선택해주세요.');
      return;
    }

    try {
      this.isCapturing = true;
      this.captureCount = 0;
      this.updateControlButtons();
      this.updateStatus(`${this.selectedUsers.size}명의 사용자 캡처 시작...`);

      // Start capturing video of selected users
      this.captureInterval = setInterval(() => {
        this.captureSelectedUsers();
      }, 3000); // Capture every 2 seconds

      console.log('Started capturing selected users:', Array.from(this.selectedUsers));
      
    } catch (error) {
      console.error('Capture start error:', error);
      this.updateStatus(`오류: ${error.message}`);
      this.stopCapture();
    }
  }

  captureSelectedUsers() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let capturedCount = 0;

    this.selectedUsers.forEach(userId => {
      const user = this.userVideos.get(userId);
      if (user && user.video) {
        try {
          const video = user.video;
          const width = video.videoWidth || video.clientWidth;
          const height = video.videoHeight || video.clientHeight;

          if (width > 0 && height > 0) {
            this.canvas.width = width;
            this.canvas.height = height;
            this.ctx.drawImage(video, 0, 0, width, height);
            
            const dataURL = this.canvas.toDataURL('image/png', 0.8);
            this.saveUserCapture(dataURL, user.name || userId, timestamp);
            capturedCount++;
          }
        } catch (error) {
          console.error(`Error capturing user ${userId}:`, error);
        }
      }
    });

    this.captureCount++;
    this.updateStatus(`${capturedCount}명 캡처 완료 (${this.captureCount}회차)`);
  }

  saveUserCapture(dataURL, userName, timestamp) {
    const link = document.createElement('a');
    link.download = `meet-${userName}-${timestamp}.png`;
    link.href = dataURL;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  stopCapture() {
    this.isCapturing = false;
    this.updateControlButtons();
    
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    this.updateStatus(`캡처 중지됨 (총 ${this.captureCount}회 캡처)`);
    console.log('Capture stopped');
  }

  updateControlButtons() {
    const startBtn = document.getElementById('start-capture-btn');
    const stopBtn = document.getElementById('stop-capture-btn');
    if (startBtn && stopBtn) {
      startBtn.disabled = this.isCapturing;
      stopBtn.disabled = !this.isCapturing;
      startBtn.style.opacity = this.isCapturing ? '0.5' : '1';
      stopBtn.style.opacity = this.isCapturing ? '1' : '0.5';
    }
  }

  updateStatus(message) {
    const statusEl = document.getElementById('capture-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.classList.remove('status-capturing', 'status-idle');
      statusEl.classList.add(this.isCapturing ? 'status-capturing' : 'status-idle');
    }
  }
}

// 확장프로그램 초기화
if (window.location.href.includes('landing')) {
  console.log("Main page : video is not displayed");
} else {
  try {
    new MeetUserCapture();
  } catch (error) {
    console.error('Extension initialization error:', error);
  }
}