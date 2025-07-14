import { BaseTab } from '../BaseTab.js';
import FirebaseAPI from '../../firebase.js';
import { DateUtils } from '../../utils/DateUtils.js';
import { TimeUtils } from '../../utils/TimeUtils.js';

export class MonthlyTotalTab extends BaseTab {
    constructor() {
        super('monthly-total');
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
                <h3>Totale Mensile</h3>
                <div class="month-navigation">
                    <button id="prev-month-total" class="btn btn-secondary">◀</button>
                    <span id="current-month-total">${this.getMonthDisplayText()}</span>
                    <button id="next-month-total" class="btn btn-secondary">▶</button>
                </div>
            </div>
            
            <div class="monthly-total-container">
                <div class="monthly-summary">
                    ${this.renderMonthlySummary()}
                </div>
                
                <div class="monthly-details">
                    <h4>Dettaglio per Dipendente</h4>
                    <div class="monthly-table-container">
                        <table class="data-table monthly-table">
                            <thead>
                                <tr>
                                    <th>Dipendente</th>
                                    <th>Ore Totali</th>
                                    <th>Giorni Lavorati</th>
                                    <th>Giorni Riposo</th>
                                    <th>Media Giornaliera</th>
                                    <th>Straordinari</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderEmployeesTable()}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="export-section">
                    <h4>Esporta Dati</h4>
                    <div class="export-actions">
                        <button id="export-csv-btn" class="btn btn-primary">📊 Esporta CSV</button>
                        <button id="print-report-btn" class="btn btn-secondary">🖨️ Stampa Report</button>
                    </div>
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

    renderMonthlySummary() {
        const summary = this.calculateMonthlySummary();
        
        return `
            <div class="summary-cards">
                <div class="summary-card">
                    <div class="summary-title">Ore Totali</div>
                    <div class="summary-value">${TimeUtils.formatDuration(summary.totalHours)}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-title">Dipendenti Attivi</div>
                    <div class="summary-value">${summary.activeEmployees}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-title">Media per Dipendente</div>
                    <div class="summary-value">${TimeUtils.formatDuration(summary.averagePerEmployee)}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-title">Giorni Lavorativi</div>
                    <div class="summary-value">${summary.totalWorkDays}</div>
                </div>
            </div>
        `;
    }

    calculateMonthlySummary() {
        let totalHours = 0;
        let activeEmployees = 0;
        let totalWorkDays = 0;
        
        this.employees.forEach(employee => {
            const monthlyData = this.getEmployeeMonthlyData(employee);
            if (monthlyData.totalMinutes > 0) {
                totalHours += monthlyData.totalMinutes;
                activeEmployees++;
                totalWorkDays += monthlyData.workDays;
            }
        });
        
        const averagePerEmployee = activeEmployees > 0 ? Math.round(totalHours / activeEmployees) : 0;
        
        return {
            totalHours,
            activeEmployees,
            averagePerEmployee,
            totalWorkDays
        };
    }

