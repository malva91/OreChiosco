import { DateUtils } from '../utils/DateUtils.js';
import { TimeUtils } from '../utils/TimeUtils.js';
import { SecurityUtils } from '../utils/SecurityUtils.js';
import { CONFIG } from '../config.js';

export class CalendarRenderer {
    renderCalendar(weekStart, employees, weekShifts, containerId = 'calendar') {
        const weekDates = DateUtils.getWeekDates(weekStart);
        
        return `
            <div class="calendar-container" id="${containerId}-container">
                <div class="calendar-header" id="${containerId}-header">
                    <div class="time-header">Ore</div>
                    ${weekDates.map((date, dayIndex) => this.renderDayHeader(date, dayIndex, employees)).join('')}
                </div>
                
                <div class="calendar-body" id="${containerId}-body">
                    <div class="time-label-column" id="${containerId}-time-labels">
                        ${this.renderTimeLabels()}
                    </div>
                    <div class="shifts-grid" id="${containerId}-shifts-grid">
                        ${this.renderTimeRows(weekDates, employees, weekShifts)}
                    </div>
                </div>
            </div>
        `;
    }

    renderDayHeader(date, dayIndex, employees) {
        const dayName = DateUtils.getDayName(date);
        const dayDate = DateUtils.formatShortDate(date);
        const isToday = DateUtils.isToday(date);
        
        const employeeList = Array.isArray(employees) ? employees : Object.keys(employees).filter(emp => emp !== 'admin');
        
        return `
            <div class="day-container">
                <div class="day-header ${isToday ? 'today' : ''}">
                    <div class="day-title">
                        <div class="day-name">${SecurityUtils.sanitizeHTML(dayName)}</div>
                        <div class="day-date">${SecurityUtils.sanitizeHTML(dayDate)}</div>
                    </div>
                </div>
                <div class="employees-row">
                    ${employeeList.map((employee, empIndex) => {
                        const employeeName = typeof employee === 'string' ? employee : employee.username;
                        const colorIndex = typeof employee === 'object' ? employee.colorIndex || (empIndex % CONFIG.EMPLOYEE_COLORS_COUNT) + 1 : (empIndex % CONFIG.EMPLOYEE_COLORS_COUNT) + 1;
                        return `
                            <div class="employee-header emp-color-${colorIndex}">
                                <span class="employee-name-vertical">${SecurityUtils.sanitizeHTML(employeeName)}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    renderTimeLabels() {
        const slots = TimeUtils.generateTimeSlots();
        return slots.map(slot => `
            <div class="time-slot">${slot}</div>
        `).join('');
    }

    renderTimeRows(weekDates, employees, weekShifts) {
        const slots = TimeUtils.generateTimeSlots();
        
        return slots.map(slot => `
            <div class="time-row">
                ${weekDates.map(date => this.renderDaySlots(date, slot, employees, weekShifts)).join('')}
            </div>
        `).join('');
    }

    renderDaySlots(date, slot, employees, weekShifts) {
        const dateStr = DateUtils.formatDate(date);
        const dayShifts = weekShifts[dateStr] || {};
        const employeeList = Array.isArray(employees) ? employees : Object.keys(employees).filter(emp => emp !== 'admin');
        
        return `
            <div class="day-slots">
                ${employeeList.map((employee, empIndex) => {
                    const employeeName = typeof employee === 'string' ? employee : employee.username;
                    const colorIndex = typeof employee === 'object' ? employee.colorIndex || (empIndex % CONFIG.EMPLOYEE_COLORS_COUNT) + 1 : (empIndex % CONFIG.EMPLOYEE_COLORS_COUNT) + 1;
                    const employeeShifts = dayShifts[employeeName] || [];
                    let cellContent = '';
                    let cellClasses = ['time-slot-cell'];
                    
                    // Check if this slot is covered by a shift
                    employeeShifts.forEach(shift => {
                        if (TimeUtils.isTimeInRange(slot, shift.start, shift.end)) {
                            const colorClass = `emp-color-${colorIndex}`;
                            
                            if (shift.type === 'festa') {
                                cellClasses.push('festa-cell');
                                cellContent = '🎉';
                            } else if (shift.type === 'employee_hours') {
                                cellClasses.push(colorClass);
                                cellClasses.push('employee-hours');
                                
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
                            } else {
                                cellClasses.push(colorClass);
                                
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
                    
                    return `<div class="${cellClasses.join(' ')}">${SecurityUtils.sanitizeHTML(cellContent)}</div>`;
                }).join('')}
            </div>
        `;
    }

    setupScrollSync(containerId) {
        const header = document.getElementById(`${containerId}-header`);
        const body = document.getElementById(`${containerId}-body`);
        
        if (!header || !body) return;
        
        let isScrolling = false;
        
        body.addEventListener('scroll', () => {
            if (!isScrolling) {
                isScrolling = true;
                header.scrollLeft = body.scrollLeft;
                setTimeout(() => { isScrolling = false; }, 10);
            }
        });
        
        header.addEventListener('scroll', () => {
            if (!isScrolling) {
                isScrolling = true;
                body.scrollLeft = header.scrollLeft;
                setTimeout(() => { isScrolling = false; }, 10);
            }
        });
    }
}