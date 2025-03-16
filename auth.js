// auth.js
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize AuthManager once Firebase is definitely loaded
        const initInterval = setInterval(() => {
            if (typeof firebase !== 'undefined' && typeof window.CONFIG !== 'undefined') {
                clearInterval(initInterval);
                initializeAuthManager();
            }
        }, 100);
    });
} else {
    // Initialize AuthManager once Firebase is definitely loaded
    const initInterval = setInterval(() => {
        if (typeof firebase !== 'undefined' && typeof window.CONFIG !== 'undefined') {
            clearInterval(initInterval);
            initializeAuthManager();
        }
    }, 100);
}

function initializeAuthManager() {
    class AuthManager {
        constructor() {
            this.currentUser = null;
            this.subscription = null;
            this.userData = null;
            this.initAuthStateListener();
            this.setupEventListeners();
        }

        // Initialize Authentication State Listener
        initAuthStateListener() {
            try {
                firebase.auth().onAuthStateChanged(async (user) => {
                    this.currentUser = user;
                    if (user) {
                        await this.loadUserData();
                        this.updateUIForAuthenticatedUser();
                    } else {
                        this.updateUIForUnauthenticatedUser();
                    }
                });
            } catch (error) {
                console.error('Auth state listener error:', error);
            }
        }

        // Setup Event Listeners
        setupEventListeners() {
            // Auth Modal Controls
            document.getElementById('authButton')?.addEventListener('click', () => this.toggleAuthModal());
            document.getElementById('closeAuthModal')?.addEventListener('click', () => this.closeAuthModal());

            // Form Navigation
            document.getElementById('showSignUp')?.addEventListener('click', () => this.showForm('signUpForm'));
            document.getElementById('showSignIn')?.addEventListener('click', () => this.showForm('signInForm'));
            document.getElementById('showForgotPassword')?.addEventListener('click', () => this.showForm('forgotPasswordForm'));
            document.getElementById('backToSignIn')?.addEventListener('click', () => this.showForm('signInForm'));

            // Form Submissions
            document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleSignIn(e));
            document.getElementById('registerForm')?.addEventListener('submit', (e) => this.handleSignUp(e));
            document.getElementById('resetForm')?.addEventListener('submit', (e) => this.handlePasswordReset(e));

            // Profile Controls
            document.getElementById('showProfile')?.addEventListener('click', () => this.toggleProfileModal());
            document.getElementById('closeProfileModal')?.addEventListener('click', () => this.closeProfileModal());
            document.getElementById('logoutBtn')?.addEventListener('click', () => this.signOut());
            document.getElementById('editProfile')?.addEventListener('click', () => this.handleEditProfile());
            document.getElementById('upgradeAccount')?.addEventListener('click', () => this.handleUpgradeAccount());
            document.getElementById('viewHistory')?.addEventListener('click', () => this.handleViewHistory());

            // Subscription Modal
            document.querySelectorAll('.subscribe-btn').forEach(btn => {
                btn?.addEventListener('click', (e) => this.handleSubscription(e.target.dataset.plan));
            });

            // Modal Close Buttons
            document.getElementById('closeSubscriptionModal')?.addEventListener('click', () => 
                this.closeModal('subscriptionModal'));
            document.getElementById('closeHistoryModal')?.addEventListener('click', () => 
                this.closeModal('historyModal'));
        }

        // Authentication Form Handlers
        async handleSignIn(e) {
            e.preventDefault();
            this.showLoading(true);

            try {
                const email = e.target.loginEmail.value;
                const password = e.target.loginPassword.value;

                await firebase.auth().signInWithEmailAndPassword(email, password);
                this.showToast('Successfully signed in!');
                this.closeAuthModal();
                e.target.reset();
            } catch (error) {
                console.error('Sign in error:', error);
                this.showToast(this.getAuthErrorMessage(error));
            } finally {
                this.showLoading(false);
            }
        }

        async handleSignUp(e) {
            e.preventDefault();
            this.showLoading(true);

            try {
                const email = e.target.registerEmail.value;
                const password = e.target.registerPassword.value;
                const name = e.target.registerName.value;

                const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                await userCredential.user.updateProfile({ displayName: name });
                
                this.showToast('Account created successfully!');
                this.closeAuthModal();
                e.target.reset();
            } catch (error) {
                console.error('Sign up error:', error);
                this.showToast(this.getAuthErrorMessage(error));
            } finally {
                this.showLoading(false);
            }
        }

        async handlePasswordReset(e) {
            e.preventDefault();
            this.showLoading(true);

            try {
                const email = e.target.resetEmail.value;
                await firebase.auth().sendPasswordResetEmail(email);
                this.showToast('Password reset email sent!');
                this.showForm('signInForm');
                e.target.reset();
            } catch (error) {
                console.error('Password reset error:', error);
                this.showToast(this.getAuthErrorMessage(error));
            } finally {
                this.showLoading(false);
            }
        }

        // User Data Management
        async loadUserData() {
            try {
                if (!this.currentUser) return;

                // Load user history first
                await this.loadUserHistory();

                // Handle developer accounts
                if (window.CONFIG.DEVELOPER_EMAILS.includes(this.currentUser.email)) {
                    this.userData = {
                        uid: this.currentUser.uid,
                        email: this.currentUser.email,
                        name: this.currentUser.displayName || 'Developer',
                        isDeveloper: true,
                        identificationCount: Infinity,
                        remainingAttempts: Infinity,
                        settings: window.CONFIG.DEFAULT_SETTINGS
                    };
                    
                    this.subscription = {
                        plan: 'DEVELOPER',
                        status: 'active',
                        unlimited: true
                    };
                    
                    this.updateProfileUI();
                    return;
                }

                // Regular user data loading
                const [userDoc, subscriptionDoc] = await Promise.all([
                    firebase.firestore()
                        .collection('users')
                        .doc(this.currentUser.uid)
                        .get(),
                    firebase.firestore()
                        .collection('subscriptions')
                        .doc(this.currentUser.uid)
                        .get()
                ]);

                // Create user profile if it doesn't exist
                if (!userDoc.exists) {
                    const userProfile = {
                        uid: this.currentUser.uid,
                        email: this.currentUser.email,
                        name: this.currentUser.displayName || 'User',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        identificationCount: 0,
                        lastIdentification: null,
                        remainingAttempts: window.CONFIG.PLANS.FREE.maxAttempts,
                        settings: window.CONFIG.DEFAULT_SETTINGS
                    };

                    await firebase.firestore()
                        .collection('users')
                        .doc(this.currentUser.uid)
                        .set(userProfile);

                    this.userData = userProfile;
                } else {
                    this.userData = userDoc.data();
                }

                if (subscriptionDoc.exists) {
                    this.subscription = subscriptionDoc.data();
                }

                // Initialize attempts for new users
                if (!this.userData.hasOwnProperty('remainingAttempts')) {
                    await firebase.firestore()
                        .collection('users')
                        .doc(this.currentUser.uid)
                        .update({
                            remainingAttempts: window.CONFIG.PLANS.FREE.maxAttempts
                        });
                    this.userData.remainingAttempts = window.CONFIG.PLANS.FREE.maxAttempts;
                }

                this.updateProfileUI();
            } catch (error) {
                console.error('Error loading user data:', error);
                // Provide fallback data for developers even if Firestore fails
                if (window.CONFIG.DEVELOPER_EMAILS.includes(this.currentUser.email)) {
                    this.userData = {
                        uid: this.currentUser.uid,
                        email: this.currentUser.email,
                        name: 'Developer',
                        isDeveloper: true,
                        identificationCount: Infinity,
                        remainingAttempts: Infinity
                    };
                    this.updateProfileUI();
                } else {
                    window.utils.showToast('Error loading user data');
                }
            }
        }

        async loadUserHistory() {
            if (!this.currentUser) return;

            try {
                const snapshot = await firebase.firestore()
                    .collection('users')
                    .doc(this.currentUser.uid)
                    .collection('history')
                    .orderBy('timestamp', 'desc')
                    .limit(window.CONFIG.MAX_HISTORY_ITEMS)
                    .get();

                const history = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Update app state and localStorage
                if (window.app) {
                    window.app.state.history = history;
                    window.app.updateHistoryUI();
                    window.app.updateMainHistoryGrid();
                }

                window.utils.saveToLocalStorage(window.CONFIG.STORAGE_KEYS.HISTORY, history);
            } catch (error) {
                console.error('Error loading user history:', error);
            }
        }

        async createUserProfile() {
            if (!this.currentUser) return;

            try {
                const userProfile = {
                    uid: this.currentUser.uid,
                    email: this.currentUser.email,
                    name: this.currentUser.displayName || 'User',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    identificationCount: 0,
                    lastIdentification: null,
                    remainingAttempts: window.CONFIG.PLANS.FREE.maxAttempts,
                    settings: window.CONFIG.DEFAULT_SETTINGS
                };

                await firebase.firestore()
                    .collection('users')
                    .doc(this.currentUser.uid)
                    .set(userProfile);

                this.userData = userProfile;
            } catch (error) {
                console.error('Error creating user profile:', error);
                window.utils.showToast('Error creating user profile');
            }
        }

        // UI Updates
        updateUIForAuthenticatedUser() {
            const authButton = document.getElementById('authButton');
            const profileBtn = document.getElementById('showProfile');
            const settingsBtn = document.getElementById('showSettings');

            if (authButton) {
                authButton.classList.add('hidden');
            }

            if (profileBtn) {
                profileBtn.classList.remove('hidden');
            }

            if (settingsBtn) {
                settingsBtn.classList.remove('hidden');
            }

            // Update header layout
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.classList.add('authenticated');
            }
        }

        updateUIForUnauthenticatedUser() {
            const authButton = document.getElementById('authButton');
            const profileBtn = document.getElementById('showProfile');
            const settingsBtn = document.getElementById('showSettings');

            if (authButton) {
                authButton.classList.remove('hidden');
                authButton.innerHTML = `
                    <i class="fas fa-user-circle"></i>
                    <span>Sign In</span>
                `;
            }

            if (profileBtn) {
                profileBtn.classList.add('hidden');
            }

            if (settingsBtn) {
                settingsBtn.classList.remove('hidden');
            }

            // Update header layout
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.classList.remove('authenticated');
            }

            this.userData = null;
            this.subscription = null;

            // Reset subscription status
            const subscriptionStatus = document.getElementById('subscriptionStatus');
            if (subscriptionStatus) {
                subscriptionStatus.innerHTML = `
                    <i class="fas fa-leaf"></i>
                    <span>Free Plan</span>
                `;
            }

            // Reset attempts counter
            const attemptsCounter = document.getElementById('attemptsCounter');
            if (attemptsCounter) {
                attemptsCounter.innerHTML = `
                    <span>Free Attempts Left: <strong>5</strong></span>
                `;
            }

            // Reset stats
            const identificationCount = document.getElementById('identificationCount');
            const attemptsLeft = document.getElementById('attemptsLeft');
            if (identificationCount) identificationCount.textContent = '0';
            if (attemptsLeft) attemptsLeft.textContent = '5';
        }

        updateProfileUI() {
            if (!this.userData) return;

            const elements = {
                name: document.getElementById('profileName'),
                email: document.getElementById('profileEmail'),
                identificationCount: document.getElementById('identificationCount'),
                subscriptionStatus: document.getElementById('subscriptionStatus'),
                attemptsLeft: document.getElementById('attemptsLeft')
            };

            if (elements.name && this.userData.name) {
                elements.name.textContent = this.userData.name;
            }

            if (elements.email && this.userData.email) {
                elements.email.textContent = this.userData.email;
            }

            if (elements.identificationCount) {
                elements.identificationCount.textContent = this.userData.identificationCount || 0;
            }

            if (elements.subscriptionStatus) {
                if (this.subscription) {
                    elements.subscriptionStatus.innerHTML = `
                        <i class="fas fa-crown"></i>
                        <span>${window.CONFIG.PLANS[this.subscription.plan]?.name || 'Premium Plan'}</span>
                    `;
                } else if (window.CONFIG.DEVELOPER_EMAILS.includes(this.userData.email)) {
                    elements.subscriptionStatus.innerHTML = `
                        <i class="fas fa-crown"></i>
                        <span>Developer Account</span>
                    `;
                } else {
                    elements.subscriptionStatus.innerHTML = `
                        <i class="fas fa-leaf"></i>
                        <span>Free Plan</span>
                    `;
                }
            }

            // Update attempts display
            const attempts = window.CONFIG.DEVELOPER_EMAILS.includes(this.userData.email) ? 
                Infinity : 
                (this.subscription ? Infinity : this.userData.remainingAttempts);

            if (elements.attemptsLeft) {
                elements.attemptsLeft.textContent = attempts === Infinity ? '∞' : attempts;
            }

            // Update global attempts counter
            window.utils.updateAttemptsDisplay(attempts);
        }

        // Modal Management
        toggleAuthModal() {
            const modal = document.getElementById('authModal');
            if (modal) {
                modal.classList.toggle('hidden');
                if (!modal.classList.contains('hidden')) {
                    this.showForm('signInForm');
                }
            }
        }

        closeAuthModal() {
            const modal = document.getElementById('authModal');
            if (modal) {
                modal.classList.add('hidden');
            }
        }

        toggleProfileModal() {
            if (!this.currentUser) {
                this.toggleAuthModal();
                return;
            }

            const modal = document.getElementById('profileModal');
            if (modal) {
                modal.classList.toggle('hidden');
            }
        }

        closeProfileModal() {
            const modal = document.getElementById('profileModal');
            if (modal) {
                modal.classList.add('hidden');
            }
        }

        showForm(formId) {
            ['signInForm', 'signUpForm', 'forgotPasswordForm'].forEach(id => {
                const form = document.getElementById(id);
                if (form) {
                    form.classList.toggle('hidden', id !== formId);
                }
            });
        }

        // Action Handlers
        handleEditProfile() {
            this.showToast('Edit profile feature coming soon');
        }

        handleUpgradeAccount() {
            const modal = document.getElementById('subscriptionModal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        }

        handleViewHistory() {
            const modal = document.getElementById('historyModal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        }

        // Subscription Management
        async handleSubscription(plan) {
            if (!this.currentUser) {
                this.toggleAuthModal();
                return;
            }

            try {
                this.showLoading(true);
                await this.updateSubscription(plan);
                this.showToast('Subscription updated successfully!');
                this.closeModal('subscriptionModal');
            } catch (error) {
                console.error('Subscription error:', error);
                this.showToast('Failed to update subscription');
            } finally {
                this.showLoading(false);
            }
        }

        async updateSubscription(plan) {
            const subscriptionData = {
                plan,
                startDate: firebase.firestore.FieldValue.serverTimestamp(),
                endDate: this.calculateSubscriptionEndDate(plan),
                status: 'active'
            };

            await firebase.firestore()
                .collection('subscriptions')
                .doc(this.currentUser.uid)
                .set(subscriptionData);

            this.subscription = subscriptionData;
            this.updateProfileUI();
        }

        // Utility Functions
        calculateSubscriptionEndDate(plan) {
            const now = new Date();
            switch (plan) {
                case 'MONTHLY':
                    return new Date(now.setMonth(now.getMonth() + 1));
                case 'QUARTERLY':
                    return new Date(now.setMonth(now.getMonth() + 3));
                case 'YEARLY':
                    return new Date(now.setFullYear(now.getFullYear() + 1));
                default:
                    return null;
            }
        }

        getAuthErrorMessage(error) {
            // Changed error handling to support unexpected error.code formats
            if (error.code) {
                const parts = error.code.split('/');
                const key = parts[1] ? parts[1].toUpperCase() : error.code;
                return window.CONFIG.ERRORS.AUTH[key] || error.message;
            }
            return error.message;
        }

        showToast(message) {
            window.utils.showToast(message);
        }

        showLoading(show) {
            window.utils.showLoading(show);
        }

        closeModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('hidden');
            }
        }

        async signOut() {
            try {
                // Clear all local data first
                localStorage.removeItem(window.CONFIG.STORAGE_KEYS.HISTORY);
                this.clearUserData();
                
                // Sign out from Firebase
                await firebase.auth().signOut();
                
                // Reset UI elements
                this.updateUIForUnauthenticatedUser();
                
                // Reset attempts display
                window.utils.updateAttemptsDisplay(window.CONFIG.PLANS.FREE.maxAttempts);
                
                // Clear history displays
                this.clearHistoryDisplays();
                
                window.utils.showToast('Successfully signed out!');
                this.closeProfileModal();
            } catch (error) {
                console.error('Sign out error:', error);
                window.utils.showToast('Error signing out');
            }
        }

        clearUserData() {
            this.userData = null;
            this.subscription = null;
            window.app?.state && (window.app.state.history = []);
        }

        clearHistoryDisplays() {
            // Clear main history grid
            const mainGrid = document.getElementById('mainHistoryGrid');
            const emptyState = document.getElementById('historyEmptyState');
            if (mainGrid && emptyState) {
                mainGrid.innerHTML = '';
                mainGrid.appendChild(emptyState);
                emptyState.style.display = 'flex';
            }

            // Clear history list
            const historyList = document.getElementById('historyList');
            if (historyList) {
                historyList.innerHTML = '';
            }
        }
    }

    // Initialize AuthManager
    window.authManager = new AuthManager();
    console.log('Auth Manager initialized successfully');
}
