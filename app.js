// App State
const AppState = {
    notes: JSON.parse(localStorage.getItem('notes')) || [],
    categories: JSON.parse(localStorage.getItem('categories')) || [
        { id: 'work', name: 'Work', color: '#4C6FFF', icon: 'fas fa-briefcase' },
        { id: 'personal', name: 'Personal', color: '#FF6B6B', icon: 'fas fa-user' },
        { id: 'study', name: 'Study', color: '#6BCB77', icon: 'fas fa-book' },
        { id: 'goals', name: 'Goals', color: '#9B6BFF', icon: 'fas fa-bullseye' }
    ],
    currentView: localStorage.getItem('currentView') || 'grid',
    currentTheme: localStorage.getItem('theme') || 'light',
    isEditMode: false,
    currentNoteId: null,
    activeSection: 'all',
    editingCategoryId: null,
    // ADD NEW PROPERTIES HERE
    userProfile: JSON.parse(localStorage.getItem('userProfile')) || {
        name: 'John Doe',
        email: 'john.doe@example.com',
        avatar: 'https://via.placeholder.com/120',
        accountType: 'Basic',
        storage: {
            used: 2.5,
            total: 5
        }
    },
    settings: JSON.parse(localStorage.getItem('settings')) || {
        archiveInterval: 30,
        deleteRetention: 7,
        autoBackup: false,
        privateNotes: false,
        reminders: true
    }
};

const PerformanceMonitor = {
    measures: new Map(),
    start(label) {
        this.measures.set(label, performance.now());
    },
    end(label) {
        const start = this.measures.get(label);
        if (start) {
            const duration = performance.now() - start;
            console.log(`${label}: ${duration}ms`);
            this.measures.delete(label);
        }
    }
};

// Add this Error Recovery system
const ErrorRecovery = {
    backupState: null,
    maxBackups: 5,
    backups: [],

    saveState() {
        try {
            const currentState = JSON.stringify(AppState);
            this.backups.unshift(currentState);
            
            // Keep only the last 5 backups
            if (this.backups.length > this.maxBackups) {
                this.backups.pop();
            }
        } catch (error) {
            handleError(error, 'ErrorRecovery.saveState');
        }
    },

    recover() {
        try {
            if (this.backups.length > 0) {
                const lastValidState = this.backups[0];
                Object.assign(AppState, JSON.parse(lastValidState));
                renderNotes();
                showNotification('Successfully recovered to last known good state', 'success');
            }
        } catch (error) {
            handleError(error, 'ErrorRecovery.recover');
            showNotification('Failed to recover state', 'error');
        }
    }
};

// Rich Text Editor

class RichTextEditor {
    constructor() {
        this.editor = document.getElementById('noteContent');
        this.toolbar = document.querySelector('.formatting-toolbar');
        
        if (this.editor && this.toolbar) {
            this.initializeEditor();
        }
    }

    initializeEditor() {
        // Format Buttons
        const formatButtons = this.toolbar.querySelectorAll('.format-btn');
        formatButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const command = button.dataset.command;
                
                if (command === 'createLink') {
                    this.handleLinkInsertion();
                } else {
                    this.executeCommand(command);
                }
                
                if (!['foreColor', 'hiliteColor', 'createLink'].includes(command)) {
                    this.toggleActiveState(button);
                }
            });
        });

        // Font Controls
        const fontSizeSelect = this.toolbar.querySelector('.font-size-select');
        fontSizeSelect?.addEventListener('change', (e) => {
            this.executeCommand('fontSize', e.target.value);
        });

        const fontFamilySelect = this.toolbar.querySelector('.font-family-select');
        fontFamilySelect?.addEventListener('change', (e) => {
            this.executeCommand('fontName', e.target.value);
        });

        // Color Pickers
        const colorPickers = this.toolbar.querySelectorAll('.color-picker');
        colorPickers.forEach(picker => {
            picker.addEventListener('change', (e) => {
                const command = picker.dataset.command;
                this.executeCommand(command, e.target.value);
            });
            picker.addEventListener('click', e => e.stopPropagation());
        });

        // Editor State Updates
        this.editor.addEventListener('keyup', () => this.updateButtonStates());
        this.editor.addEventListener('mouseup', () => this.updateButtonStates());
    }
    executeCommand(command, value = null) {
        document.execCommand(command, false, value);
        this.editor.focus();
    }

    handleLinkInsertion() {
        const selection = window.getSelection();
        const url = prompt('Enter the URL:', 'http://');
        
        if (url) {
            if (selection.toString().length === 0) {
                const linkText = prompt('Enter the link text:', '');
                if (linkText) {
                    this.executeCommand('insertHTML', 
                        `<a href="${url}" target="_blank">${linkText}</a>`);
                }
            } else {
                this.executeCommand('createLink', url);
                const link = selection.anchorNode.parentElement;
                if (link.tagName === 'A') {
                    link.target = '_blank';
                }
            }
        }
    }

    toggleActiveState(button) {
        const command = button.dataset.command;
        try {
            const isActive = document.queryCommandState(command);
            button.classList.toggle('active', isActive);
        } catch (e) {
            console.warn(`Command state check failed for: ${command}`);
        }
    }

    updateButtonStates() {
        const buttons = this.toolbar.querySelectorAll('.format-btn');
        buttons.forEach(button => {
            const command = button.dataset.command;
            if (command && !['createLink', 'removeFormat', 'foreColor', 'hiliteColor'].includes(command)) {
                this.toggleActiveState(button);
            }
        });
    }
}

