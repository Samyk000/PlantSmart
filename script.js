// Constants and Configuration
const CONFIG = {
    API_KEY: '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',
    MAX_FILE_SIZE: 5 * 1024 * 1024,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
    HISTORY_KEY: 'plantSearchHistory',
    MAX_HISTORY_ITEMS: 20,
    TOAST_DURATION: 3000,
    STORAGE_VERSION: '1.0',
    STORAGE_KEYS: {
        HISTORY: 'plantSearchHistory',
        APP_STATE: 'plantSmartState',
        SETTINGS: 'plantSmartSettings'
    },
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
};

// Feature Detection
const FEATURES = {
    camera: 'mediaDevices' in navigator,
    share: 'share' in navigator,
    storage: (() => {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            return false;
        }
    })()
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
    navigationStack: ['main'],
    isLoading: false,
    currentPlantData: null,
    history: [],
    stream: null,
    facingMode: 'environment',
    isFromHistory: false,
    lastAction: null,
    retryCount: 0,

    setState(updates) {
        Object.assign(this, updates);
        this.notifyListeners();
        this.saveToStorage();
    },

    listeners: new Set(),

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    },

    notifyListeners() {
        this.listeners.forEach(listener => listener(this));
    },

    saveToStorage() {
        if (!FEATURES.storage) return;

        const stateToSave = {
            currentScreen: this.currentScreen,
            previousScreen: this.previousScreen,
            navigationStack: this.navigationStack,
            history: this.history,
            facingMode: this.facingMode,
            version: CONFIG.STORAGE_VERSION
        };

        try {
            localStorage.setItem(
                CONFIG.STORAGE_KEYS.APP_STATE,
                JSON.stringify(stateToSave)
            );
        } catch (error) {
            console.error('Error saving state:', error);
        }
    },

    loadFromStorage() {
        if (!FEATURES.storage) return;

        try {
            const savedState = localStorage.getItem(CONFIG.STORAGE_KEYS.APP_STATE);
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                if (parsedState.version === CONFIG.STORAGE_VERSION) {
                    Object.assign(this, parsedState);
                }
            }
        } catch (error) {
            console.error('Error loading state:', error);
        }
    },

    clearStorage() {
        if (!FEATURES.storage) return;
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.APP_STATE);
        } catch (error) {
            console.error('Error clearing state:', error);
        }
    }
};

// Initialize Application
function initializeApp() {
    AppState.loadFromStorage();
    setupEventListeners();
    checkCameraSupport();
    loadSearchHistory();
    updateUIBasedOnFeatures();
}

// UI Update Functions
function updateUIBasedOnFeatures() {
    if (!FEATURES.camera && elements.camera.openBtn) {
        elements.camera.openBtn.style.display = 'none';
    }
    if (!FEATURES.share && elements.buttons.shareResults) {
        elements.buttons.shareResults.style.display = 'none';
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Camera Controls
    if (elements.camera.openBtn) {
        elements.camera.openBtn.addEventListener('click', () => {
            AppState.setState({ lastAction: 'camera' });
            initCamera();
        });
    }
    if (elements.camera.closeBtn) {
        elements.camera.closeBtn.addEventListener('click', () => {
            stopCamera();
            navigateBack();
        });
    }
    if (elements.camera.captureBtn) {
        elements.camera.captureBtn.addEventListener('click', capturePhoto);
    }
    if (elements.camera.switchBtn) {
        elements.camera.switchBtn.addEventListener('click', switchCamera);
    }

    // Upload Controls
    if (elements.buttons.upload) {
        elements.buttons.upload.addEventListener('click', () => {
            AppState.setState({ lastAction: 'upload' });
            elements.inputs.imageInput.click();
        });
    }
    if (elements.inputs.imageInput) {
        elements.inputs.imageInput.addEventListener('change', handleImageSelect);
    }

    // Navigation and History
    if (elements.buttons.showHistory) {
        elements.buttons.showHistory.addEventListener('click', () => {
            AppState.setState({ 
                previousScreen: AppState.currentScreen,
                lastAction: 'showHistory'
            });
            navigateToScreen('history');
        });
    }
    if (elements.buttons.closeHistory) {
        elements.buttons.closeHistory.addEventListener('click', () => navigateBack());
    }
    if (elements.buttons.clearHistory) {
        elements.buttons.clearHistory.addEventListener('click', clearHistory);
    }
    if (elements.buttons.backFromPreview) {
        elements.buttons.backFromPreview.addEventListener('click', () => navigateBack());
    }
    if (elements.buttons.backFromResults) {
        elements.buttons.backFromResults.addEventListener('click', () => navigateBack());
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

    // Handle back button and window events
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', () => {
        cleanup();
        AppState.saveToStorage();
    });
    window.addEventListener('online', () => showToast('Connection restored', 2000));
    window.addEventListener('offline', () => showToast('No internet connection'));
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        showToast('Something went wrong. Please try again.');
        cleanup();
    });

    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && AppState.currentScreen === 'camera') {
            stopCamera();
            navigateBack();
        }
    });
}

