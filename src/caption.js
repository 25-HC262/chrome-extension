// Create Caption
function createCaption() {
  const existing = document.getElementById('sign-caption');
  if (existing) return;

  const captionDiv = document.createElement('div');
  captionDiv.id = 'sign-caption'; 
  captionDiv.textContent = '이것은 테스트 자막 입니다.';
  document.body.appendChild(captionDiv);
}

// Update caption content
function updateCaption(text) {
  const captionDiv = document.getElementById('sign-caption');
  if (captionDiv) {
    captionDiv.textContent = text;
  }
}

if (window.location.href.includes('landing')) {
  console.log("Main page : caption is not displayed");
} else {  
  createCaption();

  let captions = ["안녕하세요", "this is test caption"];
  let i = 0;

  setInterval(() => {
    updateCaption(captions[i % captions.length]);
    i++;
  }, 3000);
}
