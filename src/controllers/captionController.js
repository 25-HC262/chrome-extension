import ttsController from './ttsController.js';

class CaptionController {
    constructor() {
        this.captionScript = [];
    }

    createCaption() {
        const existing = document.getElementById('sign-caption');

        if (existing) {
            return;
        }

        const captionDiv = document.createElement('div');
        captionDiv.id = 'sign-caption'; 
        captionDiv.textContent = '';
        document.body.appendChild(captionDiv);
    }

    updateCaption(text) {
        const captionDiv = document.getElementById('sign-caption');

        if (!captionDiv) {
            return;
        }

        captionDiv.textContent = text;
        this.captionScript.push(text);
        this.updateCaptionScript();
    }

    createCaptionScript() {
        const existingCaptionScript = document.getElementById('sign-caption-script');
        if (existingCaptionScript) {
            return;
        }
        const captionScriptDiv = document.createElement('div');
        captionScriptDiv.id = 'sign-caption-script'; 
        captionScriptDiv.textContent = '';
        document.body.appendChild(captionScriptDiv);
    }

    updateCaptionScript() {
        const captionScriptDiv = document.getElementById('sign-caption-script');
        if (!captionScriptDiv) {
            return;
        }
        captionScriptDiv.innerHTML = this.captionScript.map(line=>`<div>${line}</div>`).join('');
    }
}

const captionController = new CaptionController();
export default captionController; 
