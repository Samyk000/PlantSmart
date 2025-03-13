// Constants and Configuration
const CONFIG = {
    API_KEY: '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',
    MAX_FILE_SIZE: 5 * 1024 * 1024,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
    HISTORY_KEY: 'plantSearchHistory',
    MAX_HISTORY_ITEMS: 20
};

// DOM Elements
const elements = {
    screens: {
        main: document.getElementById('mainScreen'),
        camera: document.getElementById('cameraScreen'),
        preview: document.getElementById('previewScreen'),
        results: document.getElementById('resultsScreen'),
        history: document.getElementById('historyScreen')
    },
    camera: {
        feed: document.getElementById('cameraFeed'),
        openBtn: document.getElementById('openCamera'),
        closeBtn: document.getElementById('closeCamera'),
        captureBtn: document.getElementById('capturePhoto'),
        switchBtn: document.getElementById('switchCamera')
    },
    buttons: {
        upload: document.getElementById('uploadBtn'),
        showHistory: document.getElementById('showHistory'),
        closeHistory: document.getElementById('closeHistory'),
        clearHistory: document.getElementById('clearHistory'),
        backToMain: document.getElementById('backToMain'),
        retakePhoto: document.getElementById('retakePhoto'),
        identifyBtn: document.getElementById('identifyBtn'),
        newSearch: document.getElementById('newSearch'),
        shareResults: document.getElementById('shareResults')
    },
    inputs: {
        imageInput: document.getElementById('imageInput')
    },
    containers: {
        preview: document.getElementById('preview'),
        resultImage: document.getElementById('resultImage'),
        loading: document.getElementById('loadingContainer'),
        results: document.getElementById('resultsContent'),
        historyList: document.getElementById('historyList'),
        plantDetails: document.getElementById('plantDetails')
    },
    text: {
        plantCommonName: document.getElementById('plantCommonName'),
        plantScientificName: document.getElementById('plantScientificName')
    },
    toast: document.getElementById('toast')
};

// State Management
let currentPlantData = null;
let searchHistory = [];
let stream = null;
let facingMode = 'environment';

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadSearchHistory();
});

function initializeApp() {
    setupEventListeners();
    checkCameraSupport();
}

// Event Listeners Setup
function setupEventListeners() {
    // Camera Controls
    elements.camera.openBtn.addEventListener('click', initCamera);
    elements.camera.closeBtn.addEventListener('click', stopCamera);
    elements.camera.captureBtn.addEventListener('click', capturePhoto);
    elements.camera.switchBtn.addEventListener('click', switchCamera);

    // Upload Controls
    elements.buttons.upload.addEventListener('click', () => elements.inputs.imageInput.click());
    elements.inputs.imageInput.addEventListener('change', handleImageSelect);

    // Navigation
    elements.buttons.showHistory.addEventListener('click', showHistory);
    elements.buttons.closeHistory.addEventListener('click', hideHistory);
    elements.buttons.clearHistory.addEventListener('click', clearHistory);
    elements.buttons.backToMain.addEventListener('click', navigateToMain);
    elements.buttons.retakePhoto.addEventListener('click', navigateToMain);
    elements.buttons.identifyBtn.addEventListener('click', startIdentification);
    elements.buttons.newSearch.addEventListener('click', navigateToMain);
}

// Camera Handling
async function checkCameraSupport() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        elements.camera.openBtn.style.display = hasCamera ? 'flex' : 'none';
    } catch (error) {
        console.error('Camera check failed:', error);
        elements.camera.openBtn.style.display = 'none';
    }
}

async function initCamera() {
    try {
        const constraints = {
            video: { 
                facingMode: facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        elements.camera.feed.srcObject = stream;
        elements.screens.camera.classList.remove('hidden');
        
        // Check if device has multiple cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMultipleCameras = devices.filter(device => device.kind === 'videoinput').length > 1;
        elements.camera.switchBtn.style.display = hasMultipleCameras ? 'block' : 'none';

    } catch (error) {
        console.error('Camera initialization failed:', error);
        showToast('Cannot access camera. Please check permissions or try uploading an image.');
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    elements.screens.camera.classList.add('hidden');
}

async function switchCamera() {
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    await stopCamera();
    await initCamera();
}

async function capturePhoto() {
    try {
        const canvas = document.createElement('canvas');
        const video = elements.camera.feed;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        handleCapturedImage(blob);
        
    } catch (error) {
        console.error('Photo capture failed:', error);
        showToast('Failed to capture photo. Please try again.');
    }
}

function handleCapturedImage(blob) {
    stopCamera();
    displayPreview(blob);
    navigateToPreview();
}

// Image Handling
async function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!validateImage(file)) return;

    try {
        const optimizedImage = await optimizeImage(file);
        displayPreview(optimizedImage);
        navigateToPreview();
    } catch (error) {
        showToast('Error processing image. Please try again.');
    }
}

function validateImage(file) {
    if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
        showToast('Please select a valid image file (JPG or PNG)');
        return false;
    }

    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showToast('Image size should be less than 5MB');
        return false;
    }

    return true;
}

