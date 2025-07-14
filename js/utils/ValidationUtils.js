import { TimeUtils } from './TimeUtils.js';

export class ValidationUtils {
    static validateTimeInput(startTime, endTime) {
        const errors = [];

        if (!TimeUtils.isValidTime(startTime)) {
            errors.push('Orario di inizio non valido');
        }

        if (!TimeUtils.isValidTime(endTime)) {
            errors.push('Orario di fine non valido');
        }

        if (TimeUtils.isValidTime(startTime) && TimeUtils.isValidTime(endTime)) {
            if (TimeUtils.timeToMinutes(endTime) <= TimeUtils.timeToMinutes(startTime)) {
                errors.push('L\'orario di fine deve essere successivo all\'orario di inizio');
            }
        }

        if (!TimeUtils.isInWorkingHours(startTime)) {
            errors.push('Orario di inizio fuori dall\'orario lavorativo (06:00-21:30)');
        }

        if (!TimeUtils.isInWorkingHours(endTime)) {
            errors.push('Orario di fine fuori dall\'orario lavorativo (06:00-21:30)');
        }

        return errors;
    }

    static validateEmployee(username, password) {
        const errors = [];

        if (!username || username.trim().length < 3) {
            errors.push('Username deve avere almeno 3 caratteri');
        }

        if (!password || password.length < 6) {
            errors.push('Password deve avere almeno 6 caratteri');
        }

        return errors;
    }

    static validateShiftOverlap(shifts, newShift) {
        const newStartMinutes = TimeUtils.timeToMinutes(newShift.start);
        const newEndMinutes = TimeUtils.timeToMinutes(newShift.end);

        for (const shift of shifts) {
            const shiftStartMinutes = TimeUtils.timeToMinutes(shift.start);
            const shiftEndMinutes = TimeUtils.timeToMinutes(shift.end);

            // Check for overlap
            if (
                (newStartMinutes < shiftEndMinutes && newEndMinutes > shiftStartMinutes) ||
                (shiftStartMinutes < newEndMinutes && shiftEndMinutes > newStartMinutes)
            ) {
                return 'I turni non possono sovrapporsi';
            }
        }

        return null;
    }

    static sanitizeInput(input) {
        return input.trim().replace(/[<>]/g, '');
    }
}