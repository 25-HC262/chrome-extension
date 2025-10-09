
import streamController from './streamController.js';
// import panelHTML from '../public/index.html';
// const streamController = require('/src/controllers/streamController.js');

class PanelController {
    constructor() {
        this.panelContent = null;
        this.panelElement = null;
        this.titleElement = null;

        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        this.minimizeButton = null;
        this.startTranslateButton = null;
        this.stopTranslateButton = null;
        
        this.captureStatus = null;
        this.captionDiv = null;
    }

    async createControlPanel() {
        const existingPanel = document.getElementById('capture-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        try {
            // const response = await fetch(chrome.runtime.getURL('src/public/index.html'));
            // if (!response.ok) {
            //     throw new Error('Failed to load index.html: ',response.statusText);
            // }
            // const panelHTML = await response.text();
            const panelHTML = `
                    <div id="capture-panel" class="capture-panel">
                        <div class="panel-title" style="cursor: move;">
                            <h3>사용자별 화면 캡처 & 스트리밍</h3>
                            <button id="minimize-button" title="최소화">-</button>
                        </div>
                        <div class="panel-content">
                            <div class="user-list-container">
                                <div class="list-title" style="margin-bottom: 10px; font-weight: 500; color: #333;">
                                    참가자 목록
                                </div>
                                <div id="user-list" class="user-list">
                                    <div class="user-list-loading">
                                        Loading...
                                    </div>
                                </div>
                            </div>
                            <div class="translate-container">
                                <div class="controls-title" style="font-weight: 500; margin-bottom: 8px; color: #333;">
                                    실시간 해석
                                </div>
                                <button id="start-translate-button">해석 시작</button>
                                <button id="stop-translate-button">해석 중지</button>
                            </div>
                            <div id="caption-div"></div>
                            <div id="capture-status" class="status-idle">
                                대기 중
                            </div>
                        </div>
                    </div>`



            // Convert HTML string into DOM 
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = panelHTML;
            this.panelElement = tempDiv.firstElementChild;

            if (!this.panelElement) {
                console.error("Panel HTML is empty or malformed");
                return;
            }
            
            document.body.appendChild(this.panelElement);
            this.getElement();
            await this.attachEventListeners();
        } catch (error) {
            console.error("Error: ",error);
        }
    }

    getElement() {
        this.panelContent = this.panelElement.querySelector('.panel-content');
        this.titleElement = this.panelElement.querySelector('.panel-title');
        this.minimizeButton = this.panelElement.querySelector('#minimize-button');
        this.startTranslateButton = this.panelElement.querySelector('#start-translate-button');
        this.stopTranslateButton = this.panelElement.querySelector('#stop-translate-button');
        this.captureStatus = this.panelElement.querySelector('#capture-status');
        this.captionDiv = this.panelElement.querySelector('#caption-div')        
    }

    attachEventListeners() {
        this.startTranslateButton.addEventListener('click', () => streamController.startStreaming());
        this.stopTranslateButton.addEventListener('click', () => streamController.stopStreaming()); 
        this.minimizeButton.addEventListener('click', (e) => this.toggleMinimize(e));
        this.titleElement.addEventListener('mousedown', (e) => this.startDrag(e));
        
        document.addEventListener('mousemove', (e) => this.dragPanel(e));
        document.addEventListener('mouseup', () => this.stopDrag());
    }

    toggleMinimize(e) {
        e.stopPropagation();
        let isMinimized = this.panelContent.style.display === 'none';
        this.panelContent.style.display = isMinimized ? '' : 'none';
        this.minimizeButton.textContent = isMinimized ? '+' : '-';
    }

    startDrag(e) {
        this.isDragging = true;
        const panelRect = this.panelElement.getBoundingClientRect();
        this.dragOffsetX = e.clientX - panelRect.left;
        this.dragOffsetY = e.clientY - panelRect.top;
        document.body.style.userSelect = 'none';
    }

    stopDrag() {
        this.isDragging = false;
        document.body.style.userSelect = '';
    }

    dragPanel(e) {
        if (!this.isDragging) {
            return;
        }
        const panelRect = this.panelElement.getBoundingClientRect();
        const panelWidth = panelRect.width;
        const panelHeight = panelRect.height;

        let newLeft = e.clientX - this.dragOffsetX;
        let newTop = e.clientY - this.dragOffsetY;

        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - panelWidth));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - panelHeight));
        this.panelElement.style.left = newLeft + 'px';
        this.panelElement.style.top = newTop + 'px';
        this.panelElement.style.right = 'unset';
    }

    updateStatus(message, statusType = 'idle') {
        this.captureStatus.textContent = message;
        this.captureStatus.classList.remove('status-idle', 'status-streaming', 'status-error');
        this.captureStatus.classList.add(`status-${statusType}`);
    }

    updateStreamingButtons(isStreaming) {
        this.startTranslateButton.disabled = isStreaming;
        this.stopTranslateButton.disabled = !isStreaming;

        this.startTranslateButton.style.opacity = isStreaming ? '0.5' : '1';
        this.stopTranslateButton.style.opacity = isStreaming ? '1' : '0.5';
    }
}

const panelController = new PanelController();
export default panelController; 