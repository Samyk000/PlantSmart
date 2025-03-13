// Constants and Configuration
const CONFIG = {
    API_KEY: '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',
    MAX_FILE_SIZE: 5 * 1024 * 1024,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
    HISTORY_KEY: 'plantSearchHistory',
    MAX_HISTORY_ITEMS: 20,
    TOAST_DURATION: 3000
};

// Feature Detection
const FEATURES = {
    camera: 'mediaDevices' in navigator,
    share: 'share' in navigator,
    storage: 'localStorage' in window
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
        backFromPreview: document.getElementById('backFromPreview'),
        backFromResults: document.getElementById('backFromResults'),
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
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage')
};

// Application State
const AppState = {
    currentScreen: 'main',
    previousScreen: null,
    isLoading: false,
    currentPlantData: null,
    history: [],
    stream: null,
    facingMode: 'environment',
    isFromHistory: false,

    setState(updates) {
        Object.assign(this, updates);
        this.notifyListeners();
    },

    listeners: new Set(),

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    },

    notifyListeners() {
        this.listeners.forEach(listener => listener(this));
    }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    setupEventListeners();
    checkCameraSupport();
    loadSearchHistory();
    updateUIBasedOnFeatures();
}

// Event Listeners Setup
function setupEventListeners() {
    // Camera Controls
    if (elements.camera.openBtn) {
        elements.camera.openBtn.addEventListener('click', initCamera);
    }
    if (elements.camera.closeBtn) {
        elements.camera.closeBtn.addEventListener('click', () => {
            stopCamera();
            navigateToScreen('main');
        });
    }
    if (elements.camera.captureBtn) {
        elements.camera.captureBtn.addEventListener('click', capturePhoto);
    }
    if (elements.camera.switchBtn) {
        elements.camera.switchBtn.addEventListener('click', switchCamera);
    }

    // Upload Controls
    if (elements.buttons.upload && elements.inputs.imageInput) {
        elements.buttons.upload.addEventListener('click', () => elements.inputs.imageInput.click());
        elements.inputs.imageInput.addEventListener('change', handleImageSelect);
    }

    // Navigation
    if (elements.buttons.showHistory) {
        elements.buttons.showHistory.addEventListener('click', () => {
            AppState.previousScreen = AppState.currentScreen;
            navigateToScreen('history');
        });
    }
    if (elements.buttons.closeHistory) {
        elements.buttons.closeHistory.addEventListener('click', () => {
            navigateToScreen(AppState.previousScreen || 'main');
        });
    }
    if (elements.buttons.clearHistory) {
        elements.buttons.clearHistory.addEventListener('click', clearHistory);
    }
    if (elements.buttons.backFromPreview) {
        elements.buttons.backFromPreview.addEventListener('click', () => navigateBack('preview'));
    }
    if (elements.buttons.backFromResults) {
        elements.buttons.backFromResults.addEventListener('click', () => navigateBack('results'));
    }
    if (elements.buttons.retakePhoto) {
        elements.buttons.retakePhoto.addEventListener('click', () => {
            cleanup();
            initCamera();
        });
    }
    if (elements.buttons.identifyBtn) {
        elements.buttons.identifyBtn.addEventListener('click', startIdentification);
    }
    if (elements.buttons.newSearch) {
        elements.buttons.newSearch.addEventListener('click', () => {
            cleanup();
            navigateToScreen('main');
        });
    }
    if (elements.buttons.shareResults) {
        elements.buttons.shareResults.addEventListener('click', shareResults);
    }

    // Handle back button
    window.addEventListener('popstate', handlePopState);
}

// Navigation Functions
function navigateToScreen(screenId) {
    if (screenId === AppState.currentScreen) return;

    Object.entries(elements.screens).forEach(([id, screen]) => {
        if (screen) {
            screen.classList.toggle('hidden', id !== screenId);
        }
    });

    // Special handling for history navigation
    if (screenId === 'history') {
        renderHistoryList(); // Refresh history list when showing history screen
    }

    AppState.setState({ 
        previousScreen: AppState.currentScreen,
        currentScreen: screenId
    });

    history.pushState({ screen: screenId }, '', `#${screenId}`);
}