const elements = {
    body: document.body,
    overlay: document.getElementById('overlay'),
    sidebar: document.getElementById('sidebar'),
    menuToggle: document.getElementById('menuToggle'),
    themeToggle: document.getElementById('themeToggle'),
    userMenu: document.querySelector('.user-menu'),
    userMenuTrigger: document.querySelector('.user-menu-trigger'),
    noteModal: document.getElementById('noteModal'),
    categoryModal: document.getElementById('categoryModal'),
    profileModal: document.getElementById('profileModal'),
    settingsModal: document.getElementById('settingsModal'),
    passwordModal: document.getElementById('passwordModal'),
    createNoteBtn: document.getElementById('createNote'),
    noteForm: document.getElementById('noteForm'),
    notesContainer: document.getElementById('notesGrid'),
    navItems: document.querySelectorAll('.nav-item'),
    categoriesList: document.getElementById('categoriesList'),
    saveCategoryBtn: document.getElementById('saveCategoryBtn'),
    newCategoryBtn: document.getElementById('newCategoryBtn'),
    searchInput: document.getElementById('searchInput'),
    viewButtons: document.querySelectorAll('.view-btn'),
    modalTitle: document.querySelector('.note-modal .modal-title h2'),
    noteTitleInput: document.getElementById('noteTitleInput'),
    noteContent: document.getElementById('noteContent'),
    categorySelect: document.getElementById('categorySelect'),
    saveNoteBtn: document.getElementById('saveNoteBtn'),
    cancelNoteBtn: document.getElementById('cancelNoteBtn'),
    categoryName: document.getElementById('categoryName'),
    colorOptions: document.querySelectorAll('.color-option'),
    iconOptions: document.querySelectorAll('.icon-option'),
    profileForm: document.getElementById('profileForm'),
    profileAvatar: document.querySelector('.profile-avatar'),
    profileName: document.getElementById('fullName'),
    profileEmail: document.getElementById('email'),
    changeAvatarBtn: document.querySelector('.change-avatar-btn'),
    upgradeBtn: document.querySelector('.btn-upgrade'),
    archiveInterval: document.getElementById('archiveInterval'),
    deleteRetention: document.getElementById('deleteRetention'),
    privateNotesToggle: document.getElementById('privateNotesToggle'),
    reminderToggle: document.getElementById('reminderToggle'),
    configureBackupBtn: document.getElementById('configureBackupBtn'),
    checkUpdatesBtn: document.getElementById('checkUpdatesBtn'),
    configureRemindersBtn: document.getElementById('configureRemindersBtn'),
    storageProgress: document.querySelector('.storage-progress'),
    storageUsed: document.querySelector('.storage-used'),
    storageTotal: document.querySelector('.storage-total'),
    showFilters: document.getElementById('showFilters'),
    filterDropdown: document.getElementById('filterDropdown'),
    sortBySelect: document.getElementById('sortBySelect'),
    sortButtons: document.querySelectorAll('.sort-btn'),
    dateFrom: document.getElementById('dateFrom'),
    dateTo: document.getElementById('dateTo'),
    pinnedOnly: document.getElementById('pinnedOnly'),
    favoritesOnly: document.getElementById('favoritesOnly'),
    resetFilters: document.getElementById('resetFilters'),
    applyFilters: document.getElementById('applyFilters'),
};

function initializeProfile() {
    if (elements.profileName) elements.profileName.value = AppState.userProfile.name;
    if (elements.profileEmail) elements.profileEmail.value = AppState.userProfile.email;
    if (elements.profileAvatar) elements.profileAvatar.src = AppState.userProfile.avatar;
    
    // Update storage meter
    if (elements.storageProgress && elements.storageUsed && elements.storageTotal) {
        const percentage = (AppState.userProfile.storage.used / AppState.userProfile.storage.total) * 100;
        elements.storageProgress.style.width = `${percentage}%`;
        elements.storageUsed.textContent = `${AppState.userProfile.storage.used} GB`;
        elements.storageTotal.textContent = `${AppState.userProfile.storage.total} GB`;
    }
}



function closeAllDropdowns() {
    document.querySelectorAll('.more-options-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}


function handleProfileSubmit(e) {
    e.preventDefault();
    AppState.userProfile.name = elements.profileName.value;
    localStorage.setItem('userProfile', JSON.stringify(AppState.userProfile));
    
    // Update user name in header
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement) {
        userNameElement.textContent = AppState.userProfile.name;
    }
    
    closeAllModals();
}



function initializeSettings() {
    if (elements.archiveInterval) elements.archiveInterval.value = AppState.settings.archiveInterval;
    if (elements.deleteRetention) elements.deleteRetention.value = AppState.settings.deleteRetention;
    if (elements.privateNotesToggle) elements.privateNotesToggle.checked = AppState.settings.privateNotes;
    if (elements.reminderToggle) elements.reminderToggle.checked = AppState.settings.reminders;
}

function handleSettingsSubmit(e) {
    e.preventDefault();
    AppState.settings = {
        ...AppState.settings,
        archiveInterval: parseInt(elements.archiveInterval.value),
        deleteRetention: parseInt(elements.deleteRetention.value),
        privateNotes: elements.privateNotesToggle.checked,
        reminders: elements.reminderToggle.checked
    };
    localStorage.setItem('settings', JSON.stringify(AppState.settings));
    closeAllModals();
}

function setupProfileAndSettingsListeners() {
    // Profile Modal Listeners
    if (elements.profileForm) {
        elements.profileForm.addEventListener('submit', handleProfileSubmit);
    }
    
    if (elements.changeAvatarBtn) {
        elements.changeAvatarBtn.addEventListener('click', () => {
            alert('Avatar change functionality to be implemented');
        });
    }
    
    if (elements.upgradeBtn) {
        elements.upgradeBtn.addEventListener('click', () => {
            alert('Upgrade to Pro functionality to be implemented');
        });
    }

    // Settings Modal Listeners
    if (elements.configureBackupBtn) {
        elements.configureBackupBtn.addEventListener('click', () => {
            alert('Backup configuration to be implemented');
        });
    }

    if (elements.checkUpdatesBtn) {
        elements.checkUpdatesBtn.addEventListener('click', () => {
            alert('Checking for updates...');
        });
    }

    if (elements.configureRemindersBtn) {
        elements.configureRemindersBtn.addEventListener('click', () => {
            alert('Reminder configuration to be implemented');
        });
    }

    // Toggle switches
    if (elements.privateNotesToggle) {
        elements.privateNotesToggle.addEventListener('change', (e) => {
            AppState.settings.privateNotes = e.target.checked;
            localStorage.setItem('settings', JSON.stringify(AppState.settings));
        });
    }

    if (elements.reminderToggle) {
        elements.reminderToggle.addEventListener('change', (e) => {
            AppState.settings.reminders = e.target.checked;
            localStorage.setItem('settings', JSON.stringify(AppState.settings));
        });
    }
}


function setupMenuButtons() {
    const profileBtn = document.getElementById('profileMenuBtn');
    const settingsBtn = document.getElementById('settingsMenuBtn');

    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            elements.userMenu.classList.remove('active');
            openModal(elements.profileModal);
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            elements.userMenu.classList.remove('active');
            openModal(elements.settingsModal);
        });
    }
}

