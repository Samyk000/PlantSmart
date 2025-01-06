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
    activeSection: 'all'
};

// DOM Elements
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
    createNoteBtn: document.getElementById('createNote'),
    closeButtons: document.querySelectorAll('.close-btn'),
    noteForm: document.getElementById('noteForm'),
    notesContainer: document.querySelector('.notes-grid'),
    navItems: document.querySelectorAll('.nav-item'),
    categoriesList: document.querySelector('.categories-list'),
    newCategoryBtn: document.getElementById('newCategoryBtn'),
    searchInput: document.querySelector('.search-bar input'),
    viewButtons: document.querySelectorAll('.view-btn'),
    modalTitle: document.querySelector('.note-modal .modal-title h2'),
    noteTitleInput: document.querySelector('.note-title-input'),
    noteContent: document.querySelector('.rich-editor'),
    categorySelect: document.querySelector('.category-select select'),
    formatButtons: document.querySelectorAll('.format-btn'),
    saveNoteBtn: document.querySelector('.note-modal .btn-primary'),
    cancelNoteBtn: document.querySelector('.note-modal .btn-secondary'),
    categoryName: document.getElementById('categoryName'),
    colorOptions: document.querySelectorAll('.color-option'),
    iconOptions: document.querySelectorAll('.icon-option')
};

// Initialize App
function initializeApp() {
    loadTheme();
    setupEventListeners();
    renderCategories();
    renderNotes();
    updateCategoryCounts();
    loadView();
}

// Theme Management
function loadTheme() {
    elements.body.setAttribute('data-theme', AppState.currentTheme);
}

function toggleTheme() {
    AppState.currentTheme = AppState.currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', AppState.currentTheme);
    loadTheme();
}

// View Management
function loadView() {
    toggleView(AppState.currentView);
}

function toggleView(viewType) {
    AppState.currentView = viewType;
    localStorage.setItem('currentView', viewType);
    elements.notesContainer.className = viewType === 'grid' ? 'notes-grid' : 'notes-list';
    elements.viewButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewType);
    });
}

// Note Management
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

function deleteNote(id) {
    const note = AppState.notes.find(note => note.id === id);
    if (note) {
        if (note.isDeleted) {
            // Permanently delete from trash
            AppState.notes = AppState.notes.filter(n => n.id !== id);
        } else {
            // Move to trash
            note.isDeleted = true;
        }
        saveNotesToStorage();
        renderNotes();
        updateCategoryCounts();
    }
}

function toggleNoteFavorite(id) {
    const index = AppState.notes.findIndex(note => note.id === id);
    if (index !== -1) {
        AppState.notes[index].isFavorite = !AppState.notes[index].isFavorite;
        saveNotesToStorage();
        renderNotes();
        updateCategoryCounts();
    }
}

