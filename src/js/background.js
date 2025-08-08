chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'requestDesktopCapture') {
    chrome.desktopCapture.chooseDesktopMedia(
      ['screen', 'window', 'tab'],
      sender.tab,
      (streamId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ 
            success: false, 
            error: chrome.runtime.lastError.message 
          });
        } else if (streamId) {
          sendResponse({ 
            success: true, 
            streamId: streamId 
          });
        } else {
          sendResponse({ 
            success: false, 
            error: 'Desktop capture denied by user' 
          });
        }
      }
    );
    return true;
  }
  
  sendResponse({ success: false, error: 'Unknown action' });
  return true;
});