// Navigation Functions
function navigateToScreen(screenId) {
    if (screenId === AppState.currentScreen) return;

    // Update navigation stack
    AppState.navigationStack.push(screenId);

    // Handle screen transitions
    Object.entries(elements.screens).forEach(([id, screen]) => {
        if (screen) {
            screen.classList.toggle('hidden', id !== screenId);
        }
    });

    // Special handling for specific screens
    if (screenId === 'history') {
        renderHistoryList();
    }

    // Update state
    AppState.setState({ 
        previousScreen: AppState.currentScreen,
        currentScreen: screenId
    });

    // Update browser history
    history.pushState({ screen: screenId }, '', `#${screenId}`);
}

function navigateBack() {
    // Remove current screen from navigation stack
    AppState.navigationStack.pop();
    
    const previousScreen = AppState.navigationStack[AppState.navigationStack.length - 1] || 'main';

    switch (AppState.currentScreen) {
        case 'results':
            if (AppState.isFromHistory) {
                navigateToScreen('history');
            } else {
                navigateToScreen('main');
            }
            break;

        case 'preview':
            if (AppState.isFromHistory) {
                navigateToScreen('history');
            } else {
                navigateToScreen('main');
            }
            break;

        case 'history':
            navigateToScreen('main');
            break;

        default:
            navigateToScreen(previousScreen);
    }

    // Reset state when returning to main
    if (previousScreen === 'main') {
        AppState.setState({ 
            isFromHistory: false,
            lastAction: null
        });
    }
}

function handlePopState(event) {
    const screen = event.state?.screen || 'main';
    
    if (AppState.navigationStack[AppState.navigationStack.length - 1] !== screen) {
        AppState.navigationStack.pop();
    }
    
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


// Camera Initialization and Control
async function initCamera() {
    try {
        const constraints = {
            video: { 
                facingMode: AppState.facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        // Stop any existing stream before requesting new one
        stopCamera();

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
        navigateToScreen('main');
    }
}

function stopCamera() {
    try {
        if (AppState.stream) {
            AppState.stream.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            AppState.stream = null;
        }
        
        if (elements.camera.feed) {
            elements.camera.feed.srcObject = null;
        }
    } catch (error) {
        console.error('Error stopping camera:', error);
    }
}

async function switchCamera() {
    AppState.facingMode = AppState.facingMode === 'environment' ? 'user' : 'environment';
    await initCamera();
}

// Image Capture and Processing
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
    if (elements.containers.preview) {
        elements.containers.preview.src = url;
        elements.containers.preview.onload = () => URL.revokeObjectURL(url);
    }
    if (elements.containers.resultImage) {
        elements.containers.resultImage.src = url;
    }
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
        navigateBack();
    }
}

async function getBase64FromImage(imgElement) {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            const processImage = () => {
                canvas.width = imgElement.naturalWidth;
                canvas.height = imgElement.naturalHeight;
                context.drawImage(imgElement, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };

            if (!imgElement.complete) {
                imgElement.onload = processImage;
                imgElement.onerror = () => reject(new Error('Image loading failed'));
            } else {
                processImage();
            }
        } catch (error) {
            reject(error);
        }
    });
}

