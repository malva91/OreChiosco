export class ErrorHandler {
    static showError(message, container = document.body) {
        this.showAlert(message, 'error', container);
    }

    static showSuccess(message, container = document.body) {
        this.showAlert(message, 'success', container);
    }

    static showWarning(message, container = document.body) {
        this.showAlert(message, 'warning', container);
    }

    static showInfo(message, container = document.body) {
        this.showAlert(message, 'info', container);
    }

    static showAlert(message, type = 'info', container = document.body) {
        // Remove existing alerts
        const existingAlerts = container.querySelectorAll('.custom-alert');
        existingAlerts.forEach(alert => alert.remove());

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
                <div class="alert-message">${this.sanitizeMessage(message)}</div>
                <div class="alert-actions">
                    <button class="btn btn-primary alert-ok-btn">OK</button>
                </div>
            </div>
        `;
        
        container.appendChild(alertDiv);
        
        const okBtn = alertDiv.querySelector('.alert-ok-btn');
        okBtn.addEventListener('click', () => {
            container.removeChild(alertDiv);
            // Re-enable body scroll
            document.body.style.overflow = '';
        });
        
        // Prevent body scroll when alert is shown
        document.body.style.overflow = 'hidden';
        
        // Auto-remove after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                if (container.contains(alertDiv)) {
                    container.removeChild(alertDiv);
                    document.body.style.overflow = '';
                }
            }, 5000);
        }
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape' && container.contains(alertDiv)) {
                container.removeChild(alertDiv);
                document.body.style.overflow = '';
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Close on outside click
        alertDiv.addEventListener('click', (e) => {
            if (e.target === alertDiv) {
                container.removeChild(alertDiv);
                document.body.style.overflow = '';
                document.removeEventListener('keydown', handleEscape);
            }
        });
    }

    static showConfirm(message, onConfirm, type = 'warning', container = document.body) {
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
                <div class="confirm-message">${this.sanitizeMessage(message)}</div>
                <div class="confirm-actions">
                    <button class="btn btn-secondary confirm-cancel-btn">Annulla</button>
                    <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'} confirm-ok-btn">Conferma</button>
                </div>
            </div>
        `;
        
        container.appendChild(confirmDiv);
        
        const okBtn = confirmDiv.querySelector('.confirm-ok-btn');
        const cancelBtn = confirmDiv.querySelector('.confirm-cancel-btn');
        
        const cleanup = () => {
            if (container.contains(confirmDiv)) {
                container.removeChild(confirmDiv);
            }
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

    static sanitizeMessage(message) {
        if (typeof message !== 'string') {
            message = String(message);
        }
        return message
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    static logError(error, context = '') {
        const timestamp = new Date().toISOString();
        const errorInfo = {
            timestamp,
            context,
            message: error.message || error,
            stack: error.stack || 'No stack trace available'
        };
        
        console.error('Application Error:', errorInfo);
        
        // In production, you might want to send this to a logging service
        // this.sendToLoggingService(errorInfo);
    }
}