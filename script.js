class Task {
    constructor(id, text, completed = false, priority = 'low', dueDate = '', category = '') {
        this.id = id;
        this.text = text;
        this.completed = completed;
        this.priority = priority;
        this.dueDate = dueDate;
        this.category = category;
        this.createdAt = new Date();
    }
}

class TaskTracker {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.currentFilter = 'all';
        this.initializeElements();
        this.addEventListeners();
        this.initializeTheme(); // Initialize theme on load
        this.render();
    }

    initializeElements() {
        this.taskInput = document.getElementById('taskInput');
        this.taskPriority = document.getElementById('taskPriority');
        this.taskDueDate = document.getElementById('taskDueDate');
        this.taskCategory = document.getElementById('taskCategory');
        this.tasksList = document.getElementById('tasksList');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.totalTasksElement = document.getElementById('totalTasks');
        this.completedTasksElement = document.getElementById('completedTasks');
        this.pendingTasksElement = document.getElementById('pendingTasks');
        this.allCountElement = document.getElementById('allCount');
        this.pendingCountElement = document.getElementById('pendingCount');
        this.completedCountElement = document.getElementById('completedCount');
        this.createTaskBtn = document.getElementById('createTaskBtn');
        this.taskModal = document.getElementById('taskModal');
        this.saveTaskBtn = document.getElementById('saveTask');
        this.cancelTaskBtn = document.getElementById('cancelTask');
        this.settingsButton = document.getElementById('settingsButton');
        this.settingsDropdown = document.getElementById('settingsDropdown');
        this.exportTasksBtn = document.getElementById('exportTasks');
        this.importTasksBtn = document.getElementById('importTasks');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarClose = document.getElementById('sidebarClose');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.editTaskModal = document.getElementById('editTaskModal');
        this.editTaskInput = document.getElementById('editTaskInput');
        this.editTaskPriority = document.getElementById('editTaskPriority');
        this.editTaskDueDate = document.getElementById('editTaskDueDate');
        this.editTaskCategory = document.getElementById('editTaskCategory');
        this.saveEditTaskBtn = document.getElementById('saveEditTask');
        this.cancelEditTaskBtn = document.getElementById('cancelEditTask');
        this.categoriesModal = document.getElementById('categoriesModal');
        this.newCategoryInput = document.getElementById('newCategory');
        this.categoriesList = document.getElementById('categoriesList');
        this.saveCategoryBtn = document.getElementById('saveCategory');
        this.cancelCategoryBtn = document.getElementById('cancelCategory');
        this.settingsModal = document.getElementById('settingsModal');
        this.themeSetting = document.getElementById('themeSetting');
        this.notificationSetting = document.getElementById('notificationSetting');
        this.saveSettingsBtn = document.getElementById('saveSettings');
        this.cancelSettingsBtn = document.getElementById('cancelSettings');
        this.helpModal = document.getElementById('helpModal');
        this.closeHelpBtn = document.getElementById('closeHelp');
        this.aboutModal = document.getElementById('aboutModal');
        this.closeAboutBtn = document.getElementById('closeAbout');
        this.categoriesBtn = document.getElementById('categoriesBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.helpBtn = document.getElementById('helpBtn');
        this.aboutBtn = document.getElementById('aboutBtn');
        this.themeToggle = document.getElementById('themeToggle'); // Dark theme toggle button
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.body.setAttribute('data-theme', savedTheme);
            this.updateThemeIcon(savedTheme); // Update icon based on saved theme
        } else {
            document.body.setAttribute('data-theme', 'light');
            this.updateThemeIcon('light'); // Default to light theme icon
        }
    }

    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme); // Update icon based on new theme
    }

    updateThemeIcon(theme) {
        if (this.themeToggle) {
            const icon = this.themeToggle.querySelector('i');
            if (theme === 'dark') {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }
    }

    addEventListeners() {
        this.createTaskBtn?.addEventListener('click', () => this.openTaskModal());
        this.saveTaskBtn?.addEventListener('click', () => this.addTask());
        this.cancelTaskBtn?.addEventListener('click', () => this.closeTaskModal());

        this.filterBtns?.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.target.closest('.filter-btn').dataset.filter;
                this.updateActiveFilter();
                this.render();
            });
        });

        this.settingsButton?.addEventListener('click', () => {
            this.settingsDropdown.style.display = this.settingsDropdown.style.display === 'block' ? 'none' : 'block';
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.settings')) {
                this.settingsDropdown.style.display = 'none';
            }
        });

        this.exportTasksBtn?.addEventListener('click', () => this.exportTasks());
        this.importTasksBtn?.addEventListener('click', () => this.importTasks());

        this.sidebarToggle?.addEventListener('click', () => this.toggleSidebar());
        this.sidebarClose?.addEventListener('click', () => this.toggleSidebar());
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.sidebar') && !e.target.closest('.sidebar-toggle')) {
                this.sidebar.classList.remove('active');
            }
        });

        this.saveEditTaskBtn?.addEventListener('click', () => this.saveEditedTask());
        this.cancelEditTaskBtn?.addEventListener('click', () => this.closeEditTaskModal());

        this.categoriesBtn?.addEventListener('click', () => this.openCategoriesModal());
        this.saveCategoryBtn?.addEventListener('click', () => this.saveCategory());
        this.cancelCategoryBtn?.addEventListener('click', () => this.closeCategoriesModal());

        this.settingsBtn?.addEventListener('click', () => this.openSettingsModal());
        this.saveSettingsBtn?.addEventListener('click', () => this.saveSettings());
        this.cancelSettingsBtn?.addEventListener('click', () => this.closeSettingsModal());

        this.helpBtn?.addEventListener('click', () => this.openHelpModal());
        this.closeHelpBtn?.addEventListener('click', () => this.closeHelpModal());

        this.aboutBtn?.addEventListener('click', () => this.openAboutModal());
        this.closeAboutBtn?.addEventListener('click', () => this.closeAboutModal());

        // Dark theme toggle event listener
        this.themeToggle?.addEventListener('click', () => this.toggleTheme());
    }

    openTaskModal() {
        this.taskModal.style.display = 'flex';
    }

    closeTaskModal() {
        this.taskModal.style.display = 'none';
        this.clearTaskForm();
    }

    clearTaskForm() {
        this.taskInput.value = '';
        this.taskPriority.value = 'low';
        this.taskDueDate.value = '';
        this.taskCategory.value = '';
    }

    addTask() {
        const text = this.taskInput.value.trim();
        if (text) {
            const newTask = new Task(
                Date.now().toString(),
                text,
                false,
                this.taskPriority.value,
                this.taskDueDate.value,
                this.taskCategory.value.trim()
            );
            this.tasks.unshift(newTask);
            this.saveToLocalStorage();
            this.render();
            this.closeTaskModal();
        }
    }

    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const pendingTasks = totalTasks - completedTasks;

        if (this.totalTasksElement) this.totalTasksElement.textContent = totalTasks;
        if (this.completedTasksElement) this.completedTasksElement.textContent = completedTasks;
        if (this.pendingTasksElement) this.pendingTasksElement.textContent = pendingTasks;

        if (this.allCountElement) this.allCountElement.textContent = totalTasks;
        if (this.pendingCountElement) this.pendingCountElement.textContent = pendingTasks;
        if (this.completedCountElement) this.completedCountElement.textContent = completedTasks;
    }

    saveToLocalStorage() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    render() {
        const filteredTasks = this.getFilteredTasks();
        if (this.tasksList) {
            this.tasksList.innerHTML = '';

            filteredTasks.forEach(task => {
                const taskElement = this.createTaskElement(task);
                this.tasksList.appendChild(taskElement);
            });

            this.updateStats();
        }
    }

    getFilteredTasks() {
        return this.tasks.filter(task => {
            if (this.currentFilter === 'all') return true;
            if (this.currentFilter === 'completed') return task.completed;
            if (this.currentFilter === 'pending') return !task.completed;
            return true;
        });
    }

    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;
        li.dataset.priority = task.priority;

        li.innerHTML = `
            <div class="task-content">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
                ${task.category ? `<span class="task-category">${task.category}</span>` : ''}
                ${task.dueDate ? `<span class="task-due-date">${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
            </div>
            <div class="task-actions">
                <button class="edit-btn" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        const checkbox = li.querySelector('.task-checkbox');
        const editBtn = li.querySelector('.edit-btn');
        const deleteBtn = li.querySelector('.delete-btn');

        checkbox?.addEventListener('change', () => this.toggleTaskStatus(task.id));
        editBtn?.addEventListener('click', () => this.openEditTaskModal(task));
        deleteBtn?.addEventListener('click', () => this.deleteTask(task.id));

        return li;
    }

    toggleTaskStatus(taskId) {
        const task = this.tasks.find(task => task.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveToLocalStorage();
            this.render();
        }
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveToLocalStorage();
        this.render();
    }

    updateActiveFilter() {
        this.filterBtns?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
        });
    }

    exportTasks() {
        const data = JSON.stringify(this.tasks);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tasks.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    importTasks() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const data = JSON.parse(event.target.result);
                this.tasks = data;
                this.saveToLocalStorage();
                this.render();
            };
            reader.readAsText(file);
        };
        input.click();
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('active');
    }

    openEditTaskModal(task) {
        this.editTaskInput.value = task.text;
        this.editTaskPriority.value = task.priority;
        this.editTaskDueDate.value = task.dueDate;
        this.editTaskCategory.value = task.category;
        this.editTaskModal.style.display = 'flex';
        this.currentTaskId = task.id;
    }

    closeEditTaskModal() {
        this.editTaskModal.style.display = 'none';
        this.currentTaskId = null;
    }

    saveEditedTask() {
        const task = this.tasks.find(task => task.id === this.currentTaskId);
        if (task) {
            task.text = this.editTaskInput.value.trim();
            task.priority = this.editTaskPriority.value;
            task.dueDate = this.editTaskDueDate.value;
            task.category = this.editTaskCategory.value.trim();
            this.saveToLocalStorage();
            this.render();
            this.closeEditTaskModal();
        }
    }

    openCategoriesModal() {
        this.categoriesModal.style.display = 'flex';
        this.renderCategories();
        this.toggleSidebar();
    }

    closeCategoriesModal() {
        this.categoriesModal.style.display = 'none';
    }

    renderCategories() {
        const categories = [...new Set(this.tasks.map(task => task.category).filter(category => category))];
        if (this.categoriesList) {
            this.categoriesList.innerHTML = '';
            categories.forEach(category => {
                const li = document.createElement('li');
                li.textContent = category;
                this.categoriesList.appendChild(li);
            });
        }
    }

    saveCategory() {
        const category = this.newCategoryInput.value.trim();
        if (category) {
            this.tasks.forEach(task => {
                if (!task.category) {
                    task.category = category;
                }
            });
            this.saveToLocalStorage();
            this.render();
            this.closeCategoriesModal();
        }
    }

    openSettingsModal() {
        this.settingsModal.style.display = 'flex';
        this.toggleSidebar();
    }

    closeSettingsModal() {
        this.settingsModal.style.display = 'none';
    }

    saveSettings() {
        const theme = this.themeSetting.value;
        const notifications = this.notificationSetting.value;
        document.body.setAttribute('data-theme', theme);
        this.saveToLocalStorage();
        this.closeSettingsModal();
    }

    openHelpModal() {
        this.helpModal.style.display = 'flex';
        this.toggleSidebar();
    }

    closeHelpModal() {
        this.helpModal.style.display = 'none';
    }

    openAboutModal() {
        this.aboutModal.style.display = 'flex';
        this.toggleSidebar();
    }

    closeAboutModal() {
        this.aboutModal.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const taskTracker = new TaskTracker();
}); 