// Plant Identification API and Results
async function identifyPlant(base64Image) {
    try {
        if (!base64Image || typeof base64Image !== 'string') {
            throw new Error('Invalid image data');
        }

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
                            text: `Analyze this plant and provide ONLY a JSON response in this exact format:
                            {
                                "commonName": "",
                                "scientificName": "",
                                "description": "",
                                "characteristics": {
                                    "type": "",
                                    "height": "",
                                    "spread": "",
                                    "flowering": ""
                                },
                                "growingInfo": {
                                    "sunlight": "",
                                    "water": "",
                                    "soil": ""
                                },
                                "quickFacts": ["fact1", "fact2", "fact3", "fact4", "fact5"]
                            }`
                        },
                        {
                            type: 'image_url',
                            image_url: { url: base64Image }
                        }
                    ]
                }],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Invalid API response structure');
        }

        const plantData = JSON.parse(sanitizeJSON(data.choices[0].message.content));

        if (!plantData.commonName || !plantData.scientificName) {
            throw new Error('Incomplete plant identification data');
        }

        AppState.setState({ currentPlantData: plantData });
        saveToHistory(plantData);
        displayResults(plantData);

        return plantData;
    } catch (error) {
        console.error('Plant identification failed:', error);
        showToast('Unable to identify plant. Please try again with a clearer image.');
        throw new Error('Failed to identify plant');
    } finally {
        showLoading(false);
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

// History Management
function loadSearchHistory() {
    try {
        if (FEATURES.storage) {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY);
            if (saved) {
                AppState.history = JSON.parse(saved);
                AppState.history = AppState.history.filter(item => 
                    item && item.id && item.commonName && item.imageUrl
                );
            }
        }
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

    elements.containers.historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            loadHistoryItem(Number(item.dataset.id));
            AppState.setState({ isFromHistory: true });
        });
    });
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

    if (FEATURES.storage) {
        try {
            localStorage.setItem(
                CONFIG.STORAGE_KEYS.HISTORY, 
                JSON.stringify(AppState.history)
            );
        } catch (error) {
            console.error('Error saving history:', error);
            while (AppState.history.length > 0) {
                AppState.history.pop();
                try {
                    localStorage.setItem(
                        CONFIG.STORAGE_KEYS.HISTORY, 
                        JSON.stringify(AppState.history)
                    );
                    break;
                } catch (e) {
                    continue;
                }
            }
        }
    }

    renderHistoryList();
}

// Utility Functions and Event Handlers
function sanitizeJSON(jsonString) {
    try {
        jsonString = jsonString.replace(/[^\x20-\x7E]/g, '');
        const start = jsonString.indexOf('{');
        const end = jsonString.lastIndexOf('}') + 1;
        
        if (start === -1 || end === 0) {
            throw new Error('Invalid JSON structure');
        }
        
        const cleanJson = jsonString.slice(start, end);
        JSON.parse(cleanJson); // Validate JSON
        return cleanJson;
    } catch (error) {
        console.error('JSON sanitization error:', error);
        return JSON.stringify({
            commonName: "Unknown Plant",
            scientificName: "Species unknown",
            description: "Unable to process plant details",
            characteristics: {
                type: "Unknown",
                height: "Unknown",
                spread: "Unknown",
                flowering: "Unknown"
            },
            growingInfo: {
                sunlight: "Unknown",
                water: "Unknown",
                soil: "Unknown"
            },
            quickFacts: [
                "Unable to identify plant details",
                "Please try again with a clearer image",
                "Ensure the plant is well-lit and in focus"
            ]
        });
    }
}

// Additional Utility Functions
function sanitizeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
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

// Loading State Management
function showLoading(show) {
    if (elements.containers.loading) {
        elements.containers.loading.style.display = show ? 'flex' : 'none';
    }
    if (elements.containers.results) {
        elements.containers.results.classList.toggle('hidden', show);
    }
    AppState.setState({ isLoading: show });
}

// Toast Notification System
let toastTimeout;
function showToast(message, duration = CONFIG.TOAST_DURATION) {
    if (!elements.toast || !elements.toastMessage) return;

    clearTimeout(toastTimeout);
    elements.toastMessage.textContent = message;
    elements.toast.classList.remove('hidden');
    
    toastTimeout = setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, duration);
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

// History Item Loading
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

// Clear History
function clearHistory() {
    if (confirm('Are you sure you want to clear your search history?')) {
        AppState.history = [];
        if (FEATURES.storage) {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.HISTORY);
        }
        renderHistoryList();
        showToast('History cleared');
    }
}

// Enhanced Cleanup
function cleanup() {
    stopCamera();
    
    if (elements.inputs.imageInput) {
        elements.inputs.imageInput.value = '';
    }
    
    [elements.containers.preview, elements.containers.resultImage].forEach(img => {
        if (img && img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
            img.src = '';
        }
    });

    AppState.setState({
        currentPlantData: null,
        isLoading: false,
        isFromHistory: false,
        lastAction: null,
        retryCount: 0
    });

    clearTimeout(toastTimeout);
}

// Error Recovery
async function retryOperation(operation, maxRetries = CONFIG.MAX_RETRIES) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * (i + 1)));
        }
    }
    
    throw lastError;
}

// Prevent zoom on double tap (mobile)
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

// Initialize the application
document.addEventListener('DOMContentLoaded', initializeApp);

// Handle service worker if present
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(error => {
            console.error('Service worker registration failed:', error);
        });
    });
}
