import FirebaseAPI from './firebase.js';

class AuthManager {
    constructor() {
        this.init();
    }

    async init() {
        // Check if already logged in
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            this.redirectToDashboard(currentUser.role);
            return;
        }

        // Load employees for select dropdown
        await this.loadEmployees();
        
        // Setup form handler
        this.setupFormHandler();
    }

    async loadEmployees() {
        try {
            const employeesData = await FirebaseAPI.getEmployees();
            const usernameSelect = document.getElementById('username');
            
            // Clear existing options except first one
            usernameSelect.innerHTML = '<option value="">Seleziona utente...</option>';
            
            // Add all users from database (including admin if exists)
            Object.keys(employeesData).forEach(username => {
                const option = document.createElement('option');
                option.value = username;
                option.textContent = employeesData[username].role === 'admin' ? `${username} (Admin)` : username;
                usernameSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    }

    setupFormHandler() {
        const loginForm = document.getElementById('loginForm');
        const errorMessage = document.getElementById('error-message');
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                this.showError('Compilare tutti i campi');
                return;
            }

            this.showLoading(true);
            this.hideError();

            try {
                const user = await FirebaseAPI.validateCredentials(username, password);
                
                if (user) {
                    this.setCurrentUser(user);
                    this.redirectToDashboard(user.role);
                } else {
                    this.showError('Credenziali non valide');
                }
            } catch (error) {
                console.error('Login error:', error);
                this.showError('Errore durante il login');
            } finally {
                this.showLoading(false);
            }
        });
    }

    showLoading(show) {
        const spinner = document.querySelector('.spinner');
        const btnText = document.querySelector('.btn-text');
        
        if (show) {
            spinner.style.display = 'block';
            btnText.textContent = 'Accesso in corso...';
        } else {
            spinner.style.display = 'none';
            btnText.textContent = 'Accedi';
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    hideError() {
        const errorDiv = document.getElementById('error-message');
        errorDiv.style.display = 'none';
    }

    setCurrentUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    }

    getCurrentUser() {
        const userStr = localStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    }

    logout() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }

    redirectToDashboard(role) {
        if (role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    }
}

// Initialize auth manager
new AuthManager();