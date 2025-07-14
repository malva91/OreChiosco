import { BaseTab } from '../BaseTab.js';
import FirebaseAPI from '../../firebase.js';
import { ValidationUtils } from '../../utils/ValidationUtils.js';

export class EmployeeManagementTab extends BaseTab {
    constructor() {
        super('employees');
        this.employees = {};
        this.editingEmployee = null;
    }

    async init() {
        await this.loadEmployees();
        this.render();
        this.setupEventListeners();
    }

    async loadEmployees() {
        try {
            this.employees = await FirebaseAPI.getEmployees();
        } catch (error) {
            console.error('Error loading employees:', error);
            this.showError('Errore nel caricamento dipendenti');
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="tab-header">
                <h3>Gestione Dipendenti</h3>
                <button id="add-employee-btn" class="btn btn-primary">+ Aggiungi Dipendente</button>
            </div>
            
            <div class="employees-grid">
                ${this.renderEmployeesGrid()}
            </div>
        `;
    }

    renderEmployeesGrid() {
        const employeesList = Object.entries(this.employees)
            .filter(([username]) => username !== 'admin')
            .map(([username, data]) => `
                <div class="employee-card">
                    <div class="employee-info">
                        <h4>${username}</h4>
                        <p>Ruolo: ${data.role}</p>
                    </div>
                    <div class="employee-actions">
                        <button class="btn btn-secondary btn-sm edit-employee-btn" data-username="${username}">Modifica</button>
                        <button class="btn btn-danger btn-sm delete-employee-btn" data-username="${username}">Elimina</button>
                    </div>
                </div>
            `).join('');

        return employeesList || '<p>Nessun dipendente trovato</p>';
    }

    setupEventListeners() {
        // Add employee button
        const addBtn = document.getElementById('add-employee-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showEmployeeModal();
            });
        }

        // Edit employee buttons
        document.querySelectorAll('.edit-employee-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = e.target.dataset.username;
                this.showEmployeeModal(username);
            });
        });

        // Delete employee buttons
        document.querySelectorAll('.delete-employee-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = e.target.dataset.username;
                this.deleteEmployee(username);
            });
        });

        // Modal event listeners
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        const modal = document.getElementById('employee-modal');
        const closeButtons = modal.querySelectorAll('.modal-close');
        const saveButton = document.getElementById('save-employee-btn');

        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideEmployeeModal();
            });
        });

        saveButton.addEventListener('click', () => {
            this.saveEmployee();
        });

        // Close modal on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideEmployeeModal();
            }
        });
    }

    showEmployeeModal(username = null) {
        const modal = document.getElementById('employee-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('employee-form');
        
        this.editingEmployee = username;
        
        if (username) {
            title.textContent = 'Modifica Dipendente';
            const employee = this.employees[username];
            document.getElementById('employee-username').value = username;
            document.getElementById('employee-username').disabled = true;
            document.getElementById('employee-password').value = employee.password;
            document.getElementById('employee-role').value = employee.role;
        } else {
            title.textContent = 'Aggiungi Dipendente';
            form.reset();
            document.getElementById('employee-username').disabled = false;
        }
        
        modal.style.display = 'block';
    }

    hideEmployeeModal() {
        const modal = document.getElementById('employee-modal');
        modal.style.display = 'none';
        this.editingEmployee = null;
    }

    async saveEmployee() {
        const username = document.getElementById('employee-username').value.trim();
        const password = document.getElementById('employee-password').value;
        const role = document.getElementById('employee-role').value;

        // Validate input
        const errors = ValidationUtils.validateEmployee(username, password);
        if (errors.length > 0) {
            this.showError(errors.join('\n'));
            return;
        }

        // Check if username already exists (for new employees)
        if (!this.editingEmployee && this.employees[username]) {
            this.showError('Username già esistente');
            return;
        }

        this.showLoading(true);

        try {
            const employeeData = {
                password: password,
                role: role
            };

            if (this.editingEmployee) {
                await FirebaseAPI.updateEmployee(username, employeeData);
                this.showSuccess('Dipendente aggiornato con successo');
            } else {
                await FirebaseAPI.createEmployee(username, employeeData);
                this.showSuccess('Dipendente creato con successo');
            }

            await this.loadEmployees();
            this.render();
            this.setupEventListeners();
            this.hideEmployeeModal();

        } catch (error) {
            console.error('Error saving employee:', error);
            this.showError('Errore nel salvataggio del dipendente');
        } finally {
            this.showLoading(false);
        }
    }

    async deleteEmployee(username) {
        this.showCustomConfirm(
            `Sei sicuro di voler eliminare il dipendente "${username}"?<br><br>Questa azione eliminerà anche tutti i dati associati e non può essere annullata.`,
            async () => {
                this.showLoading(true);

                try {
                    await FirebaseAPI.deleteEmployee(username);
                    this.showSuccess('Dipendente eliminato con successo');
                    
                    await this.loadEmployees();
                    this.render();
                    this.setupEventListeners();

                } catch (error) {
                    console.error('Error deleting employee:', error);
                    this.showError('Errore nell\'eliminazione del dipendente');
                } finally {
                    this.showLoading(false);
                }
            },
            'danger'
        );
    }
}