document.addEventListener('DOMContentLoaded', () => {
    initCamera();
    initSensors();
    
    // allow input enter key to send message
    document.getElementById('chat-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') sendMessage();
    });
});

let currentMode = 'single';
let currentTemplate = null;
let takingPhoto = false;

const videoEl = document.getElementById('camera-preview');
const cameraModule = document.getElementById('camera-module');
const chatModule = document.getElementById('chat-module');
const templateMenu = document.getElementById('template-menu');
const badge = document.getElementById('status-badge');
const canvas = document.getElementById('photo-canvas');
const transitionImg = document.getElementById('transition-img');
const chatStream = document.getElementById('chat-stream');
const chatInput = document.getElementById('chat-input');
const refInput = document.getElementById('ref-image-upload');
const scanRing = document.querySelector('.scan-ring');

async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        videoEl.srcObject = stream;
        videoEl.onloadedmetadata = () => {
            videoEl.play();
            videoEl.classList.add('ready');
            canvas.width = videoEl.videoWidth || 1080;
            canvas.height = videoEl.videoHeight || 1920;
        };
    } catch (error) {
        console.warn('Camera access denied or unavailable.', error);
        showTip('无法调用相机，正处于前端模拟展示模式。您可以继续体验交互。');
        canvas.width = 1080;
        canvas.height = 1920;
    }
}

function toggleLeveler() {
    const overlay = document.getElementById('leveler-overlay');
    const btn = document.getElementById('btn-leveler');
    overlay.classList.toggle('hidden');
    
    if (!overlay.classList.contains('hidden')) {
        btn.classList.add('highlight');
        btn.querySelector('i').style.color = '#ffcc00';
    } else {
        btn.classList.remove('highlight');
        btn.querySelector('i').style.color = '';
    }
}

function initSensors() {
    const levelerLine = document.getElementById('leveler-line');
    let angle = 0;
    
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') {
        window.addEventListener('deviceorientation', (event) => {
            angle = event.gamma || 0;
            updateLeveler(angle, levelerLine);
        });
    } else {
        setInterval(() => {
            angle = Math.sin(Date.now() / 1500) * 8;
            updateLeveler(angle, levelerLine);
        }, 50);
    }
}

function updateLeveler(angle, el) {
    if(!el) return;
    el.style.transform = `rotate(${-angle}deg)`;
    if (Math.abs(angle) < 2) {
        el.classList.add('aligned');
        if(navigator.vibrate && !el.dataset.vibrated) {
            navigator.vibrate(10);
            el.dataset.vibrated = true;
        }
    } else {
        el.classList.remove('aligned');
        el.dataset.vibrated = false;
    }
}

function switchMode(btn) {
    document.querySelectorAll('.mode-tab').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.innerText.includes('单图') ? 'single' : 'multi';
    
    const compGrid = document.getElementById('composition-overlay');
    if(currentMode === 'multi') {
        compGrid.classList.remove('hidden');
    } else {
        compGrid.classList.add('hidden');
    }
}

function toggleFlash() {
    const btn = document.getElementById('btn-flash');
    btn.classList.toggle('highlight');
    if (btn.classList.contains('highlight')) {
        btn.querySelector('i').className = 'fa-solid fa-bolt';
    } else {
        btn.querySelector('i').className = 'fa-solid fa-bolt-slash';
    }
}

function toggleTemplateMenu() {
    templateMenu.classList.toggle('show');
}

