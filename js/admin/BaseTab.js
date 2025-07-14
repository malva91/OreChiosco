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
        this.showCustomAlert(message, 'error');
    }

    showSuccess(message) {
        this.showCustomAlert(message, 'success');
    }
    
    showCustomAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert alert-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        const titles = {
            success: 'Successo',
            error: 'Errore',
            warning: 'Attenzione',
            info: 'Informazione'
        };
        
        alertDiv.innerHTML = `
            <div class="alert-content">
                <div class="alert-header">
                    <span class="alert-icon">${icons[type]}</span>
                    <h3 class="alert-title">${titles[type]}</h3>
                </div>
                <div class="alert-message">${message}</div>
                <div class="alert-actions">
                    <button class="btn btn-primary alert-ok-btn">OK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(alertDiv);
        
        const okBtn = alertDiv.querySelector('.alert-ok-btn');
        okBtn.addEventListener('click', () => {
            document.body.removeChild(alertDiv);
        });
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(alertDiv);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Close on outside click
        alertDiv.addEventListener('click', (e) => {
            if (e.target === alertDiv) {
                document.body.removeChild(alertDiv);
                document.removeEventListener('keydown', handleEscape);
            }
        });
    }
    
    showCustomConfirm(message, onConfirm, type = 'warning') {
        const confirmDiv = document.createElement('div');
        confirmDiv.className = `custom-confirm confirm-${type}`;
        
        const icons = {
            danger: '⚠️',
            warning: '❓',
            info: 'ℹ️'
        };
        
        const titles = {
            danger: 'Conferma eliminazione',
            warning: 'Conferma azione',
            info: 'Conferma'
        };
        
        confirmDiv.innerHTML = `
            <div class="confirm-content">
                <div class="confirm-header">
                    <span class="confirm-icon">${icons[type]}</span>
                    <h3 class="confirm-title">${titles[type]}</h3>
                </div>
                <div class="confirm-message">${message}</div>
                <div class="confirm-actions">
                    <button class="btn btn-secondary confirm-cancel-btn">Annulla</button>
                    <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'} confirm-ok-btn">Conferma</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmDiv);
        
        const okBtn = confirmDiv.querySelector('.confirm-ok-btn');
        const cancelBtn = confirmDiv.querySelector('.confirm-cancel-btn');
        
        const cleanup = () => {
            document.body.removeChild(confirmDiv);
            document.removeEventListener('keydown', handleEscape);
        };
        
        okBtn.addEventListener('click', () => {
            cleanup();
            onConfirm();
        });
        
        cancelBtn.addEventListener('click', cleanup);
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                cleanup();
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Close on outside click
        confirmDiv.addEventListener('click', (e) => {
            if (e.target === confirmDiv) {
                cleanup();
            }
        });
    }
}