import { DateUtils } from '../utils/DateUtils.js';
import { TimeUtils } from '../utils/TimeUtils.js';
import { SecurityUtils } from '../utils/SecurityUtils.js';
import { CONFIG } from '../config.js';

export class CalendarRenderer {
    renderCalendar(weekStart, employees, weekShifts, containerId = 'calendar') {
        const weekDates = DateUtils.getWeekDates(weekStart);
        
        return `
            <table class="calendar-table" id="${containerId}-container">
                <thead class="calendar-header" id="${containerId}-header">
                    <tr>
                        <th class="time-header">Ore</th>
                        ${weekDates.map((date, dayIndex) => this.renderDayHeaderCell(date, dayIndex, employees)).join('')}
                    </tr>
                    <tr class="employees-header-row">
                        <th class="time-header-empty"></th>
                        ${weekDates.map((date, dayIndex) => this.renderEmployeesHeaderCells(date, dayIndex, employees)).join('')}
                    </tr>
                </thead>
                <tbody class="calendar-body" id="${containerId}-body">
                    ${this.renderTimeRows(weekDates, employees, weekShifts)}
                </tbody>
            </table>
        `;
    }

    renderDayHeaderCell(date, dayIndex, employees) {
        const dayName = DateUtils.getDayName(date);
        const dayDate = DateUtils.formatShortDate(date);
        const isToday = DateUtils.isToday(date);
        
        const employeeList = Array.isArray(employees) ? employees : Object.keys(employees).filter(emp => emp !== 'admin');
        
        return `
            <th class="day-header ${isToday ? 'today' : ''}" colspan="${employeeList.length}">
                <div class="day-title">
                    <div class="day-name">${SecurityUtils.sanitizeHTML(dayName)}</div>
                    <div class="day-date">${SecurityUtils.sanitizeHTML(dayDate)}</div>
                </div>
            </th>
        `;
    }
    
    renderEmployeesHeaderCells(date, dayIndex, employees) {
        const employeeList = Array.isArray(employees) ? employees : Object.keys(employees).filter(emp => emp !== 'admin');
        
        return employeeList.map((employee, empIndex) => {
            const employeeName = typeof employee === 'string' ? employee : employee.username;
            const colorIndex = typeof employee === 'object' ? employee.colorIndex || (empIndex % CONFIG.EMPLOYEE_COLORS_COUNT) + 1 : (empIndex % CONFIG.EMPLOYEE_COLORS_COUNT) + 1;
            return `
                <th class="employee-header emp-color-${colorIndex}">
                    <span class="employee-name-vertical">${SecurityUtils.sanitizeHTML(employeeName)}</span>
                </th>
            `;
        }).join('');
    }

    renderTimeRows(weekDates, employees, weekShifts) {
        const slots = TimeUtils.generateTimeSlots();
        
        return slots.map(slot => `
            <tr class="time-row">
                <td class="time-slot">${slot}</td>
                ${weekDates.map(date => this.renderDaySlotCells(date, slot, employees, weekShifts)).join('')}
            </tr>
        `).join('');
    }

    renderDaySlotCells(date, slot, employees, weekShifts) {
        const dateStr = DateUtils.formatDate(date);
        const dayShifts = weekShifts[dateStr] || {};
        const employeeList = Array.isArray(employees) ? employees : Object.keys(employees).filter(emp => emp !== 'admin');
        
        return employeeList.map((employee, empIndex) => {
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
            
            return `<td class="${cellClasses.join(' ')}">${SecurityUtils.sanitizeHTML(cellContent)}</td>`;
        }).join('');
    }

    setupScrollSync(containerId) {
        const table = document.getElementById(\`${containerId}-container`);
        const header = table?.querySelector('thead');
        const body = table?.querySelector('tbody');
        
        if (!header || !body) return;
        
        // For table layout, we need to sync horizontal scroll on the container
        const container = table.parentElement;
        if (!container) return;
        
        let isScrolling = false;
        
        container.addEventListener('scroll', () => {
            if (!isScrolling) {
                isScrolling = true;
                // Sync any other scroll elements if needed
                setTimeout(() => { isScrolling = false; }, 10);
            }
        });
    }
}