function duplicateNote(id) {
    const originalNote = AppState.notes.find(note => note.id === id);
    if (originalNote) {
        const duplicatedNote = {
            ...originalNote,
            id: Date.now(),
            title: `${originalNote.title} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        AppState.notes.unshift(duplicatedNote);
        saveNotesToStorage();
        renderNotes();
        updateCategoryCounts();
    }
}

// Filter Notes
function filterNotes() {
    let filteredNotes = [...AppState.notes]; // Create a copy of all notes

    // Filter based on active section
    if (AppState.activeSection === 'trash') {
        filteredNotes = filteredNotes.filter(note => note.isDeleted);
    } else if (AppState.activeSection === 'favorites') {
        filteredNotes = filteredNotes.filter(note => note.isFavorite && !note.isDeleted);
    } else if (AppState.activeSection === 'all') {
        // Show all notes that aren't deleted, including favorites
        filteredNotes = filteredNotes.filter(note => !note.isDeleted);
    } else {
        // Category specific notes
        filteredNotes = filteredNotes.filter(note => 
            note.category === AppState.activeSection && !note.isDeleted
        );
    }

    // Apply search filter if search term exists
    if (elements.searchInput.value) {
        const searchTerm = elements.searchInput.value.toLowerCase();
        filteredNotes = filteredNotes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) ||
            note.content.toLowerCase().includes(searchTerm)
        );
    }

    return filteredNotes;
}

// UI Rendering
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

// Event Listeners Setup
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
            const command = btn.dataset.command;
            const value = btn.dataset.value || null;
            document.execCommand(command, false, value);
            if (!['foreColor', 'backColor', 'fontName', 'fontSize'].includes(command)) {
                btn.classList.toggle('active');
            }
        });
    });

    elements.newCategoryBtn.addEventListener('click', openCategoryModal);
    
    document.querySelector('.category-modal .btn-primary').addEventListener('click', (e) => {
        e.preventDefault();
        handleCategoryCreate();
    });
    
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

// Note Card Event Listeners
function setupNoteCardListeners(noteElement, noteId) {
    const starBtn = noteElement.querySelector('.star-btn');
    starBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleNoteFavorite(noteId);
    });

    const moreBtn = noteElement.querySelector('.more-btn');
    const actionsDropdown = noteElement.querySelector('.actions-dropdown');
    
    moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.actions-dropdown').forEach(dropdown => {
            if (dropdown !== actionsDropdown) {
                dropdown.parentElement.classList.remove('active');
            }
        });
        moreBtn.parentElement.classList.toggle('active');
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
        const note = AppState.notes.find(n => n.id === noteId);
        const message = note.isDeleted ? 
            'Are you sure you want to permanently delete this note?' : 
            'Are you sure you want to move this note to trash?';
        
        if (confirm(message)) {
            deleteNote(noteId);
        }
    });

    noteElement.addEventListener('click', () => {
        openNoteModal(noteId);
    });
}

// Form Handlers
function handleNoteSubmit(e) {
    e.preventDefault();
    const title = elements.noteTitleInput.value.trim();
    const content = elements.noteContent.innerHTML.trim();
    const category = elements.categorySelect.value;

    if (!title) {
        alert('Please enter a note title');
        return;
    }

    const noteData = {
        title,
        content,
        category
    };

    if (AppState.isEditMode && AppState.currentNoteId) {
        updateNote(AppState.currentNoteId, noteData);
    } else {
        createNote(noteData);
    }

    closeAllModals();
    resetNoteForm();
}

function handleCategoryCreate() {
    const name = elements.categoryName.value.trim();
    const colorOption = document.querySelector('.color-option.active');
    const iconOption = document.querySelector('.icon-option.active');

    if (!name || !colorOption || !iconOption) {
        alert('Please fill in all category details');
        return;
    }

    const categoryData = {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        color: getComputedStyle(colorOption).getPropertyValue('--color').trim(),
        icon: iconOption.querySelector('i').className
    };

    if (AppState.categories.some(cat => cat.id === categoryData.id)) {
        alert('A category with this name already exists');
        return;
    }

    AppState.categories.push(categoryData);
    saveCategoriestoStorage();
    renderCategories();
    updateCategorySelect();
    closeAllModals();
    resetCategoryForm();
}

// Category Management
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
        `;
        
        categoryElement.addEventListener('click', (e) => {
            e.preventDefault();
            handleNavigation(categoryElement);
        });
        
        elements.categoriesList.appendChild(categoryElement);
    });
    
    updateCategorySelect();
}

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

// Modal Management
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

function openCategoryModal() {
    resetCategoryForm();
    elements.categoryModal.classList.add('active');
    elements.overlay.classList.add('active');
}

function closeAllModals() {
    elements.noteModal.classList.remove('active');
    elements.categoryModal.classList.remove('active');
    elements.overlay.classList.remove('active');
    resetForms();
}

// Form Reset Functions
function resetNoteForm() {
    AppState.isEditMode = false;
    AppState.currentNoteId = null;
    elements.noteTitleInput.value = '';
    elements.noteContent.innerHTML = '';
    elements.categorySelect.value = '';
}

function resetCategoryForm() {
    elements.categoryName.value = '';
    elements.colorOptions.forEach(opt => opt.classList.remove('active'));
    elements.colorOptions[0].classList.add('active');
    elements.iconOptions.forEach(opt => opt.classList.remove('active'));
    elements.iconOptions[0].classList.add('active');
}

function resetForms() {
    resetNoteForm();
    resetCategoryForm();
}

// Navigation Handling
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

// Category Management
function updateCategoryCounts() {
    const counts = {
        all: 0,
        favorites: 0,
        trash: 0
    };

    // Initialize category counts
    AppState.categories.forEach(category => {
        counts[category.id] = 0;
    });

    // Count notes
    AppState.notes.forEach(note => {
        if (!note.isDeleted) {
            counts.all++; // Count all non-deleted notes
            if (note.isFavorite) counts.favorites++;
            if (note.category) counts[note.category]++;
        } else {
            counts.trash++;
        }
    });

    // Update UI counts
    document.querySelectorAll('.nav-item, .category-item').forEach(item => {
        const countElement = item.querySelector('.note-count');
        if (countElement) {
            const section = item.dataset.section || 
                          item.querySelector('span:not(.note-count)').textContent.toLowerCase();
            countElement.textContent = counts[section] || 0;
        }
    });
}

// Utility Functions
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

function formatDate(date) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
}

// Storage Functions
function saveNotesToStorage() {
    localStorage.setItem('notes', JSON.stringify(AppState.notes));
}

function saveCategoriestoStorage() {
    localStorage.setItem('categories', JSON.stringify(AppState.categories));
}

// Initialize the app
document.addEventListener('DOMContentLoaded', initializeApp);

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    const moreActions = document.querySelectorAll('.more-actions');
    moreActions.forEach(action => {
        if (!action.contains(e.target)) {
            action.classList.remove('active');
        }
    });
});
