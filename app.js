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
    editingCategoryId: null
};

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
    closeButtons: document.querySelectorAll('.close-btn'),
    noteForm: document.getElementById('noteForm'),
    notesContainer: document.getElementById('notesGrid'),
    navItems: document.querySelectorAll('.nav-item'),
    categoriesList: document.getElementById('categoriesList'),
    newCategoryBtn: document.getElementById('newCategoryBtn'),
    searchInput: document.getElementById('searchInput'),
    viewButtons: document.querySelectorAll('.view-btn'),
    modalTitle: document.querySelector('.note-modal .modal-title h2'),
    noteTitleInput: document.getElementById('noteTitleInput'),
    noteContent: document.getElementById('noteContent'),
    categorySelect: document.getElementById('categorySelect'),
    formatButtons: document.querySelectorAll('.format-btn'),
    saveNoteBtn: document.getElementById('saveNoteBtn'),
    cancelNoteBtn: document.getElementById('cancelNoteBtn'),
    categoryName: document.getElementById('categoryName'),
    colorOptions: document.querySelectorAll('.color-option'),
    iconOptions: document.querySelectorAll('.icon-option')
};

function setupModalCloseButtons() {
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeAllModals();
        });
    });
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

// Initialize App
function initializeApp() {
    loadTheme();
    setupEventListeners();
    setupModalCloseButtons();
    setupMenuButtons();
    renderCategories();
    renderNotes();
    updateCategoryCounts();
    loadView();
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

    elements.formatButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const command = btn.title.toLowerCase();
            document.execCommand(command, false, null);
        });
    });

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

    // Add event listeners for close buttons (X) in modals
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            closeAllModals();
        });
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
        openNoteModal();
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

    elements.formatButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const command = btn.title.toLowerCase();
            document.execCommand(command, false, null);
        });
    });

    elements.newCategoryBtn.addEventListener('click', () => openCategoryModal());

    elements.closeButtons.forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    elements.overlay.addEventListener('click', () => {
        closeAllModals();
        elements.sidebar.classList.remove('active');
        elements.overlay.classList.remove('active');
    });

    elements.colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            elements.colorOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });

    elements.iconOptions.forEach(option => {
        option.addEventListener('click', () => {
            elements.iconOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });
}

// Handle Note Submit
function handleNoteSubmit(e) {
    e.preventDefault();
    const title = elements.noteTitleInput.value.trim();
    const content = elements.noteContent.innerHTML.trim();
    const category = elements.categorySelect.value;

    if (!title) return;

    const noteData = { title, content, category };

    if (AppState.isEditMode && AppState.currentNoteId) {
        updateNote(AppState.currentNoteId, noteData);
    } else {
        createNote(noteData);
    }

    closeAllModals();
    resetNoteForm();
}

// Create Note
function createNote(data) {
    const note = {
        id: Date.now(),
        title: data.title,
        content: data.content,
        category: data.category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
        isDeleted: false,
        isPinned: false
    };
    AppState.notes.unshift(note);
    saveNotesToStorage();
    renderNotes();
    updateCategoryCounts();
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

// Filter Notes
function filterNotes() {
    let filteredNotes = [...AppState.notes];

    if (AppState.activeSection === 'trash') {
        filteredNotes = filteredNotes.filter(note => note.isDeleted);
    } else if (AppState.activeSection === 'favorites') {
        filteredNotes = filteredNotes.filter(note => note.isFavorite && !note.isDeleted);
    } else if (AppState.activeSection === 'all') {
        filteredNotes = filteredNotes.filter(note => !note.isDeleted);
    } else {
        filteredNotes = filteredNotes.filter(note =>
            note.category === AppState.activeSection && !note.isDeleted
        );
    }

    if (elements.searchInput.value) {
        const searchTerm = elements.searchInput.value.toLowerCase();
        filteredNotes = filteredNotes.filter(note =>
            note.title.toLowerCase().includes(searchTerm) ||
            note.content.toLowerCase().includes(searchTerm)
        );
    }

    return filteredNotes;
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
            <div class="note-header">
                <div class="note-badges">
                    ${note.isPinned ? `
                        <span class="badge pinned">
                            <i class="fas fa-thumbtack"></i>
                            Pinned
                        </span>
                    ` : ''}
                    ${category ? `
                        <span class="badge category ${category.id}">
                            <i class="${category.icon}"></i>
                            ${category.name}
                        </span>
                    ` : ''}
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
            <div class="note-body">
                <h2 class="note-title">${note.title}</h2>
                <div class="note-preview">${note.content}</div>
                <div class="note-metadata">
                    <span class="date">
                        <i class="far fa-clock"></i>
                        Updated ${formatDate(note.updatedAt)}
                    </span>
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
function formatDate(date) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
}

// Save Notes to Storage
function saveNotesToStorage() {
    localStorage.setItem('notes', JSON.stringify(AppState.notes));
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
}

// Reset Note Form
function resetNoteForm() {
    AppState.isEditMode = false;
    AppState.currentNoteId = null;
    elements.noteTitleInput.value = '';
    elements.noteContent.innerHTML = '';
    elements.categorySelect.value = '';
}

// Reset Forms
function resetForms() {
    resetNoteForm();
    resetCategoryForm();
}

// Initialize the App
document.addEventListener('DOMContentLoaded', initializeApp);