// Setup Filter Listeners
function setupFilterListeners() {
    // Toggle filter dropdown
    elements.showFilters.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.filterDropdown.classList.toggle('active');
    });

    // Close filter dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-filters')) {
            elements.filterDropdown.classList.remove('active');
        }
    });

    // Sort buttons
    elements.sortButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.sortButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            SearchOptions.sortOrder = btn.dataset.order;
            renderNotes();
        });
    });

    // Sort by select
    elements.sortBySelect.addEventListener('change', () => {
        SearchOptions.sortBy = elements.sortBySelect.value;
        renderNotes();
    });

    // Date range inputs
    elements.dateFrom.addEventListener('change', updateDateRange);
    elements.dateTo.addEventListener('change', updateDateRange);

    // Checkbox filters
    elements.pinnedOnly.addEventListener('change', () => {
        SearchOptions.onlyPinned = elements.pinnedOnly.checked;
        renderNotes();
    });

    elements.favoritesOnly.addEventListener('change', () => {
        SearchOptions.onlyFavorites = elements.favoritesOnly.checked;
        renderNotes();
    });

    // Reset filters
    elements.resetFilters.addEventListener('click', () => {
        resetSearchFilters();
        renderNotes();
    });

    // Apply filters
    elements.applyFilters.addEventListener('click', () => {
        elements.filterDropdown.classList.remove('active');
        renderNotes();
    });
}

function updateDateRange() {
    const fromDate = elements.dateFrom.value;
    const toDate = elements.dateTo.value;

    if (fromDate && toDate) {
        SearchOptions.dateRange = {
            start: new Date(fromDate),
            end: new Date(toDate)
        };
    } else {
        SearchOptions.dateRange = null;
    }
    renderNotes();
}


// Reset Search Filters
function resetSearchFilters() {
    // Reset SearchOptions
    SearchOptions.dateRange = null;
    SearchOptions.sortBy = 'updatedAt';
    SearchOptions.sortOrder = 'desc';
    SearchOptions.onlyPinned = false;
    SearchOptions.onlyFavorites = false;

    // Reset UI elements
    elements.sortBySelect.value = 'updatedAt';
    elements.sortButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.order === 'desc');
    });
    elements.dateFrom.value = '';
    elements.dateTo.value = '';
    elements.pinnedOnly.checked = false;
    elements.favoritesOnly.checked = false;
}

// Initialize App
function initializeApp() {
    try {
        PerformanceMonitor.start('app-initialization');
        
        // Create initial state backup
        ErrorRecovery.saveState();
        
        // Initialize core features
        loadTheme();
        setupEventListeners();
        setupMenuButtons();
        setupProfileAndSettingsListeners();
        setupFilterListeners();
        
        // Initialize UI components
        PerformanceMonitor.start('render-initial-ui');
        renderCategories();
        renderNotes();
        updateCategoryCounts();
        loadView();
        PerformanceMonitor.end('render-initial-ui');
        
        // Initialize user data
        initializeProfile();
        initializeSettings();
        
        PerformanceMonitor.end('app-initialization');
        
        // Show success message
        showNotification('Application initialized successfully', 'success');
        window.noteEditor = new RichTextEditor();
    } catch (error) {
        handleError(error, 'initializeApp');
        showNotification('Error initializing application. Attempting recovery...', 'error');
        ErrorRecovery.recover();
    }
}

// Load Theme
function loadTheme() {
    elements.body.setAttribute('data-theme', AppState.currentTheme);
}

// Toggle Theme
function toggleTheme() {
    AppState.currentTheme = AppState.currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', AppState.currentTheme);
    loadTheme();
}

// Load View
function loadView() {
    toggleView(AppState.currentView);
}

// Toggle View (Grid/List)
function toggleView(viewType) {
    AppState.currentView = viewType;
    localStorage.setItem('currentView', viewType);
    elements.notesContainer.className = viewType === 'grid' ? 'notes-grid' : 'notes-list';
    elements.viewButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewType);
    });
}