async function optimizeImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            let { width, height } = calculateDimensions(img.width, img.height, 1200);

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(resolve, 'image/jpeg', 0.8);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

function calculateDimensions(width, height, maxDim) {
    if (width > height) {
        if (width > maxDim) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
        }
    } else {
        if (height > maxDim) {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
        }
    }
    return { width, height };
}

function displayPreview(blob) {
    const url = URL.createObjectURL(blob);
    elements.containers.preview.src = url;
    elements.containers.resultImage.src = url;
}

// Plant Identification
async function startIdentification() {
    try {
        showLoading(true);
        navigateToResults();

        const imageData = await getBase64FromImage(elements.containers.preview);
        const plantData = await identifyPlant(imageData);
        
        currentPlantData = plantData;
        saveToHistory(plantData);
        displayResults(plantData);
    } catch (error) {
        console.error('Identification error:', error);
        showToast('Error identifying plant. Please try again.');
        navigateToPreview();
    } finally {
        showLoading(false);
    }
}

async function identifyPlant(base64Image) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.API_KEY}`,
            'HTTP-Referer': window.location.href,
            'X-Title': 'PlantSmart AI'
        },
        body: JSON.stringify({
            model: 'google/gemini-2.0-flash-thinking-exp:free',
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: "Analyze this plant and provide ONLY a JSON response in this format (no additional text): {\"commonName\":\"\",\"scientificName\":\"\",\"description\":\"\",\"characteristics\":{\"type\":\"\",\"height\":\"\",\"spread\":\"\",\"flowering\":\"\"},\"growingInfo\":{\"sunlight\":\"\",\"water\":\"\",\"soil\":\"\"},\"quickFacts\":[]}"
                    },
                    {
                        type: 'image_url',
                        image_url: { url: base64Image }
                    }
                ]
            }]
        })
    });

    if (!response.ok) {
        throw new Error('API request failed');
    }

    const data = await response.json();
    try {
        const content = data.choices[0].message.content;
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}') + 1;
        return JSON.parse(content.slice(jsonStart, jsonEnd));
    } catch (error) {
        console.error('JSON parsing error:', error);
        throw new Error('Invalid response format');
    }
}

// Results Display
function displayResults(data) {
    elements.text.plantCommonName.textContent = data.commonName;
    elements.text.plantScientificName.textContent = data.scientificName;
    
    elements.containers.plantDetails.innerHTML = `
        <div class="detail-section">
            <h3><i class="fas fa-info-circle"></i> About</h3>
            <p>${data.description}</p>
        </div>

        <div class="detail-section">
            <h3><i class="fas fa-leaf"></i> Characteristics</h3>
            <div class="characteristic-list">
                ${Object.entries(data.characteristics).map(([key, value]) => `
                    <div class="characteristic-item">
                        <i class="fas ${getCharacteristicIcon(key)}"></i>
                        <span>${value}</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="detail-section">
            <h3><i class="fas fa-seedling"></i> Growing Information</h3>
            <div class="characteristic-list">
                ${Object.entries(data.growingInfo).map(([key, value]) => `
                    <div class="characteristic-item">
                        <i class="fas ${getGrowingIcon(key)}"></i>
                        <span>${value}</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="detail-section">
            <h3><i class="fas fa-lightbulb"></i> Quick Facts</h3>
            <ul class="facts-list">
                ${data.quickFacts.map(fact => `
                    <li>${fact}</li>
                `).join('')}
            </ul>
        </div>
    `;

    elements.containers.results.classList.remove('hidden');
}

function getCharacteristicIcon(type) {
    const icons = {
        type: 'fa-pagelines',
        height: 'fa-arrows-alt-v',
        spread: 'fa-arrows-alt-h',
        flowering: 'fa-flower'
    };
    return icons[type] || 'fa-info-circle';
}

function getGrowingIcon(type) {
    const icons = {
        sunlight: 'fa-sun',
        water: 'fa-tint',
        soil: 'fa-mountain'
    };
    return icons[type] || 'fa-info-circle';
}

// History Management
function loadSearchHistory() {
    try {
        const saved = localStorage.getItem(CONFIG.HISTORY_KEY);
        searchHistory = saved ? JSON.parse(saved) : [];
        renderHistoryList();
    } catch (error) {
        console.error('History loading error:', error);
        searchHistory = [];
    }
}

function saveToHistory(plantData) {
    const historyItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        imageUrl: elements.containers.preview.src,
        ...plantData
    };

    searchHistory.unshift(historyItem);
    if (searchHistory.length > CONFIG.MAX_HISTORY_ITEMS) {
        searchHistory.pop();
    }

    localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(searchHistory));
    renderHistoryList();
}

// Continue with the rest of the code...

// History Display and Management
function renderHistoryList() {
    if (!searchHistory.length) {
        elements.containers.historyList.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-history"></i>
                <p>No plants identified yet</p>
                <small>Your identified plants will appear here</small>
            </div>
        `;
        return;
    }

    elements.containers.historyList.innerHTML = searchHistory.map(item => `
        <div class="history-item" onclick="loadHistoryItem(${item.id})">
            <img src="${item.imageUrl}" alt="${item.commonName}">
            <div class="history-item-info">
                <h4>${item.commonName}</h4>
                <p>${item.scientificName}</p>
                <small>${formatDate(item.timestamp)}</small>
            </div>
            <i class="fas fa-chevron-right"></i>
        </div>
    `).join('');
}

