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
        overlay.style.display = show ? 'flex' : 'none';
    }

    showError(message) {
        alert(message); // Simple error display for now
    }

    showSuccess(message) {
        alert(message); // Simple success display for now
    }
}