// Open Modal
function openModal(modal) {
    // Close any other open modals first
    closeAllModals();
    
    if (modal) {
        modal.classList.add('active');
        elements.overlay.classList.add('active');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    elements.themeToggle.addEventListener('click', toggleTheme);

    elements.menuToggle.addEventListener('click', () => {
        elements.sidebar.classList.toggle('active');
        elements.overlay.classList.toggle('active');
    });

    elements.userMenuTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.userMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!elements.userMenu.contains(e.target)) {
            elements.userMenu.classList.remove('active');
        }
    });


    elements.createNoteBtn.addEventListener('click', () => {
        AppState.isEditMode = false;
        AppState.currentNoteId = null;
        openModal(elements.noteModal);
    });

    elements.noteForm.addEventListener('submit', handleNoteSubmit);

    elements.viewButtons.forEach(btn => {
        btn.addEventListener('click', () => toggleView(btn.dataset.view));
    });

    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            handleNavigation(item);
        });
    });

    elements.searchInput.addEventListener('input', debounce(() => {
        renderNotes();
    }, 300));


    elements.newCategoryBtn.addEventListener('click', () => openModal(elements.categoryModal));

    // Add event listeners for cancel buttons
    document.getElementById('cancelNoteBtn').addEventListener('click', (e) => {
        e.preventDefault();
        closeAllModals();
    });

    document.getElementById('cancelCategoryBtn').addEventListener('click', (e) => {
        e.preventDefault();
        closeAllModals();
    });

    document.getElementById('cancelProfileBtn').addEventListener('click', (e) => {
        e.preventDefault();
        closeAllModals();
    });

    document.getElementById('cancelSettingsBtn').addEventListener('click', (e) => {
        e.preventDefault();
        closeAllModals();
    });

    document.getElementById('cancelPasswordBtn').addEventListener('click', (e) => {
        e.preventDefault();
        closeAllModals();
    });

    // Add event listeners for profile, settings, and sign out buttons
    document.getElementById('profileMenuBtn').addEventListener('click', (e) => {
        e.preventDefault();
        openModal(elements.profileModal);
    });

    document.getElementById('settingsMenuBtn').addEventListener('click', (e) => {
        e.preventDefault();
        openModal(elements.settingsModal);
    });

    document.getElementById('signOutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        // Add sign-out functionality here
        alert('Sign out functionality to be implemented.');
    });

    // Add event listener for overlay
    elements.overlay.addEventListener('click', () => {
        closeAllModals();
        elements.sidebar.classList.remove('active');
    });

    elements.colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            elements.colorOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });

    if (elements.saveCategoryBtn) {
        elements.saveCategoryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleCategorySubmit(e);
        });
    }

    elements.iconOptions.forEach(option => {
        option.addEventListener('click', () => {
            elements.iconOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });
}

// Render Categories
function renderCategories() {
    elements.categoriesList.innerHTML = '';
    AppState.categories.forEach(category => {
        const categoryElement = document.createElement('a');
        categoryElement.className = 'nav-item category-item';
        categoryElement.href = '#';
        categoryElement.dataset.section = category.id;
        categoryElement.style.setProperty('--category-color', category.color);

        categoryElement.innerHTML = `
            <i class="${category.icon}"></i>
            <span>${category.name}</span>
            <span class="note-count">0</span>
            <div class="more-actions category-more-actions">
                <button class="icon-btn more-btn" aria-label="More options">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="actions-dropdown">
                    <button class="action-item edit-category" data-category-id="${category.id}">
                        <i class="fas fa-pen"></i>
                        Edit
                    </button>
                    <button class="action-item delete-category" data-category-id="${category.id}">
                        <i class="fas fa-trash-alt"></i>
                        Delete
                    </button>
                </div>
            </div>
        `;

        setupCategoryListeners(categoryElement, category.id);
        elements.categoriesList.appendChild(categoryElement);
    });

    updateCategorySelect();
}

// Setup Category Listeners
function setupCategoryListeners(categoryElement, categoryId) {
    const moreActions = categoryElement.querySelector('.category-more-actions');
    const moreBtn = moreActions.querySelector('.more-btn');

    categoryElement.addEventListener('click', (e) => {
        if (!e.target.closest('.more-actions')) {
            e.preventDefault();
            handleNavigation(categoryElement);
        }
    });

    moreBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        document.querySelectorAll('.category-more-actions').forEach(actions => {
            if (actions !== moreActions) {
                actions.classList.remove('active');
            }
        });

        moreActions.classList.toggle('active');
    });

    categoryElement.querySelector('.edit-category').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openCategoryModal(categoryId);
    });

    categoryElement.querySelector('.delete-category').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteCategory(categoryId);
    });
}

// Open Category Modal
function openCategoryModal(categoryId = null) {
    resetCategoryForm();

    if (categoryId) {
        const category = AppState.categories.find(cat => cat.id === categoryId);
        if (category) {
            document.querySelector('.category-modal .modal-title h2').textContent = 'Edit Category';
            elements.categoryName.value = category.name;

            elements.colorOptions.forEach(opt => {
                const color = getComputedStyle(opt).getPropertyValue('--color').trim();
                if (color === category.color) {
                    opt.classList.add('active');
                }
            });

            elements.iconOptions.forEach(opt => {
                if (opt.querySelector('i').className === category.icon) {
                    opt.classList.add('active');
                }
            });

            AppState.editingCategoryId = categoryId;
        }
    } else {
        document.querySelector('.category-modal .modal-title h2').textContent = 'Create New Category';
        AppState.editingCategoryId = null;
    }

    elements.categoryModal.classList.add('active');
    elements.overlay.classList.add('active');
}

