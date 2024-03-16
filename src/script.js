const tilebar = document.getElementById('tilebar');
let isDragging = false;
let startX = 0, startY = 0;
let allTasks = [];

tilebar.addEventListener('mousedown', e => {
    if (e.target.id === 'tilebar') {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
    }
});

document.addEventListener('mousemove', e => {
    if (isDragging) {
        let newX = e.clientX - startX;
        let newY = e.clientY - startY;
        window.electron.send('move', {
            x: newX,
            y: newY
        });
    }
});

tilebar.addEventListener('mouseup', () => {
    isDragging = false;
});

document.getElementById('minimize').addEventListener('click', () => {
    window.electron.send('minimize');
});

document.getElementById('close').addEventListener('click', quit);

const toolbar = document.querySelector('.toolbar');
toolbar.style.top = `${tilebar.offsetHeight}px`;
let opened = {};

toolbar.querySelectorAll('.tool').forEach((tool, index) => {
    opened[index] = false;

    const tools = tool.querySelector('.tools');
    tools.querySelectorAll('div').forEach(toolAction => {
        toolAction.addEventListener('click', () => {
            switch (toolAction.getAttribute('data-action')) {
                case 'quit':
                    quit();
                    break;
                case 'find':
                    find();
                    break;
                case 'delete-all':
                    deleteAll();
                    break;
            }
        });
    });

    tool.addEventListener('click', () => {
        for (let i in opened) {
            if (i != index) {
                const otherTool = toolbar.querySelectorAll('.tool')[i];
                const otherTools = otherTool.querySelector('.tools');
                otherTools.style.opacity = 0;
                otherTools.style.transform = 'translateY(-4px)';
                setTimeout(() => {
                    otherTools.style.removeProperty('display');
                }, 200);
                opened[i] = false;
            }
        }

        opened[index] = !opened[index];

        if (opened[index]) {
            tools.style.display = 'block';
            setTimeout(() => {
                tools.style.opacity = 1;
                tools.style.transform = 'translateY(0)';
            });
        } else {
            tools.style.opacity = 0;
            tools.style.transform = 'translateY(-4px)';
            setTimeout(() => {
                tools.style.removeProperty('display');
            }, 200);
        }
    });
});

document.addEventListener('click', e => {
    if (e.target.closest('[data-action="save"]')) save();
    if (e.target.closest('[data-action="open"]')) open();
});

function save() {
    const tasksToSave = Array.from(document.querySelectorAll('.task')).map((task, index) => {
        const originalLabel = task.querySelector('.task-name div').textContent;
        return {
            _task: originalLabel,
            title: originalLabel,
            index: index,
            checked: task.querySelector('.task-name div s') ? true : false
        };
    });

    window.electron.send('save', tasksToSave);
}

function open() {
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'application/json';
    file.style.display = 'none';
    document.body.appendChild(file);
    file.click();

    file.addEventListener('change', e => {
        const loadedFile = e.target.files[0];
        const fr = new FileReader();
        fr.addEventListener('load', e => {
            const result = JSON.parse(e.target.result);
            allTasks = result;
            content.innerHTML = '';
            allTasks.forEach(t => {
                let task = document.createElement('div');
                task.classList.add('task');
                task.innerHTML = taskFormat(t.title, escapeHTML(t._task), t.checked);
                task.draggable = true;
                applyTaskFunctionalities(task);
                content.appendChild(task);

                setTimeout(() => {
                    task.style.transform = 'scale(1)';
                    task.style.opacity = 1;
                });
            });
            file.remove();
        });
        fr.readAsText(loadedFile);
    });
}

function quit() {
    if (allTasks.length !== 0) {
        confirm('You have unsaved changes. Are you sure you want to exit?').then(bool => {
            if (bool) {
                window.electron.send('close');
            }
        });
    } else {
        window.electron.send('close');
    }
}

function deleteAll() {
    allTasks = [];
    content.querySelectorAll('.task').forEach(task => {
        task.style.transform = 'scale(.8)';
        task.style.opacity = 0;
    });

    setTimeout(() => {
        content.innerHTML = '<h3 class="availability">There are no available tasks at the moment &gt;_&lt;</h3>';
    }, 200);
}

let isFind = false;

