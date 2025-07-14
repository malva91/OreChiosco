export class TimeUtils {
    static formatTime(timeString) {
        if (!timeString) return '';
        return timeString.substring(0, 5);
    }

    static getCurrentTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    static calculateDuration(startTime, endTime) {
        if (!startTime || !endTime) return 0;
        
        const start = this.timeToMinutes(startTime);
        const end = this.timeToMinutes(endTime);
        
        return end - start;
    }

    static timeToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    static minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    static formatDuration(totalMinutes) {
        if (totalMinutes < 0) return '0h 0m';
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes}m`;
    }

    static isValidTime(timeString) {
        const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return regex.test(timeString);
    }

    static isInWorkingHours(timeString) {
        const minutes = this.timeToMinutes(timeString);
        const startWork = this.timeToMinutes('06:00');
        const endWork = this.timeToMinutes('21:30');
        
        return minutes >= startWork && minutes <= endWork;
    }

    static generateTimeSlots() {
        const slots = [];
        for (let h = 6; h < 22; h++) {
            slots.push(`${h.toString().padStart(2, '0')}:00`);
            slots.push(`${h.toString().padStart(2, '0')}:30`);
        }
        slots.push('22:00');
        return slots;
    }

    static isTimeInRange(time, startTime, endTime) {
        const timeMinutes = this.timeToMinutes(time);
        const startMinutes = this.timeToMinutes(startTime);
        const endMinutes = this.timeToMinutes(endTime);
        
        return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
    }
}