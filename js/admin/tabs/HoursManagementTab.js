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
                <div class="admin-hours-info">
                    <p class="info-text">💡 Qui puoi modificare le ore inserite dai dipendenti</p>
                </div>
            </div>
            
            <div class="hours-management">
                <div class="hours-management-header">
                    <div class="employee-selector-card">
                        <h4>👤 Seleziona Dipendente</h4>
                        <select id="employee-select" class="employee-select-modern">
                            <option value="">Seleziona dipendente...</option>
                            ${this.employees.map((emp, index) => `
                                <option value="${emp}" class="emp-option-${(index % 15) + 1}">${emp}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="date-selector-card">
                        <h4>📅 Data Selezionata</h4>
                        <div class="date-navigation-modern">
                            <button id="prev-hours-date" class="btn-nav">◀</button>
                            <span id="hours-current-date" class="current-date-display">${DateUtils.formatDisplayDate(this.currentDate)}</span>
                            <button id="next-hours-date" class="btn-nav">▶</button>
                        </div>
                    </div>
                </div>
                
                <div id="employee-hours-section" style="display: none;">
                    <div class="hours-form-modern">
                        <div class="form-status" id="form-status">
                            <div class="status-indicator" id="status-indicator">
                                <span class="status-text" id="status-text">Nessun dato</span>
                            </div>
                        </div>
                        
                        <div class="special-day-options">
                            <label class="special-option">
                                <input type="checkbox" id="admin-rest-day">
                                <span class="option-icon">😴</span>
                                <span class="option-text">Giorno di riposo</span>
                            </label>
                            <label class="special-option">
                                <input type="checkbox" id="admin-festa">
                                <span class="option-icon">🎉</span>
                                <span class="option-text">Festa</span>
                            </label>
                        </div>
                        
                        <div class="shifts-section">
                            <div class="shifts-header">
                                <h4>⏰ Turni di Lavoro</h4>
                                <button id="add-admin-shift-btn" class="btn-add-shift">+ Aggiungi Turno</button>
                            </div>
                            <div id="admin-shifts-container">
                                <!-- Shifts will be added here -->
                            </div>
                        </div>
                        
                        <div class="form-actions-modern">
                            <button id="save-employee-hours-btn" class="btn-save-modern">
                                <span class="btn-icon">💾</span>
                                <span>Salva Modifiche</span>
                            </button>
                            <button id="reset-employee-hours-btn" class="btn-reset-modern">
                                <span class="btn-icon">🔄</span>
                                <span>Ripristina</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Calendar Section -->
                    <div class="calendar-section-modern">
                        <div class="calendar-header-modern">
                            <h4>📊 Calendario Settimanale</h4>
                            <div class="week-navigation-modern">
                                <button id="prev-week-hours" class="btn-nav">◀ Settimana</button>
                                <span id="current-week-hours">${this.getWeekDisplayText()}</span>
                                <button id="next-week-hours" class="btn-nav">Settimana ▶</button>
                            </div>
                        </div>
                        
                        <div class="calendar-legend-modern">
                            <div class="legend-item-modern">
                                <div class="legend-color-modern admin-shift"></div>
                                <span>Turni Admin</span>
                            </div>
                            <div class="legend-item-modern">
                                <div class="legend-color-modern employee-hours"></div>
                                <span>Ore Dipendenti 👤</span>
                            </div>
                            <div class="legend-item-modern">
                                <div class="legend-color-modern festa-cell"></div>
                                <span>Festa 🎉</span>
                            </div>
                        </div>
                        
                        <div id="hours-calendar-container">
                            <!-- Shifts will be added here -->
                        </div>
                    </div>
                    
                    <div class="employee-hours-history">
                        <h4>Storico Ore - ${this.selectedEmployee || ''}</h4>
                        <div id="admin-hours-history"></div>
                        <div class="total-hours">
                            <strong>Totale Mese: <span id="admin-total-hours">0h 0m</span></strong>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Shift Edit Modal -->
            <div id="shift-edit-modal" class="modal-modern" style="display: none;">
                <div class="modal-content-modern">
                    <div class="modal-header-modern">
                        <h3 id="shift-modal-title">Modifica Turno</h3>
                        <button class="modal-close-modern">&times;</button>
                    </div>
                    <div class="modal-body-modern">
                        <div class="shift-edit-form">
                            <div class="form-group-modern">
                                <label>⏰ Orario Inizio</label>
                                <input type="time" id="edit-shift-start" class="time-input-modern" min="06:00" max="21:30">
                            </div>
                            <div class="form-group-modern">
                                <label>⏰ Orario Fine</label>
                                <input type="time" id="edit-shift-end" class="time-input-modern" min="06:00" max="21:30">
                            </div>
                            <div class="form-group-modern">
                                <label>🏷️ Tipo Turno</label>
                                <select id="edit-shift-type" class="select-modern">
                                    <option value="default">Normale</option>
                                    <option value="festa">Festa</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer-modern">
                        <button id="save-shift-edit-btn" class="btn-save-modal">
                            <span class="btn-icon">💾</span>
                            <span>Salva</span>
                        </button>
                        <button id="delete-shift-btn" class="btn-delete-modal">
                            <span class="btn-icon">🗑️</span>
                            <span>Elimina</span>
                        </button>
                        <button class="btn-cancel-modal modal-close-modern">Annulla</button>
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
        
        // Week navigation
        document.getElementById('prev-week-hours').addEventListener('click', () => {
            this.currentWeekStart = DateUtils.addDays(this.currentWeekStart, -7);
            this.updateWeekDisplay();
            this.loadWeekData();
        });

        document.getElementById('next-week-hours').addEventListener('click', () => {
            this.currentWeekStart = DateUtils.addDays(this.currentWeekStart, 7);
            this.updateWeekDisplay();
            this.loadWeekData();
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
        
        // Modal event listeners
        this.setupModalEventListeners();
    }
    
    setupModalEventListeners() {
        const modal = document.getElementById('shift-edit-modal');
        const closeButtons = modal.querySelectorAll('.modal-close-modern');
        
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideShiftEditModal();
            });
        });
        
        // Save shift edit
        document.getElementById('save-shift-edit-btn').addEventListener('click', () => {
            this.saveShiftEdit();
        });
        
        // Delete shift
        document.getElementById('delete-shift-btn').addEventListener('click', () => {
            this.deleteShift();
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideShiftEditModal();
            }
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
        this.loadWeekData();
    }

    hideEmployeeSection() {
        document.getElementById('employee-hours-section').style.display = 'none';
    }

    updateDateDisplay() {
        document.getElementById('hours-current-date').textContent = DateUtils.formatDisplayDate(this.currentDate);
    }
    
    updateWeekDisplay() {
        document.getElementById('current-week-hours').textContent = this.getWeekDisplayText();
    }
    
    getWeekDisplayText() {
        if (!this.currentWeekStart) {
            this.currentWeekStart = DateUtils.getMonday(this.currentDate);
        }
        const weekEnd = DateUtils.addDays(this.currentWeekStart, 6);
        return `${DateUtils.formatShortDate(this.currentWeekStart)} - ${DateUtils.formatShortDate(weekEnd)}`;
    }
    
    async loadWeekData() {
        if (!this.selectedEmployee) return;
        
        try {
            if (!this.currentWeekStart) {
                this.currentWeekStart = DateUtils.getMonday(this.currentDate);
            }
            
            const weekDates = DateUtils.getWeekDates(this.currentWeekStart);
            const startDate = DateUtils.formatDate(weekDates[0]);
            const endDate = DateUtils.formatDate(weekDates[6]);
            
            // Load employee hours for the week
            const employeeHours = await FirebaseAPI.getEmployeeHours(this.selectedEmployee);
            
            // Render calendar
            this.renderHoursCalendar(weekDates, employeeHours);
            
        } catch (error) {
            console.error('Error loading week data:', error);
            this.showError('Errore nel caricamento dati settimanali');
        }
    }
    
    renderHoursCalendar(weekDates, employeeHours) {
        const container = document.getElementById('hours-calendar-container');
        
        const calendarHtml = `
            <div class="mini-calendar-modern">
                <div class="calendar-days-header">
                    ${weekDates.map(date => {
                        const dayName = DateUtils.getDayName(date);
                        const dayDate = DateUtils.formatShortDate(date);
                        const isToday = DateUtils.isToday(date);
                        return `
                            <div class="day-header-modern ${isToday ? 'today' : ''}">
                                <div class="day-name-modern">${dayName}</div>
                                <div class="day-date-modern">${dayDate}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="calendar-shifts-grid">
                    ${weekDates.map(date => {
                        const dateStr = DateUtils.formatDate(date);
                        const dayData = employeeHours[dateStr];
                        return this.renderDayShifts(dateStr, dayData);
                    }).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = calendarHtml;
        
        // Add click listeners to shifts
        container.querySelectorAll('.shift-block').forEach(block => {
            block.addEventListener('click', (e) => {
                const dateStr = e.target.dataset.date;
                const shiftIndex = parseInt(e.target.dataset.shiftIndex);
                this.openShiftEditModal(dateStr, shiftIndex);
            });
        });
    }
    
    renderDayShifts(dateStr, dayData) {
        if (!dayData) {
            return `
                <div class="day-shifts-container">
                    <div class="no-shifts">Nessun dato</div>
                </div>
            `;
        }
        
        if (dayData.rest_day) {
            return `
                <div class="day-shifts-container">
                    <div class="rest-day-block">😴 Riposo</div>
                </div>
            `;
        }
        
        if (dayData.festa) {
            return `
                <div class="day-shifts-container">
                    <div class="festa-day-block">🎉 Festa</div>
                </div>
            `;
        }
        
        const shiftNames = ['first_shift', 'second_shift', 'third_shift'];
        const shifts = [];
        
        shiftNames.forEach((shiftName, index) => {
            if (dayData[shiftName]) {
                const shift = dayData[shiftName];
                shifts.push({
                    index,
                    start: shift.entry,
                    end: shift.exit
                });
            }
        });
        
        if (shifts.length === 0) {
            return `
                <div class="day-shifts-container">
                    <div class="no-shifts">Nessun turno</div>
                </div>
            `;
        }
        
        return `
            <div class="day-shifts-container">
                ${shifts.map(shift => `
                    <div class="shift-block" data-date="${dateStr}" data-shift-index="${shift.index}">
                        <div class="shift-time">${shift.start} - ${shift.end}</div>
                        <div class="shift-duration">${TimeUtils.formatDuration(TimeUtils.calculateDuration(shift.start, shift.end))}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    openShiftEditModal(dateStr, shiftIndex) {
        this.editingShift = { dateStr, shiftIndex };
        
        const dayData = this.hoursData[dateStr];
        const shiftNames = ['first_shift', 'second_shift', 'third_shift'];
        const shiftData = dayData[shiftNames[shiftIndex]];
        
        // Populate modal
        document.getElementById('edit-shift-start').value = shiftData.entry || '';
        document.getElementById('edit-shift-end').value = shiftData.exit || '';
        document.getElementById('edit-shift-type').value = 'default';
        
        // Show modal
        document.getElementById('shift-edit-modal').style.display = 'flex';
    }
    
    hideShiftEditModal() {
        document.getElementById('shift-edit-modal').style.display = 'none';
        this.editingShift = null;
    }
    
    async saveShiftEdit() {
        if (!this.editingShift) return;
        
        const startTime = document.getElementById('edit-shift-start').value;
        const endTime = document.getElementById('edit-shift-end').value;
        const shiftType = document.getElementById('edit-shift-type').value;
        
        if (!startTime || !endTime) {
            this.showError('Inserire orario di inizio e fine');
            return;
        }
        
        if (TimeUtils.timeToMinutes(endTime) <= TimeUtils.timeToMinutes(startTime)) {
            this.showError('L\'orario di fine deve essere successivo all\'orario di inizio');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const { dateStr, shiftIndex } = this.editingShift;
            const shiftNames = ['first_shift', 'second_shift', 'third_shift'];
            
            // Update the shift data
            if (!this.hoursData[dateStr]) {
                this.hoursData[dateStr] = {};
            }
            
            this.hoursData[dateStr][shiftNames[shiftIndex]] = {
                entry: startTime,
                exit: endTime
            };
            
            this.hoursData[dateStr].modified_by_admin = true;
            this.hoursData[dateStr].modified_at = new Date().toISOString();
            
            await FirebaseAPI.saveEmployeeHours(this.selectedEmployee, dateStr, this.hoursData[dateStr]);
            
            this.showSuccess('Turno modificato con successo');
            this.hideShiftEditModal();
            
            // Reload data
            await this.loadEmployeeHours();
            await this.loadWeekData();
            
        } catch (error) {
            console.error('Error saving shift edit:', error);
            this.showError('Errore nel salvataggio del turno');
        } finally {
            this.showLoading(false);
        }
    }
    
    async deleteShift() {
        if (!this.editingShift) return;
        
        this.showCustomConfirm(
            'Sei sicuro di voler eliminare questo turno?',
            async () => {
                this.showLoading(true);
                
                try {
                    const { dateStr, shiftIndex } = this.editingShift;
                    const shiftNames = ['first_shift', 'second_shift', 'third_shift'];
                    
                    // Remove the shift
                    if (this.hoursData[dateStr]) {
                        delete this.hoursData[dateStr][shiftNames[shiftIndex]];
                        this.hoursData[dateStr].modified_by_admin = true;
                        this.hoursData[dateStr].modified_at = new Date().toISOString();
                        
                        await FirebaseAPI.saveEmployeeHours(this.selectedEmployee, dateStr, this.hoursData[dateStr]);
                    }
                    
                    this.showSuccess('Turno eliminato con successo');
                    this.hideShiftEditModal();
                    
                    // Reload data
                    await this.loadEmployeeHours();
                    await this.loadWeekData();
                    
                } catch (error) {
                    console.error('Error deleting shift:', error);
                    this.showError('Errore nell\'eliminazione del turno');
                } finally {
                    this.showLoading(false);
                }
            },
            'danger'
        );
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
            shiftDiv.className = 'shift-form-modern';
            shiftDiv.innerHTML = `
                <div class="shift-header-modern">
                    <div class="shift-number">Turno ${index + 1}</div>
                    ${this.shifts.length > 1 ? `<button type="button" class="btn-remove-shift" data-index="${index}">🗑️</button>` : ''}
                </div>
                <div class="time-inputs-modern">
                    <div class="form-group-modern">
                        <label>⏰ Entrata</label>
                        <input type="time" class="admin-entry-time time-input-modern" data-index="${index}" value="${shift.entry}" min="06:00" max="21:30">
                    </div>
                    <div class="form-group-modern">
                        <label>⏰ Uscita</label>
                        <input type="time" class="admin-exit-time time-input-modern" data-index="${index}" value="${shift.exit}" min="06:00" max="21:30">
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

        container.querySelectorAll('.btn-remove-shift').forEach(btn => {
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