import { BaseTab } from '../BaseTab.js';
import FirebaseAPI from '../../firebase.js';
import { DateUtils } from '../../utils/DateUtils.js';
import { TimeUtils } from '../../utils/TimeUtils.js';

export class HoursViewTab extends BaseTab {
    constructor() {
        super('hours-view');
        this.employees = [];
        this.allHoursData = {};
        this.currentMonth = new Date();
    }

    async init() {
        await this.loadEmployees();
        await this.loadAllHours();
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

    async loadAllHours() {
        try {
            this.allHoursData = await FirebaseAPI.getAllHours();
        } catch (error) {
            console.error('Error loading hours data:', error);
            this.showError('Errore nel caricamento ore');
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="tab-header">
                <h3>Ore Dipendenti</h3>
                <div class="month-navigation">
                    <button id="prev-month-view" class="btn btn-secondary">◀</button>
                    <span id="current-month-view">${this.getMonthDisplayText()}</span>
                    <button id="next-month-view" class="btn btn-secondary">▶</button>
                </div>
            </div>
            
            <div class="hours-view-container">
                <div class="employees-hours-grid">
                    ${this.renderEmployeesHours()}
                </div>
            </div>
        `;
    }

    getMonthDisplayText() {
        return this.currentMonth.toLocaleDateString('it-IT', {
            month: 'long',
            year: 'numeric'
        });
    }

    renderEmployeesHours() {
        return this.employees.map((employee, index) => {
            const monthlyData = this.getEmployeeMonthlyData(employee);
            const colorClass = `emp-color-${(index % 15) + 1}`;
            
            return `
                <div class="employee-hours-card ${colorClass}">
                    <div class="employee-hours-header">
                        <h4>${employee}</h4>
                        <div class="monthly-total">${TimeUtils.formatDuration(monthlyData.totalMinutes)}</div>
                    </div>
                    <div class="employee-hours-details">
                        <div class="hours-stats">
                            <div class="stat-item">
                                <span class="stat-label">Giorni lavorati:</span>
                                <span class="stat-value">${monthlyData.workDays}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Giorni riposo:</span>
                                <span class="stat-value">${monthlyData.restDays}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Media giornaliera:</span>
                                <span class="stat-value">${TimeUtils.formatDuration(monthlyData.averageDaily)}</span>
                            </div>
                        </div>
                        <div class="daily-hours-list">
                            ${this.renderDailyHours(employee, monthlyData.dailyHours)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getEmployeeMonthlyData(employee) {
        const employeeHours = this.allHoursData[employee] || {};
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        let totalMinutes = 0;
        let workDays = 0;
        let restDays = 0;
        const dailyHours = [];
        
        // Get all days in the month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = DateUtils.formatDate(date);
            const dayData = employeeHours[dateStr];
            
            if (dayData) {
                if (dayData.rest_day) {
                    restDays++;
                    dailyHours.push({
                        date: dateStr,
                        minutes: 0,
                        isRestDay: true,
                        shifts: []
                    });
                } else {
                    let dayMinutes = 0;
                    const shifts = [];
                    const shiftNames = ['first_shift', 'second_shift', 'third_shift'];
                    
                    shiftNames.forEach((shiftName, index) => {
                        if (dayData[shiftName]) {
                            const shift = dayData[shiftName];
                            const duration = TimeUtils.calculateDuration(shift.entry, shift.exit);
                            dayMinutes += duration;
                            shifts.push({
                                index: index + 1,
                                entry: shift.entry,
                                exit: shift.exit,
                                duration: duration
                            });
                        }
                    });
                    
                    if (dayMinutes > 0) {
                        workDays++;
                        totalMinutes += dayMinutes;
                    }
                    
                    dailyHours.push({
                        date: dateStr,
                        minutes: dayMinutes,
                        isRestDay: false,
                        shifts: shifts
                    });
                }
            }
        }
        
        const averageDaily = workDays > 0 ? Math.round(totalMinutes / workDays) : 0;
        
        return {
            totalMinutes,
            workDays,
            restDays,
            averageDaily,
            dailyHours: dailyHours.filter(day => day.minutes > 0 || day.isRestDay)
        };
    }

    renderDailyHours(employee, dailyHours) {
        if (dailyHours.length === 0) {
            return '<p class="no-data">Nessun dato per questo mese</p>';
        }
        
        return dailyHours.slice(0, 10).map(day => {
            const date = DateUtils.parseDate(day.date);
            const dayName = DateUtils.getDayName(date);
            const shortDate = DateUtils.formatShortDate(date);
            
            if (day.isRestDay) {
                return `
                    <div class="daily-hour-item rest-day">
                        <div class="day-info">
                            <span class="day-name">${dayName}</span>
                            <span class="day-date">${shortDate}</span>
                        </div>
                        <div class="day-hours">Riposo</div>
                    </div>
                `;
            }
            
            const shiftsText = day.shifts.map(shift => 
                `${shift.entry}-${shift.exit}`
            ).join(', ');
            
            return `
                <div class="daily-hour-item">
                    <div class="day-info">
                        <span class="day-name">${dayName}</span>
                        <span class="day-date">${shortDate}</span>
                    </div>
                    <div class="day-hours">
                        <div class="hours-total">${TimeUtils.formatDuration(day.minutes)}</div>
                        <div class="hours-detail">${shiftsText}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    setupEventListeners() {
        document.getElementById('prev-month-view').addEventListener('click', () => {
            this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
            this.updateMonthDisplay();
            this.render();
            this.setupEventListeners();
        });

        document.getElementById('next-month-view').addEventListener('click', () => {
            this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
            this.updateMonthDisplay();
            this.render();
            this.setupEventListeners();
        });
    }

    updateMonthDisplay() {
        document.getElementById('current-month-view').textContent = this.getMonthDisplayText();
    }
}