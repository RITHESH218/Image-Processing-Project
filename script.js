// DOM Elements
const encodeImageUpload = document.getElementById('encode-image-upload');
const secretMessage = document.getElementById('secret-message');
const messageCapacity = document.getElementById('message-capacity');
const encodeBtn = document.getElementById('encode-btn');
const encodeLoading = document.getElementById('encode-loading');
const encodedImageContainer = document.getElementById('encoded-image-container');
const encodedImage = document.getElementById('encoded-image');
const downloadBtn = document.getElementById('download-btn');
const encodeDropZone = document.getElementById('encode-drop-zone');

const decodeImageUpload = document.getElementById('decode-image-upload');
const decodeBtn = document.getElementById('decode-btn');
const decodeLoading = document.getElementById('decode-loading');
const decodedMessageContainer = document.getElementById('decoded-message-container');
const decodedMessage = document.getElementById('decoded-message');
const decodeDropZone = document.getElementById('decode-drop-zone');
const copyBtn = document.getElementById('copy-btn');

const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const themeToggle = document.getElementById('theme-toggle');
const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

// Global variables
let originalImage = null;
let maxMessageLength = 0;

// --- Theme Toggle ---
if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    themeToggleLightIcon.style.display = 'block';
    themeToggleDarkIcon.style.display = 'none';
} else {
    document.documentElement.classList.remove('dark');
    themeToggleLightIcon.style.display = 'none';
    themeToggleDarkIcon.style.display = 'block';
}

themeToggle.addEventListener('click', () => {
    // toggle icons
    themeToggleDarkIcon.style.display = themeToggleDarkIcon.style.display === 'none' ? 'block' : 'none';
    themeToggleLightIcon.style.display = themeToggleLightIcon.style.display === 'none' ? 'block' : 'none';

    // if set via local storage previously
    if (localStorage.getItem('color-theme')) {
        if (localStorage.getItem('color-theme') === 'light') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        }
    // if NOT set via local storage previously
    } else {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        }
    }
});


// --- File Handling and Drag & Drop ---
function setupFileDropZone(dropZone, input, onFileSelect) {
    dropZone.addEventListener('click', () => input.click());

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file) {
            input.files = dt.files;
            handleFile(file, onFileSelect);
        }
    }, false);

    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFile(file, onFileSelect);
        }
    });
}

function handleFile(file, callback) {
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        callback(e.target.result);
    };
    reader.readAsDataURL(file);
}

function onEncodeFileSelect(imageDataUrl) {
    originalImage = new Image();
    originalImage.onload = function() {
        const pixelCount = originalImage.width * originalImage.height;
        maxMessageLength = Math.floor((pixelCount * 3) / 8) - 1; // 1 byte for delimiter
        messageCapacity.textContent = `Message capacity: ${maxMessageLength} characters`;
        encodedImageContainer.classList.add('hidden');
    };
    originalImage.src = imageDataUrl;
}

function onDecodeFileSelect() {
    decodedMessageContainer.classList.add('hidden');
}

setupFileDropZone(encodeDropZone, encodeImageUpload, onEncodeFileSelect);
setupFileDropZone(decodeDropZone, decodeImageUpload, onDecodeFileSelect);


// --- Event Listeners ---
encodeBtn.addEventListener('click', encodeMessage);
decodeBtn.addEventListener('click', decodeMessage);
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(decodedMessage.textContent).then(() => {
        showToast('Message copied to clipboard!');
    }, () => {
        showToast('Failed to copy message.', 'error');
    });
});

// --- Core Functions ---
function showToast(message, type = 'success') {
    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function stringToBinary(str) {
    return str.split('').map(char => {
        return char.charCodeAt(0).toString(2).padStart(8, '0');
    }).join('') + '11111111'; // Add delimiter
}

function binaryToString(binary) {
    let str = '';
    for (let i = 0; i < binary.length; i += 8) {
        const byte = binary.substr(i, 8);
        if (byte === '11111111') break; // Delimiter found
        str += String.fromCharCode(parseInt(byte, 2));
    }
    return str;
}

function encodeMessage() {
    if (!originalImage) {
        showToast('Please upload an image first', 'error');
        return;
    }
    
    const message = secretMessage.value;
    if (!message) {
        showToast('Please enter a secret message', 'error');
        return;
    }
    
    if (message.length > maxMessageLength) {
        showToast(`Message too long. Maximum length is ${maxMessageLength} characters`, 'error');
        return;
    }
    
    encodeLoading.style.display = 'block';
    encodeBtn.disabled = true;
    
    setTimeout(() => {
        try {
            canvas.width = originalImage.width;
            canvas.height = originalImage.height;
            ctx.drawImage(originalImage, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const binaryMessage = stringToBinary(message);
            let binaryIndex = 0;
            
            for (let i = 0; i < data.length && binaryIndex < binaryMessage.length; i += 4) {
                // R channel
                if (binaryIndex < binaryMessage.length) data[i] = (data[i] & 0xFE) | parseInt(binaryMessage[binaryIndex++], 2);
                // G channel
                if (binaryIndex < binaryMessage.length) data[i + 1] = (data[i + 1] & 0xFE) | parseInt(binaryMessage[binaryIndex++], 2);
                // B channel
                if (binaryIndex < binaryMessage.length) data[i + 2] = (data[i + 2] & 0xFE) | parseInt(binaryMessage[binaryIndex++], 2);
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            const encodedImageUrl = canvas.toDataURL('image/png');
            encodedImage.src = encodedImageUrl;
            downloadBtn.href = encodedImageUrl;
            encodedImageContainer.classList.remove('hidden');
            
            showToast('Message encoded successfully!');
        } catch (error) {
            showToast('Error encoding message: ' + error.message, 'error');
        } finally {
            encodeLoading.style.display = 'none';
            encodeBtn.disabled = false;
        }
    }, 100);
}

function decodeMessage() {
    const file = decodeImageUpload.files[0];
    if (!file) {
        showToast('Please upload an encoded image first', 'error');
        return;
    }
    
    decodeLoading.style.display = 'block';
    decodeBtn.disabled = true;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            try {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                let binaryMessage = '';
                
                for (let i = 0; i < data.length; i += 4) {
                    binaryMessage += (data[i] & 1);
                    binaryMessage += (data[i + 1] & 1);
                    binaryMessage += (data[i + 2] & 1);
                }

                const delimiterIndex = binaryMessage.indexOf('11111111');
                if (delimiterIndex !== -1) {
                    binaryMessage = binaryMessage.substring(0, delimiterIndex);
                }

                const message = binaryToString(binaryMessage);
                
                if (message.trim() === '') {
                    showToast('No hidden message found or image is corrupt.', 'error');
                } else {
                    decodedMessage.textContent = message;
                    decodedMessageContainer.classList.remove('hidden');
                    showToast('Message decoded successfully!');
                }
            } catch (error) {
                showToast('Error decoding message: ' + error.message, 'error');
            } finally {
                decodeLoading.style.display = 'none';
                decodeBtn.disabled = false;
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}