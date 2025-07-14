import { BaseTab } from '../BaseTab.js';
import FirebaseAPI from '../../firebase.js';
import { DateUtils } from '../../utils/DateUtils.js';
import { TimeUtils } from '../../utils/TimeUtils.js';
import { ValidationUtils } from '../../utils/ValidationUtils.js';
import { CalendarRenderer } from '../../calendar/CalendarRenderer.js';

export class ShiftManagementTab extends BaseTab {
    constructor() {
        super('shifts');
        this.currentDate = new Date();
        this.currentWeekStart = DateUtils.getMonday(new Date());
        this.employees = [];
        this.shifts = {};
        this.weekShifts = {};
        this.calendarRenderer = new CalendarRenderer();
    }

    async init() {
        await this.loadEmployees();
        await this.loadShifts();
        await this.loadWeekData();
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

    async loadShifts() {
        try {
            const dateStr = DateUtils.formatDate(this.currentDate);
            this.shifts = await FirebaseAPI.getShifts(dateStr);
        } catch (error) {
            console.error('Error loading shifts:', error);
            this.showError('Errore nel caricamento turni');
        }
    }

    async loadWeekData() {
        try {
            const weekDates = DateUtils.getWeekDates(this.currentWeekStart);
            const startDate = DateUtils.formatDate(weekDates[0]);
            const endDate = DateUtils.formatDate(weekDates[6]);
            
            // Load both admin shifts and employee hours
            this.weekShifts = await FirebaseAPI.getWeekShifts(startDate, endDate);
            
            // Load employee hours for the week
            const allHours = await FirebaseAPI.getAllHours();
            
            // Merge employee hours into week shifts for display
            weekDates.forEach(date => {
                const dateStr = DateUtils.formatDate(date);
                if (!this.weekShifts[dateStr]) {
                    this.weekShifts[dateStr] = {};
                }
                
                this.employees.forEach(employee => {
                    const employeeHours = allHours[employee] || {};
                    const dayData = employeeHours[dateStr];
                    
                    if (dayData && !dayData.rest_day) {
                        const employeeShifts = [];
                        const shiftNames = ['first_shift', 'second_shift', 'third_shift'];
                        
                        shiftNames.forEach(shiftName => {
                            if (dayData[shiftName]) {
                                const shift = dayData[shiftName];
                                employeeShifts.push({
                                    start: shift.entry,
                                    end: shift.exit,
                                    type: 'employee_hours'
                                });
                            }
                        });
                        
                        if (employeeShifts.length > 0) {
                            if (!this.weekShifts[dateStr][employee]) {
                                this.weekShifts[dateStr][employee] = [];
                            }
                            this.weekShifts[dateStr][employee] = [
                                ...this.weekShifts[dateStr][employee],
                                ...employeeShifts
                            ];
                        }
                    }
                });
            });
            
        } catch (error) {
            console.error('Error loading week data:', error);
            this.showError('Errore nel caricamento dati settimanali');
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="tab-header">
                <h3>Gestione Turni</h3>
                <div class="date-navigation">
                    <button id="prev-shift-date" class="btn btn-secondary">◀</button>
                    <span id="shift-current-date">${DateUtils.formatDisplayDate(this.currentDate)}</span>
                    <button id="next-shift-date" class="btn btn-secondary">▶</button>
                </div>
            </div>
            
            <div class="shifts-form-section">
                ${this.renderShiftsForm()}
            </div>
            
            <div class="shifts-calendar-section">
                <div class="calendar-header-section">
                    <h4>📅 Calendario Settimanale</h4>
                    <div class="week-navigation">
                        <button id="prev-week-shifts" class="btn btn-secondary">◀ Settimana Precedente</button>
                        <span id="current-week-shifts">${this.getWeekDisplayText()}</span>
                        <button id="next-week-shifts" class="btn btn-secondary">Settimana Successiva ▶</button>
                    </div>
                </div>
                
                <div class="calendar-legend">
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #3182ce;"></div>
                        <span class="legend-text">Turni Admin</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #3182ce; opacity: 0.7; border: 2px dashed #fff;"></div>
                        <span class="legend-text">Ore Dipendenti 👤</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color festa-cell"></div>
                        <span class="legend-text">Festa 🎉</span>
                    </div>
                </div>
                
                ${this.calendarRenderer.renderMiniCalendar(this.currentWeekStart, this.employees, this.weekShifts)}
            </div>
        `;
    }

    getWeekDisplayText() {
        const weekEnd = DateUtils.addDays(this.currentWeekStart, 6);
        return `${DateUtils.formatShortDate(this.currentWeekStart)} - ${DateUtils.formatShortDate(weekEnd)}`;
    }

    renderShiftsForm() {
        return `
            <div class="shifts-form">
                <h4>Assegnazione Turni per ${DateUtils.formatDisplayDate(this.currentDate)}</h4>
                <div class="employees-shifts-grid">
                    ${this.employees.map((employee, index) => this.renderEmployeeShifts(employee, index)).join('')}
                </div>
                <div class="form-actions">
                    <button id="save-shifts-btn" class="btn btn-success">💾 Salva Turni</button>
                    <button id="clear-shifts-btn" class="btn btn-danger">🗑️ Cancella Tutti</button>
                    <button id="copy-yesterday-btn" class="btn btn-secondary">📋 Copia da Ieri</button>
                </div>
            </div>
        `;
    }

    renderEmployeeShifts(employee, index) {
        const employeeShifts = this.shifts[employee] || [];
        const colorClass = `emp-color-${(index % 15) + 1}`;
        
        return `
            <div class="employee-shifts-card ${colorClass}">
                <div class="employee-header">
                    <h5>${employee}</h5>
                    <button class="btn btn-primary btn-sm add-shift-btn" data-employee="${employee}">+ Turno</button>
                </div>
                <div class="shifts-list" id="shifts-${employee}">
                    ${employeeShifts.length > 0 ? 
                        employeeShifts.map((shift, index) => this.renderShiftForm(employee, shift, index)).join('') :
                        this.renderShiftForm(employee, { start: '', end: '', type: 'default' }, 0)
                    }
                </div>
            </div>
        `;
    }

    renderShiftForm(employee, shift, index) {
        return `
            <div class="shift-form">
                <div class="shift-inputs">
                    <div class="form-group">
                        <label>Inizio</label>
                        <input type="time" class="shift-start" value="${shift.start || ''}" min="06:00" max="21:30"
                               data-employee="${employee}" data-index="${index}">
                    </div>
                    <div class="form-group">
                        <label>Fine</label>
                        <input type="time" class="shift-end" value="${shift.end || ''}" min="06:00" max="21:30"
                               data-employee="${employee}" data-index="${index}">
                    </div>
                    <div class="form-group">
                        <label>Tipo</label>
                        <select class="shift-type" data-employee="${employee}" data-index="${index}">
                            <option value="default" ${shift.type === 'default' ? 'selected' : ''}>Normale</option>
                            <option value="festa" ${shift.type === 'festa' ? 'selected' : ''}>Festa</option>
                        </select>
                    </div>
                    <button class="btn btn-danger btn-sm remove-shift-btn" 
                            data-employee="${employee}" data-index="${index}">Rimuovi</button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Date navigation
        document.getElementById('prev-shift-date').addEventListener('click', () => {
            this.currentDate = DateUtils.addDays(this.currentDate, -1);
            this.updateDateAndReload();
        });

        document.getElementById('next-shift-date').addEventListener('click', () => {
            this.currentDate = DateUtils.addDays(this.currentDate, 1);
            this.updateDateAndReload();
        });

        // Week navigation
        document.getElementById('prev-week-shifts').addEventListener('click', () => {
            this.currentWeekStart = DateUtils.addDays(this.currentWeekStart, -7);
            this.updateWeekAndReload();
        });

        document.getElementById('next-week-shifts').addEventListener('click', () => {
            this.currentWeekStart = DateUtils.addDays(this.currentWeekStart, 7);
            this.updateWeekAndReload();
        });

        // Add shift buttons
        document.querySelectorAll('.add-shift-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const employee = e.target.dataset.employee;
                this.addShift(employee);
            });
        });

