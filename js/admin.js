import FirebaseAPI from './firebase.js';
import { AdminTabManager } from './admin/AdminTabManager.js';
import { MobileMenuManager } from './utils/MobileMenuManager.js';

class AdminManager {
    constructor() {
        this.currentUser = this.getCurrentUser();
        
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            window.location.href = 'index.html';
            return;
        }

        this.init();
    }

    getCurrentUser() {
        const userStr = localStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    }

    async init() {
        this.setupUI();
        this.setupEventListeners();
        this.mobileMenuManager = new MobileMenuManager();
        this.tabManager = new AdminTabManager();
        await this.tabManager.init();
    }

    setupUI() {
        document.getElementById('user-info').textContent = this.currentUser.username;
    }

    setupEventListeners() {
        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });

        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.tabManager.switchTab(tabName);
            });
        });
    }
}

// Initialize admin manager
new AdminManager();