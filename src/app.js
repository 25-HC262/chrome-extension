// src/app.js
import panelController from './controllers/panelController.js';
import captionController from './controllers/captionController.js';
import streamController from './controllers/streamController.js';
import userController from './controllers/userController.js';
import videoController from './controllers/videoController.js';


// const panelController = require('./controllers/panelController.js');
// const captionController = require('./controllers/captionController.js');
// const streamController = require('./controllers/streamController.js');
// const userController = require('./controllers/userController.js');
// const videoController = require('./controllers/videoController.js');


class MeetUserCaptureApp {
  constructor() {
    // this.panelController = panelController;
    // this.captionController = captionController;
    // this.streamController = streamController;
    // this.userController = userController;
    // this.videoController = videoController;
    
    // this.setupListeners();
  }

  init() {
    // this.panelController.createControlPanel();
    // this.captionController.createCaption();
    // // this.captionController.createCaptionScript();
    // this.videoController.setupCanvas();
    // this.userController.startUserDetection();
    // this.streamController.connectToStreamingServer();
    panelController.createControlPanel();
    captionController.createCaption();
    // chrome.runtime.sendMessage({
    //     action: "readCaption",
    //     captionText: "이것을 읽어주세요"
    // }).then(() => {
    //         // 성공적으로 메시지 전송 후 lastCaptionText 업데이트
    //         captionController.updateCaption("이것을 읽어주세요");
    // }).catch(error => {
    //     console.error("메시지 전송 오류:", error);
    // });
    videoController.setupCanvas();
    userController.startUserDetection();
    streamController.connectToStreamingServer();
    console.log('Meet User Capture Extension initialized');
  }
  /*
  // 사용자 목록 업데이트 (UI)
  updateUserList(users) {
    const userListEl = document.getElementById('user-list');
    if (!userListEl) return;
    
    this.userVideos.clear();
    users.forEach(user => this.userVideos.set(user.id, user));
    
    // UI 업데이트 로직 (PanelController의 메서드로 이동 가능)
    if (users.length === 0) {
      userListEl.innerHTML = `<div class="user-list-loading">참가자를 찾을 수 없습니다.</div>`;
    } else {
      userListEl.innerHTML = '';
      users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.classList.add('user-item');
        userItem.innerHTML = `
          <input type="checkbox" id="user-${user.id}" value="${user.id}" ${this.selectedUsers.has(user.id) ? 'checked' : ''}>
          <label for="user-${user.id}" class="user-label">${user.name || user.id}</label>
        `;
        userListEl.appendChild(userItem);

        userItem.querySelector('input').addEventListener('change', (e) => {
          if (e.target.checked) {
            this.selectedUsers.add(user.id);
          } else {
            this.selectedUsers.delete(user.id);
          }
          console.log('Selected users:', Array.from(this.selectedUsers));
        });
      });
    }
  }

  // 스트리밍 시작
  startStreaming() {
    if (this.selectedUsers.size === 0) {
      this.panelController.updateStatus('스트리밍할 사용자를 선택해주세요.');
      return;
    }
    this.isStreaming = true;
    this.streamingController.startStreaming(this.selectedUsers, this.userVideos);
    this.panelController.updateStreamingButtons(this.isStreaming);
    this.panelController.updateStatus(`${this.selectedUsers.size}명의 사용자 스트리밍 시작...`);
  }

  // 스트리밍 중지
  stopStreaming() {
    this.isStreaming = false;
    this.streamingController.stopStreaming();
    this.panelController.updateStreamingButtons(this.isStreaming);
    this.panelController.updateStatus('스트리밍 중지됨');
  }

  // 기타 메서드 (캡션, 상태 업데이트 등)
  setupListeners() {
    this.streamingController.onUpdateCaption = (text) => {
      this.panelController.updateCaption(text);
    };
    this.streamingController.onUpdateStatus = (text) => {
      this.panelController.updateStatus(text);
    };
  }
    */
}

const app = new MeetUserCaptureApp();

const startApp = () => {
    const observer = new MutationObserver((mutations, obs) => {
        userController.detectUsers();
        userController.addUserSelectButton();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    app.init();
    console.log("@#@# app을 실행했습니다")
}

// 확장 프로그램 실행
if (window.location.href.includes('landing')) {
    console.log("Main page : video is not displayed");
} else {
    try {
        startApp();
        // setInterval(() => {
        //   runCaptionSequence();
        // }, 3000);
    } catch (error) {
        console.error('Extension initialization error:', error);
    }
}