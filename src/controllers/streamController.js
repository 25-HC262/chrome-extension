import captionController from './captionController.js';
import panelController from './panelController.js';
import userController from './userController.js';
import videoController from './videoController.js';
import ttsController from './ttsController.js';

/*
const panelController = require('/src/controllers/panelController.js');
const userController = require('/src/controllers/userController.js');
*/

class StreamController {
    constructor() {
        this.streamingServer = null;
        this.streamingUsers = new Map();
        this.isStreaming = false;
        // user id(temp) : /?userId=Nl0j0e
        this.userId = "user_0";
    }

    async connectToStreamingServer() {
        if (!this.userId) {
            console.error('userId가 없습니다.');
            return;
        }

        try {
            const serverUrl = `wss://streaming.trout-stream.n-e.kr/stream?userId=${this.userId}`;
            //const serverUrl = `ws://localhost:3000/stream?userId=${this.userId}`;
            console.log("@#@# serverURL:",serverUrl);
            this.streamingServer = new WebSocket(serverUrl);
            this.streamingServer.binaryType = 'arraybuffer';

            this.streamingServer.onopen = () => {
                console.log('Connected to streaming server');
                panelController.updateStatus('스트리밍 서버에 연결됨');
            }

            this.streamingServer.onmessage = (event) => {
                if (typeof event.data === 'string') {
                    const message = JSON.parse(event.data);
                    console.log('JSON 메시지 수신:', message);
                    this.handleServerMessage(message); 
                    
                } else if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
                    console.log('바이너리 데이터 (영상 청크) 수신 (무시됨)');
                }
            }

            this.streamingServer.onerror = (error) => {
                console.error('Streaming server error:', error);
                panelController.updateStatus('스트리밍 서버 연결 오류');
            };

            this.streamingServer.onclose = () => {
                console.log('Disconnected from streaming server');
                panelController.updateStatus('스트리밍 서버 연결 해제');
                // Try to reconnect after 5 seconds
                setTimeout(() => this.connectToStreamingServer(), 5000);
            };
        } catch (error) {
            console.error('Failed to connect to streaming server:', error);
            panelController.updateStatus('스트리밍 서버 연결 실패');
        }
    }

    async startStreaming() {
        if (userController.selectedUsers.size === 0) {
            alert('번역할 사용자를 선택해주세요.');
            return;
        }

        if (!this.streamingServer || this.streamingServer.readyState !== WebSocket.OPEN) {
            await this.connectToStreamingServer();
            // alert('스트리밍 서버에 연결되지 않았습니다.');
            // return;
        }

        try {
            this.isStreaming = true;
            panelController.updateStreamingButtons(this.isStreaming);
            panelController.updateStatus(`${userController.selectedUsers.size}명의 사용자 스트리밍이 시작됨`, 'streaming');

            console.log('Started streaming selected users:', Array.from(userController.selectedUsers));
            // Start streaming each selected user
            for (const userId of Array.from(userController.selectedUsers)) {
                console.log("@#@# selected user id : ",userId);
                await this.startUserStreaming(userId);
            }

        } catch (error) {
            console.error('Streaming start error:', error);
            panelController.updateStatus(`스트리밍 오류: ${error.message}`);
            this.stopStreaming();
        }
    }

    async startUserStreaming(userId) {
        const user = videoController.userVideos.get(userId);
        if (!user || !user.video) {
            console.error(`User ${userId} not found or no video`);
            return;
        }
        const { video } = user;
        console.log(`@#@#Video readyState: ${video.readyState}`);
        if (video.paused) {
            try {
                await video.play(); // 비디오 재생 시도
                console.log(`User ${userId} video started playing.`);
            } catch (e) {
                console.error(`Failed to start video playback for ${userId}:`, e);
                alert('비디오 재생을 시작할 수 없습니다. (브라우저 자동 재생 정책 문제일 수 있습니다.)');
                return;
            }
        }
        
        try {
            const { canvas } = this.prepareVideoStream(video);
            const intervalId = this.startFrameSending(video, canvas, userId);

            this.streamingUsers.set(userId, {
                canvas,
                video,
                intervalId,
            });

            this.notifyServerOfStart(userId, user.name, canvas.width, canvas.height);
        } catch (error) {
            console.error(`Error starting stream for user ${userId}:`, error);
        }
    }

    prepareVideoStream(video) {
        const canvas = document.createElement('canvas');

        const sourceWidth = video.videoWidth;
        const sourceHeight = video.videoHeight;
        const targetMaxWidth = 640;
        const scale = Math.min(1, targetMaxWidth / (sourceWidth || 1));
        const targetWidth = Math.max(1, Math.round((sourceWidth || 1) * scale));
        const targetHeight = Math.max(1, Math.round((sourceHeight || 1) * scale));

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        return { canvas };
    }

    startFrameSending(video, canvas, userId) {
        const ctx = canvas.getContext('2d');
        const intervalId = setInterval(() => {
            if (!this.streamingServer || this.streamingServer.readyState !== WebSocket.OPEN) return;
            try {
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                    ctx.save();
                    ctx.scale(-1, 1);
                    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
                    ctx.restore();
                }
                canvas.toBlob((blob) => {
                    if (!blob || !this.streamingServer || this.streamingServer.readyState !== WebSocket.OPEN) return;
                    blob.arrayBuffer().then(buffer => {
                        if (this.streamingServer && this.streamingServer.readyState === WebSocket.OPEN) {
                            this.streamingServer.send(buffer);
                        }
                    });
                }, 'image/jpeg', 0.7);
            } catch (e) {
                console.warn(`Frame capture error for user ${userId}:`, e);
            }
        }, 100); // ~10fps
        return intervalId;
    }

    notifyServerOfStart(userId, userName, width, height) {
        if (this.streamingServer && this.streamingServer.readyState === WebSocket.OPEN) {
            this.streamingServer.send(JSON.stringify({
                type: 'start_stream',
                userId,
                userName: userName || userId,
                width,
                height,
                fps: 10,
                mimeType: 'image/jpeg',
            }));
            console.log(`Started streaming user ${userId} with JPEG frames at 10fps`);
        }
    }

    async stopStreaming() {
        this.isStreaming = false;
        panelController.updateStreamingButtons(this.isStreaming);
        
        if (this.streamingInterval) {
            clearInterval(this.streamingInterval);
            this.streamingInterval = null;
        }

        // Stop streaming for each user
        this.streamingUsers.forEach((streamData, userId) => {
            this.stopUserStreaming(userId);
        });

        this.streamingUsers.clear();
        panelController.updateStatus('스트리밍 중지됨');
        console.log('Streaming stopped');
    }

    stopUserStreaming(userId) {
        const streamData = this.streamingUsers.get(userId);
        if (!streamData) {
            return;
        }

        if (streamData.intervalId) {
            clearInterval(streamData.intervalId);
        }

        if (this.streamingServer && this.streamingServer.readyState === WebSocket.OPEN) {
            this.streamingServer.send(JSON.stringify({
                type: 'stop_stream',
                userId: userId
            }));
        }

        this.streamingUsers.delete(userId);
        console.log(`Stopped streaming user ${userId}`);
    }

    handleServerMessage(message) {
        switch (message.type) {
            case 'stream_started' :
                console.log('Stream started on server for user:', message.userId);
                break;
            case 'stream_stopped':
                console.log('Stream stopped on server for user:', message.userId);
                break;
            case 'model_response' :
                console.log(`[서버로부터 받은 응답] -> ${message.text}`);
                captionController.updateCaption(message.text);
                
                chrome.runtime.sendMessage({
                    action: "readCaption",
                    captionText: message.text
                }).then(() => {
                        // 성공적으로 메시지 전송 후 lastCaptionText 업데이트
                        captionController.updateCaption(message.text);
                }).catch(error => {
                    console.error("메시지 전송 오류:", error);
                });


                // this.showSubtitle(message.text);
                // this.updateCaption(message.text);
            case 'error':
                console.error('Server error:', message.error);
                panelController.updateStatus(`서버 오류: ${message.error}`);
                break;
            default:
                console.log('Unknown server message:', message);
        }
    }
}

const streamController = new StreamController();
export default streamController; 