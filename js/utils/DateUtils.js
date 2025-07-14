export class DateUtils {
    static formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    static formatDisplayDate(date) {
        return date.toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    static formatShortDate(date) {
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    static parseDate(dateString) {
        return new Date(dateString + 'T00:00:00');
    }

    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    static getMonday(date) {
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
    }

    static getWeekDates(startDate) {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            dates.push(this.addDays(startDate, i));
        }
        return dates;
    }

    static getWeekRange(date) {
        const monday = this.getMonday(new Date(date));
        const sunday = this.addDays(monday, 6);
        return {
            start: monday,
            end: sunday
        };
    }

    static isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    static getDayName(date) {
        return date.toLocaleDateString('it-IT', { weekday: 'long' });
    }
}