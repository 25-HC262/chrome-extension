import panelController from './panelController.js';
import videoController from './videoController.js';

/*
const videoController = require('/src/controllers/videoController.js');
const panelController = require('/src/controllers/panelController.js');
*/

class UserController {
    constructor() {
        this.userDetectionInterval = null;
        this.users = [];
        this.selectedUsers = new Set();
    }

    addUserSelectButton() {
        const menu = document.querySelector('div.pw1uU');
        if (!menu) {
            return;
        }

        if (menu.querySelector('.my-custom-option')) {
            return;
        }

        const newItem = document.createElement('div');
        newItem.className = 'my-custom-option';
        newItem.setAttribute('role', 'menuitem');
        newItem.textContent = '사용자 정의 동작';
        newItem.style.cursor = 'pointer';
        newItem.style.padding = '10px';
        newItem.style.color = '#fff';
        newItem.style.fontSize = '14px';
        newItem.style.backgroundColor = '#3c4043';
        newItem.style.borderTop = '1px solid #555';

        const refItem = menu.querySelector('div[role="menuitem"]');
        
        if (refItem) {
            newItem.className = refItem.className;
            newItem.style.cssText = refItem.style.cssText;
        }

        newItem.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('유저 선택됨');
        })

        menu.appendChild(newItem);
    }

    startUserDetection() {
        const handleUserSelection = (userId, checked) => this.toggleUserSelection(userId, checked);

        this.userDetectionInterval = setInterval(() => {
            this.updateUserList(this.users, this.selectedUsers, handleUserSelection);
        }, 3000);
        
        setTimeout(() => this.updateUserList(this.users, this.selectedUsers, handleUserSelection), 1000);
    }

    updateUserList(users, selectedUsers, onUserSelectionChanged) {
        users = this.detectUsers();
        const userListElement = document.getElementById('user-list');

        if (!userListElement) {
            return;
        }

        if (users.length === 0) {
            userListElement.innerHTML = `
                <div class="user-list-loading">
                    참가자를 찾을 수 없습니다.<br>
                    <small>비디오가 켜져 있는 참가자만 표시됩니다.</small>
                </div>
            `;
            return;
        }

        userListElement.innerHTML = '';

        this.users.forEach((user, index) => {
            const userItem = document.createElement('div');
            userItem.classList.add('user-item');

            const userItemHTML = `
                <input type="checkbox" id="user-${user.id}" value="${user.id}" ${selectedUsers.has(user.id) ? 'checked' : ''}>
                <label for="user-${user.id}" class="user-label">
                    <div class="user-info">
                        <div>${user.name || `참가자 ${index + 1}`}</div>
                        <div class="user-info-details">${user.videoSize} • ${user.type}</div>
                    </div>
                </label>
            `;
            userItem.innerHTML = userItemHTML;

            const checkbox = userItem.querySelector('input[type="checkbox"]');
            
            userItem.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    onUserSelectionChanged(user.id, checkbox.checked);
                }
            });

            checkbox.addEventListener('change', (e) => {
                onUserSelectionChanged(user.id, e.target.checked);
            });

            userListElement.appendChild(userItem);
        });
    }

    detectUsers() {
        const videoElements = videoController.findAllVideoElements();
        this.users = [];

        videoElements.forEach((video, index) => {
            const container = video.closest('[data-participant-id], [data-allocation-index], [jsname]');
            const participantId = this.extractParticipantId(container, video, index);
            const name = this.extractUserName(container);
            const videoSize = `${video.videoWidth || video.clientWidth}x${video.videoHeight || video.clientHeight}`;
            const type = videoController.determineVideoType(video, container);

            const user = {
                id: participantId,
                name: name,
                video: video,
                container: container,
                videoSize: videoSize,
                type: type,
                index: index
            };

            this.users.push(user);
            videoController.userVideos.set(participantId, user);
        });

        return this.users;
    }  

    extractParticipantId(container, video, index) {
        const dataId = container.getAttribute('data-participant-id') ||
        container.getAttribute('data-allocation-index') ||
        container.getAttribute('jsname');

        if (dataId && dataId.startsWith('ucc-')) {
            return dataId; // Found a reliable ID, use it.
        }

        // Extract ID from video element
        if (video.src && video.src.startsWith('blob:')) {
            return video.src;
        }

        const name = this.extractUserName(container);
        if (name) {
            return `${name.replace(/\s/g, '_')}_${index}`;
        }

        return `user_${index}`;
    }

    extractUserName(container) {
        const nameSelectors = [
            'div.zSX24d > div.jKwXVe > span.zWGUib',
            '[aria-label*="님"]', // Look for aria-label with "님" suffix
            'div[role="button"][aria-label]', // Buttons with an aria-label
            '.notranslate' // General notranslate class
        ];

        for (const selector of nameSelectors) {
            const nameElement = container.querySelector(selector);
            if (!nameElement) {
                return;
            }
            const name = nameElement.textContent || nameElement.getAttribute('aria-label');
            if (name && name.trim()) {
                return name.replace(/님$/, '').trim();
            }
        }

        const ariaLabelName = container.getAttribute('aria-label');
        if (ariaLabelName && ariaLabelName.trim()) {
            return ariaLabelName.replace(/님$/, '').trim();
        }

        return null;
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
        const handleUserSelection = (userId, checked) => this.toggleUserSelection(userId, checked);
    
        this.updateUserList(this.users, this.selectedUsers, handleUserSelection);
        panelController.updateStatus('사용자 목록을 새로고침했습니다.');
    }
}

const userController = new UserController();
export default userController; 