import FirebaseAPI from './firebase.js';
import { DateUtils } from './utils/DateUtils.js';
import { TimeUtils } from './utils/TimeUtils.js';
import { ValidationUtils } from './utils/ValidationUtils.js';
import { MobileMenuManager } from './utils/MobileMenuManager.js';

class DashboardManager {
    constructor() {
        this.currentUser = this.getCurrentUser();
        this.currentDate = new Date();
        this.shifts = [];
        
        if (!this.currentUser) {
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
        await this.loadCurrentDayData();
    }

    setupUI() {
        document.getElementById('user-info').textContent = this.currentUser.username;
        
        // Show admin link if user is admin
        if (this.currentUser.role === 'admin') {
            document.getElementById('admin-link').style.display = 'block';
        }
        
        this.updateDateDisplay();
        this.addInitialShift();
    }

    setupEventListeners() {
        // Date navigation
        document.getElementById('prev-date').addEventListener('click', () => {
            this.currentDate = DateUtils.addDays(this.currentDate, -1);
            this.updateDateDisplay();
            this.loadCurrentDayData();
        });

        document.getElementById('next-date').addEventListener('click', () => {
            this.currentDate = DateUtils.addDays(this.currentDate, 1);
            this.updateDateDisplay();
            this.loadCurrentDayData();
        });

        // Shift management
        document.getElementById('add-shift-btn').addEventListener('click', () => {
            this.addShiftForm();
        });

        document.getElementById('save-hours-btn').addEventListener('click', () => {
            this.saveHours();
        });

        document.getElementById('current-time-btn').addEventListener('click', () => {
            this.fillCurrentTime();
        });

        // Checkboxes
        document.getElementById('rest-day-checkbox').addEventListener('change', (e) => {
            const shiftsContainer = document.getElementById('shifts-container');
            shiftsContainer.style.display = e.target.checked ? 'none' : 'block';
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
    }

    updateDateDisplay() {
        document.getElementById('current-date').textContent = DateUtils.formatDisplayDate(this.currentDate);
    }

    addInitialShift() {
        this.shifts = [{ entry: '', exit: '' }];
        this.renderShifts();
    }

    addShiftForm() {
        this.shifts.push({ entry: '', exit: '' });
        this.renderShifts();
    }

    renderShifts() {
        const container = document.getElementById('shifts-container');
        container.innerHTML = '';

        this.shifts.forEach((shift, index) => {
            const shiftDiv = document.createElement('div');
            shiftDiv.className = 'shift-form';
            shiftDiv.innerHTML = `
                <div class="shift-header">
                    <h4>Turno ${index + 1}</h4>
                    ${this.shifts.length > 1 ? `<button type="button" class="btn btn-danger btn-sm" onclick="dashboard.removeShift(${index})">Rimuovi</button>` : ''}
                </div>
                <div class="time-inputs">
                    <div class="form-group">
                        <label>Entrata</label>
                        <input type="time" class="entry-time" data-index="${index}" value="${shift.entry}" min="06:00" max="21:30">
                    </div>
                    <div class="form-group">
                        <label>Uscita</label>
                        <input type="time" class="exit-time" data-index="${index}" value="${shift.exit}" min="06:00" max="21:30">
                    </div>
                </div>
            `;
            container.appendChild(shiftDiv);
        });

        // Add event listeners to new inputs
        container.querySelectorAll('.entry-time, .exit-time').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const isEntry = e.target.classList.contains('entry-time');
                
                if (isEntry) {
                    this.shifts[index].entry = e.target.value;
                } else {
                    this.shifts[index].exit = e.target.value;
                }
            });
        });
    }

    removeShift(index) {
        this.shifts.splice(index, 1);
        this.renderShifts();
    }

    fillCurrentTime() {
        const currentTime = TimeUtils.getCurrentTime();
        const activeInputs = document.querySelectorAll('.entry-time, .exit-time');
        
        activeInputs.forEach(input => {
            if (!input.value) {
                input.value = currentTime;
                const index = parseInt(input.dataset.index);
                const isEntry = input.classList.contains('entry-time');
                
                if (isEntry) {
                    this.shifts[index].entry = currentTime;
                } else {
                    this.shifts[index].exit = currentTime;
                }
            }
        });
    }

    async saveHours() {
        this.showLoading(true);
        
        try {
            const dateStr = DateUtils.formatDate(this.currentDate);
            const isRestDay = document.getElementById('rest-day-checkbox').checked;
            const isFesta = document.getElementById('festa-checkbox').checked;
            
            const hoursData = {
                rest_day: isRestDay
            };

            if (!isRestDay) {
                // Validate and prepare shifts
                const shiftNames = ['first_shift', 'second_shift', 'third_shift'];
                let hasValidShifts = false;

                for (let i = 0; i < this.shifts.length && i < 3; i++) {
                    const shift = this.shifts[i];
                    
                    if (shift.entry && shift.exit) {
                        const errors = ValidationUtils.validateTimeInput(shift.entry, shift.exit);
                        if (errors.length > 0) {
                            alert('Errori nel turno ' + (i + 1) + ':\n' + errors.join('\n'));
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
                    alert('Inserire almeno un turno valido');
                    return;
                }
            }

            await FirebaseAPI.saveEmployeeHours(this.currentUser.username, dateStr, hoursData);
            
            // Update history
            await this.loadHoursHistory();
            
            this.showCustomAlert('Ore salvate con successo!', 'success');
            
        } catch (error) {
            console.error('Error saving hours:', error);
            this.showCustomAlert('Errore nel salvataggio delle ore', 'error');
        } finally {
            this.showLoading(false);
        }
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

    async loadCurrentDayData() {
        this.showLoading(true);
        
        try {
            const dateStr = DateUtils.formatDate(this.currentDate);
            const hoursData = await FirebaseAPI.getEmployeeHours(this.currentUser.username);
            const dayData = hoursData[dateStr];
            
            if (dayData) {
                // Set rest day checkbox
                document.getElementById('rest-day-checkbox').checked = dayData.rest_day || false;
                
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
                    this.addInitialShift();
                } else {
                    this.renderShifts();
                }
            } else {
                // Reset form
                document.getElementById('rest-day-checkbox').checked = false;
                this.addInitialShift();
            }
            
            await this.loadHoursHistory();
            
        } catch (error) {
            console.error('Error loading day data:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async loadHoursHistory() {
        try {
            const hoursData = await FirebaseAPI.getEmployeeHours(this.currentUser.username);
            const historyContainer = document.getElementById('hours-history');
            
            historyContainer.innerHTML = '';
            
            if (Object.keys(hoursData).length === 0) {
                historyContainer.innerHTML = '<p>Nessun dato disponibile</p>';
                document.getElementById('total-hours').textContent = '0h 0m';
                return;
            }
            
            // Sort dates
            const sortedDates = Object.keys(hoursData).sort().reverse();
            let totalMinutes = 0;
            
            sortedDates.forEach(dateStr => {
                const dayData = hoursData[dateStr];
                const date = DateUtils.parseDate(dateStr);
                
                const dayDiv = document.createElement('div');
                dayDiv.className = 'history-day';
                
                let dayMinutes = 0;
                let shiftsHtml = '';
                
                if (dayData.rest_day) {
                    shiftsHtml = '<span class="rest-day">Giorno di riposo</span>';
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
                
                dayDiv.innerHTML = `
                    <div class="day-header">
                        <span class="day-date">${DateUtils.formatShortDate(date)}</span>
                        <span class="day-total">${TimeUtils.formatDuration(dayMinutes)}</span>
                    </div>
                    <div class="day-shifts">${shiftsHtml}</div>
                `;
                
                historyContainer.appendChild(dayDiv);
            });
            
            document.getElementById('total-hours').textContent = TimeUtils.formatDuration(totalMinutes);
            
        } catch (error) {
            console.error('Error loading hours history:', error);
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// Make dashboard available globally for event handlers
window.dashboard = new DashboardManager();