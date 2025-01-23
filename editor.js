export class RichTextEditor {
    constructor() {
        this.editor = document.getElementById('noteContent');
        this.toolbar = document.querySelector('.formatting-toolbar');
        this.savedRange = null;
        
        if (this.editor && this.toolbar) {
            this.initializeEditor();
            this.initializeSelectionHandling();
            this.setupFormatTracking();
        }
    }

    initializeEditor() {
        this.editor.contentEditable = 'true';
        this.editor.innerHTML = this.editor.innerHTML || '<div><br></div>';
    
        // Format Buttons
        this.toolbar.querySelectorAll('.format-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                const command = button.dataset.command;
    
                this.restoreSelection();
                if (command) {
                    switch(command) {
                        case 'createLink':
                            this.handleLinkInsertion();
                            break;
                        case 'removeFormat':
                            this.removeAllFormatting();
                            break;
                        default:
                            this.applyFormatting(command);
                    }
                }
                this.saveSelection();
                this.updateButtonStates();
                this.editor.focus();
            });
        });
    
        // Font Controls
        this.setupFontControls('.font-size-select', 'fontSize', (size) => this.getFontSizeValue(size));
        this.setupFontControls('.font-family-select', 'fontName');
    
        // Color Pickers
        this.toolbar.querySelectorAll('.color-btn').forEach(button => {
            const picker = button.querySelector('.color-picker');
    
            if (picker) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.restoreSelection();
                    picker.click();  // Simulate a click to open the color picker
                });
    
                picker.addEventListener('input', (e) => {
                    const command = picker.dataset.command;
                    const color = e.target.value;
                    if (command && color) {
                        this.restoreSelection();
                        this.executeCommand(command, color);
                        this.saveSelection();
                        this.updateButtonStates();
                    }
                });
            }
        });
    
        // Selection change handling
        document.addEventListener('selectionchange', () => {
            if (document.activeElement === this.editor) {
                this.saveSelection();
                this.updateButtonStates();
            }
        });
    }

    setupFontControls(selector, command, valueMapper = (value) => value) {
        const control = this.toolbar.querySelector(selector);
        if (control) {
            control.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });

            control.addEventListener('change', (e) => {
                e.preventDefault();
                this.restoreSelection();
                const value = valueMapper(e.target.value);
                if (value) {
                    this.executeCommand(command, value);
                    this.editor.focus();
                }
            });
        }
    }

    setupFormatTracking() {
        this.editor.addEventListener('input', () => this.updateButtonStates());
        this.editor.addEventListener('click', () => this.updateButtonStates());
    }

    initializeSelectionHandling() {
        ['mouseup', 'keyup', 'touchend'].forEach(event => {
            this.editor.addEventListener(event, () => {
                this.saveSelection();
                this.updateButtonStates();
            });
        });

        this.editor.addEventListener('focus', () => this.restoreSelection());

        this.toolbar.addEventListener('mousedown', (e) => {
            if (e.target.closest('button, select, input[type="color"]')) {
                e.preventDefault();
            }
        });
    }

    getFontSizeValue(size) {
        const sizeMap = {
            '8pt': '1',
            '10pt': '2',
            '12pt': '3',
            '14pt': '4',
            '16pt': '5',
            '18pt': '6',
            '24pt': '7',
            '36pt': '8',
            '48pt': '9'
        };
        return sizeMap[size] || '3';
    }

    saveSelection() {
        if (window.getSelection) {
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                this.savedRange = sel.getRangeAt(0).cloneRange();
            }
        }
    }

    restoreSelection() {
        if (this.savedRange) {
            if (window.getSelection) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(this.savedRange);
            }
            this.editor.focus();
        }
    }

    executeCommand(command, value = null) {
        try {
            this.restoreSelection();
            document.execCommand(command, false, value);
            this.updateButtonStates();
        } catch (error) {
            console.error(`Command execution error for ${command}:`, error);
        }
    }

    applyFormatting(command) {
        this.executeCommand(command);
    }

    handleLinkInsertion() {
        this.restoreSelection();
        const url = prompt('Enter URL:', 'http://');
        if (url && url !== 'http://') {
            document.execCommand('createLink', false, url);

            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const linkNode = range.commonAncestorContainer.parentNode;
            if (linkNode.tagName === 'A') {
                linkNode.target = '_blank';
                linkNode.rel = 'noopener noreferrer';
            }
            this.editor.focus();
        }
    }

    removeAllFormatting() {
        try {
            this.restoreSelection();
            document.execCommand('removeFormat', false, null);
            document.execCommand('fontName', false, 'Arial');
            document.execCommand('fontSize', false, '3');
            document.execCommand('justifyLeft', false, null);
            this.updateButtonStates();
            this.editor.focus();
        } catch (error) {
            console.error('Remove formatting error:', error);
        }
    }

    updateButtonStates() {
        this.toolbar.querySelectorAll('.format-btn').forEach(button => {
            const command = button.dataset.command;
            if (command && !['createLink', 'removeFormat'].includes(command)) {
                try {
                    const isActive = document.queryCommandState(command);
                    button.classList.toggle('active', isActive);
                } catch (e) {
                    console.warn(`Command state check failed for: ${command}`);
                }
            }
        });
    }

    reset() {
        this.editor.innerHTML = '<div><br></div>';
        this.savedRange = null;
        this.updateButtonStates();
    }
}

// Initialize the editor
document.addEventListener('DOMContentLoaded', () => {
    window.noteEditor = new RichTextEditor();
});