function selectTemplate(name, preset) {
    document.querySelectorAll('.template-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    currentTemplate = name;
    toggleTemplateMenu();
    
    if(preset === 'macro') {
        showBadge('<i class="fa-solid fa-leaf"></i> <span>已开启微距镜头</span>');
    } else if(preset === 'food') {
        showBadge('<i class="fa-solid fa-droplet"></i> <span>色彩增强: 暖色系</span>');
        document.getElementById('composition-overlay').classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function showBadge(html) {
    badge.innerHTML = html;
    badge.classList.remove('hidden');
    badge.style.animation = 'none';
    badge.offsetHeight; 
    badge.style.animation = null;
    
    setTimeout(() => badge.classList.add('hidden'), 3000);
}

function showTip(msg) {
    const toast = document.getElementById('toast-tip');
    if(!toast) return;
    toast.innerHTML = msg;
    toast.classList.remove('hidden');
    toast.style.animation = 'none';
    toast.offsetHeight;
    toast.style.animation = null;
    setTimeout(() => { toast.classList.add('hidden'); }, 3000);
}

function triggerImgUpload() {
    refInput.click();
}

function takePhoto() {
    if(takingPhoto) return;
    takingPhoto = true;
    
    document.getElementById('btn-shutter').classList.add('recording');
    scanRing.classList.remove('hidden');
    
    const flash = document.getElementById('flash-overlay');
    flash.classList.add('flash');
    setTimeout(() => flash.classList.remove('flash'), 800);
    
    if(navigator.vibrate) navigator.vibrate(50);
    
    setTimeout(() => {
        captureAndTransition();
        document.getElementById('btn-shutter').classList.remove('recording');
        scanRing.classList.add('hidden');
        takingPhoto = false;
    }, 800); 
}

function captureAndTransition() {
    const ctx = canvas.getContext('2d');
    if(videoEl.videoWidth > 0) {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#111';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = '#444';
        ctx.font = '50px Inter';
        ctx.textAlign = 'center';
        ctx.fillText("Mocked Photo Capture", canvas.width/2, canvas.height/2);
    }
    
    const dataUrl = canvas.toDataURL('image/jpeg');
    transitionImg.src = dataUrl;
    
    transitionImg.classList.remove('hidden');
    transitionImg.style.transition = 'none';
    
    // Get actual video container position and size
    const containerRect = document.querySelector('.video-container').getBoundingClientRect();
    const appRect = document.getElementById('app').getBoundingClientRect();
    
    transitionImg.style.width = `${containerRect.width}px`;
    transitionImg.style.height = `${containerRect.height}px`;
    transitionImg.style.top = `${containerRect.top}px`;
    transitionImg.style.left = `${containerRect.left}px`;
    transitionImg.style.objectFit = 'cover';
    transitionImg.offsetHeight; 
    
    cameraModule.classList.add('shrinked');
    chatModule.classList.add('active');
    
    transitionImg.style.transition = 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';
    
    setTimeout(() => {
        // Transition to chat thumbnail position
        transitionImg.style.width = '120px';
        transitionImg.style.height = '160px'; // Keep 3:4 ratio for thumbnail
        transitionImg.style.top = 'auto';
        transitionImg.style.left = 'auto'; 
        transitionImg.style.right = '32px';
        transitionImg.style.bottom = '120px';
        transitionImg.style.borderRadius = '12px';
        
        setTimeout(() => {
            appendImageMessage(dataUrl);
            transitionImg.classList.add('hidden');
            simulateAIResponse();
        }, 600);
    }, 50);
}

function openChat() {
    cameraModule.classList.add('shrinked');
    chatModule.classList.add('active');
    setTimeout(scrollToBottom, 600);
}

function backToCamera() {
    cameraModule.classList.remove('shrinked');
    chatModule.classList.remove('active');
}

function appendImageMessage(src) {
    const msg = document.createElement('div');
    msg.className = 'chat-message user-message';
    msg.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-user"></i></div>
        <div class="image-bubble"><img src="${src}" alt="Captured"></div>
    `;
    chatStream.appendChild(msg);
    scrollToBottom();
}

function appendTextMessage(text, sender = 'user') {
    const msg = document.createElement('div');
    msg.className = `chat-message ${sender}-message`;
    const icon = sender === 'user' ? 'fa-user' : 'fa-wand-magic-sparkles';
    
    msg.innerHTML = `
        <div class="avatar"><i class="fa-solid ${icon}"></i></div>
        <div class="bubble">${text}</div>
    `;
    chatStream.appendChild(msg);
    scrollToBottom();
}

function addTypingIndicator() {
    const msg = document.createElement('div');
    msg.className = 'chat-message ai-message typing-msg';
    msg.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
        <div class="bubble typing-indicator">
            <span></span><span></span><span></span>
        </div>
    `;
    chatStream.appendChild(msg);
    scrollToBottom();
    return msg;
}

function scrollToBottom() {
    chatStream.scrollTop = chatStream.scrollHeight;
}

function sendMessage() {
    const text = chatInput.value.trim();
    if(!text) return;
    
    appendTextMessage(text, 'user');
    chatInput.value = '';
    
    const typing = addTypingIndicator();
    
    setTimeout(() => {
        typing.remove();
        appendTextMessage(`好的，正在为您处理：“${text}”...`, 'ai');
        
        setTimeout(() => {
            appendDemoResult();
        }, 1500);
    }, 1200);
}

function applyChip(el) {
    const cmd = el.innerText;
    appendTextMessage(cmd, 'user');
    
    const typing = addTypingIndicator();
    setTimeout(() => {
        typing.remove();
        appendTextMessage(`收到指令：“${cmd}”。正在调取生成模型，请稍后...`, 'ai');
        setTimeout(() => {
            appendDemoResult();
        }, 1500);
    }, 1200);
}

function simulateAIResponse() {
    let reply = "";
    if (currentTemplate) {
        reply = `已基于您选择的 [${currentTemplate}] 模版，为您自动进行主体抠图、光影修复及高频细节增强。请问需要生成什么背景？您可以点击下方快捷指令或直接输入要求。`;
    } else {
        reply = "底片已获取！清晰度很高。请问您想要给它换个怎样的背景？例如“沙滩”、“高级灰底色”等。";
    }
    
    const typing = addTypingIndicator();
    setTimeout(() => {
        typing.remove();
        appendTextMessage(reply, 'ai');
    }, 1500);
}

function appendDemoResult() {
    const typing = addTypingIndicator();
    setTimeout(() => {
        typing.remove();
        const msg = document.createElement('div');
        msg.className = 'chat-message ai-message';
        // Mock stunning AI result
        msg.innerHTML = `
            <div class="avatar"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
            <div class="image-bubble" style="border: 1px solid var(--accent); box-shadow: 0 0 15px var(--accent-glow)">
                <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600" alt="Generated Output">
            </div>
        `;
        chatStream.appendChild(msg);
        scrollToBottom();
        
        setTimeout(() => {
            appendTextMessage("出图啦！这是初步的效果。如果您对光影或倒影不满意，可以继续让我调整。", 'ai');
        }, 800);
    }, 2000);
}
