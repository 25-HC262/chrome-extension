// Capturing user video and streaming to server

class MeetUserCapture {
  constructor() {
    this.isCapturing = false;
    this.isStreaming = false;
    this.captureInterval = null;
    this.canvas = null; // convert video into image
    this.ctx = null; // canvas's 2D context
    this.selectedUsers = new Set(); // save selected user id 
    this.userVideos = new Map(); // mapping user and video 
    this.captureCount = 0;
    
    // Streaming properties
    this.streamingUsers = new Map(); // Map of userId to MediaStream
    this.peerConnections = new Map(); // Map of userId to RTCPeerConnection
    this.streamingServer = null; // WebSocket connection to streaming server
    this.streamingInterval = null;
    
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
    this.connectToStreamingServer();
    console.log('Meet User Capture Extension initialized');
  }

  // Connect to streaming server
  async connectToStreamingServer() {
    try {
      // You can change this URL to your streaming server
      // const serverUrl = 'wss://52.64.75.56:3000/';
      const serverUrl = 'wss://43.202.48.37:3000'
      this.streamingServer = new WebSocket(serverUrl);
      
      this.streamingServer.onopen = () => {
        console.log('Connected to streaming server');
        this.updateStatus('스트리밍 서버에 연결됨');
      };
      
      this.streamingServer.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleServerMessage(message);
      };
      
      this.streamingServer.onerror = (error) => {
        console.error('Streaming server error:', error);
        this.updateStatus('스트리밍 서버 연결 오류');
      };
      
      this.streamingServer.onclose = () => {
        console.log('Disconnected from streaming server');
        this.updateStatus('스트리밍 서버 연결 해제');
        // Try to reconnect after 5 seconds
        setTimeout(() => this.connectToStreamingServer(), 5000);
      };
    } catch (error) {
      console.error('Failed to connect to streaming server:', error);
      this.updateStatus('스트리밍 서버 연결 실패');
    }
  }

  // Handle messages from streaming server
  handleServerMessage(message) {
    switch (message.type) {
      case 'stream_started':
        console.log('Stream started on server for user:', message.userId);
        break;
      case 'stream_stopped':
        console.log('Stream stopped on server for user:', message.userId);
        break;
      case 'error':
        console.error('Server error:', message.error);
        this.updateStatus(`서버 오류: ${message.error}`);
        break;
      default:
        console.log('Unknown server message:', message);
    }
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
    title.textContent = '사용자별 화면 캡처 & 스트리밍';
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

    // Streaming controls
    const streamingControls = document.createElement('div');
    streamingControls.classList.add('streaming-controls');
    streamingControls.style.marginTop = '10px';
    streamingControls.style.paddingTop = '10px';
    streamingControls.style.borderTop = '1px solid #ddd';
    
    const streamingTitle = document.createElement('div');
    streamingTitle.textContent = '실시간 스트리밍:';
    streamingTitle.style.fontWeight = '500';
    streamingTitle.style.marginBottom = '8px';
    streamingTitle.style.color = '#333';
    
    const startStreamBtn = document.createElement('button');
    startStreamBtn.id = 'start-stream-btn';
    startStreamBtn.textContent = '스트리밍 시작';
    startStreamBtn.style.backgroundColor = '#34a853';
    startStreamBtn.style.color = 'white';
    startStreamBtn.style.border = 'none';
    startStreamBtn.style.padding = '8px 16px';
    startStreamBtn.style.borderRadius = '4px';
    startStreamBtn.style.cursor = 'pointer';
    startStreamBtn.style.marginRight = '8px';

    const stopStreamBtn = document.createElement('button');
    stopStreamBtn.id = 'stop-stream-btn';
    stopStreamBtn.textContent = '스트리밍 중지';
    stopStreamBtn.style.backgroundColor = '#ea4335';
    stopStreamBtn.style.color = 'white';
    stopStreamBtn.style.border = 'none';
    stopStreamBtn.style.padding = '8px 16px';
    stopStreamBtn.style.borderRadius = '4px';
    stopStreamBtn.style.cursor = 'pointer';
    stopStreamBtn.disabled = true;

    // Program status
    const status = document.createElement('div');
    status.id = 'capture-status';
    status.classList.add('status-idle');
    status.textContent = '대기 중';

    // Event listener
    startStreamBtn.addEventListener('click', () => this.startStreaming());
    stopStreamBtn.addEventListener('click', () => this.stopStreaming());

    // Append streaming controls
    streamingControls.appendChild(streamingTitle);
    streamingControls.appendChild(startStreamBtn);
    streamingControls.appendChild(stopStreamBtn);

    // Move userListContainer, controls, streamingControls, status into panelContent
    panelContent.appendChild(userListContainer);
    panelContent.appendChild(streamingControls);
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

  // Start real-time streaming of selected users
  async startStreaming() {
    if (this.selectedUsers.size === 0) {
      alert('스트리밍할 사용자를 선택해주세요.');
      return;
    }

    if (!this.streamingServer || this.streamingServer.readyState !== WebSocket.OPEN) {
      alert('스트리밍 서버에 연결되지 않았습니다.');
      return;
    }

    try {
      this.isStreaming = true;
      this.updateStreamingButtons();
      this.updateStatus(`${this.selectedUsers.size}명의 사용자 스트리밍 시작...`);

      // Start streaming each selected user
      for (const userId of this.selectedUsers) {
        await this.startUserStreaming(userId);
      }

      // Using MediaRecorder-based streaming; no periodic JPEG frame push needed

      console.log('Started streaming selected users:', Array.from(this.selectedUsers));
      
    } catch (error) {
      console.error('Streaming start error:', error);
      this.updateStatus(`스트리밍 오류: ${error.message}`);
      this.stopStreaming();
    }
  }

  // Start streaming for a specific user
  async startUserStreaming(userId) {
    const user = this.userVideos.get(userId);
    if (!user || !user.video) {
      console.error(`User ${userId} not found or no video`);
      return;
    }

    try {
      // Create canvas and drawing context
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const video = user.video;

      // Determine target resolution (scale down to save bandwidth)
      const sourceWidth = video.videoWidth || video.clientWidth;
      const sourceHeight = video.videoHeight || video.clientHeight;
      const targetMaxWidth = 640; // reduce server and network load
      const scale = Math.min(1, targetMaxWidth / (sourceWidth || 1));
      const targetWidth = Math.max(1, Math.round((sourceWidth || 1) * scale));
      const targetHeight = Math.max(1, Math.round((sourceHeight || 1) * scale));
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Create MediaStream from canvas
      const stream = canvas.captureStream(30); // 30 FPS

      // Pick supported mimeType, prefer vp9 -> vp8 -> webm
      const preferredMimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      const chosenMimeType = preferredMimeTypes.find(t => {
        try { return window.MediaRecorder && MediaRecorder.isTypeSupported(t); } catch (_) { return false; }
      }) || '';

      const videoBitsPerSecond = 800000; // ~0.8 Mbps per user
      const recorderOptions = {};
      if (chosenMimeType) recorderOptions.mimeType = chosenMimeType;
      recorderOptions.videoBitsPerSecond = videoBitsPerSecond;

      // Build per-user streaming state
      const streamData = {
        stream: stream,
        canvas: canvas,
        ctx: ctx,
        video: video,
        recorder: null,
        drawFrameId: null
      };
      this.streamingUsers.set(userId, streamData);

      // Notify server about new stream
      if (this.streamingServer && this.streamingServer.readyState === WebSocket.OPEN) {
        this.streamingServer.send(JSON.stringify({
          type: 'start_stream',
          userId: userId,
          userName: user.name || userId,
          width: canvas.width,
          height: canvas.height,
          fps: 30,
          mimeType: chosenMimeType || undefined,
          videoBitsPerSecond: videoBitsPerSecond
        }));
      }

      // Start drawing frames from <video> to canvas
      const draw = () => {
        try {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            ctx.save();
            ctx.scale(-1,1);
            ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
            ctx.restore();
          }
        } catch (e) {
          console.warn(`Draw error for user ${userId}:`, e);
        } finally {
          streamData.drawFrameId = requestAnimationFrame(draw);
        }
      };
      draw();

      // Create and start MediaRecorder
      const recorder = new MediaRecorder(stream, recorderOptions);
      streamData.recorder = recorder;

      recorder.ondataavailable = (event) => {
        if (!event.data || event.data.size === 0) return;
        if (!this.streamingServer || this.streamingServer.readyState !== WebSocket.OPEN) return;
        // Send metadata first
        this.streamingServer.send(JSON.stringify({
          type: 'video_chunk',
          userId: userId,
          timestamp: Date.now(),
          size: event.data.size,
          mimeType: recorder.mimeType || chosenMimeType || 'video/webm'
        }));
        // Then send the actual media chunk
        this.streamingServer.send(event.data);
      };

      recorder.onerror = (err) => {
        console.error(`MediaRecorder error for user ${userId}:`, err);
      };

      recorder.onstart = () => {
        console.log(`MediaRecorder started for user ${userId}`);
      };

      recorder.onstop = () => {
        console.log(`MediaRecorder stopped for user ${userId}`);
      };

      // Emit chunks every 1000ms
      recorder.start(1000);

      console.log(`Started streaming user ${userId} with MediaRecorder (${recorder.mimeType || chosenMimeType || 'video/webm'}) at ${videoBitsPerSecond}bps`);
      
    } catch (error) {
      console.error(`Error starting stream for user ${userId}:`, error);
      throw error;
    }
  }

  // (Deprecated) updateStreamingData removed in favor of MediaRecorder chunk streaming

  // Stop streaming
  stopStreaming() {
    this.isStreaming = false;
    this.updateStreamingButtons();
    
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = null;
    }

    // Stop streaming for each user
    this.streamingUsers.forEach((streamData, userId) => {
      this.stopUserStreaming(userId);
    });

    this.streamingUsers.clear();
    this.updateStatus('스트리밍 중지됨');
    console.log('Streaming stopped');
  }

  // Stop streaming for a specific user
  stopUserStreaming(userId) {
    const streamData = this.streamingUsers.get(userId);
    if (streamData) {
      // Stop draw loop
      if (streamData.drawFrameId) {
        cancelAnimationFrame(streamData.drawFrameId);
        streamData.drawFrameId = null;
      }

      // Stop recorder
      if (streamData.recorder && streamData.recorder.state !== 'inactive') {
        try { streamData.recorder.stop(); } catch (_) {}
      }

      // Stop all tracks in the stream
      if (streamData.stream) {
        streamData.stream.getTracks().forEach(track => track.stop());
      }
      
      // Notify server about stream stop
      if (this.streamingServer && this.streamingServer.readyState === WebSocket.OPEN) {
        this.streamingServer.send(JSON.stringify({
          type: 'stop_stream',
          userId: userId
        }));
      }
      
      this.streamingUsers.delete(userId);
      console.log(`Stopped streaming user ${userId}`);
    }
  }

  // Update streaming control buttons
  updateStreamingButtons() {
    const startStreamBtn = document.getElementById('start-stream-btn');
    const stopStreamBtn = document.getElementById('stop-stream-btn');
    
    if (startStreamBtn && stopStreamBtn) {
      startStreamBtn.disabled = this.isStreaming;
      stopStreamBtn.disabled = !this.isStreaming;
      
      startStreamBtn.style.opacity = this.isStreaming ? '0.5' : '1';
      stopStreamBtn.style.opacity = this.isStreaming ? '1' : '0.5';
    }
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

  updateStatus(message) {
    const statusEl = document.getElementById('capture-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.classList.remove('status-capturing', 'status-idle', 'status-streaming');
      
      if (this.isStreaming) {
        statusEl.classList.add('status-streaming');
      } else if (this.isCapturing) {
        statusEl.classList.add('status-capturing');
      } else {
        statusEl.classList.add('status-idle');
      }
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