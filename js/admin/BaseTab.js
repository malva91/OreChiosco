import { ErrorHandler } from '../utils/ErrorHandler.js';

export class BaseTab {
    constructor(tabId) {
        this.tabId = tabId;
        this.container = document.getElementById(`${tabId}-tab`);
    }

    async init() {
        // To be implemented by subclasses
    }

    render() {
        // To be implemented by subclasses
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        ErrorHandler.showError(message, this.container);
    }

    showSuccess(message) {
        ErrorHandler.showSuccess(message, this.container);
    }
    
    showWarning(message) {
        ErrorHandler.showWarning(message, this.container);
    }
    
    showInfo(message) {
        ErrorHandler.showInfo(message, this.container);
    }
    
    showCustomConfirm(message, onConfirm, type = 'warning') {
        ErrorHandler.showConfirm(message, onConfirm, type, this.container);
    }
}