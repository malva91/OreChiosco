import { BaseTab } from '../BaseTab.js';
import FirebaseAPI from '../../firebase.js';
import { DateUtils } from '../../utils/DateUtils.js';
import { TimeUtils } from '../../utils/TimeUtils.js';

export class HoursManagementTab extends BaseTab {
    constructor() {
        super('hours-input');
        this.employees = [];
        this.currentDate = new Date();
        this.selectedEmployee = null;
        this.hoursData = {};
    }

    async init() {
        await this.loadEmployees();
        this.render();
        this.setupEventListeners();
    }

    async loadEmployees() {
        try {
            const employeesData = await FirebaseAPI.getEmployees();
            this.employees = Object.keys(employeesData).filter(username => username !== 'admin');
        } catch (error) {
            console.error('Error loading employees:', error);
            this.showError('Errore nel caricamento dipendenti');
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="tab-header">
                <h3>Modifica Ore Dipendenti</h3>
            </div>
            
            <div class="admin-hours-info">
                <p class="info-text">💡 Qui puoi modificare le ore inserite dai dipendenti per ogni giorno</p>
            </div>
            
            <div class="hours-management">
                <div class="hours-management-header">
                    <div class="employee-selector">
                        <label for="employee-select">Seleziona Dipendente:</label>
                        <select id="employee-select">
                            <option value="">Seleziona...</option>
                            ${this.employees.map(emp => `<option value="${emp}">${emp}</option>`).join('')}
                        </select>
                    </div>
                </div>
                
                <div id="employee-hours-section" style="display: none;">
                    <div class="hours-date-section">
                        <div class="date-navigation">
                            <button id="prev-hours-date" class="btn btn-secondary">◀</button>
                            <span id="hours-current-date">${DateUtils.formatDisplayDate(this.currentDate)}</span>
                            <button id="next-hours-date" class="btn btn-secondary">▶</button>
                        </div>
                    </div>
                    
                    <div class="hours-edit-container">
                        <div class="hours-form-card">
                            <div class="form-status" id="form-status">
                                <div class="status-indicator" id="status-indicator">
                                    <span class="status-text" id="status-text">Nessun dato</span>
                                </div>
                            </div>
                            
                            <div class="checkbox-group">
                                <label>
                                    <input type="checkbox" id="admin-rest-day">
                                    <span>Giorno di riposo</span>
                                </label>
                                <label>
                                    <input type="checkbox" id="admin-festa">
                                    <span>Festa</span>
                                </label>
                            </div>
                            
                            <div id="admin-shifts-container">
                                <!-- Shifts will be added here -->
                            </div>
                            
                            <div class="form-actions">
                                <button id="save-employee-hours-btn" class="btn btn-success">💾 Salva Modifiche</button>
                                <button id="add-admin-shift-btn" class="btn btn-primary">+ Aggiungi Turno</button>
                                <button id="reset-employee-hours-btn" class="btn btn-warning">🔄 Ripristina Originale</button>
                            </div>
                        </div>
                        
                        <div class="employee-hours-history-card">
                            <h4>Storico Ore - ${this.selectedEmployee || ''}</h4>
                            <div id="admin-hours-history"></div>
                            <div class="total-hours">
                                <strong>Totale Mese: <span id="admin-total-hours">0h 0m</span></strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Employee selector
        document.getElementById('employee-select').addEventListener('change', (e) => {
            this.selectedEmployee = e.target.value;
            if (this.selectedEmployee) {
                this.showEmployeeSection();
                this.loadEmployeeHours();
            } else {
                this.hideEmployeeSection();
            }
        });

        // Date navigation
        document.getElementById('prev-hours-date').addEventListener('click', () => {
            this.currentDate = DateUtils.addDays(this.currentDate, -1);
            this.updateDateDisplay();
            this.loadEmployeeHours();
        });

        document.getElementById('next-hours-date').addEventListener('click', () => {
            this.currentDate = DateUtils.addDays(this.currentDate, 1);
            this.updateDateDisplay();
            this.loadEmployeeHours();
        });

        // Rest day checkbox
        document.getElementById('admin-rest-day').addEventListener('change', (e) => {
            const shiftsContainer = document.getElementById('admin-shifts-container');
            const festaCheckbox = document.getElementById('admin-festa');
            
            if (e.target.checked) {
                shiftsContainer.style.display = 'none';
                festaCheckbox.checked = false;
                festaCheckbox.disabled = true;
            } else {
                festaCheckbox.disabled = false;
                if (!festaCheckbox.checked) {
                    shiftsContainer.style.display = 'block';
                }
            }
        });

        // Festa checkbox
        document.getElementById('admin-festa').addEventListener('change', (e) => {
            const shiftsContainer = document.getElementById('admin-shifts-container');
            const restDay = document.getElementById('admin-rest-day');
            
            if (e.target.checked) {
                shiftsContainer.style.display = 'none';
                restDay.checked = false;
                restDay.disabled = true;
            } else {
                restDay.disabled = false;
                if (!restDay.checked) {
                    shiftsContainer.style.display = 'block';
                }
            }
        });

        // Add shift button
        document.getElementById('add-admin-shift-btn').addEventListener('click', () => {
            this.addAdminShift();
        });

        // Save hours button
        document.getElementById('save-employee-hours-btn').addEventListener('click', () => {
            this.saveEmployeeHours();
        });
        
        // Reset hours button
        document.getElementById('reset-employee-hours-btn').addEventListener('click', () => {
            this.resetEmployeeHours();
        });
    }

    showEmployeeSection() {
        document.getElementById('employee-hours-section').style.display = 'block';
        // Update the history title
        const historyTitle = document.querySelector('.employee-hours-history h4');
        if (historyTitle) {
            historyTitle.textContent = `Storico Ore - ${this.selectedEmployee}`;
        }
        this.shifts = [{ entry: '', exit: '' }];
        this.renderAdminShifts();
    }

    hideEmployeeSection() {
        document.getElementById('employee-hours-section').style.display = 'none';
    }

    updateDateDisplay() {
        document.getElementById('hours-current-date').textContent = DateUtils.formatDisplayDate(this.currentDate);
    }

    async loadEmployeeHours() {
        if (!this.selectedEmployee) return;
        
        this.showLoading(true);
        
        try {
            const dateStr = DateUtils.formatDate(this.currentDate);
            this.hoursData = await FirebaseAPI.getEmployeeHours(this.selectedEmployee);
            const dayData = this.hoursData[dateStr];
            
            // Update status indicator
            this.updateFormStatus(dayData);
            
            if (dayData) {
                document.getElementById('admin-rest-day').checked = dayData.rest_day || false;
                document.getElementById('admin-festa').checked = dayData.festa || false;
                
                // Handle checkbox states
                const restDay = document.getElementById('admin-rest-day');
                const festa = document.getElementById('admin-festa');
                const shiftsContainer = document.getElementById('admin-shifts-container');
                
                if (dayData.rest_day) {
                    shiftsContainer.style.display = 'none';
                    festa.disabled = true;
                } else if (dayData.festa) {
                    shiftsContainer.style.display = 'none';
                    restDay.disabled = true;
                } else {
                    shiftsContainer.style.display = 'block';
                    restDay.disabled = false;
                    festa.disabled = false;
                }
                
                // Load shifts
                this.shifts = [];
                const shiftNames = ['first_shift', 'second_shift', 'third_shift'];
                
                shiftNames.forEach(shiftName => {
                    if (dayData[shiftName]) {
                        this.shifts.push({
                            entry: dayData[shiftName].entry || '',
                            exit: dayData[shiftName].exit || ''
                        });
                    }
                });
                
                if (this.shifts.length === 0) {
                    this.shifts = [{ entry: '', exit: '' }];
                }
                
                this.renderAdminShifts();
            } else {
                document.getElementById('admin-rest-day').checked = false;
                document.getElementById('admin-festa').checked = false;
                document.getElementById('admin-rest-day').disabled = false;
                document.getElementById('admin-festa').disabled = false;
                document.getElementById('admin-shifts-container').style.display = 'block';
                this.shifts = [{ entry: '', exit: '' }];
                this.renderAdminShifts();
            }
            
            this.loadEmployeeHoursHistory();
            
        } catch (error) {
            console.error('Error loading employee hours:', error);
            this.showError('Errore nel caricamento ore dipendente');
        } finally {
            this.showLoading(false);
        }
    }
    
    updateFormStatus(dayData) {
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        
        if (!dayData) {
            statusIndicator.className = 'status-indicator status-empty';
            statusText.textContent = 'Nessun dato inserito';
        } else if (dayData.rest_day) {
            statusIndicator.className = 'status-indicator status-rest';
            statusText.textContent = 'Giorno di riposo';
        } else if (dayData.festa) {
            statusIndicator.className = 'status-indicator status-festa';
            statusText.textContent = 'Festa';
        } else {
            statusIndicator.className = 'status-indicator status-work';
            statusText.textContent = 'Ore lavorative inserite';
            if (dayData.modified_by_admin) {
                statusText.textContent += ' (Modificate da Admin)';
            }
        }
    }
    
    async resetEmployeeHours() {
        if (!this.selectedEmployee) return;
        
        this.showCustomConfirm(
            'Sei sicuro di voler ripristinare i dati originali? Le modifiche non salvate andranno perse.',
            async () => {
                await this.loadEmployeeHours();
                this.showSuccess('Dati ripristinati');
            }
        );
    }

    renderAdminShifts() {
        const container = document.getElementById('admin-shifts-container');
        container.innerHTML = '';

        this.shifts.forEach((shift, index) => {
            const shiftDiv = document.createElement('div');
            shiftDiv.className = 'shift-form';
            shiftDiv.innerHTML = `
                <div class="shift-header">
                    <h5>Turno ${index + 1}</h5>
                    ${this.shifts.length > 1 ? `<button type="button" class="btn btn-danger btn-sm remove-admin-shift-btn" data-index="${index}">Rimuovi</button>` : ''}
                </div>
                <div class="time-inputs">
                    <div class="form-group">
                        <label>Entrata</label>
                        <input type="time" class="admin-entry-time" data-index="${index}" value="${shift.entry}" min="06:00" max="21:30">
                    </div>
                    <div class="form-group">
                        <label>Uscita</label>
                        <input type="time" class="admin-exit-time" data-index="${index}" value="${shift.exit}" min="06:00" max="21:30">
                    </div>
                </div>
            `;
            container.appendChild(shiftDiv);
        });

        // Add event listeners
        container.querySelectorAll('.admin-entry-time, .admin-exit-time').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const isEntry = e.target.classList.contains('admin-entry-time');
                
                if (isEntry) {
                    this.shifts[index].entry = e.target.value;
                } else {
                    this.shifts[index].exit = e.target.value;
                }
            });
        });

        container.querySelectorAll('.remove-admin-shift-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removeAdminShift(index);
            });
        });
    }

    addAdminShift() {
        this.shifts.push({ entry: '', exit: '' });
        this.renderAdminShifts();
    }

    removeAdminShift(index) {
        this.shifts.splice(index, 1);
        this.renderAdminShifts();
    }

    async saveEmployeeHours() {
        if (!this.selectedEmployee) return;
        
        this.showLoading(true);
        
        try {
            const dateStr = DateUtils.formatDate(this.currentDate);
            const isRestDay = document.getElementById('admin-rest-day').checked;
            const isFesta = document.getElementById('admin-festa').checked;
            
            const hoursData = { 
                rest_day: isRestDay,
                festa: isFesta,
                modified_by_admin: true,
                modified_at: new Date().toISOString()
            };

            if (!isRestDay && !isFesta) {
                const shiftNames = ['first_shift', 'second_shift', 'third_shift'];
                let hasValidShifts = false;

                for (let i = 0; i < this.shifts.length && i < 3; i++) {
                    const shift = this.shifts[i];
                    
                    if (shift.entry && shift.exit) {
                        // Validate time
                        if (TimeUtils.timeToMinutes(shift.exit) <= TimeUtils.timeToMinutes(shift.entry)) {
                            this.showError('L\'orario di uscita deve essere successivo all\'orario di entrata');
                            return;
                        }
                        
                        hoursData[shiftNames[i]] = {
                            entry: shift.entry,
                            exit: shift.exit
                        };
                        hasValidShifts = true;
                    }
                }

                if (!hasValidShifts) {
                    this.showError('Inserire almeno un turno valido con entrata e uscita');
                    return;
                }
            }

            await FirebaseAPI.saveEmployeeHours(this.selectedEmployee, dateStr, hoursData);
            this.showSuccess('Modifiche salvate con successo');
            
            await this.loadEmployeeHours();
            
        } catch (error) {
            console.error('Error saving employee hours:', error);
            this.showError('Errore nel salvataggio ore');
        } finally {
            this.showLoading(false);
        }
    }

    loadEmployeeHoursHistory() {
        const historyContainer = document.getElementById('admin-hours-history');
        historyContainer.innerHTML = '';
        
        if (Object.keys(this.hoursData).length === 0) {
            historyContainer.innerHTML = '<p>Nessun dato disponibile</p>';
            document.getElementById('admin-total-hours').textContent = '0h 0m';
            return;
        }
        
        // Get current month data
        const currentMonth = this.currentDate.getMonth();
        const currentYear = this.currentDate.getFullYear();
        
        const monthDates = Object.keys(this.hoursData).filter(dateStr => {
            const date = DateUtils.parseDate(dateStr);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).sort().reverse();
        
        let totalMinutes = 0;
        
        monthDates.forEach(dateStr => {
            const dayData = this.hoursData[dateStr];
            const date = DateUtils.parseDate(dateStr);
            
            const dayDiv = document.createElement('div');
            dayDiv.className = 'history-day';
            
            let dayMinutes = 0;
            let shiftsHtml = '';
            
            if (dayData.rest_day) {
                shiftsHtml = '<span class="rest-day">Giorno di riposo</span>';
            } else if (dayData.festa) {
                shiftsHtml = '<span class="festa-day">Festa</span>';
            } else {
                const shiftNames = ['first_shift', 'second_shift', 'third_shift'];
                
                shiftNames.forEach((shiftName, index) => {
                    if (dayData[shiftName]) {
                        const shift = dayData[shiftName];
                        const duration = TimeUtils.calculateDuration(shift.entry, shift.exit);
                        dayMinutes += duration;
                        
                        shiftsHtml += `
                            <div class="shift-info">
                                <strong>Turno ${index + 1}:</strong> ${shift.entry} - ${shift.exit} (${TimeUtils.formatDuration(duration)})
                            </div>
                        `;
                    }
                });
            }
            
            totalMinutes += dayMinutes;
            
            const isModified = dayData.modified_by_admin ? ' (Modificato da Admin)' : '';
            
            dayDiv.innerHTML = `
                <div class="day-header">
                    <span class="day-date">${DateUtils.formatShortDate(date)}${isModified}</span>
                    <span class="day-total">${TimeUtils.formatDuration(dayMinutes)}</span>
                </div>
                <div class="day-shifts">${shiftsHtml}</div>
            `;
            
            if (dayData.modified_by_admin) {
                dayDiv.classList.add('modified-by-admin');
            }
            
            historyContainer.appendChild(dayDiv);
        });
        
        document.getElementById('admin-total-hours').textContent = TimeUtils.formatDuration(totalMinutes);
    }
}