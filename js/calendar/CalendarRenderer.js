import { DateUtils } from '../utils/DateUtils.js';
import { TimeUtils } from '../utils/TimeUtils.js';

export class CalendarRenderer {
    renderMiniCalendar(weekStart, employees, weekShifts) {
        const weekDates = DateUtils.getWeekDates(weekStart);
        
        return `
            <div class="mini-calendar-container">
                <div class="mini-calendar-header">
                    <div class="mini-time-header">Ore</div>
                    <div class="mini-employees-header">
                        ${weekDates.map((date, dayIndex) => this.renderMiniDayHeader(date, dayIndex, employees)).join('')}
                    </div>
                </div>
                
                <div class="mini-calendar-body">
                    <div class="mini-time-labels">
                        ${this.renderMiniTimeLabels()}
                    </div>
                    <div class="mini-shifts-grid">
                        ${this.renderMiniShiftsGrid(weekDates, employees, weekShifts)}
                    </div>
                </div>
            </div>
        `;
    }

    renderMiniDayHeader(date, dayIndex, employees) {
        const dayName = DateUtils.getDayName(date);
        const dayDate = DateUtils.formatShortDate(date);
        const isToday = DateUtils.isToday(date);
        const dayWidth = employees.length * 40; // Reduced width for mini calendar
        
        return `
            <div class="mini-day-container" style="width: ${dayWidth}px; min-width: ${dayWidth}px;">
                <div class="mini-day-separator"></div>
                <div class="mini-day-title ${isToday ? 'today' : ''}">
                    <div class="mini-day-name">${dayName}</div>
                    <div class="mini-day-date">${dayDate}</div>
                </div>
                <div class="mini-employees-row">
                    ${employees.map((employee, empIndex) => `
                        <div class="mini-employee-header emp-color-${(empIndex % 4) + 1}">
                            <span class="mini-employee-name">${employee.substring(0, 3)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderMiniTimeLabels() {
        const slots = TimeUtils.generateTimeSlots().filter((_, index) => index % 2 === 0); // Show every other slot
        
        return slots.map(slot => `
            <div class="mini-time-slot">${slot}</div>
        `).join('');
    }

    renderMiniShiftsGrid(weekDates, employees, weekShifts) {
        const slots = TimeUtils.generateTimeSlots().filter((_, index) => index % 2 === 0);
        
        return slots.map(slot => `
            <div class="mini-time-row">
                ${weekDates.map(date => this.renderMiniDaySlots(date, slot, employees, weekShifts)).join('')}
            </div>
        `).join('');
    }

    renderMiniDaySlots(date, slot, employees, weekShifts) {
        const dateStr = DateUtils.formatDate(date);
        const dayShifts = weekShifts[dateStr] || {};
        const dayWidth = employees.length * 40;
        
        return `
            <div class="mini-day-slots" style="width: ${dayWidth}px; min-width: ${dayWidth}px;">
                <div class="mini-day-separator-line"></div>
                ${employees.map((employee, empIndex) => {
                    const employeeShifts = dayShifts[employee] || [];
                    let cellContent = '';
                    let cellClasses = ['mini-time-slot-cell'];
                    
                    employeeShifts.forEach(shift => {
                        if (TimeUtils.isTimeInRange(slot, shift.start, shift.end)) {
                            const colorClass = `emp-color-${(empIndex % 15) + 1}`;
                            
                            if (shift.type === 'festa') {
                                cellClasses.push('festa-cell');
                                cellContent = '🎉';
                            } else if (shift.type === 'employee_hours') {
                                cellClasses.push(colorClass);
                                cellClasses.push('employee-hours');
                                
                                if (slot === shift.start) {
                                    cellContent = slot.substring(0, 2);
                                    cellClasses.push('shift-start');
                                } else if (TimeUtils.timeToMinutes(slot) + 60 > TimeUtils.timeToMinutes(shift.end)) {
                                    cellContent = shift.end.substring(0, 2);
                                    cellClasses.push('shift-end');
                                } else {
                                    cellClasses.push('shift-mid');
                                }
                            } else {
                                cellClasses.push(colorClass);
                                
                                if (slot === shift.start) {
                                    cellContent = slot.substring(0, 2);
                                    cellClasses.push('shift-start');
                                } else if (TimeUtils.timeToMinutes(slot) + 60 > TimeUtils.timeToMinutes(shift.end)) {
                                    cellContent = shift.end.substring(0, 2);
                                    cellClasses.push('shift-end');
                                } else {
                                    cellClasses.push('shift-mid');
                                }
                            }
                        }
                    });
                    
                    return `<div class="${cellClasses.join(' ')}">${cellContent}</div>`;
                }).join('')}
            </div>
        `;
    }
}