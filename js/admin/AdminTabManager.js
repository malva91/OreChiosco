import { EmployeeManagementTab } from './tabs/EmployeeManagementTab.js';
import { ShiftManagementTab } from './tabs/ShiftManagementTab.js';
import { HoursManagementTab } from './tabs/HoursManagementTab.js';

export class AdminTabManager {
    constructor() {
        this.tabs = {};
        this.currentTab = 'employees';
    }

    async init() {
        // Initialize all tabs
        this.tabs.employees = new EmployeeManagementTab();
        this.tabs.shifts = new ShiftManagementTab();
        this.tabs['hours-input'] = new HoursManagementTab();
        this.tabs['hours-view'] = new HoursManagementTab();
        this.tabs['monthly-total'] = new HoursManagementTab();

        // Initialize current tab
        await this.tabs[this.currentTab].init();
    }

    async switchTab(tabName) {
        // Hide current tab
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });

        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });

        // Show new tab
        const newTabPane = document.getElementById(`${tabName}-tab`);
        const newTabButton = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (newTabPane && newTabButton) {
            newTabPane.classList.add('active');
            newTabButton.classList.add('active');
            
            this.currentTab = tabName;
            
            // Initialize tab if needed
            if (this.tabs[tabName]) {
                await this.tabs[tabName].init();
            }
        }
    }
}