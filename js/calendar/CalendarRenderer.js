import { DateUtils } from '../utils/DateUtils.js';
import { TimeUtils } from '../utils/TimeUtils.js';

export class CalendarRenderer {
    renderCalendar(weekStart, employees, weekShifts, containerId = 'calendar') {
        const weekDates = DateUtils.getWeekDates(weekStart);
        
        return `
            <div class="calendar-container" id="${containerId}-container">
                <div class="calendar-header" id="${containerId}-header">
                    <div class="time-header">Ore</div>
                    <div class="employees-header" id="${containerId}-employees-header">
                        ${weekDates.map((date, dayIndex) => this.renderDayHeader(date, dayIndex, employees)).join('')}
                    </div>
                </div>
                
                <div class="calendar-body" id="${containerId}-body">
                    <div class="time-label-column" id="${containerId}-time-labels">
                        ${this.renderTimeLabels()}
                    </div>
                    <div class="shifts-grid" id="${containerId}-shifts-grid">
                        ${this.renderShiftsGrid(weekDates, employees, weekShifts)}
                    </div>
                </div>
            </div>
        `;
    }

    renderDayHeader(date, dayIndex, employees) {
        const dayName = DateUtils.getDayName(date);
        const dayDate = DateUtils.formatShortDate(date);
        const isToday = DateUtils.isToday(date);
        
        // Calculate width based on screen size
        let cellWidth = 60;
        if (window.innerWidth <= 480) {
            cellWidth = 35;
        } else if (window.innerWidth <= 768) {
            cellWidth = 45;
        }
        
        const dayWidth = employees.length * cellWidth;
        
        return `
            <div class="day-container" style="width: ${dayWidth}px; min-width: ${dayWidth}px;">
                <div class="day-separator"></div>
                <div class="day-title ${isToday ? 'today' : ''}">
                    <div class="day-name">${dayName}</div>
                    <div class="day-date">${dayDate}</div>
                </div>
                <div class="employees-row">
                    ${employees.map((employee, empIndex) => `
                        <div class="employee-header emp-color-${(empIndex % 15) + 1}">
                            <span class="employee-name-vertical">${employee}</span>
                        </div>
                    `).join('')}
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

    renderShiftsGrid(weekDates, employees, weekShifts) {
        const slots = TimeUtils.generateTimeSlots();
        
        // Calculate cell width based on screen size
        let cellWidth = 60;
        if (window.innerWidth <= 480) {
            cellWidth = 35;
        } else if (window.innerWidth <= 768) {
            cellWidth = 45;
        }
        
        return slots.map(slot => `
            <div class="time-row">
                ${weekDates.map(date => this.renderDaySlots(date, slot, employees, weekShifts, cellWidth)).join('')}
            </div>
        `).join('');
    }

    renderDaySlots(date, slot, employees, weekShifts, cellWidth) {
        const dateStr = DateUtils.formatDate(date);
        const dayShifts = weekShifts[dateStr] || {};
        const dayWidth = employees.length * cellWidth;
        
        return `
            <div class="day-slots" style="width: ${dayWidth}px; min-width: ${dayWidth}px;">
                ${employees.map((employee, empIndex) => {
                    const employeeShifts = dayShifts[employee] || [];
                    let cellContent = '';
                    let cellClasses = ['time-slot-cell'];
                    
                    // Check if this slot is covered by a shift
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
                    
                    return `<div class="${cellClasses.join(' ')}">${cellContent}</div>`;
                }).join('')}
            </div>
        `;
    }

    setupScrollSync(containerId) {
        const header = document.getElementById(`${containerId}-header`);
        const body = document.getElementById(`${containerId}-body`);
        
        if (!header || !body) return;
        
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
}