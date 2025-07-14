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
            
            this.weekShifts = await FirebaseAPI.getWeekShifts(startDate, endDate);
        } catch (error) {
            console.error('Error loading week data:', error);
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
                    <h4>Calendario Settimanale</h4>
                    <div class="week-navigation">
                        <button id="prev-week-shifts" class="btn btn-secondary btn-sm">◀</button>
                        <span id="current-week-shifts">${this.getWeekDisplayText()}</span>
                        <button id="next-week-shifts" class="btn btn-secondary btn-sm">▶</button>
                    </div>
                </div>
                <div id="shifts-calendar-container">
                    ${this.renderMiniCalendar()}
                </div>
            </div>
        `;
    }

    getWeekDisplayText() {
        const weekEnd = DateUtils.addDays(this.currentWeekStart, 6);
        return `${DateUtils.formatShortDate(this.currentWeekStart)} - ${DateUtils.formatShortDate(weekEnd)}`;
    }

    renderMiniCalendar() {
        return this.calendarRenderer.renderMiniCalendar(this.currentWeekStart, this.employees, this.weekShifts);
    }

    renderShiftsForm() {
        return `
            <div class="shifts-form">
                <h4>Assegnazione Turni</h4>
                <div class="employees-shifts-grid">
                    ${this.employees.map((employee, index) => this.renderEmployeeShifts(employee, index)).join('')}
                </div>
                <div class="form-actions">
                    <button id="save-shifts-btn" class="btn btn-success">Salva Turni</button>
                    <button id="clear-shifts-btn" class="btn btn-danger">Cancella Tutti</button>
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
                    ${employeeShifts.map((shift, index) => this.renderShiftForm(employee, shift, index)).join('')}
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

        // Week navigation for calendar
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
        document.getElementById('shifts-calendar-container').innerHTML = this.renderMiniCalendar();
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
        if (!this.shifts[employee] || !this.shifts[employee][index]) return;
        
        const shift = this.shifts[employee][index];
        const field = input.classList.contains('shift-start') ? 'start' : 
                     input.classList.contains('shift-end') ? 'end' : 'type';
        
        shift[field] = input.value;
    }

    async saveShifts() {
        this.showLoading(true);
        
        try {
            // Validate all shifts
            for (const employee in this.shifts) {
                for (const shift of this.shifts[employee]) {
                    if (shift.start && shift.end) {
                        const errors = ValidationUtils.validateTimeInput(shift.start, shift.end);
                        if (errors.length > 0) {
                            this.showError(`Errori nel turno di ${employee}:\n${errors.join('\n')}`);
                            return;
                        }
                    }
                }
            }
            
            const dateStr = DateUtils.formatDate(this.currentDate);
            await FirebaseAPI.saveShifts(dateStr, this.shifts);
            this.showSuccess('Turni salvati con successo');
            
            // Reload week data to update calendar
            await this.loadWeekData();
            document.getElementById('shifts-calendar-container').innerHTML = this.renderMiniCalendar();
            
        } catch (error) {
            console.error('Error saving shifts:', error);
            this.showError('Errore nel salvataggio dei turni');
        } finally {
            this.showLoading(false);
        }
    }

    clearShifts() {
        if (confirm('Sei sicuro di voler cancellare tutti i turni per questa data?')) {
            this.shifts = {};
            this.render();
            this.setupEventListeners();
        }
    }
}