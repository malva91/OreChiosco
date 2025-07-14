import FirebaseAPI from './firebase.js';
import { DateUtils } from './utils/DateUtils.js';
import { TimeUtils } from './utils/TimeUtils.js';
import { MobileMenuManager } from './utils/MobileMenuManager.js';

class CalendarManager {
    constructor() {
        this.currentUser = this.getCurrentUser();
        this.currentWeekStart = DateUtils.getMonday(new Date());
        this.employees = [];
        this.weekShifts = {};
        
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
        await this.loadEmployees();
        await this.loadWeekData();
        this.renderCalendar();
    }

    setupUI() {
        document.getElementById('user-info').textContent = this.currentUser.username;
        
        // Show admin link if user is admin
        if (this.currentUser.role === 'admin') {
            document.getElementById('admin-link').style.display = 'block';
        }
        
        this.updateWeekDisplay();
    }

    setupEventListeners() {
        // Week navigation
        document.getElementById('prev-week').addEventListener('click', () => {
            this.currentWeekStart = DateUtils.addDays(this.currentWeekStart, -7);
            this.updateWeekDisplay();
            this.loadWeekData();
        });

        document.getElementById('next-week').addEventListener('click', () => {
            this.currentWeekStart = DateUtils.addDays(this.currentWeekStart, 7);
            this.updateWeekDisplay();
            this.loadWeekData();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
    }

    updateWeekDisplay() {
        const weekEnd = DateUtils.addDays(this.currentWeekStart, 6);
        const weekText = `${DateUtils.formatShortDate(this.currentWeekStart)} - ${DateUtils.formatShortDate(weekEnd)}`;
        document.getElementById('current-week').textContent = weekText;
    }

    async loadEmployees() {
        try {
            const employeesData = await FirebaseAPI.getEmployees();
            this.employees = Object.keys(employeesData).filter(username => username !== 'admin');
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    }

    async loadWeekData() {
        this.showLoading(true);
        
        try {
            const weekDates = DateUtils.getWeekDates(this.currentWeekStart);
            const startDate = DateUtils.formatDate(weekDates[0]);
            const endDate = DateUtils.formatDate(weekDates[6]);
            
            this.weekShifts = await FirebaseAPI.getWeekShifts(startDate, endDate);
            this.renderCalendar();
            
        } catch (error) {
            console.error('Error loading week data:', error);
        } finally {
            this.showLoading(false);
        }
    }

    renderCalendar() {
        this.renderHeader();
        this.renderTimeLabels();
        this.renderShiftsGrid();
        this.setupScrollSync();
    }

    renderHeader() {
        const employeesHeader = document.getElementById('employees-header');
        employeesHeader.innerHTML = '';
        
        const weekDates = DateUtils.getWeekDates(this.currentWeekStart);
        
        // Set CSS custom property for employee count
        document.documentElement.style.setProperty('--employees-count', this.employees.length);
        
        // Per ogni giorno della settimana
        weekDates.forEach((date, dayIndex) => {
            const dayContainer = document.createElement('div');
            dayContainer.className = 'day-container';
            
            // Calculate width based on screen size
            let cellWidth = 60;
            if (window.innerWidth <= 480) {
                cellWidth = 35;
            } else if (window.innerWidth <= 768) {
                cellWidth = 45;
            }
            
            const dayWidth = this.employees.length * cellWidth;
            dayContainer.style.width = `${dayWidth}px`;
            dayContainer.style.minWidth = `${dayWidth}px`;
            
            // Add day separator
            const separator = document.createElement('div');
            separator.className = 'day-separator';
            dayContainer.appendChild(separator);
            
            const dayName = DateUtils.getDayName(date);
            const dayDate = DateUtils.formatShortDate(date);
            const isToday = DateUtils.isToday(date);
            
            // Header del giorno
            const dayHeader = document.createElement('div');
            dayHeader.className = `day-title ${isToday ? 'today' : ''}`;
            dayHeader.innerHTML = `
                <div class="day-name">${dayName}</div>
                <div class="day-date">${dayDate}</div>
            `;
            dayContainer.appendChild(dayHeader);
            
            // Colonne dipendenti per questo giorno
            const employeesRow = document.createElement('div');
            employeesRow.className = 'employees-row';
            
            this.employees.forEach((employee, empIndex) => {
                const empHeader = document.createElement('div');
                empHeader.className = `employee-header emp-color-${(empIndex % 15) + 1}`;
                empHeader.innerHTML = `<span class="employee-name-vertical">${employee}</span>`;
                employeesRow.appendChild(empHeader);
            });
            
            dayContainer.appendChild(employeesRow);
            employeesHeader.appendChild(dayContainer);
        });
    }

    renderTimeLabels() {
        const timeLabels = document.getElementById('time-labels');
        timeLabels.innerHTML = '';
        
        const slots = TimeUtils.generateTimeSlots();
        
        slots.forEach(slot => {
            const timeDiv = document.createElement('div');
            timeDiv.className = 'time-slot';
            timeDiv.textContent = slot;
            timeLabels.appendChild(timeDiv);
        });
    }

    renderShiftsGrid() {
        const shiftsGrid = document.getElementById('shifts-grid');
        shiftsGrid.innerHTML = '';
        
        const slots = TimeUtils.generateTimeSlots();
        const weekDates = DateUtils.getWeekDates(this.currentWeekStart);
        
        // Calculate cell width based on screen size
        let cellWidth = 60;
        if (window.innerWidth <= 480) {
            cellWidth = 35;
        } else if (window.innerWidth <= 768) {
            cellWidth = 45;
        }
        
        // Per ogni slot orario
        slots.forEach(slot => {
            const timeRow = document.createElement('div');
            timeRow.className = 'time-row';
            
            // Per ogni giorno della settimana
            weekDates.forEach((date, dayIndex) => {
                const dayContainer = document.createElement('div');
                dayContainer.className = 'day-slots';
                
                // Mantieni la stessa larghezza dell'header
                const dayWidth = this.employees.length * cellWidth;
                dayContainer.style.width = `${dayWidth}px`;
                dayContainer.style.minWidth = `${dayWidth}px`;
                
                const dateStr = DateUtils.formatDate(date);
                const dayShifts = this.weekShifts[dateStr] || {};
                
                // Per ogni dipendente
                this.employees.forEach((employee, empIndex) => {
                    const slotCell = document.createElement('div');
                    slotCell.className = 'time-slot-cell';
                    
                    const employeeShifts = dayShifts[employee] || [];
                    let cellContent = '';
                    let cellClasses = ['time-slot-cell'];
                    
                    // Controlla se questo slot è coperto da un turno
                    employeeShifts.forEach(shift => {
                        if (TimeUtils.isTimeInRange(slot, shift.start, shift.end)) {
                            const colorClass = `emp-color-${(empIndex % 15) + 1}`;
                            
                            if (shift.type === 'festa') {
                                cellClasses.push('festa-cell');
                                cellContent = '🎉';
                            } else {
                                cellClasses.push(colorClass);
                                
                                // Mostra orario all'inizio e fine turno
                                if (slot === shift.start) {
                                    cellContent = slot;
                                    cellClasses.push('shift-start');
                                } else if (slot === shift.end || 
                                          (TimeUtils.timeToMinutes(slot) + 30 > TimeUtils.timeToMinutes(shift.end))) {
                                    cellContent = shift.end;
                                    cellClasses.push('shift-end');
                                } else {
                                    cellClasses.push('shift-mid');
                                }
                            }
                        }
                    });
                    
                    slotCell.className = cellClasses.join(' ');
                    slotCell.innerHTML = cellContent;
                    
                    dayContainer.appendChild(slotCell);
                });
                
                timeRow.appendChild(dayContainer);
            });
            
            shiftsGrid.appendChild(timeRow);
        });
    }

    setupScrollSync() {
        const header = document.getElementById('calendar-header');
        const body = document.getElementById('calendar-body');
        
        let isHeaderScrolling = false;
        let isBodyScrolling = false;
        
        header.addEventListener('scroll', () => {
            if (!isBodyScrolling) {
                isHeaderScrolling = true;
                body.scrollLeft = header.scrollLeft;
                setTimeout(() => { isHeaderScrolling = false; }, 10);
            }
        });
        
        body.addEventListener('scroll', () => {
            if (!isHeaderScrolling) {
                isBodyScrolling = true;
                header.scrollLeft = body.scrollLeft;
                setTimeout(() => { isBodyScrolling = false; }, 10);
            }
        });
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// Initialize calendar manager
new CalendarManager();