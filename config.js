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
                emailNotifications: true,
                developerMode: false
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
            DEVELOPER_EMAILS: ['dev@example.com'],

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

                try {
                    const doc = await firebase.firestore().collection('subscriptions')
                        .doc(user.uid).get();
                    return doc.exists ? doc.data() : null;
                } catch (error) {
                    console.error('Error checking subscription:', error);
                    return null;
                }
            },

            getRemainingAttempts() {
                const stored = localStorage.getItem(window.CONFIG.STORAGE_KEYS.USER_ATTEMPTS);
                return stored ? parseInt(stored) : window.CONFIG.PLANS.FREE.maxAttempts;
            },

            updateRemainingAttempts(attempts) {
                localStorage.setItem(window.CONFIG.STORAGE_KEYS.USER_ATTEMPTS, attempts.toString());
                this.updateAttemptsDisplay(attempts);
            },

            updateAttemptsDisplay(attempts) {
                const attemptsCounter = document.getElementById('attemptsCounter');
                const attemptsLeft = document.getElementById('attemptsLeft');
                
                if (attemptsCounter) {
                    attemptsCounter.innerHTML = `<span>Free Attempts Left: <strong>${attempts}</strong></span>`;
                }
                if (attemptsLeft) {
                    attemptsLeft.textContent = attempts;
                }
            },

            async shouldAllowIdentification() {
                const subscription = await this.checkUserSubscription();
                if (subscription) return true;

                const remainingAttempts = this.getRemainingAttempts();
                return remainingAttempts > 0;
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