// Handle Category Submit
function handleCategorySubmit(e) {
    e.preventDefault();
    const name = elements.categoryName.value.trim();
    const colorOption = document.querySelector('.color-option.active');
    const iconOption = document.querySelector('.icon-option.active');

    if (!name || !colorOption || !iconOption) return;

    const categoryData = {
        id: AppState.editingCategoryId || name.toLowerCase().replace(/\s+/g, '-'),
        name,
        color: getComputedStyle(colorOption).getPropertyValue('--color').trim(),
        icon: iconOption.querySelector('i').className
    };

    if (!AppState.editingCategoryId) {
        AppState.categories.push(categoryData);
    } else {
        const index = AppState.categories.findIndex(cat => cat.id === AppState.editingCategoryId);
        if (index !== -1) {
            AppState.categories[index] = categoryData;
        }
    }

    saveCategoriesToStorage();
    renderCategories();
    updateCategorySelect();
    closeAllModals();
    resetCategoryForm();
}

// Delete Category
function deleteCategory(categoryId) {
    AppState.notes = AppState.notes.map(note => {
        if (note.category === categoryId) {
            return { ...note, category: '' };
        }
        return note;
    });
    saveNotesToStorage();

    AppState.categories = AppState.categories.filter(cat => cat.id !== categoryId);
    saveCategoriesToStorage();
    renderCategories();
    updateCategorySelect();
    updateCategoryCounts();
}

// Reset Category Form
function resetCategoryForm() {
    elements.categoryName.value = '';
    elements.colorOptions.forEach(opt => opt.classList.remove('active'));
    elements.colorOptions[0].classList.add('active');
    elements.iconOptions.forEach(opt => opt.classList.remove('active'));
    elements.iconOptions[0].classList.add('active');
    AppState.editingCategoryId = null;
}

// Save Categories to Storage
function saveCategoriesToStorage() {
    localStorage.setItem('categories', JSON.stringify(AppState.categories));
}

// Update Category Select
function updateCategorySelect() {
    const select = elements.categorySelect;
    select.innerHTML = '<option value="">Select Category</option>';
    AppState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}


// Handle Note Submit
function handleNoteSubmit(e) {
    e.preventDefault();
    const title = elements.noteTitleInput.value.trim();
    const content = elements.noteContent.innerHTML.trim();
    const category = elements.categorySelect.value;

    if (!title) return;

    const noteData = {
        title,
        content,
        category,
    };

    if (AppState.isEditMode && AppState.currentNoteId) {
        updateNote(AppState.currentNoteId, noteData);
    } else {
        createNote(noteData);
    }

    closeAllModals();
    resetNoteForm();
}

function closeAllModals() {
    // First, close all dropdowns
    closeAllDropdowns();
    
    // Close all modals
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    
    // Remove overlay
    elements.overlay.classList.remove('active');
    
    // Reset all forms
    resetForms();
    
    // Reinitialize specific modals if they were active
    if (elements.profileModal && elements.profileModal.classList.contains('active')) {
        initializeProfile();
    }
    if (elements.settingsModal && elements.settingsModal.classList.contains('active')) {
        initializeSettings();
    }
}



// Create Note
function createNote(data) {
    try {
        // Validate note data
        const validationErrors = validateData(data, ValidationSchemas.note);
        if (validationErrors.length > 0) {
            throw new Error(validationErrors.map(err => err.message).join('. '));
        }

        // Sanitize content
        const sanitizedContent = sanitizeHTML(data.content);

        const note = {
            id: Date.now(),
            title: data.title.trim(),
            content: sanitizedContent,
            category: data.category,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isFavorite: false,
            isDeleted: false,
            isPinned: false,
            version: 1,
            lastModifiedBy: AppState.userProfile.name
        };

        // Check storage limit before saving
        const noteSize = new Blob([JSON.stringify(note)]).size;
        const currentStorage = AppState.userProfile.storage.used * 1024 * 1024; // Convert GB to bytes
        const newStorage = currentStorage + noteSize;
        const totalStorage = AppState.userProfile.storage.total * 1024 * 1024 * 1024; // Convert GB to bytes

        if (newStorage > totalStorage) {
            throw new Error('Storage limit exceeded. Please upgrade your plan or delete some notes.');
        }

        AppState.notes.unshift(note);
        saveNotesToStorage();
        renderNotes();
        updateCategoryCounts();
        
        showNotification('Note created successfully', 'success');
        return note;
    } catch (error) {
        handleError(error, 'createNote');
        throw error; // Re-throw to handle in UI
    }
}

// HTML Sanitizer
function sanitizeHTML(html) {
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
}

