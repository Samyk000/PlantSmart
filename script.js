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
        this.currentEditingTask = null;
        this.initializeElements();
        this.addEventListeners();
        this.render();
    }

    initializeElements() {
        this.taskInput = document.getElementById('taskInput');
        this.taskPriority = document.getElementById('taskPriority');
        this.taskDueDate = document.getElementById('taskDueDate');
        this.taskCategory = document.getElementById('taskCategory');
        this.addTaskBtn = document.getElementById('addTask');
        this.toggleAdvancedBtn = document.getElementById('toggleAdvanced');
        this.advancedOptions = document.getElementById('advancedOptions');
        this.tasksList = document.getElementById('tasksList');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.totalTasksElement = document.getElementById('totalTasks');
        this.completedTasksElement = document.getElementById('completedTasks');
        this.editModal = document.getElementById('editModal');
        this.editTaskInput = document.getElementById('editTaskInput');
        this.editDueDate = document.getElementById('editDueDate');
        this.editCategory = document.getElementById('editCategory');
        this.editPriority = document.getElementById('editPriority');
        this.saveEditBtn = document.getElementById('saveEdit');
        this.cancelEditBtn = document.getElementById('cancelEdit');
        this.searchInput = document.getElementById('searchInput');
        this.progressBar = document.querySelector('.progress');
        this.exportTasksBtn = document.getElementById('exportTasks');
        this.importTasksBtn = document.getElementById('importTasks');
        this.toggleThemeBtn = document.getElementById('toggleTheme');
        this.settingsButton = document.getElementById('settingsButton');
        this.settingsDropdown = document.getElementById('settingsDropdown');
    }

    addEventListeners() {
        this.addTaskBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        this.toggleAdvancedBtn.addEventListener('click', () => {
            this.advancedOptions.classList.toggle('visible');
        });

        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.target.dataset.filter;
                this.updateActiveFilter();
                this.render();
            });
        });

        this.saveEditBtn.addEventListener('click', () => this.saveEdit());
        this.cancelEditBtn.addEventListener('click', () => this.closeEditModal());

        this.searchInput.addEventListener('input', () => this.render());

        this.exportTasksBtn.addEventListener('click', () => this.exportTasks());
        this.importTasksBtn.addEventListener('click', () => this.importTasks());

        this.toggleThemeBtn.addEventListener('click', () => this.toggleTheme());

        this.settingsButton.addEventListener('click', () => {
            this.settingsDropdown.style.display = this.settingsDropdown.style.display === 'block' ? 'none' : 'block';
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.settings')) {
                this.settingsDropdown.style.display = 'none';
            }
        });

        Sortable.create(this.tasksList, {
            animation: 150,
            onEnd: (evt) => this.reorderTasks(evt),
        });
    }

    addTask() {
        const text = this.taskInput.value.trim();
        const priority = this.taskPriority.value;
        const dueDate = this.taskDueDate.value;
        const category = this.taskCategory.value.trim();
        if (text) {
            const newTask = new Task(Date.now().toString(), text, false, priority, dueDate, category);
            this.tasks.unshift(newTask);
            this.taskInput.value = '';
            this.taskDueDate.value = '';
            this.taskCategory.value = '';
            this.saveToLocalStorage();
            this.render();
            this.addTaskAnimation(newTask.id);
        }
    }

    deleteTask(taskId) {
        const taskElement = document.querySelector(`[data-id="${taskId}"]`);
        taskElement.style.animation = 'slideOut 0.3s ease forwards';
        
        setTimeout(() => {
            this.tasks = this.tasks.filter(task => task.id !== taskId);
            this.saveToLocalStorage();
            this.render();
        }, 300);
    }

    toggleTaskStatus(taskId) {
        const task = this.tasks.find(task => task.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveToLocalStorage();
            this.render();
        }
    }

    editTask(taskId) {
        this.currentEditingTask = this.tasks.find(task => task.id === taskId);
        if (this.currentEditingTask) {
            this.editTaskInput.value = this.currentEditingTask.text;
            this.editDueDate.value = this.currentEditingTask.dueDate;
            this.editCategory.value = this.currentEditingTask.category;
            this.editPriority.value = this.currentEditingTask.priority;
            this.editModal.style.display = 'flex';
            this.editTaskInput.focus();
        }
    }

    saveEdit() {
        const newText = this.editTaskInput.value.trim();
        const newDueDate = this.editDueDate.value;
        const newCategory = this.editCategory.value.trim();
        const newPriority = this.editPriority.value;
        if (newText && this.currentEditingTask) {
            this.currentEditingTask.text = newText;
            this.currentEditingTask.dueDate = newDueDate;
            this.currentEditingTask.category = newCategory;
            this.currentEditingTask.priority = newPriority;
            this.saveToLocalStorage();
            this.closeEditModal();
            this.render();
        }
    }

    closeEditModal() {
        this.editModal.style.display = 'none';
        this.currentEditingTask = null;
    }

    updateActiveFilter() {
        this.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
        });
    }

    getFilteredTasks() {
        const searchQuery = this.searchInput.value.toLowerCase();
        return this.tasks.filter(task => {
            const matchesFilter = this.currentFilter === 'all' ||
                (this.currentFilter === 'completed' && task.completed) ||
                (this.currentFilter === 'pending' && !task.completed);
            const matchesSearch = task.text.toLowerCase().includes(searchQuery);
            return matchesFilter && matchesSearch;
        });
    }

    addTaskAnimation(taskId) {
        setTimeout(() => {
            const taskElement = document.querySelector(`[data-id="${taskId}"]`);
            if (taskElement) {
                taskElement.style.animation = 'slideIn 0.3s ease';
            }
        }, 0);
    }

    updateStats() {
        const completedTasks = this.tasks.filter(task => task.completed).length;
        this.totalTasksElement.textContent = this.tasks.length;
        this.completedTasksElement.textContent = completedTasks;
        const progress = (completedTasks / this.tasks.length) * 100 || 0;
        this.progressBar.style.width = `${progress}%`;
    }

    saveToLocalStorage() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
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

        checkbox.addEventListener('change', () => this.toggleTaskStatus(task.id));
        editBtn.addEventListener('click', () => this.editTask(task.id));
        deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

        return li;
    }

    render() {
        const filteredTasks = this.getFilteredTasks();
        this.tasksList.innerHTML = '';
        
        filteredTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            this.tasksList.appendChild(taskElement);
        });

        this.updateStats();
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

    toggleTheme() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
        this.toggleThemeBtn.innerHTML = isDark ? '<i class="fas fa-moon"></i> Dark Mode' : '<i class="fas fa-sun"></i> Light Mode';
        this.saveToLocalStorage();
    }

    reorderTasks(evt) {
        const taskId = evt.item.dataset.id;
        const task = this.tasks.find(task => task.id === taskId);
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.tasks.splice(evt.newIndex, 0, task);
        this.saveToLocalStorage();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const taskTracker = new TaskTracker();
});

const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);
