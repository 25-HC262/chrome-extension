class VideoController {
    constructor() {
        this.canvas = null;
        this.canvas2Dcontext = null;
        this.userVideos = new Map();
    }

    setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas2Dcontext = this.canvas.getContext('2d');
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

    determineVideoType(video, container) {
        const width = video.videWidth;
        const height = video.videoHeight;
        const area = width * height;

        if (area > 300000) {
            return '메인 화면';
        }
        if (area > 50000) {
            return '일반 참가자';
        }
        return '소형 화면';
    }
}

const videoController = new VideoController();
export default videoController; 