function clearHistory() {
    if (confirm('Are you sure you want to clear your search history?')) {
        searchHistory = [];
        localStorage.removeItem(CONFIG.HISTORY_KEY);
        renderHistoryList();
        showToast('History cleared');
    }
}

// Navigation Functions
function navigateToScreen(showScreen, ...hideScreens) {
    showScreen.classList.remove('hidden');
    hideScreens.forEach(screen => screen.classList.add('hidden'));
}

function showHistory() {
    navigateToScreen(elements.screens.history, elements.screens.main);
}

function hideHistory() {
    navigateToScreen(elements.screens.main, elements.screens.history);
}

function navigateToMain() {
    stopCamera();
    navigateToScreen(
        elements.screens.main, 
        elements.screens.preview, 
        elements.screens.results, 
        elements.screens.history,
        elements.screens.camera
    );
    resetState();
}

function navigateToPreview() {
    navigateToScreen(
        elements.screens.preview, 
        elements.screens.main, 
        elements.screens.results,
        elements.screens.camera
    );
}

function navigateToResults() {
    navigateToScreen(
        elements.screens.results, 
        elements.screens.main, 
        elements.screens.preview,
        elements.screens.camera
    );
}

// UI Feedback
function showLoading(show) {
    elements.containers.loading.style.display = show ? 'flex' : 'none';
    elements.containers.results.classList.toggle('hidden', show);
}

let toastTimeout;
function showToast(message, duration = 3000) {
    clearTimeout(toastTimeout);
    
    const toast = elements.toast;
    document.getElementById('toastMessage').textContent = message;
    toast.classList.remove('hidden');
    
    toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
    }, duration);
}

// Utility Functions
function getBase64FromImage(imgElement) {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Set canvas size to match image
            canvas.width = imgElement.naturalWidth;
            canvas.height = imgElement.naturalHeight;
            
            // Draw image onto canvas
            context.drawImage(imgElement, 0, 0);
            
            // Get base64 data
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        } catch (error) {
            reject(error);
        }
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 1) {
        return 'Today';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
}

function resetState() {
    elements.inputs.imageInput.value = '';
    elements.containers.preview.src = '';
    elements.containers.resultImage.src = '';
    elements.containers.results.classList.add('hidden');
    currentPlantData = null;
}

// Share Functionality
async function shareResults() {
    if (!currentPlantData) return;

    const shareText = `
🌿 Plant identified using PlantSmart AI

${currentPlantData.commonName}
Scientific Name: ${currentPlantData.scientificName}

${currentPlantData.description}

#PlantSmartAI #Plants`;

    try {
        if (navigator.share) {
            await navigator.share({
                title: 'Plant Identification Result',
                text: shareText
            });
        } else {
            await navigator.clipboard.writeText(shareText);
            showToast('Results copied to clipboard!');
        }
    } catch (error) {
        console.error('Sharing failed:', error);
        showToast('Unable to share results');
    }
}

// History Item Loading
window.loadHistoryItem = function(id) {
    const item = searchHistory.find(i => i.id === id);
    if (item) {
        currentPlantData = item;
        elements.containers.preview.src = item.imageUrl;
        elements.containers.resultImage.src = item.imageUrl;
        navigateToResults();
        displayResults(item);
    }
};

// Error Handling
window.addEventListener('error', function(e) {
    console.error('Global error:', e);
    showToast('Something went wrong. Please try again.');
});

// Network Status Handling
window.addEventListener('online', function() {
    showToast('Back online!', 2000);
});

window.addEventListener('offline', function() {
    showToast('No internet connection');
});

// Cleanup on Page Unload
window.addEventListener('beforeunload', function() {
    stopCamera();
    // Cleanup object URLs
    if (elements.containers.preview.src.startsWith('blob:')) {
        URL.revokeObjectURL(elements.containers.preview.src);
    }
    if (elements.containers.resultImage.src.startsWith('blob:')) {
        URL.revokeObjectURL(elements.containers.resultImage.src);
    }
});

// Prevent zoom on double tap (mobile)
document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

