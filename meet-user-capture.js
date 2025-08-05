// Meet User Capture Extension
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
    // Inject CSS styles
    this.injectStyles();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupExtension();
      });
    } else {
      this.setupExtension();
    }
  }

  // Inject CSS styles into the page
  injectStyles() {
    const existingStyle = document.getElementById('meet-capture-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    const link = document.createElement('link');
    link.id = 'meet-capture-styles';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'styles.css'; // You can also inline the CSS here if needed
    document.head.appendChild(link);
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

    // Title
    const title = document.createElement('h3');
    title.textContent = '사용자별 화면 캡처';

    // User list container
    const userListContainer = document.createElement('div');
    userListContainer.innerHTML = `
      <div class="user-list-header">
        참가자 목록:
      </div>
      <div id="user-list">
        <div class="user-list-empty">
          참가자를 감지하는 중...
        </div>
      </div>
    `;

    // Control buttons
    const controls = document.createElement('div');
    controls.className = 'controls';
    
    const startBtn = document.createElement('button');
    startBtn.id = 'start-capture-btn';
    startBtn.className = 'btn btn-primary';
    startBtn.textContent = '캡처 시작';

    const stopBtn = document.createElement('button');
    stopBtn.id = 'stop-capture-btn';
    stopBtn.className = 'btn btn-danger';
    stopBtn.textContent = '캡처 중지';
    stopBtn.style.opacity = '0.5';
    stopBtn.disabled = true;

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'btn btn-success';
    refreshBtn.textContent = '새로고침';

    // Status display
    const status = document.createElement('div');
    status.id = 'capture-status';
    status.className = 'status-waiting';
    status.textContent = '대기 중';

    // Event listeners
    startBtn.addEventListener('click', () => this.startCapture());
    stopBtn.addEventListener('click', () => this.stopCapture());
    refreshBtn.addEventListener('click', () => this.refreshUserList());

    // Assemble panel
    controls.appendChild(startBtn);
    controls.appendChild(stopBtn);
    controls.appendChild(refreshBtn);
    
    panel.appendChild(title);
    panel.appendChild(userListContainer);
    panel.appendChild(controls);
    panel.appendChild(status);

    document.body.appendChild(panel);
  }

  setupCanvas() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  startUserDetection() {
    // Periodically update user list
    this.userDetectionInterval = setInterval(() => {
      this.updateUserList();
    }, 3000);
    
    // Initial update
    setTimeout(() => this.updateUserList(), 1000);
  }

  updateUserList() {
    const users = this.detectUsers();
    const userListEl = document.getElementById('user-list');
    
    if (!userListEl) return;

    if (users.length === 0) {
      userListEl.innerHTML = `
        <div class="user-list-empty">
          참가자를 찾을 수 없습니다.<br>
          <small>비디오가 켜져 있는 참가자만 표시됩니다.</small>
        </div>
      `;
      return;
    }

    userListEl.innerHTML = '';
    
    users.forEach((user, index) => {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `user-${user.id}`;
      checkbox.value = user.id;
      checkbox.checked = this.selectedUsers.has(user.id);

      const label = document.createElement('label');
      label.htmlFor = `user-${index}`;

      // User information display
      const userInfo = document.createElement('div');
      userInfo.className = 'user-info';
      userInfo.innerHTML = `
        <div class="user-name">
          ${user.name || `참가자 ${index + 1}`}
        </div>
        <div class="user-details">
          ${user.videoSize} • ${user.type}
        </div>
      `;

      // Preview thumbnail
      const thumbnail = document.createElement('div');
      thumbnail.className = 'user-thumbnail';
      thumbnail.textContent = '📹';

      label.appendChild(userInfo);
      label.appendChild(thumbnail);
      userItem.appendChild(checkbox);
      userItem.appendChild(label);

      // Event listeners
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
    
    // Try to extract ID from video element itself
    const videoId = video.getAttribute('data-participant-id') || 
                   video.id || 
                   video.className;
    
    return videoId || `user_${index}_${Date.now()}`;
  }

  extractUserName(container, video) {
    if (!container) return null;
    
    // Try to extract user name in various ways
    const nameSelectors = [
      '[data-self-name]',
      '[aria-label*="님"]',
      '.zWGUib', // Meet name display class (may change)
      '.VfPpkd-Bz112c', // Another name class
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

      // Start capturing videos of selected users
      this.captureInterval = setInterval(() => {
        this.captureSelectedUsers();
      }, 3000); // Capture every 3 seconds

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
      
      // Toggle CSS classes for status
      if (this.isCapturing) {
        statusEl.className = 'status-capturing';
      } else {
        statusEl.className = 'status-waiting';
      }
    }
  }
}

// Extension initialization
try {
  new MeetUserCapture();
} catch (error) {
  console.error('Extension initialization error:', error);
}