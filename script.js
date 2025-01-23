// Task Class to create task objects
class Task {
    constructor(id, text, completed = false) {
        this.id = id;
        this.text = text;
        this.completed = completed;
        this.createdAt = new Date();
    }
}

// TaskTracker Class to manage tasks
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
        // Input and buttons
        this.taskInput = document.getElementById('taskInput');
        this.addTaskBtn = document.getElementById('addTask');
        this.tasksList = document.getElementById('tasksList');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        
        // Statistics
        this.totalTasksElement = document.getElementById('totalTasks');
        this.completedTasksElement = document.getElementById('completedTasks');
        
        // Modal elements
        this.editModal = document.getElementById('editModal');
        this.editTaskInput = document.getElementById('editTaskInput');
        this.saveEditBtn = document.getElementById('saveEdit');
        this.cancelEditBtn = document.getElementById('cancelEdit');
    }
    

    addEventListeners() {
        // Add task events
        this.addTaskBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        // Filter events
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.target.dataset.filter;
                this.updateActiveFilter();
                this.render();
            });
        });

        // Modal events
        this.saveEditBtn.addEventListener('click', () => this.saveEdit());
        this.cancelEditBtn.addEventListener('click', () => this.closeEditModal());
    }

    addTask() {
        const text = this.taskInput.value.trim();
        if (text) {
            const newTask = new Task(Date.now().toString(), text);
            this.tasks.unshift(newTask);
            this.taskInput.value = '';
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
            this.editModal.style.display = 'flex';
            this.editTaskInput.focus();
        }
    }

    saveEdit() {
        const newText = this.editTaskInput.value.trim();
        if (newText && this.currentEditingTask) {
            this.currentEditingTask.text = newText;
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
        switch (this.currentFilter) {
            case 'completed':
                return this.tasks.filter(task => task.completed);
            case 'pending':
                return this.tasks.filter(task => !task.completed);
            default:
                return this.tasks;
        }
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
    }

    saveToLocalStorage() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;

        li.innerHTML = `
            <div class="task-content">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
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

        // Add event listeners to task elements
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
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    const taskTracker = new TaskTracker();
});

// Add these CSS keyframes to your styles.css file if not already present
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