        // Remove shift buttons
        document.querySelectorAll('.remove-shift-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const employee = e.target.dataset.employee;
                const index = parseInt(e.target.dataset.index);
                this.removeShift(employee, index);
            });
        });

        // Input change handlers
        document.querySelectorAll('.shift-start, .shift-end, .shift-type').forEach(input => {
            input.addEventListener('change', (e) => {
                const employee = e.target.dataset.employee;
                const index = parseInt(e.target.dataset.index);
                this.updateShift(employee, index, e.target);
            });
        });

        // Save and clear buttons
        document.getElementById('save-shifts-btn').addEventListener('click', () => {
            this.saveShifts();
        });

        document.getElementById('clear-shifts-btn').addEventListener('click', () => {
            this.clearShifts();
        });

        document.getElementById('copy-yesterday-btn').addEventListener('click', () => {
            this.copyFromYesterday();
        });
    }

    async updateDateAndReload() {
        document.getElementById('shift-current-date').textContent = DateUtils.formatDisplayDate(this.currentDate);
        await this.loadShifts();
        this.render();
        this.setupEventListeners();
    }

    async updateWeekAndReload() {
        document.getElementById('current-week-shifts').textContent = this.getWeekDisplayText();
        await this.loadWeekData();
        this.render();
        this.setupEventListeners();
    }

    addShift(employee) {
        if (!this.shifts[employee]) {
            this.shifts[employee] = [];
        }
        
        this.shifts[employee].push({
            start: '',
            end: '',
            type: 'default'
        });
        
        this.render();
        this.setupEventListeners();
    }

    removeShift(employee, index) {
        if (this.shifts[employee]) {
            this.shifts[employee].splice(index, 1);
            if (this.shifts[employee].length === 0) {
                delete this.shifts[employee];
            }
        }
        
        this.render();
        this.setupEventListeners();
    }

    updateShift(employee, index, input) {
        if (!this.shifts[employee]) {
            this.shifts[employee] = [];
        }
        
        // Ensure the shift exists
        while (this.shifts[employee].length <= index) {
            this.shifts[employee].push({ start: '', end: '', type: 'default' });
        }
        
        const shift = this.shifts[employee][index];
        const field = input.classList.contains('shift-start') ? 'start' : 
                     input.classList.contains('shift-end') ? 'end' : 'type';
        
        shift[field] = input.value;
    }

    async copyFromYesterday() {
        this.showCustomConfirm(
            'Vuoi copiare i turni di ieri? Questo sostituirà i turni attuali.',
            async () => {
                try {
                    const yesterday = DateUtils.addDays(this.currentDate, -1);
                    const yesterdayStr = DateUtils.formatDate(yesterday);
                    const yesterdayShifts = await FirebaseAPI.getShifts(yesterdayStr);
                    
                    if (Object.keys(yesterdayShifts).length === 0) {
                        this.showError('Nessun turno trovato per ieri');
                        return;
                    }
                    
                    this.shifts = JSON.parse(JSON.stringify(yesterdayShifts)); // Deep copy
                    this.render();
                    this.setupEventListeners();
                    this.showSuccess('Turni copiati da ieri');
                    
                } catch (error) {
                    console.error('Error copying shifts:', error);
                    this.showError('Errore nel copiare i turni');
                }
            }
        );
    }

    async saveShifts() {
        this.showLoading(true);
        
        try {
            const dateStr = DateUtils.formatDate(this.currentDate);
            
            // Validate all shifts
            for (const employee in this.shifts) {
                for (let i = 0; i < this.shifts[employee].length; i++) {
                    const shift = this.shifts[employee][i];
                    if (shift.start && shift.end && shift.type !== 'festa') {
                        if (TimeUtils.timeToMinutes(shift.end) <= TimeUtils.timeToMinutes(shift.start)) {
                            this.showError(`Errore nel turno di ${employee}: l'orario di fine deve essere successivo all'orario di inizio`);
                            return;
                        }
                        
                        // Check for overlaps within same employee
                        for (let j = i + 1; j < this.shifts[employee].length; j++) {
                            const otherShift = this.shifts[employee][j];
                            if (otherShift.start && otherShift.end && otherShift.type !== 'festa') {
                                const overlap = this.checkShiftOverlap(shift, otherShift);
                                if (overlap) {
                                    this.showError(`Sovrapposizione di turni per ${employee}`);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
            
            // Clean up empty shifts
            const cleanedShifts = {};
            for (const employee in this.shifts) {
                const validShifts = this.shifts[employee].filter(shift => 
                    shift.type === 'festa' || (shift.start && shift.end)
                );
                if (validShifts.length > 0) {
                    cleanedShifts[employee] = validShifts;
                }
            }
            
            await FirebaseAPI.saveShifts(dateStr, cleanedShifts);
            this.showSuccess('Turni salvati con successo');
            
            // Reload week data to update calendar
            await this.loadWeekData();
            this.render();
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Error saving shifts:', error);
            this.showError('Errore nel salvataggio dei turni');
        } finally {
            this.showLoading(false);
        }
    }

    checkShiftOverlap(shift1, shift2) {
        const start1 = TimeUtils.timeToMinutes(shift1.start);
        const end1 = TimeUtils.timeToMinutes(shift1.end);
        const start2 = TimeUtils.timeToMinutes(shift2.start);
        const end2 = TimeUtils.timeToMinutes(shift2.end);
        
        return (start1 < end2 && end1 > start2);
    }

    clearShifts() {
        this.showCustomConfirm(
            'Sei sicuro di voler cancellare tutti i turni per questa data?',
            () => {
                this.shifts = {};
                this.render();
                this.setupEventListeners();
                this.showSuccess('Turni cancellati');
            },
            'danger'
        );
    }
}