function duplicateNote(noteId) {
    const originalNote = AppState.notes.find(note => note.id === noteId);
    if (originalNote) {
        const duplicatedNote = {
            ...originalNote,
            id: Date.now(),
            title: `${originalNote.title} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isPinned: false
        };
        AppState.notes.unshift(duplicatedNote);
        saveNotesToStorage();
        renderNotes();
        updateCategoryCounts();
    }
}

// Update Note
function updateNote(id, data) {
    const index = AppState.notes.findIndex(note => note.id === id);
    if (index !== -1) {
        AppState.notes[index] = {
            ...AppState.notes[index],
            ...data,
            updatedAt: new Date().toISOString()
        };
        saveNotesToStorage();
        renderNotes();
        updateCategoryCounts();
    }
}

// Delete Note
function deleteNote(id) {
    const note = AppState.notes.find(note => note.id === id);
    if (note) {
        if (note.isDeleted) {
            AppState.notes = AppState.notes.filter(n => n.id !== id);
        } else {
            note.isDeleted = true;
        }
        saveNotesToStorage();
        renderNotes();
        updateCategoryCounts();
    }
}

// Toggle Note Favorite
function toggleNoteFavorite(id) {
    const index = AppState.notes.findIndex(note => note.id === id);
    if (index !== -1) {
        AppState.notes[index].isFavorite = !AppState.notes[index].isFavorite;
        saveNotesToStorage();
        renderNotes();
        updateCategoryCounts();
    }
}

// Search and Filter Configuration
const SearchConfig = {
    debounceTime: 300,
    minSearchLength: 2,
    maxResults: 100,
    searchFields: ['title', 'content', 'category']
};

// Advanced Search Options
const SearchOptions = {
    dateRange: null,
    categories: [],
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    onlyPinned: false,
    onlyFavorites: false
};

// Filter Notes with Advanced Options
function filterNotes() {
    try {
        let filteredNotes = [...AppState.notes];

        // Base section filtering
        filteredNotes = filterBySection(filteredNotes);
        
        // Search term filtering
        if (elements.searchInput.value.length >= SearchConfig.minSearchLength) {
            filteredNotes = searchNotes(filteredNotes, elements.searchInput.value);
        }

        // Apply advanced filters
        filteredNotes = applyAdvancedFilters(filteredNotes);

        // Sort results
        filteredNotes = sortNotes(filteredNotes);

        // Limit results for performance
        if (filteredNotes.length > SearchConfig.maxResults) {
            showNotification(`Showing top ${SearchConfig.maxResults} results`, 'info');
            filteredNotes = filteredNotes.slice(0, SearchConfig.maxResults);
        }

        return filteredNotes;
    } catch (error) {
        handleError(error, 'filterNotes');
        return [];
    }
}

// Filter by Section
function filterBySection(notes) {
    switch (AppState.activeSection) {
        case 'trash':
            return notes.filter(note => note.isDeleted);
        case 'favorites':
            return notes.filter(note => note.isFavorite && !note.isDeleted);
        case 'all':
            return notes.filter(note => !note.isDeleted);
        default:
            return notes.filter(note => 
                note.category === AppState.activeSection && !note.isDeleted
            );
    }
}

// Search Notes
function searchNotes(notes, searchTerm) {
    const terms = searchTerm.toLowerCase().split(' ').filter(term => term.length >= SearchConfig.minSearchLength);
    
    if (terms.length === 0) return notes;

    return notes.filter(note => {
        const searchableText = SearchConfig.searchFields.map(field => {
            if (field === 'category') {
                const category = AppState.categories.find(cat => cat.id === note.category);
                return category ? category.name.toLowerCase() : '';
            }
            return note[field] ? note[field].toLowerCase() : '';
        }).join(' ');

        return terms.every(term => searchableText.includes(term));
    });
}

// Apply Advanced Filters
function applyAdvancedFilters(notes) {
    return notes.filter(note => {
        // Date range filter
        if (SearchOptions.dateRange) {
            const noteDate = new Date(note.updatedAt);
            if (noteDate < SearchOptions.dateRange.start || noteDate > SearchOptions.dateRange.end) {
                return false;
            }
        }

        // Category filter
        if (SearchOptions.categories.length > 0) {
            if (!SearchOptions.categories.includes(note.category)) {
                return false;
            }
        }

        // Pinned notes filter
        if (SearchOptions.onlyPinned && !note.isPinned) {
            return false;
        }

        // Favorites filter
        if (SearchOptions.onlyFavorites && !note.isFavorite) {
            return false;
        }

        return true;
    });
}

// Sort Notes
function sortNotes(notes) {
    return notes.sort((a, b) => {
        let compareValue = 0;
        
        // Primary sort: Pinned
        if (a.isPinned !== b.isPinned) {
            return b.isPinned ? 1 : -1;
        }

        // Secondary sort: Selected field
        switch (SearchOptions.sortBy) {
            case 'title':
                compareValue = a.title.localeCompare(b.title);
                break;
            case 'createdAt':
                compareValue = new Date(b.createdAt) - new Date(a.createdAt);
                break;
            case 'updatedAt':
            default:
                compareValue = new Date(b.updatedAt) - new Date(a.updatedAt);
        }

        return SearchOptions.sortOrder === 'asc' ? -compareValue : compareValue;
    });
}

// Update Search Options
function updateSearchOptions(options) {
    Object.assign(SearchOptions, options);
    renderNotes();
}

// Render Notes
function renderNotes() {
    const filteredNotes = filterNotes();
    const pinnedNotes = filteredNotes.filter(note => note.isPinned);
    const unpinnedNotes = filteredNotes.filter(note => !note.isPinned);

    elements.notesContainer.innerHTML = '';

    if (pinnedNotes.length > 0) {
        pinnedNotes.forEach(note => renderNoteCard(note));
    }

    unpinnedNotes.forEach(note => renderNoteCard(note));

    if (filteredNotes.length === 0) {
        renderEmptyState();
    }
}

// Render Note Card
function renderNoteCard(note) {
    const category = AppState.categories.find(cat => cat.id === note.category);
    const noteElement = document.createElement('article');
    noteElement.className = `note-card ${note.isPinned ? 'pinned' : ''}`;
    
    noteElement.innerHTML = `
        <div class="note-card-content">
            <h2 class="note-title">${note.title}</h2>
            <div class="note-preview">${note.content}</div>
            <div class="note-footer">
                <div class="note-metadata">
                    <span class="date">
                        <i class="far fa-clock"></i>
                        Updated ${formatDate(note.updatedAt)}
                    </span>
                </div>
                <div class="note-badges">
                    ${category ? `
                        <span class="badge category ${category.id}">
                            <i class="${category.icon}"></i>
                            ${category.name}
                        </span>
                    ` : ''}
                    ${note.isPinned ? `
                        <span class="badge pinned">
                            <i class="fas fa-thumbtack"></i>
                            Pinned
                        </span>
                    ` : ''}
                </div>
            </div>
            <div class="note-actions">
                <button class="icon-btn star-btn ${note.isFavorite ? 'active' : ''}" data-note-id="${note.id}">
                    <i class="fa${note.isFavorite ? 's' : 'r'} fa-star"></i>
                </button>
                <div class="more-actions">
                    <button class="icon-btn more-btn">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="actions-dropdown">
                        <button class="action-item edit-note" data-note-id="${note.id}">
                            <i class="fas fa-pen"></i>
                            Edit
                        </button>
                        <button class="action-item duplicate-note" data-note-id="${note.id}">
                            <i class="fas fa-copy"></i>
                            Duplicate
                        </button>
                        <div class="action-divider"></div>
                        <button class="action-item delete delete-note" data-note-id="${note.id}">
                            <i class="fas fa-trash-alt"></i>
                            ${note.isDeleted ? 'Delete Permanently' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    elements.notesContainer.appendChild(noteElement);
    setupNoteCardListeners(noteElement, note.id);
}

// Render Empty State
function renderEmptyState() {
    const message = AppState.activeSection === 'trash' ?
        'Trash is empty' :
        'No notes found';
    const description = AppState.activeSection === 'trash' ?
        'Deleted notes will appear here' :
        'Create a new note or try a different search term';

    elements.notesContainer.innerHTML = `
        <div class="empty-state">
            <i class="far fa-sticky-note"></i>
            <h3>${message}</h3>
            <p>${description}</p>
        </div>
    `;
}

// Setup Note Card Listeners
function setupNoteCardListeners(noteElement, noteId) {
    const starBtn = noteElement.querySelector('.star-btn');
    starBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleNoteFavorite(noteId);
    });

    const moreBtn = noteElement.querySelector('.more-btn');
    const moreActions = moreBtn.closest('.more-actions');

    moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.more-actions').forEach(actions => {
            if (actions !== moreActions) {
                actions.classList.remove('active');
            }
        });
        moreActions.classList.toggle('active');
    });

    noteElement.querySelector('.edit-note').addEventListener('click', (e) => {
        e.stopPropagation();
        openNoteModal(noteId);
    });

    noteElement.querySelector('.duplicate-note').addEventListener('click', (e) => {
        e.stopPropagation();
        duplicateNote(noteId);
    });

    noteElement.querySelector('.delete-note').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteNote(noteId);
    });

    noteElement.addEventListener('click', () => {
        openNoteModal(noteId);
    });
}