function find() {
    isFind = !isFind;

    if (isFind) {
        const input = document.createElement('div');
        input.innerHTML = `
        <input type="text" placeholder="Find">
        <button role="button" class="accent">
            <svg xmlns="http://www.w3.org/2000/svg" fill="#000000" width="24" height="24" viewBox="0 0 32 32" version="1.1">
                <path d="M29.156 29.961l-0.709 0.709c-0.785 0.784-2.055 0.784-2.838 0l-5.676-5.674c-0.656-0.658-0.729-1.644-0.281-2.412l-3.104-3.102c-1.669 1.238-3.728 1.979-5.965 1.979-5.54 0-10.031-4.491-10.031-10.031s4.491-10.032 10.031-10.032c5.541 0 10.031 4.491 10.031 10.032 0 2.579-0.98 4.923-2.58 6.7l3.035 3.035c0.768-0.447 1.754-0.375 2.41 0.283l5.676 5.674c0.784 0.785 0.784 2.056 0.001 2.839zM18.088 11.389c0-4.155-3.369-7.523-7.524-7.523s-7.524 3.367-7.524 7.523 3.368 7.523 7.523 7.523 7.525-3.368 7.525-7.523z"/>
            </svg>
        </button>
        `;
        input.classList.add('find');
        document.body.appendChild(input);

        const search = input.querySelector('button');
        const searchInput = input.querySelector('input');
        searchInput.focus();
        search.addEventListener('click', () => {
            const searchText = searchInput.value.toLowerCase();
            let isFound = false;
            document.querySelectorAll('.task').forEach(task => {
                const taskText = task.querySelector('.task-name div').textContent.toLowerCase();
                if (taskText.includes(searchText)) {
                    task.style.display = 'flex';
                    isFound = true;
                } else {
                    task.style.display = 'none';
                }
            });
            if (!isFound) {
                alert('No tasks found!');

                document.querySelectorAll('.task').forEach(task => {
                    task.style.display = 'flex';
                });
            }
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') search.click();
        });
    } else {
        document.querySelectorAll('.find').forEach(finder => finder.remove());
        for (let task of allTasks) {
            task.style.display = 'flex';
        }
    }
}

document.addEventListener('keydown', e => {
    if (e.ctrlKey) {
        if (e.key === 's') save();
        if (e.key === 'o') open();
        if (e.key === 'w') quit();
        if (e.key === 'f') find();
        if (e.key === 'Delete') deleteAll();
    }
});

const mainInput = document.getElementById('main-input');
const submitBtn = document.getElementById('submit-btn');
const content = document.querySelector('.content');
const availability = content.querySelector('.availability');
let availabilityText = availability.textContent;

submitBtn.addEventListener('click', setTask);

mainInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') setTask();
});

