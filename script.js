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
        this.toggleThemeBtn = document.getElementById('toggleTheme');
        this.exportTasksBtn = document.getElementById('exportTasks');
        this.importTasksBtn = document.getElementById('importTasks');
    }

    addEventListeners() {
        this.createTaskBtn.addEventListener('click', () => this.openTaskModal());
        this.saveTaskBtn.addEventListener('click', () => this.addTask());
        this.cancelTaskBtn.addEventListener('click', () => this.closeTaskModal());

        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.target.closest('.filter-btn').dataset.filter;
                this.updateActiveFilter();
                this.render();
            });
        });

        this.settingsButton.addEventListener('click', () => {
            this.settingsDropdown.style.display = this.settingsDropdown.style.display === 'block' ? 'none' : 'block';
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.settings')) {
                this.settingsDropdown.style.display = 'none';
            }
        });

        this.toggleThemeBtn.addEventListener('click', () => this.toggleTheme());
        this.exportTasksBtn.addEventListener('click', () => this.exportTasks());
        this.importTasksBtn.addEventListener('click', () => this.importTasks());
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

        this.totalTasksElement.textContent = totalTasks;
        this.completedTasksElement.textContent = completedTasks;
        this.pendingTasksElement.textContent = pendingTasks;

        this.allCountElement.textContent = totalTasks;
        this.pendingCountElement.textContent = pendingTasks;
        this.completedCountElement.textContent = completedTasks;
    }

    saveToLocalStorage() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
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
        const deleteBtn = li.querySelector('.delete-btn');

        checkbox.addEventListener('change', () => this.toggleTaskStatus(task.id));
        deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

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
        this.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
        });
    }

    toggleTheme() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
        this.toggleThemeBtn.innerHTML = isDark ? '<i class="fas fa-moon"></i> Dark Mode' : '<i class="fas fa-sun"></i> Light Mode';
        this.saveToLocalStorage();
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
}

document.addEventListener('DOMContentLoaded', () => {
    const taskTracker = new TaskTracker();
});
