// app.js
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		startAppInit();
	});
} else {
	startAppInit();
}

function startAppInit() {
	// Wait for Firebase and other dependencies to be loaded
	const initInterval = setInterval(() => {
		if (typeof firebase !== 'undefined' && 
			typeof window.CONFIG !== 'undefined' && 
			typeof window.utils !== 'undefined' && 
			typeof window.authManager !== 'undefined') {
			clearInterval(initInterval);
			initializeApp();
		}
	}, 100);
	
	// ...existing code (initializeApp function remains unchanged)...
    function initializeApp() {
        class PlantSmartApp {
            constructor() {
                this.state = {
                    currentScreen: 'main',
                    isLoading: false,
                    stream: null,
                    facingMode: 'environment',
                    currentPlantData: null,
                    currentImage: null,
                    history: [],
                    settings: window.CONFIG.DEFAULT_SETTINGS
                };
                this.initializeElements();
                this.setupEventListeners();
                this.loadHistory();
                this.checkCameraSupport();
                this.loadSettings();
                this.setupIntersectionObserver();
                this.setupProgressiveLoading();
                this.setupLoadingSteps();
            }

            initializeElements() {
                this.elements = {
                    screens: {
                        main: document.getElementById('mainScreen'),
                        camera: document.getElementById('cameraScreen'),
                        preview: document.getElementById('previewResultsScreen')
                    },
                    camera: {
                        feed: document.getElementById('cameraFeed'),
                        openBtn: document.getElementById('openCamera'),
                        closeBtn: document.getElementById('closeCamera'),
                        captureBtn: document.getElementById('capturePhoto'),
                        switchBtn: document.getElementById('switchCamera')
                    },
                    preview: {
                        image: document.getElementById('previewImage'),
                        identifyBtn: document.getElementById('identifyBtn')
                    },
                    results: {
                        container: document.getElementById('resultsContent'),
                        plantName: document.getElementById('plantCommonName'),
                        scientificName: document.getElementById('plantScientificName'),
                        details: document.getElementById('plantDetails'),
                        loading: document.getElementById('loadingContainer')
                    },
                    modals: {
                        settings: document.getElementById('settingsModal'),
                        history: document.getElementById('historyModal')
                    },
                    buttons: {
                        upload: document.getElementById('uploadBtn'),
                        newSearch: document.getElementById('newSearch'),
                        showHistory: document.getElementById('showHistory'),
                        shareResults: document.getElementById('shareResults'),
                        clearHistory: document.getElementById('clearHistoryBtn'),
                        backFromResults: document.getElementById('backFromResults'),
                        showSettings: document.getElementById('showSettings')
                    },
                    inputs: {
                        imageInput: document.getElementById('imageInput'),
                        darkThemeToggle: document.getElementById('darkThemeToggle'),
                        emailNotificationsToggle: document.getElementById('emailNotificationsToggle'),
                        developerModeToggle: document.getElementById('developerModeToggle')
                    },
                    historyList: document.getElementById('historyList')
                };
            }

            setupEventListeners() {
                // Camera Controls
                this.elements.camera.openBtn?.addEventListener('click', () => this.initCamera());
                this.elements.camera.closeBtn?.addEventListener('click', () => this.stopCamera());
                this.elements.camera.captureBtn?.addEventListener('click', () => this.capturePhoto());
                this.elements.camera.switchBtn?.addEventListener('click', () => this.switchCamera());

                // Image Upload
                this.elements.buttons.upload?.addEventListener('click', () => this.elements.inputs.imageInput.click());
                this.elements.inputs.imageInput?.addEventListener('change', (e) => this.handleImageSelect(e));

                // Results Navigation
                this.elements.buttons.backFromResults?.addEventListener('click', () => this.navigateToScreen('main'));
                this.elements.buttons.newSearch?.addEventListener('click', () => this.resetAndStartNew());

                // History & Settings
                this.elements.buttons.showHistory?.addEventListener('click', () => this.toggleHistoryModal(true));
                this.elements.buttons.clearHistory?.addEventListener('click', () => this.clearHistory());
                this.elements.buttons.showSettings?.addEventListener('click', () => this.toggleSettingsModal(true));

                // Results Actions
                this.elements.preview.identifyBtn?.addEventListener('click', () => this.startIdentification());
                this.elements.buttons.shareResults?.addEventListener('click', () => this.handleShareResults());

                // Settings Toggles
                this.elements.inputs.darkThemeToggle?.addEventListener('change', (e) => this.handleThemeToggle(e.target.checked));
                this.elements.inputs.emailNotificationsToggle?.addEventListener('change', (e) => this.handleNotificationsToggle(e.target.checked));
                this.elements.inputs.developerModeToggle?.addEventListener('change', (e) => this.handleDeveloperModeToggle(e.target.checked));

                // Modal Close Buttons
                document.getElementById('closeSettingsModal')?.addEventListener('click', () => this.toggleSettingsModal(false));
                document.getElementById('closeHistoryModal')?.addEventListener('click', () => this.toggleHistoryModal(false));

                // Window Events
                window.addEventListener('beforeunload', () => this.cleanup());
            }

            // Settings Management
            loadSettings() {
                const savedSettings = window.utils.getFromLocalStorage(window.CONFIG.STORAGE_KEYS.SETTINGS);
                if (savedSettings) {
                    this.state.settings = { ...this.state.settings, ...savedSettings };
                    this.applySettings();
                }
            }

            applySettings() {
                if (this.elements.inputs.darkThemeToggle) {
                    this.elements.inputs.darkThemeToggle.checked = this.state.settings.darkTheme;
                }
                if (this.elements.inputs.emailNotificationsToggle) {
                    this.elements.inputs.emailNotificationsToggle.checked = this.state.settings.emailNotifications;
                }
                if (this.elements.inputs.developerModeToggle) {
                    this.elements.inputs.developerModeToggle.checked = this.state.settings.developerMode;
                }

                document.documentElement.setAttribute('data-theme', 
                    this.state.settings.darkTheme ? 'dark' : 'light');
            }

            saveSettings() {
                window.utils.saveToLocalStorage(window.CONFIG.STORAGE_KEYS.SETTINGS, this.state.settings);
            }

            handleThemeToggle(isDark) {
                this.state.settings.darkTheme = isDark;
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                this.saveSettings();
            }

            handleNotificationsToggle(enabled) {
                this.state.settings.emailNotifications = enabled;
                this.saveSettings();
            }

            handleDeveloperModeToggle(enabled) {
                this.state.settings.developerMode = enabled;
                this.saveSettings();
            }
            
            
            
                        // Camera Handling
            async checkCameraSupport() {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const hasCamera = devices.some(device => device.kind === 'videoinput');
                    if (this.elements.camera.openBtn) {
                        this.elements.camera.openBtn.style.display = hasCamera ? 'flex' : 'none';
                    }
                } catch (error) {
                    console.error('Camera check failed:', error);
                    if (this.elements.camera.openBtn) {
                        this.elements.camera.openBtn.style.display = 'none';
                    }
                }
            }

            async initCamera() {
                try {
                    const constraints = {
                        video: {
                            facingMode: this.state.facingMode,
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        }
                    };

                    this.stopCamera();
                    this.state.stream = await navigator.mediaDevices.getUserMedia(constraints);
                    
                    if (this.elements.camera.feed) {
                        this.elements.camera.feed.srcObject = this.state.stream;
                        await this.elements.camera.feed.play();
                    }

                    this.navigateToScreen('camera');

                    // Check for multiple cameras
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const hasMultipleCameras = devices.filter(device => 
                        device.kind === 'videoinput').length > 1;
                    if (this.elements.camera.switchBtn) {
                        this.elements.camera.switchBtn.style.display = hasMultipleCameras ? 'block' : 'none';
                    }
                } catch (error) {
                    console.error('Camera initialization failed:', error);
                    window.utils.showToast('Cannot access camera. Please check permissions.');
                    this.navigateToScreen('main');
                }
            }

            stopCamera() {
                if (this.state.stream) {
                    this.state.stream.getTracks().forEach(track => track.stop());
                    this.state.stream = null;
                }
                
                if (this.elements.camera.feed) {
                    this.elements.camera.feed.srcObject = null;
                }
            }

            async switchCamera() {
                this.state.facingMode = this.state.facingMode === 'environment' ? 'user' : 'environment';
                await this.initCamera();
            }

            async capturePhoto() {
                try {
                    const video = this.elements.camera.feed;
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    const ctx = canvas.getContext('2d');
                    if (this.state.facingMode === 'user') {
                        ctx.scale(-1, 1);
                        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
                    } else {
                        ctx.drawImage(video, 0, 0);
                    }

                    // Convert to base64 with reduced quality
                    const base64Image = canvas.toDataURL('image/jpeg', 0.8);
                    this.handleCapturedImage(base64Image);
                } catch (error) {
                    console.error('Photo capture failed:', error);
                    window.utils.showToast('Failed to capture photo. Please try again.');
                }
            }

            // Image Processing
            async handleImageSelect(event) {
                const file = event.target.files?.[0];
                if (!file) return;

                try {
                    if (!window.utils.validateImage(file)) return;
                    const base64Image = await this.optimizeImage(file);
                    this.handleCapturedImage(base64Image);
                } catch (error) {
                    console.error('Image processing error:', error);
                    window.utils.showToast('Error processing image. Please try again.');
                } finally {
                    event.target.value = ''; // Reset input
                }
            }

            async optimizeImage(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');

                            // Calculate new dimensions while maintaining aspect ratio
                            let { width, height } = this.calculateDimensions(img.width, img.height, 800);
                            canvas.width = width;
                            canvas.height = height;

                            ctx.drawImage(img, 0, 0, width, height);
                            resolve(canvas.toDataURL('image/jpeg', 0.8));
                        };
                        img.onerror = reject;
                        img.src = e.target.result;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }

            calculateDimensions(width, height, maxDim) {
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

            async handleCapturedImage(base64Image) {
                this.stopCamera();
                this.state.currentImage = base64Image;
                
                requestAnimationFrame(() => {
                    // Use smooth transitions
                    this.elements.preview.image.style.opacity = '0';
                    this.elements.preview.image.src = base64Image;
                    this.elements.preview.image.onload = () => {
                        requestAnimationFrame(() => {
                            this.elements.preview.image.style.opacity = '1';
                        });
                    };
                });

                this.navigateToScreen('preview');
            }

            // Plant Identification
            async startIdentification() {
                if (!await window.utils.shouldAllowIdentification()) {
                    window.utils.showToast('No remaining attempts. Please upgrade your account.');
                    return;
                }

                try {
                    window.utils.showLoading(true);
                    await this.identifyPlant(this.state.currentImage);
                } catch (error) {
                    console.error('Identification error:', error);
                    window.utils.showToast('Failed to identify plant. Please try again.');
                } finally {
                    window.utils.showLoading(false);
                }
            }

            async identifyPlant(base64Image) {
                try {
                    // Load image
                    const img = new Image();
                    const loadPromise = new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = () => reject(new Error('Failed to load image'));
                    });
                    img.src = base64Image;
                    await loadPromise;

                    // Get TensorFlow predictions
                    const predictions = await window.plantModel.classifyImage(img);
                    
                    if (!predictions.length) {
                        throw new Error(window.CONFIG.ERRORS.MODEL.IDENTIFICATION_FAILED);
                    }

                    // Enhance with Gemma
                    const plantData = await window.plantModel.enhanceWithGemma(predictions, base64Image);
                    
                    this.state.currentPlantData = {
                        ...plantData,
                        confidence: predictions[0].score,
                        predictedLabels: predictions.map(p => ({
                            label: p.label,
                            confidence: p.score
                        }))
                    };

                    await this.saveToHistory(this.state.currentPlantData);
                    this.displayResults(this.state.currentPlantData);
                    await this.updateUserStats();

                } catch (error) {
                    console.error('Plant identification failed:', error);
                    throw error;
                }
            }

                        // Results Display
            displayResults(data) {
                if (!this.elements.results.container) return;

                this.elements.results.plantName.textContent = data.commonName;
                this.elements.results.scientificName.textContent = data.scientificName;
                this.elements.results.details.innerHTML = this.generateDetailsHTML(data);
                this.elements.results.container.classList.remove('hidden');
                this.elements.results.loading.classList.add('hidden');
            }

            generateDetailsHTML(data) {
                return `
                    <div class="detail-section">
                        <h3><i class="fas fa-info-circle"></i> About</h3>
                        <p>${window.utils.sanitizeHTML(data.description)}</p>
                    </div>
                    <div class="detail-section">
                        <h3><i class="fas fa-leaf"></i> Characteristics</h3>
                        <div class="characteristics-list">
                            ${Object.entries(data.characteristics || {}).map(([key, value]) => `
                                <div class="characteristic-item">
                                    <i class="fas ${this.getCharacteristicIcon(key)}"></i>
                                    <span>${window.utils.sanitizeHTML(value)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="detail-section">
                        <h3><i class="fas fa-seedling"></i> Growing Information</h3>
                        <div class="growing-info">
                            ${Object.entries(data.growingInfo || {}).map(([key, value]) => `
                                <div class="info-item">
                                    <i class="fas ${this.getGrowingIcon(key)}"></i>
                                    <span>${window.utils.sanitizeHTML(value)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ${data.quickFacts ? `
                        <div class="detail-section">
                            <h3><i class="fas fa-lightbulb"></i> Quick Facts</h3>
                            <ul class="facts-list">
                                ${data.quickFacts.map(fact => `
                                    <li>${window.utils.sanitizeHTML(fact)}</li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                `;
            }

            // History Management
            async loadHistory() {
                try {
                    const user = firebase.auth().currentUser;
                    if (user) {
                        const snapshot = await firebase.firestore()
                            .collection('users')
                            .doc(user.uid)
                            .collection('history')
                            .orderBy('timestamp', 'desc')
                            .limit(window.CONFIG.MAX_HISTORY_ITEMS)
                            .get();

                        this.state.history = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                    } else {
                        const savedHistory = window.utils.getFromLocalStorage(window.CONFIG.STORAGE_KEYS.HISTORY);
                        this.state.history = savedHistory || [];
                    }

                    this.updateHistoryUI();
                } catch (error) {
                    console.error('Error loading history:', error);
                    window.utils.showToast('Error loading history');
                }
            }

            async saveToHistory(plantData) {
                const historyItem = {
                    id: window.utils.generateUniqueId(),
                    timestamp: new Date().toISOString(),
                    imageData: this.state.currentImage,
                    ...plantData
                };

                try {
                    const user = firebase.auth().currentUser;
                    if (user) {
                        // Save to Firestore without image data
                        const firestoreItem = {
                            ...historyItem,
                            imageData: null // Don't store image in Firestore
                        };
                        
                        await firebase.firestore()
                            .collection('users')
                            .doc(user.uid)
                            .collection('history')
                            .doc(historyItem.id)
                            .set(firestoreItem);
                    }

                    // Save to local storage with image
                    this.state.history.unshift(historyItem);
                    this.state.history = this.state.history
                        .slice(0, window.CONFIG.MAX_HISTORY_ITEMS);
                    
                    window.utils.saveToLocalStorage(
                        window.CONFIG.STORAGE_KEYS.HISTORY,
                        this.state.history
                    );

                    this.updateHistoryUI();
                } catch (error) {
                    console.error('Error saving to history:', error);
                    window.utils.showToast('Error saving to history');
                }
            }

            async clearHistory() {
                try {
                    const user = firebase.auth().currentUser;
                    if (user) {
                        const batch = firebase.firestore().batch();
                        const snapshot = await firebase.firestore()
                            .collection('users')
                            .doc(user.uid)
                            .collection('history')
                            .get();

                        snapshot.docs.forEach(doc => {
                            batch.delete(doc.ref);
                        });

                        await batch.commit();
                    }

                    this.state.history = [];
                    window.utils.saveToLocalStorage(window.CONFIG.STORAGE_KEYS.HISTORY, []);
                    this.updateHistoryUI();
                    window.utils.showToast('History cleared successfully');
                } catch (error) {
                    console.error('Error clearing history:', error);
                    window.utils.showToast('Error clearing history');
                }
            }

            updateHistoryUI() {
                if (!this.elements.historyList) return;

                this.elements.historyList.innerHTML = this.state.history
                    .map(item => this.generateHistoryItemHTML(item))
                    .join('');
            }

            generateHistoryItemHTML(item) {
                return `
                    <div class="history-item" data-id="${item.id}">
                        <img src="${item.imageData || 'placeholder.jpg'}" 
                             alt="${item.commonName}" 
                             loading="lazy">
                        <div class="history-item-details">
                            <h4>${window.utils.sanitizeHTML(item.commonName)}</h4>
                            <p>${window.utils.sanitizeHTML(item.scientificName)}</p>
                            <span class="history-date">
                                ${window.utils.formatDate(new Date(item.timestamp))}
                            </span>
                        </div>
                    </div>
                `;
            }

            // Modal Management
            toggleHistoryModal(show) {
                const modal = this.elements.modals.history;
                if (modal) {
                    modal.classList.toggle('hidden', !show);
                    if (show) {
                        this.updateHistoryUI();
                    }
                }
            }

            toggleSettingsModal(show) {
                const modal = this.elements.modals.settings;
                if (modal) {
                    modal.classList.toggle('hidden', !show);
                }
            }

            // Sharing
            async handleShareResults() {
                if (!this.state.currentPlantData) {
                    window.utils.showToast('No results to share');
                    return;
                }

                try {
                    const shareData = {
                        title: 'Plant Identification Result',
                        text: `I identified ${this.state.currentPlantData.commonName} using PlantSmart AI!`,
                        url: window.location.href
                    };

                    if (navigator.share) {
                        await navigator.share(shareData);
                    } else {
                        await navigator.clipboard.writeText(
                            `${shareData.title}\n${shareData.text}\n${shareData.url}`
                        );
                        window.utils.showToast('Results copied to clipboard!');
                    }
                } catch (error) {
                    console.error('Share failed:', error);
                    window.utils.showToast('Failed to share results');
                }
            }

            // Navigation
            navigateToScreen(screenId) {
                Object.entries(this.elements.screens).forEach(([id, screen]) => {
                    if (screen) {
                        screen.classList.toggle('hidden', id !== screenId);
                    }
                });
                this.state.currentScreen = screenId;
            }

            // Utility Functions
            getCharacteristicIcon(type) {
                const icons = {
                    type: 'fa-pagelines',
                    height: 'fa-arrows-alt-v',
                    spread: 'fa-arrows-alt-h',
                    flowering: 'fa-flower'
                };
                return icons[type] || 'fa-info-circle';
            }

            getGrowingIcon(type) {
                const icons = {
                    sunlight: 'fa-sun',
                    water: 'fa-tint',
                    soil: 'fa-mountain'
                };
                return icons[type] || 'fa-info-circle';
            }

            async updateUserStats() {
                const user = firebase.auth().currentUser;
                if (!user) return;

                try {
                    await firebase.firestore()
                        .collection('users')
                        .doc(user.uid)
                        .update({
                            identificationCount: firebase.firestore.FieldValue.increment(1),
                            lastIdentification: firebase.firestore.FieldValue.serverTimestamp()
                        });
                } catch (error) {
                    console.error('Error updating user stats:', error);
                }
            }

            resetAndStartNew() {
                this.state.currentPlantData = null;
                this.state.currentImage = null;
                if (this.elements.preview.image) {
                    this.elements.preview.image.src = '';
                }
                this.navigateToScreen('main');
            }

            // Cleanup
            cleanup() {
                this.stopCamera();
                this.saveSettings();
            }

            setupIntersectionObserver() {
                const options = {
                    root: null,
                    rootMargin: '20px',
                    threshold: 0.1
                };

                this.observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const target = entry.target;
                            if (target.classList.contains('lazy-load')) {
                                this.loadElement(target);
                            }
                        }
                    });
                }, options);

                document.querySelectorAll('.lazy-load').forEach(el => this.observer.observe(el));
            }

            setupProgressiveLoading() {
                // Add skeleton screens
                document.querySelectorAll('.skeleton-loader').forEach(skeleton => {
                    skeleton.classList.add('skeleton');
                });

                // Remove skeletons when content loads
                window.addEventListener('load', () => {
                    document.querySelectorAll('.skeleton-loader').forEach(skeleton => {
                        skeleton.classList.remove('skeleton');
                    });
                });
            }

            setupLoadingSteps() {
                window.addEventListener('loadingStepUpdate', (event) => {
                    const { step, message } = event.detail;
                    this.updateLoadingUI(step, message);
                });
            }

            updateLoadingUI(currentStep, message) {
                // Safely get elements
                const elements = {
                    title: document.getElementById('loadingTitle'),
                    message: document.getElementById('loadingMessage'),
                    fill: document.querySelector('.progress-fill'),
                    steps: document.querySelectorAll('.step')
                };

                // Ensure loading container is visible
                const container = document.getElementById('loadingContainer');
                if (container) {
                    container.classList.remove('hidden');
                }

                // Update title and message with null checks
                if (elements.title) {
                    elements.title.textContent = message || '';
                }

                if (elements.message) {
                    elements.message.textContent = message || '';
                }

                // Update progress bar with null check
                if (elements.fill) {
                    const progress = ((currentStep - 1) / 3) * 100;
                    elements.fill.style.width = `${progress}%`;
                }

                // Update steps with null check
                if (elements.steps && elements.steps.length) {
                    elements.steps.forEach((step, index) => {
                        step.classList.remove('active', 'completed');
                        if (index + 1 < currentStep) {
                            step.classList.add('completed');
                        } else if (index + 1 === currentStep) {
                            step.classList.add('active');
                        }
                    });
                }
            }
        }

        // Initialize the app
        window.app = new PlantSmartApp();
        console.log('PlantSmart App initialized successfully');
    }
}