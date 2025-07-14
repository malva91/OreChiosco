import FirebaseAPI from './firebase.js';
import { DateUtils } from './utils/DateUtils.js';
import { TimeUtils } from './utils/TimeUtils.js';
import { MobileMenuManager } from './utils/MobileMenuManager.js';
import { CalendarRenderer } from './calendar/CalendarRenderer.js';

class CalendarManager {
    constructor() {
        this.currentUser = this.getCurrentUser();
        this.currentWeekStart = DateUtils.getMonday(new Date());
        this.employees = [];
        this.weekShifts = {};
        this.calendarRenderer = new CalendarRenderer();
        
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
            
            // Carica solo i turni admin, non le ore dipendenti
            this.weekShifts = await FirebaseAPI.getWeekShifts(startDate, endDate);
            
            // Carica anche le ore dipendenti per il calendario principale
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
                    
                    if (dayData && !dayData.rest_day && !dayData.festa) {
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
                    } else if (dayData && dayData.festa) {
                        // Aggiungi festa
                        if (!this.weekShifts[dateStr][employee]) {
                            this.weekShifts[dateStr][employee] = [];
                        }
                        this.weekShifts[dateStr][employee].push({
                            start: '08:00',
                            end: '20:00',
                            type: 'festa'
                        });
                    }
                });
            });
            
            this.renderCalendar();
            
        } catch (error) {
            console.error('Error loading week data:', error);
        } finally {
            this.showLoading(false);
        }
    }

    renderCalendar() {
        // Set CSS custom property for employee count
        document.documentElement.style.setProperty('--employees-count', this.employees.length);
        
        // Render the calendar using the same renderer
        const calendarContainer = document.querySelector('.calendar-container');
        if (calendarContainer) {
            calendarContainer.outerHTML = this.calendarRenderer.renderCalendar(
                this.currentWeekStart, 
                this.employees, 
                this.weekShifts, 
                'calendar'
            );
            
            // Setup scroll sync
            setTimeout(() => {
                this.calendarRenderer.setupScrollSync('calendar');
            }, 100);
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// Initialize calendar manager
new CalendarManager();