function applyTaskFunctionalities(task) {
    const checkbox = task.querySelector('.checkbox');
    const label = checkbox.nextElementSibling;
    let originalLabel = label.textContent;

    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            label.innerHTML = `<s>${originalLabel}</s>`;
            label.style.opacity = .5;
        } else {
            label.innerHTML = `<div>${originalLabel}</div>`;
            label.style.removeProperty('opacity');
        }
    });

    const edit = task.querySelector('.edit');
    const remove = task.querySelector('.remove');
    const hCheckbox = task.querySelector('.h-checkbox');
    let editIcon = edit.innerHTML;
    let originalTitle;

    edit.addEventListener('click', () => {
        hCheckbox.click();

        if (hCheckbox.checked) {
            checkbox.style.display = 'none';
            label.setAttribute('contenteditable', true);
            label.focus();
            edit.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4.89163 13.2687L9.16582 17.5427L18.7085 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            `;
            label.addEventListener('keydown', e => {
                if (e.key === 'Enter') e.preventDefault();
            });
            label.style.overflow = 'auto';
            label.style.textOverflow = 'clip';
            label.classList.add('edit-mode');
        } else {
            checkbox.style.removeProperty('display');
            label.setAttribute('contenteditable', false);
            edit.innerHTML = editIcon;
            originalLabel = label.textContent;
            label.scrollLeft = 0;
            label.style.removeProperty('overflow');
            label.style.removeProperty('text-overflow');
            originalTitle = label.textContent;
            label.title = originalTitle;
            label.classList.remove('edit-mode');
        }
    });

    remove.addEventListener('click', () => {
        let taskHeight = task.offsetHeight;
        task.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        task.style.transform = 'scale(.8)';
        task.style.opacity = 0;

        let taskIndex = Array.from(content.children).indexOf(task);

        Array.from(content.children).forEach((taskBelow, index) => {
            if (index > taskIndex) {
                taskBelow.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
                taskBelow.style.transform = `translateY(-${taskHeight}px)`;
            }
        });

        setTimeout(() => {
            Array.from(content.children).forEach((taskBelow, index) => {
                if (index > taskIndex) {
                    taskBelow.style.transition = 'none';
                    taskBelow.style.transform = 'none';

                    setTimeout(() => {
                        taskBelow.style.removeProperty('transition');
                    }, 200);
                }
            });

            task.remove();
            allTasks = allTasks.filter((_, index) => index != task.getAttribute('data-pos'));

            if (content.children.length < 1) {
                content.innerHTML = '<h3 class="availability">There are no available tasks at the moment &gt;_&lt;</h3>';
            }
        }, 200);
    });

    task.addEventListener('dragstart', handleDragStart, false);
    task.addEventListener('dragenter', handleDragEnter, false);
    task.addEventListener('dragover', handleDragOver, false);
    task.addEventListener('dragleave', handleDragLeave, false);
    task.addEventListener('drop', handleDrop, false);

    function handleDragStart(e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', null);
        draggedTask = this;
    }

    function handleDragEnter() {
        this.classList.add('task-over');
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDragLeave(e) {
        if (!e.relatedTarget || !this.contains(e.relatedTarget)) {
            this.classList.remove('task-over');
        }
    }

    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        if (draggedTask !== this) {
            const draggedIndex = Array.from(this.parentNode.children).indexOf(draggedTask);
            const dropIndex = Array.from(this.parentNode.children).indexOf(this);

            const tasks = Array.from(this.parentNode.children);
            [tasks[draggedIndex], tasks[dropIndex]] = [tasks[dropIndex], tasks[draggedIndex]];

            tasks.forEach(task => this.parentNode.appendChild(task));
        }

        this.classList.remove('task-over');
        return false;
    }
}

function setTask() {
    if (mainInput.value.trim() === '') return;

    const task = document.createElement('div');
    task.classList.add('task');
    task.draggable = true;
    task.innerHTML = taskFormat(mainInput.value, escapeHTML(mainInput.value));

    setTimeout(() => {
        task.style.transform = 'scale(1)';
        task.style.opacity = 1;
    });

    allTasks.push({
        _task: mainInput.value,
        index: allTasks.length,
        checked: false
    });

    if (content.children.length > 0) {
        content.insertBefore(task, content.firstChild);
        document.querySelectorAll('.availability').forEach(isAvailable => isAvailable.remove());
    } else {
        content.appendChild(task);
    }

    applyTaskFunctionalities(task);
    mainInput.value = '';
}

function taskFormat(title, name, checked = false) {
    return `
    <div class="task-name">
        <input type="checkbox" class="checkbox" title="Mark as done" ${checked ? 'checked' : ''}>
        <div title="${title}" ${checked ? 'style="opacity: .5;"' : ''}>${checked ? `<s>${name}</s>` : name}</div>
    </div>
    <div class="task-actions">
        <button role="button" class="edit" title="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15.4998 5.49994L18.3282 8.32837M3 20.9997L3.04745 20.6675C3.21536 19.4922 3.29932 18.9045 3.49029 18.3558C3.65975 17.8689 3.89124 17.4059 4.17906 16.9783C4.50341 16.4963 4.92319 16.0765 5.76274 15.237L17.4107 3.58896C18.1918 2.80791 19.4581 2.80791 20.2392 3.58896C21.0202 4.37001 21.0202 5.63634 20.2392 6.41739L8.37744 18.2791C7.61579 19.0408 7.23497 19.4216 6.8012 19.7244C6.41618 19.9932 6.00093 20.2159 5.56398 20.3879C5.07171 20.5817 4.54375 20.6882 3.48793 20.9012L3 20.9997Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
        <button role="button" class="remove" title="Remove">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L17.1991 18.0129C17.129 19.065 17.0939 19.5911 16.8667 19.99C16.6666 20.3412 16.3648 20.6235 16.0011 20.7998C15.588 21 15.0607 21 14.0062 21H9.99377C8.93927 21 8.41202 21 7.99889 20.7998C7.63517 20.6235 7.33339 20.3412 7.13332 19.99C6.90607 19.5911 6.871 19.065 6.80086 18.0129L6 6M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6M14 10V17M10 10V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
        <input type="checkbox" class="h-checkbox" style="visibility: hidden; position: absolute;">
    </div>`;
}

function escapeHTML(html) {
    return html.replace(/[&<>"']/g, match => {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
}

function alert(message, delay = 3000) {
    const alert = document.createElement('div');
    alert.classList.add('alert');
    alert.textContent = message;
    document.body.appendChild(alert);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            setTimeout(() => {
                alert.style.opacity = 1;
                alert.style.transform = 'translate(-50%, -100%)';
            }, delay / 30);
        });
    });

    setTimeout(() => {
        alert.style.opacity = 0;
        alert.style.transform = 'translate(-50%, -200%)';
        setTimeout(() => alert.remove(), delay);
    }, delay);
}

function confirm(message) {
    return new Promise(resolve => {
        const modal = document.createElement('div');
        modal.classList.add('modal');
        modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-body">
                <p>${escapeHTML(message)}</p>
            </div>
            <div class="modal-footer">
                <button role="button" class="modal-cancel">Cancel</button>
                <button role="button" class="modal-confirm accent">OK</button>
            </div>
        </div>
        `;
        document.body.appendChild(modal);

        const content = modal.querySelector('.modal-content');

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.style.opacity = 1;
                content.style.transform = 'translate(-50%, -50%) scale(1)';
            });
        });

        const cancel = modal.querySelector('.modal-cancel');
        const confirm = modal.querySelector('.modal-confirm');
        confirm.focus();

        confirm.addEventListener('click', () => {
            decision();
            resolve(true);
        });
        cancel.addEventListener('click', () => {
            decision();
            resolve(false);
        });

        function decision(delay = 200) {
            modal.style.opacity = 0;
            content.style.transform = 'translate(-50%, -50%) scale(.8)';
            setTimeout(() => modal.remove(), delay);
        }
    });
}

document.body.addEventListener('click', e => {
    if (e.target.hasAttribute('data-ripple')) {
        const ripple = document.createElement('span');
        ripple.style.left = `${e.clientX - e.target.offsetLeft}px`;
        ripple.style.top = `${e.clientY - e.target.offsetTop}px`;
        ripple.classList.add('ripple');
        e.target.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    }
});