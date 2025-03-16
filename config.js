// config.js
(function() {
    // Check if Firebase is available
    function initializeConfig() {
        // Application Configuration
        window.CONFIG = {
            // API Configuration
            API_KEY: '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',
            API_ENDPOINT: 'https://openrouter.ai/api/v1/chat/completions',
            API_MODEL: 'google/gemma-3-27b-it:free',
            
            // TensorFlow Settings
            TENSORFLOW: {
                confidence_threshold: 0.7,
                top_k: 3
            },
            
            // File Restrictions
            MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
            ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
            
            // History Settings
            MAX_HISTORY_ITEMS: 50,
            
            // Storage Keys
            STORAGE_KEYS: {
                THEME: 'plantSmart_theme',
                HISTORY: 'plantSmart_history',
                SETTINGS: 'plantSmart_settings',
                USER_ATTEMPTS: 'plantSmart_attempts'
            },

            // Default Settings
            DEFAULT_SETTINGS: {
                darkTheme: false,
                emailNotifications: true
            },

            // Subscription Plans
            PLANS: {
                FREE: {
                    name: 'Free Plan',
                    maxAttempts: 5,
                    features: ['Basic Plant Identification', 'Limited History']
                },
                MONTHLY: {
                    name: 'Monthly Plan',
                    price: 5,
                    period: 'month',
                    features: ['Unlimited Identifications', 'Full History Access', 'Detailed Information']
                },
                QUARTERLY: {
                    name: 'Quarterly Plan',
                    price: 12,
                    period: '3 months',
                    features: ['Everything in Monthly', 'Priority Support', 'Save $3/month']
                },
                YEARLY: {
                    name: 'Yearly Plan',
                    price: 45,
                    period: 'year',
                    features: ['Everything in Quarterly', 'API Access', 'Save $15/year']
                }
            },

            // Toast Duration
            TOAST_DURATION: 3000,

            // Developer Emails
            DEVELOPER_EMAILS: ['sameer.amor00@gmail.com', 'dev@example.com'],

            // Error Messages
            ERRORS: {
                AUTH: {
                    INVALID_EMAIL: 'Please enter a valid email address',
                    WEAK_PASSWORD: 'Password should be at least 6 characters long',
                    EMAIL_IN_USE: 'This email is already registered',
                    INVALID_CREDENTIALS: 'Invalid email or password',
                    REQUIRES_RECENT_LOGIN: 'Please log in again to complete this action',
                    ACCOUNT_EXISTS: 'An account already exists with this email',
                    PROFILE_UPDATE_FAILED: 'Failed to update profile',
                    SUBSCRIPTION_UPDATE_FAILED: 'Failed to update subscription'
                },
                FILE: {
                    SIZE: 'File size should be less than 5MB',
                    TYPE: 'Please upload a valid image file (JPG or PNG)',
                    UPLOAD_FAILED: 'Failed to upload image'
                },
                API: {
                    IDENTIFICATION_FAILED: 'Failed to identify plant. Please try again',
                    NETWORK_ERROR: 'Network error. Please check your connection',
                    SERVER_ERROR: 'Server error. Please try again later'
                },
                MODEL: {
                    LOAD_FAILED: 'Failed to load identification model. Please check your internet connection.',
                    PROCESSING_FAILED: 'Failed to process image. Please try another photo.',
                    IDENTIFICATION_FAILED: 'Could not identify any plants in the image. Please try a clearer photo.'
                }
            },

            MODEL_URLS: {
                PRIMARY: 'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0/model/model.json',
                FALLBACK: 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json',
                CACHE_KEY: 'mobilenet-model-cache'
            }
        };

        // Utility Functions
        window.utils = {
            isDevMode() {
                return firebase.auth().currentUser && 
                       window.CONFIG.DEVELOPER_EMAILS.includes(firebase.auth().currentUser.email);
            },

            async checkUserSubscription() {
                const user = firebase.auth().currentUser;
                if (!user) return null;

                // Check if user is a developer - make this check first and explicit
                if (window.CONFIG.DEVELOPER_EMAILS.includes(user.email)) {
                    return {
                        plan: 'DEVELOPER',
                        status: 'active',
                        unlimited: true,
                        displayName: 'Developer Access'
                    };
                }

                try {
                    const doc = await firebase.firestore().collection('subscriptions')
                        .doc(user.uid).get();
                    return doc.exists ? doc.data() : null;
                } catch (error) {
                    console.error('Error checking subscription:', error);
                    return null;
                }
            },

            async getRemainingAttempts() {
                try {
                    const user = firebase.auth().currentUser;
                    
                    // Developer check
                    if (user && window.CONFIG.DEVELOPER_EMAILS.includes(user.email)) {
                        return Infinity;
                    }

                    // First check local attempts
                    const localAttempts = await this.getLocalAttempts();
                    
                    if (!user) {
                        // For guests, use only local storage
                        if (localAttempts === null) {
                            await this.setLocalAttempts(window.CONFIG.PLANS.FREE.maxAttempts);
                            return window.CONFIG.PLANS.FREE.maxAttempts;
                        }
                        return localAttempts;
                    }

                    // For logged in users
                    try {
                        const doc = await firebase.firestore()
                            .collection('users')
                            .doc(user.uid)
                            .get();

                        let attempts;
                        if (!doc.exists) {
                            attempts = window.CONFIG.PLANS.FREE.maxAttempts;
                            await firebase.firestore()
                                .collection('users')
                                .doc(user.uid)
                                .set({
                                    remainingAttempts: attempts,
                                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                                });
                        } else {
                            attempts = doc.data().remainingAttempts;
                        }

                        // Sync with local storage
                        await this.setLocalAttempts(attempts);
                        return attempts;
                    } catch (error) {
                        console.error('Firestore error:', error);
                        return localAttempts ?? window.CONFIG.PLANS.FREE.maxAttempts;
                    }
                } catch (error) {
                    console.error('Error getting attempts:', error);
                    return window.CONFIG.PLANS.FREE.maxAttempts;
                }
            },

            async updateRemainingAttempts(attempts) {
                try {
                    // Save to IndexedDB first
                    await this.setLocalAttempts(attempts);
                    
                    const user = firebase.auth().currentUser;
                    if (user) {
                        // Update Firestore for logged in users
                        await firebase.firestore()
                            .collection('users')
                            .doc(user.uid)
                            .update({
                                remainingAttempts: attempts,
                                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                            });
                    }

                    // Update UI
                    await this.updateAttemptsDisplay(attempts);

                    // Show upgrade modal if no attempts left
                    if (attempts <= 0) {
                        const subscriptionModal = document.getElementById('subscriptionModal');
                        if (subscriptionModal) {
                            subscriptionModal.classList.remove('hidden');
                        }
                    }
                } catch (error) {
                    console.error('Error updating attempts:', error);
                }
            },

            async updateAttemptsDisplay(attempts) {
                // Ensure we have a numeric value
                let displayAttempts = attempts;
                if (displayAttempts instanceof Promise) {
                    displayAttempts = await displayAttempts;
                }
                if (displayAttempts === null || isNaN(displayAttempts)) {
                    displayAttempts = window.CONFIG.PLANS.FREE.maxAttempts;
                }

                const attemptsCounter = document.getElementById('attemptsCounter');
                const attemptsLeft = document.getElementById('attemptsLeft');
                
                const isUnlimited = displayAttempts === Infinity || 
                    (firebase.auth().currentUser && 
                     window.CONFIG.DEVELOPER_EMAILS.includes(firebase.auth().currentUser.email));
                
                if (attemptsCounter) {
                    if (isUnlimited) {
                        attemptsCounter.innerHTML = `
                            <span class="unlimited-badge">
                                <i class="fas fa-infinity"></i>
                                Unlimited Access
                            </span>
                        `;
                    } else {
                        attemptsCounter.innerHTML = `
                            <span>Free Attempts Left: <strong>${displayAttempts}</strong></span>
                            ${displayAttempts <= 2 ? '<span class="upgrade-hint">Upgrade for unlimited!</span>' : ''}
                        `;
                    }
                }
                
                if (attemptsLeft) {
                    attemptsLeft.textContent = isUnlimited ? '∞' : displayAttempts;
                }

                // Update local storage
                await this.setLocalAttempts(displayAttempts);
            },

            getOrCreateSessionId() {
                let sessionId = sessionStorage.getItem('guestSessionId');
                if (!sessionId) {
                    sessionId = this.generateUniqueId();
                    sessionStorage.setItem('guestSessionId', sessionId);
                }
                return sessionId;
            },

            async getOrCreatePersistentSessionId() {
                try {
                    const db = await this.openIndexedDB();
                    const tx = db.transaction('session', 'readonly');
                    const store = tx.objectStore('session');
                    let sessionId = await store.get('sessionId');

                    if (!sessionId) {
                        sessionId = this.generateUniqueId();
                        const writeTx = db.transaction('session', 'readwrite');
                        const writeStore = writeTx.objectStore('session');
                        await writeStore.put(sessionId, 'sessionId');
                    }

                    return sessionId;
                } catch (error) {
                    console.error('IndexedDB error:', error);
                    // Fallback to localStorage if IndexedDB fails
                    let sessionId = localStorage.getItem('persistentSessionId');
                    if (!sessionId) {
                        sessionId = this.generateUniqueId();
                        localStorage.setItem('persistentSessionId', sessionId);
                    }
                    return sessionId;
                }
            },

            async openIndexedDB() {
                return new Promise((resolve, reject) => {
                    const request = indexedDB.open('PlantSmartAI', 1);

                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result);

                    request.onupgradeneeded = (event) => {
                        const db = event.target.result;
                        if (!db.objectStoreNames.contains('session')) {
                            db.createObjectStore('session');
                        }
                        if (!db.objectStoreNames.contains('attempts')) {
                            db.createObjectStore('attempts');
                        }
                    };
                });
            },

            async setLocalAttempts(attempts) {
                return new Promise((resolve, reject) => {
                    const request = indexedDB.open('PlantSmartAI', 1);
                    
                    request.onerror = () => reject(request.error);
                    
                    request.onsuccess = (event) => {
                        const db = event.target.result;
                        const tx = db.transaction('attempts', 'readwrite');
                        const store = tx.objectStore('attempts');
                        
                        const putRequest = store.put(attempts, 'remainingAttempts');
                        
                        putRequest.onsuccess = () => resolve();
                        putRequest.onerror = () => reject(putRequest.error);
                    };

                    request.onupgradeneeded = (event) => {
                        const db = event.target.result;
                        if (!db.objectStoreNames.contains('attempts')) {
                            db.createObjectStore('attempts');
                        }
                    };
                });
            },

            async getLocalAttempts() {
                return new Promise((resolve, reject) => {
                    const request = indexedDB.open('PlantSmartAI', 1);
                    
                    request.onerror = () => resolve(null);
                    
                    request.onsuccess = (event) => {
                        const db = event.target.result;
                        const tx = db.transaction('attempts', 'readonly');
                        const store = tx.objectStore('attempts');
                        
                        const getRequest = store.get('remainingAttempts');
                        
                        getRequest.onsuccess = () => resolve(getRequest.result);
                        getRequest.onerror = () => resolve(null);
                    };

                    request.onupgradeneeded = (event) => {
                        const db = event.target.result;
                        if (!db.objectStoreNames.contains('attempts')) {
                            db.createObjectStore('attempts');
                        }
                    };
                });
            },

            async shouldAllowIdentification() {
                const subscription = await this.checkUserSubscription();
                if (subscription) return true;

                const remainingAttempts = this.getRemainingAttempts();
                return remainingAttempts > 0;
            },

            shouldShowUpgradePrompt() {
                const attempts = this.getRemainingAttempts();
                return attempts <= 2 && !this.checkUserSubscription();
            },

            formatDate(date) {
                return new Intl.DateTimeFormat('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }).format(date instanceof Date ? date : new Date(date));
            },

            generateUniqueId() {
                return Date.now().toString(36) + Math.random().toString(36).substr(2);
            },

            async uploadImage(file, path) {
                if (!firebase.auth().currentUser) {
                    throw new Error('User not authenticated');
                }

                if (!this.validateImage(file)) {
                    throw new Error(window.CONFIG.ERRORS.FILE.TYPE);
                }

                const storagePath = path || `plants/${firebase.auth().currentUser.uid}/${this.generateUniqueId()}`;
                const storageRef = firebase.storage().ref(storagePath);

                try {
                    const snapshot = await storageRef.put(file);
                    return await snapshot.ref.getDownloadURL();
                } catch (error) {
                    console.error('Error uploading image:', error);
                    throw new Error(window.CONFIG.ERRORS.FILE.UPLOAD_FAILED);
                }
            },

            validateImage(file) {
                if (!window.CONFIG.ALLOWED_TYPES.includes(file.type)) {
                    this.showToast(window.CONFIG.ERRORS.FILE.TYPE);
                    return false;
                }

                if (file.size > window.CONFIG.MAX_FILE_SIZE) {
                    this.showToast(window.CONFIG.ERRORS.FILE.SIZE);
                    return false;
                }

                return true;
            },

            showToast(message, duration = window.CONFIG.TOAST_DURATION) {
                const toast = document.getElementById('toast');
                const toastMessage = document.getElementById('toastMessage');
                
                if (toast && toastMessage) {
                    toastMessage.textContent = message;
                    toast.classList.remove('hidden');
                    
                    setTimeout(() => {
                        toast.classList.add('hidden');
                    }, duration);
                }
            },

            saveToLocalStorage(key, data) {
                try {
                    localStorage.setItem(key, JSON.stringify(data));
                    return true;
                } catch (error) {
                    console.error('Error saving to localStorage:', error);
                    return false;
                }
            },

            getFromLocalStorage(key) {
                try {
                    const item = localStorage.getItem(key);
                    return item ? JSON.parse(item) : null;
                } catch (error) {
                    console.error('Error reading from localStorage:', error);
                    return null;
                }
            },

            sanitizeHTML(str) {
                const div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            },

            showLoading(show = true) {
                const loadingContainer = document.getElementById('loadingContainer');
                if (loadingContainer) {
                    loadingContainer.classList.toggle('hidden', !show);
                }
            },

            toggleModal(modalId, show) {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.toggle('hidden', !show);
                }
            },

            toggleTheme(isDark) {
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                this.saveToLocalStorage(window.CONFIG.STORAGE_KEYS.THEME, isDark);
            }
        };

        // Initialize theme from saved settings
        const savedTheme = window.utils.getFromLocalStorage(window.CONFIG.STORAGE_KEYS.THEME);
        if (savedTheme !== null) {
            window.utils.toggleTheme(savedTheme);
        }

        console.log('Configuration and utilities initialized successfully');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeConfig);
    } else {
        initializeConfig();
    }
})();