// Handle Navigation
function handleNavigation(navItem) {
    elements.navItems.forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.category-item').forEach(item => item.classList.remove('active'));
    navItem.classList.add('active');

    const section = navItem.dataset.section ||
        navItem.querySelector('span:not(.note-count)').textContent.toLowerCase();
    AppState.activeSection = section;

    document.querySelector('.content-header h1').textContent =
        navItem.querySelector('span:not(.note-count)').textContent;

    renderNotes();

    if (window.innerWidth <= 768) {
        elements.sidebar.classList.remove('active');
        elements.overlay.classList.remove('active');
    }
}

// Update Category Counts
function updateCategoryCounts() {
    const counts = {
        all: 0,
        favorites: 0,
        trash: 0
    };

    AppState.categories.forEach(category => {
        counts[category.id] = 0;
    });

    AppState.notes.forEach(note => {
        if (!note.isDeleted) {
            counts.all++;
            if (note.isFavorite) counts.favorites++;
            if (note.category) counts[note.category]++;
        } else {
            counts.trash++;
        }
    });

    document.querySelectorAll('.nav-item, .category-item').forEach(item => {
        const countElement = item.querySelector('.note-count');
        if (countElement) {
            const section = item.dataset.section ||
                item.querySelector('span:not(.note-count)').textContent.toLowerCase();
            countElement.textContent = counts[section] || 0;
        }
    });
}

// Debounce Function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // Difference in seconds

    // Helper function to format time
    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).toLowerCase();
    };

    // Format date
    const formatDatePart = (date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: '2-digit'
        });
    };

    // If less than 1 minute
    if (diff < 60) {
        return 'just now';
    }
    // If less than 1 hour
    else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        return `${minutes}m ago`;
    }
    // If less than 24 hours
    else if (diff < 86400) {
        const hours = Math.floor(diff / 3600);
        return `${hours}h ago`;
    }
    // If less than 48 hours
    else if (diff < 172800) {
        return `yesterday, ${formatTime(date)}`;
    }
    // If within this year
    else if (date.getFullYear() === now.getFullYear()) {
        return `${formatDatePart(date)}, ${formatTime(date)}`;
    }
    // Otherwise show full date and time
    else {
        return `${formatDatePart(date)}, ${formatTime(date)}`;
    }
}

// Add this function to automatically update times
function initializeTimeUpdates() {
    function updateAllTimes() {
        document.querySelectorAll('.date').forEach(dateElement => {
            const timestamp = dateElement.getAttribute('data-timestamp');
            if (timestamp) {
                const formattedDate = formatDate(timestamp);
                const timeText = dateElement.querySelector('.time-text');
                if (timeText) {
                    timeText.textContent = formattedDate;
                }
            }
        });
    }

    // Update times every minute
    setInterval(updateAllTimes, 60000);
}

// Data Validation Schemas
const ValidationSchemas = {
    note: {
        title: (value) => ({
            isValid: typeof value === 'string' && value.length > 0 && value.length <= 100,
            message: 'Title must be between 1 and 100 characters'
        }),

        category: (value) => ({
            isValid: !value || AppState.categories.some(cat => cat.id === value),
            message: 'Invalid category selected'
        })
    },
    category: {
        name: (value) => ({
            isValid: typeof value === 'string' && value.length > 0 && value.length <= 50,
            message: 'Category name must be between 1 and 50 characters'
        }),
        color: (value) => ({
            isValid: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value),
            message: 'Invalid color format'
        }),
        icon: (value) => ({
            isValid: typeof value === 'string' && value.startsWith('fas fa-'),
            message: 'Invalid icon format'
        })
    }
};

