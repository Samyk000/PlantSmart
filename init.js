// init.js

if (document.readyState === 'loading') {
    // Wait for the document and Firebase to be ready
    document.addEventListener('DOMContentLoaded', function() {
        // Check if Firebase is loaded
        const checkFirebase = setInterval(function() {
            if (typeof firebase !== 'undefined') {
                clearInterval(checkFirebase);
                initializeFirebase();
            }
        }, 100);
    });
} else {
    // Check if Firebase is loaded
    const checkFirebase = setInterval(function() {
        if (typeof firebase !== 'undefined') {
            clearInterval(checkFirebase);
            initializeFirebase();
        }
    }, 100);
}

// Initialize Firebase
function initializeFirebase() {
    // Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyCoi8AR-h8M24Qwjl3zrVBs-4624EsGFKI",
        authDomain: "social-e7fb8.firebaseapp.com",
        projectId: "social-e7fb8",
        storageBucket: "social-e7fb8.firebasestorage.app",
        messagingSenderId: "1028153462014",
        appId: "1:1028153462014:web:31dae9f798fb7c20a2a9af"
    };

    try {
        // Initialize Firebase if not already initialized
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        // Initialize services
        window.db = firebase.firestore();
        window.auth = firebase.auth();
        window.storage = firebase.storage();

        // Configure Firestore
        window.db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
        });

        // Enable offline persistence with multi-tab support
        window.db.enablePersistence({
            synchronizeTabs: true
        }).catch((err) => {
            if (err.code == 'failed-precondition') {
                // Multiple tabs open, persistence can only be enabled in one tab at a time.
                console.log('Multiple tabs open, persistence disabled');
            } else if (err.code == 'unimplemented') {
                // The current browser doesn't support persistence
                console.log('Browser doesn\'t support persistence');
            }
        });

        // Initialize default settings
        window.DEFAULT_SETTINGS = {
            darkTheme: false,
            emailNotifications: true,
            developerMode: false
        };

        // Initialize app state
        window.appState = {
            currentUser: null,
            currentScreen: 'main',
            isLoading: false,
            history: [],
            settings: { ...window.DEFAULT_SETTINGS }
        };

        // Set up global utility functions
        window.showToast = function(message, duration = 3000) {
            const toast = document.getElementById('toast');
            const toastMessage = document.getElementById('toastMessage');
            if (toast && toastMessage) {
                toastMessage.textContent = message;
                toast.classList.remove('hidden');
                setTimeout(() => {
                    toast.classList.add('hidden');
                }, duration);
            }
        };

        window.loadUserSettings = function() {
            const settings = localStorage.getItem('plantSmart_settings');
            if (settings) {
                try {
                    window.appState.settings = JSON.parse(settings);
                } catch (error) {
                    console.error('Error loading settings:', error);
                }
            }
        };

        // Load user settings
        window.loadUserSettings();

        // Apply initial theme
        document.documentElement.setAttribute('data-theme', 
            window.appState.settings.darkTheme ? 'dark' : 'light'
        );

        console.log('Firebase initialized successfully');
        window.isFirebaseInitialized = true; // added to ensure proper state update
        // Dispatch event when Firebase is ready
        window.dispatchEvent(new Event('firebaseReady'));

    } catch (error) {
        console.error('Error initializing Firebase:', error);
    }
}

// Add Firebase initialization status to window
window.isFirebaseInitialized = false;

// Create a promise that resolves when Firebase is ready
window.firebaseReady = new Promise((resolve) => {
    if (window.isFirebaseInitialized) {
        resolve();
    } else {
        window.addEventListener('firebaseReady', () => {
            window.isFirebaseInitialized = true;
            resolve();
        });
    }
});