    renderEmployeesTable() {
        return this.employees.map((employee, index) => {
            const monthlyData = this.getEmployeeMonthlyData(employee);
            const colorClass = `emp-color-${(index % 15) + 1}`;
            const overtime = this.calculateOvertime(monthlyData.totalMinutes, monthlyData.workDays);
            
            return `
                <tr class="employee-row ${colorClass}">
                    <td class="employee-name">${employee}</td>
                    <td class="hours-total">${TimeUtils.formatDuration(monthlyData.totalMinutes)}</td>
                    <td class="work-days">${monthlyData.workDays}</td>
                    <td class="rest-days">${monthlyData.restDays}</td>
                    <td class="average-daily">${TimeUtils.formatDuration(monthlyData.averageDaily)}</td>
                    <td class="overtime ${overtime > 0 ? 'has-overtime' : ''}">${TimeUtils.formatDuration(overtime)}</td>
                </tr>
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
        
        // Get all days in the month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = DateUtils.formatDate(date);
            const dayData = employeeHours[dateStr];
            
            if (dayData) {
                if (dayData.rest_day) {
                    restDays++;
                } else {
                    let dayMinutes = 0;
                    const shiftNames = ['first_shift', 'second_shift', 'third_shift'];
                    
                    shiftNames.forEach(shiftName => {
                        if (dayData[shiftName]) {
                            const shift = dayData[shiftName];
                            dayMinutes += TimeUtils.calculateDuration(shift.entry, shift.exit);
                        }
                    });
                    
                    if (dayMinutes > 0) {
                        workDays++;
                        totalMinutes += dayMinutes;
                    }
                }
            }
        }
        
        const averageDaily = workDays > 0 ? Math.round(totalMinutes / workDays) : 0;
        
        return {
            totalMinutes,
            workDays,
            restDays,
            averageDaily
        };
    }

    calculateOvertime(totalMinutes, workDays) {
        const standardHoursPerDay = 8 * 60; // 8 ore in minuti
        const standardTotal = workDays * standardHoursPerDay;
        return Math.max(0, totalMinutes - standardTotal);
    }

    setupEventListeners() {
        document.getElementById('prev-month-total').addEventListener('click', () => {
            this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
            this.updateMonthDisplay();
            this.render();
            this.setupEventListeners();
        });

        document.getElementById('next-month-total').addEventListener('click', () => {
            this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
            this.updateMonthDisplay();
            this.render();
            this.setupEventListeners();
        });

        document.getElementById('export-csv-btn').addEventListener('click', () => {
            this.exportToCSV();
        });

        document.getElementById('print-report-btn').addEventListener('click', () => {
            this.printReport();
        });
    }

    updateMonthDisplay() {
        document.getElementById('current-month-total').textContent = this.getMonthDisplayText();
    }

    exportToCSV() {
        const monthText = this.getMonthDisplayText();
        let csvContent = `Totale Mensile - ${monthText}\n\n`;
        csvContent += 'Dipendente,Ore Totali,Giorni Lavorati,Giorni Riposo,Media Giornaliera,Straordinari\n';
        
        this.employees.forEach(employee => {
            const monthlyData = this.getEmployeeMonthlyData(employee);
            const overtime = this.calculateOvertime(monthlyData.totalMinutes, monthlyData.workDays);
            
            csvContent += `${employee},${TimeUtils.formatDuration(monthlyData.totalMinutes)},${monthlyData.workDays},${monthlyData.restDays},${TimeUtils.formatDuration(monthlyData.averageDaily)},${TimeUtils.formatDuration(overtime)}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `totale_mensile_${this.currentMonth.getFullYear()}_${this.currentMonth.getMonth() + 1}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    printReport() {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (!printWindow) {
            this.showError('Impossibile aprire la finestra di stampa. Controlla le impostazioni del browser.');
            return;
        }
        
        const monthText = this.getMonthDisplayText();
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Totale Mensile - ${monthText}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #333; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .summary { display: flex; justify-content: space-around; margin: 20px 0; }
                        .summary-item { text-align: center; }
                        .summary-value { font-size: 1.5em; font-weight: bold; color: #6366f1; }
                    </style>
                </head>
                <body>
                    <h1>Totale Mensile - ${monthText}</h1>
                    <div class="summary">
                        ${this.renderPrintSummary()}
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Dipendente</th>
                                <th>Ore Totali</th>
                                <th>Giorni Lavorati</th>
                                <th>Giorni Riposo</th>
                                <th>Media Giornaliera</th>
                                <th>Straordinari</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderPrintTable()}
                        </tbody>
                    </table>
                </body>
            </html>
        `);
        
        printWindow.document.close();
        
        // Wait for content to load before printing
        printWindow.onload = function() {
            printWindow.print();
        };
        
        // Fallback for browsers that don't support onload
        setTimeout(() => {
            if (printWindow && !printWindow.closed) {
                printWindow.print();
            }
        }, 500);
    }

    renderPrintSummary() {
        const summary = this.calculateMonthlySummary();
        return `
            <div class="summary-item">
                <div>Ore Totali</div>
                <div class="summary-value">${TimeUtils.formatDuration(summary.totalHours)}</div>
            </div>
            <div class="summary-item">
                <div>Dipendenti Attivi</div>
                <div class="summary-value">${summary.activeEmployees}</div>
            </div>
            <div class="summary-item">
                <div>Media per Dipendente</div>
                <div class="summary-value">${TimeUtils.formatDuration(summary.averagePerEmployee)}</div>
            </div>
        `;
    }

    renderPrintTable() {
        return this.employees.map(employee => {
            const monthlyData = this.getEmployeeMonthlyData(employee);
            const overtime = this.calculateOvertime(monthlyData.totalMinutes, monthlyData.workDays);
            
            return `
                <tr>
                    <td>${employee}</td>
                    <td>${TimeUtils.formatDuration(monthlyData.totalMinutes)}</td>
                    <td>${monthlyData.workDays}</td>
                    <td>${monthlyData.restDays}</td>
                    <td>${TimeUtils.formatDuration(monthlyData.averageDaily)}</td>
                    <td>${TimeUtils.formatDuration(overtime)}</td>
                </tr>
            `;
        }).join('');
    }
}