const StateValidator = {
    validateNote(note) {
        const requiredFields = ['id', 'title', 'content', 'createdAt', 'updatedAt'];
        return requiredFields.every(field => note.hasOwnProperty(field));
    },
    
    validateCategory(category) {
        const requiredFields = ['id', 'name', 'color', 'icon'];
        return requiredFields.every(field => category.hasOwnProperty(field));
    },
    
    validateAppState() {
        try {
            // Validate notes
            if (!Array.isArray(AppState.notes)) return false;
            if (!AppState.notes.every(this.validateNote)) return false;
            
            // Validate categories
            if (!Array.isArray(AppState.categories)) return false;
            if (!AppState.categories.every(this.validateCategory)) return false;
            
            return true;
        } catch (error) {
            handleError(error, 'StateValidator.validateAppState');
            return false;
        }
    }
};

// Validation Function
function validateData(data, schema) {
    const errors = [];
    Object.keys(schema).forEach(key => {
        if (data[key] !== undefined) {
            const validation = schema[key](data[key]);
            if (!validation.isValid) {
                errors.push({ field: key, message: validation.message });
            }
        }
    });
    return errors;
}

// Error Handler
function handleError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    
    // Log error details
    const errorDetails = {
        message: error.message,
        context: context,
        timestamp: new Date().toISOString(),
        stack: error.stack
    };
    
    // Store error in localStorage for debugging
    const errors = JSON.parse(localStorage.getItem('errorLog') || '[]');
    errors.unshift(errorDetails);
    localStorage.setItem('errorLog', JSON.stringify(errors.slice(0, 10))); // Keep last 10 errors
    
    // Show error to user
    const errorMessage = error.message || 'An unexpected error occurred';
    showNotification(errorMessage, 'error');
    
    // Attempt recovery if it's a critical error
    if (context.includes('critical')) {
        ErrorRecovery.recover();
    }
}

// Notification System
function showNotification(message, type = 'info') {
    // Check if notification container exists
    let notificationContainer = document.querySelector('.notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

    notificationContainer.appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Safe Storage Operations
function saveNotesToStorage() {
    try {
        PerformanceMonitor.start('save-notes');
        
        // Validate state before saving
        if (!StateValidator.validateAppState()) {
            throw new Error('Invalid application state detected');
        }
        
        // Create backup before saving
        ErrorRecovery.saveState();
        
        const serializedNotes = JSON.stringify(AppState.notes);
        localStorage.setItem('notes', serializedNotes);
        
        // Track storage usage
        const storageUsed = new Blob([serializedNotes]).size;
        trackStorageUsage(storageUsed);
        
        PerformanceMonitor.end('save-notes');
    } catch (error) {
        handleError(error, 'saveNotesToStorage');
        showNotification('Failed to save notes. Attempting recovery...', 'error');
        ErrorRecovery.recover();
    }
}

function saveCategoriesToStorage() {
    try {
        localStorage.setItem('categories', JSON.stringify(AppState.categories));
    } catch (error) {
        handleError(error, 'saveCategoriesToStorage');
        showNotification('Failed to save categories. Please try again.', 'error');
    }
}

// Storage Usage Tracking
function trackStorageUsage(bytes) {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    
    AppState.userProfile.storage.used = Number(mb.toFixed(2));
    
    // Update storage display
    updateStorageDisplay();
    
    // Check storage limits
    if (AppState.userProfile.storage.used > AppState.userProfile.storage.total * 0.9) {
        showNotification('You are approaching your storage limit!', 'warning');
    }
}

function updateStorageDisplay() {
    const storageProgress = document.querySelector('.storage-progress');
    const storageUsed = document.querySelector('.storage-used');
    const storageTotal = document.querySelector('.storage-total');
    
    if (storageProgress && storageUsed && storageTotal) {
        const percentage = (AppState.userProfile.storage.used / AppState.userProfile.storage.total) * 100;
        storageProgress.style.width = `${percentage}%`;
        storageUsed.textContent = `${AppState.userProfile.storage.used} GB`;
        storageTotal.textContent = `${AppState.userProfile.storage.total} GB`;
    }
}

// Open Note Modal
function openNoteModal(noteId = null) {
    elements.noteModal.classList.add('active');
    elements.overlay.classList.add('active');

    if (noteId) {
        const note = AppState.notes.find(n => n.id === noteId);
        if (note) {
            AppState.isEditMode = true;
            AppState.currentNoteId = noteId;
            elements.modalTitle.textContent = 'Edit Note';
            elements.noteTitleInput.value = note.title;
            elements.noteContent.innerHTML = note.content;
            elements.categorySelect.value = note.category;
            
            // Update formatting toolbar states
            if (window.noteEditor) {
                window.noteEditor.updateButtonStates();
            }
        }
    } else {
        elements.modalTitle.textContent = 'Create New Note';
        resetNoteForm();
    }
}

// Close All Modals
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    elements.overlay.classList.remove('active');
    resetForms();
    
    // Reinitialize forms when opening modals
    if (elements.profileModal && elements.profileModal.classList.contains('active')) {
        initializeProfile();
    }
    if (elements.settingsModal && elements.settingsModal.classList.contains('active')) {
        initializeSettings();
    }
}

// Reset Note Form
function resetNoteForm() {
    AppState.isEditMode = false;
    AppState.currentNoteId = null;
    elements.noteTitleInput.value = '';
    elements.noteContent.innerHTML = '';
    elements.categorySelect.value = '';
    
    // Reset formatting toolbar states
    if (window.noteEditor) {
        window.noteEditor.updateButtonStates();
    }
}

// Reset Forms
function resetForms() {
    resetNoteForm();
    resetCategoryForm();
}

// Initialize the App
document.addEventListener('DOMContentLoaded', initializeApp);