function navigateBack(fromScreen) {
    switch (fromScreen) {
        case 'preview':
            if (AppState.isFromHistory) {
                navigateToScreen('history');
            } else {
                stopCamera();
                navigateToScreen('main');
            }
            break;
        case 'results':
            if (AppState.isFromHistory) {
                navigateToScreen('history');
            } else {
                navigateToScreen('preview');
            }
            break;
        default:
            navigateToScreen('main');
    }
    AppState.setState({ isFromHistory: false });
}

function handlePopState(event) {
    const screen = event.state?.screen || 'main';
    navigateToScreen(screen);
}

// Camera Functions
async function checkCameraSupport() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        if (elements.camera.openBtn) {
            elements.camera.openBtn.style.display = hasCamera ? 'flex' : 'none';
        }
    } catch (error) {
        console.error('Camera check failed:', error);
        if (elements.camera.openBtn) {
            elements.camera.openBtn.style.display = 'none';
        }
    }
}

async function initCamera() {
    try {
        const constraints = {
            video: { 
                facingMode: AppState.facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        AppState.stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (elements.camera.feed) {
            elements.camera.feed.srcObject = AppState.stream;
            await elements.camera.feed.play();
        }
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMultipleCameras = devices.filter(device => device.kind === 'videoinput').length > 1;
        if (elements.camera.switchBtn) {
            elements.camera.switchBtn.style.display = hasMultipleCameras ? 'block' : 'none';
        }

        navigateToScreen('camera');
    } catch (error) {
        console.error('Camera initialization failed:', error);
        showToast('Cannot access camera. Please check permissions or try uploading an image.');
    }
}

function stopCamera() {
    if (AppState.stream) {
        AppState.stream.getTracks().forEach(track => track.stop());
        AppState.stream = null;
    }
}

async function switchCamera() {
    AppState.facingMode = AppState.facingMode === 'environment' ? 'user' : 'environment';
    await stopCamera();
    await initCamera();
}

async function capturePhoto() {
    try {
        const video = elements.camera.feed;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (AppState.facingMode === 'user') {
            ctx.scale(-1, 1);
            ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        } else {
            ctx.drawImage(video, 0, 0);
        }

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        handleCapturedImage(blob);
    } catch (error) {
        console.error('Photo capture failed:', error);
        showToast('Failed to capture photo. Please try again.');
    }
}

// Image Handling
function handleCapturedImage(blob) {
    stopCamera();
    displayPreview(blob);
    navigateToScreen('preview');
}

async function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        if (!validateImage(file)) return;
        const optimizedImage = await optimizeImage(file);
        displayPreview(optimizedImage);
        navigateToScreen('preview');
    } catch (error) {
        console.error('Image processing error:', error);
        showToast('Error processing image. Please try again.');
    } finally {
        if (elements.inputs.imageInput) {
            elements.inputs.imageInput.value = '';
        }
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

function displayPreview(blob) {
    const url = URL.createObjectURL(blob);
    if (elements.containers.preview) {
        elements.containers.preview.src = url;
    }
    if (elements.containers.resultImage) {
        elements.containers.resultImage.src = url;
    }
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

// Plant Identification
async function startIdentification() {
    try {
        navigateToScreen('results');
        showLoading(true);
        const imageData = await getBase64FromImage(elements.containers.preview);
        await identifyPlant(imageData);
    } catch (error) {
        console.error('Start identification error:', error);
        showToast('Failed to process image. Please try again.');
        navigateToScreen('preview');
    }
}

async function identifyPlant(base64Image) {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'PlantSmart AI'
            },
            body: JSON.stringify({
                model: 'google/gemini-pro-vision',
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: "Analyze this plant and provide ONLY a JSON response in this format (no additional text): {\"commonName\":\"\",\"scientificName\":\"\",\"description\":\"\",\"characteristics\":{\"type\":\"\",\"height\":\"\",\"spread\":\"\",\"flowering\":\"\"},\"growingInfo\":{\"sunlight\":\"\",\"water\":\"\",\"soil\":\"\"},\"quickFacts\":[\"fact1\",\"fact2\",\"fact3\",\"fact4\",\"fact5\"]}"
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
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        const plantData = JSON.parse(sanitizeJSON(data.choices[0].message.content));
        
        AppState.setState({ currentPlantData: plantData });
        saveToHistory(plantData);
        displayResults(plantData);
    } catch (error) {
        console.error('Plant identification failed:', error);
        throw new Error('Failed to identify plant');
    } finally {
        showLoading(false);
    }
}

// History Management
function loadSearchHistory() {
    try {
        const saved = localStorage.getItem(CONFIG.HISTORY_KEY);
        AppState.history = saved ? JSON.parse(saved) : [];
        renderHistoryList();
    } catch (error) {
        console.error('History loading error:', error);
        AppState.history = [];
        showToast('Error loading history');
    }
}

function renderHistoryList() {
    if (!elements.containers.historyList) return;

    if (!AppState.history.length) {
        elements.containers.historyList.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-history"></i>
                <p>No plants identified yet</p>
                <small>Your identified plants will appear here</small>
            </div>
        `;
        return;
    }

    elements.containers.historyList.innerHTML = AppState.history.map(item => `
        <div class="history-item" data-id="${item.id}">
            <img src="${sanitizeHTML(item.imageUrl)}" alt="${sanitizeHTML(item.commonName)}" loading="lazy">
            <div class="history-item-info">
                <h4>${sanitizeHTML(item.commonName)}</h4>
                <p>${sanitizeHTML(item.scientificName)}</p>
                <small class="history-date">${formatDate(item.timestamp)}</small>
            </div>
            <i class="fas fa-chevron-right"></i>
        </div>
    `).join('');

    // Add click event listeners
    elements.containers.historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            loadHistoryItem(Number(item.dataset.id));
            AppState.setState({ isFromHistory: true });
        });
    });
}

function loadHistoryItem(id) {
    const item = AppState.history.find(i => i.id === id);
    if (item) {
        AppState.setState({ currentPlantData: item });
        if (elements.containers.preview) elements.containers.preview.src = item.imageUrl;
        if (elements.containers.resultImage) elements.containers.resultImage.src = item.imageUrl;
        navigateToScreen('results');
        displayResults(item);
    }
}

function saveToHistory(plantData) {
    const historyItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        imageUrl: elements.containers.preview.src,
        ...plantData
    };

    AppState.history.unshift(historyItem);
    if (AppState.history.length > CONFIG.MAX_HISTORY_ITEMS) {
        AppState.history.pop();
    }

    localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(AppState.history));
    renderHistoryList();
}

function clearHistory() {
    if (confirm('Are you sure you want to clear your search history?')) {
        AppState.history = [];
        localStorage.removeItem(CONFIG.HISTORY_KEY);
        renderHistoryList();
        showToast('History cleared');
    }
}

// Results Display
function displayResults(data) {
    if (!elements.text.plantCommonName || !elements.text.plantScientificName || !elements.containers.plantDetails) {
        return;
    }

    elements.text.plantCommonName.textContent = data.commonName;
    elements.text.plantScientificName.textContent = data.scientificName;

    elements.containers.plantDetails.innerHTML = `
        <div class="detail-section">
            <h3><i class="fas fa-info-circle"></i> About</h3>
            <p>${sanitizeHTML(data.description)}</p>
        </div>

        <div class="detail-section">
            <h3><i class="fas fa-leaf"></i> Characteristics</h3>
            <div class="characteristic-list">
                ${Object.entries(data.characteristics).map(([key, value]) => `
                    <div class="characteristic-item">
                        <i class="fas ${getCharacteristicIcon(key)}"></i>
                        <span>${sanitizeHTML(value)}</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="detail-section">
            <h3><i class="fas fa-seedling"></i> Growing Information</h3>
            <div class="growing-info">
                ${Object.entries(data.growingInfo).map(([key, value]) => `
                    <div class="info-item">
                        <i class="fas ${getGrowingIcon(key)}"></i>
                        <span>${sanitizeHTML(value)}</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="detail-section">
            <h3><i class="fas fa-lightbulb"></i> Quick Facts</h3>
            <ul class="facts-list">
                ${data.quickFacts.map(fact => `
                    <li>${sanitizeHTML(fact)}</li>
                `).join('')}
            </ul>
        </div>
    `;

    if (elements.containers.results) {
        elements.containers.results.classList.remove('hidden');
    }
    if (elements.containers.loading) {
        elements.containers.loading.classList.add('hidden');
    }
}

// Utility Functions
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

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
        }

        const diffTime = now - date;
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
        if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    } catch (error) {
        console.error('Date formatting error:', error);
        return 'Date unavailable';
    }
}

async function getBase64FromImage(imgElement) {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (!imgElement.complete) {
                imgElement.onload = () => processImage();
                imgElement.onerror = () => reject(new Error('Image loading failed'));
            } else {
                processImage();
            }

            function processImage() {
                canvas.width = imgElement.naturalWidth;
                canvas.height = imgElement.naturalHeight;
                context.drawImage(imgElement, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            }
        } catch (error) {
            reject(error);
        }
    });
}

// Security Functions
function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function sanitizeJSON(jsonString) {
    try {
        const jsonStart = jsonString.indexOf('{');
        const jsonEnd = jsonString.lastIndexOf('}') + 1;
        return jsonString.slice(jsonStart, jsonEnd);
    } catch (error) {
        console.error('JSON sanitization error:', error);
        return '{}';
    }
}

// Share Functionality
async function shareResults() {
    if (!AppState.currentPlantData) return;

    const shareText = `
🌿 Plant identified using PlantSmart AI

${AppState.currentPlantData.commonName}
Scientific Name: ${AppState.currentPlantData.scientificName}

${AppState.currentPlantData.description}

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

// Loading State Management
function showLoading(show) {
    if (elements.containers.loading) {
        elements.containers.loading.style.display = show ? 'flex' : 'none';
    }
    if (elements.containers.results) {
        elements.containers.results.classList.toggle('hidden', show);
    }
}

// Improved Toast Notification System
let toastTimeout;
function showToast(message, duration = CONFIG.TOAST_DURATION) {
    if (!elements.toast || !elements.toastMessage) return;

    // Clear any existing timeout
    clearTimeout(toastTimeout);

    // Update toast message and show it
    elements.toastMessage.textContent = message;
    elements.toast.classList.remove('hidden');
    
    // Set up the timeout to hide the toast
    toastTimeout = setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, duration);
}

// Feature Detection Update
function updateUIBasedOnFeatures() {
    if (!FEATURES.camera && elements.camera.openBtn) {
        elements.camera.openBtn.style.display = 'none';
    }
    if (!FEATURES.share && elements.buttons.shareResults) {
        elements.buttons.shareResults.style.display = 'none';
    }
}

// Cleanup Functions
function cleanup() {
    stopCamera();
    
    if (elements.inputs.imageInput) {
        elements.inputs.imageInput.value = '';
    }
    
    // Cleanup object URLs
    [elements.containers.preview, elements.containers.resultImage].forEach(img => {
        if (img && img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
            img.src = '';
        }
    });

    AppState.setState({
        currentPlantData: null,
        isLoading: false,
        isFromHistory: false
    });
}

// Event Listeners for Page Visibility and Unload
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        cleanup();
    }
});

window.addEventListener('beforeunload', cleanup);

// Prevent zoom on double tap (mobile)
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

// Error Handling
window.addEventListener('error', function(e) {
    console.error('Global error:', e);
    showToast('Something went wrong. Please try again.');
});

// Network Status Handling
window.addEventListener('online', () => showToast('Back online!', 2000));
window.addEventListener('offline', () => showToast('No internet connection'));