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

  captionScript.push(text);
  updateCaptionScript();
}

// Save caption script
function createCaptionScriptBox() {
  const existing = document.getElementById('caption-script');
  if (existing) return;

  const captionScriptDiv = document.createElement('div');
  captionScriptDiv.id = 'caption-script'; 
  captionScriptDiv.textContent = '이것은 테스트 자막 스크립트 입니다.';
  document.body.appendChild(captionScriptDiv);
}


  let captionScript = [];
// Update caption script content
function updateCaptionScript() {
  const captionScriptDiv = document.getElementById('caption-script');
  if (captionScriptDiv) {
    captionScriptDiv.innerHTML = captionScript.map(line => `<div>${line}</div>`).join('');;
  }
}


// Add button to select user video 
function addUserSelectButton() {
  const menu = document.querySelector('div.pw1uU');
  if (!menu) return;

  if (menu.querySelector('.my-custom-option'))
    return;

  const refItem = menu.querySelector('div[role="menuitem"]');

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

  if (refItem) {
    newItem.className = refItem.className;
    newItem.style.cssText = refItem.style.cssText;
  }

  newItem.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('유저 선택됨');
  });

  menu.appendChild(newItem);
}

const observer = new MutationObserver(() => {
  addUserSelectButton();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});



if (window.location.href.includes('landing')) {
  console.log("Main page : caption is not displayed");
} else {  

  createCaption();
  createCaptionScriptBox();

  let captions = ["안녕하세요", "this is test caption"];
  let i = 0;

  // setInterval(() => {
  //   updateCaption(captions[i % captions.length]);
  //   i++;
  // }, 3000);
}

export { updateCaption }