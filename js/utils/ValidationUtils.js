import { TimeUtils } from './TimeUtils.js';
import { SecurityUtils } from './SecurityUtils.js';
import { CONFIG } from '../config.js';

export class ValidationUtils {
    static validateTimeInput(startTime, endTime) {
        const errors = [];

        if (!SecurityUtils.isValidTimeFormat(startTime)) {
            errors.push('Orario di inizio non valido');
        }

        if (!SecurityUtils.isValidTimeFormat(endTime)) {
            errors.push('Orario di fine non valido');
        }

        if (SecurityUtils.isValidTimeFormat(startTime) && SecurityUtils.isValidTimeFormat(endTime)) {
            if (TimeUtils.timeToMinutes(endTime) <= TimeUtils.timeToMinutes(startTime)) {
                errors.push('L\'orario di fine deve essere successivo all\'orario di inizio');
            }
        }

        if (!TimeUtils.isInWorkingHours(startTime)) {
            errors.push(`Orario di inizio fuori dall'orario lavorativo (${CONFIG.WORKING_HOURS.START}-${CONFIG.WORKING_HOURS.END})`);
        }

        if (!TimeUtils.isInWorkingHours(endTime)) {
            errors.push(`Orario di fine fuori dall'orario lavorativo (${CONFIG.WORKING_HOURS.START}-${CONFIG.WORKING_HOURS.END})`);
        }

        return errors;
    }

    static validateEmployee(username, password, requirePasswordLength = false) {
        const errors = [];

        const sanitizedUsername = SecurityUtils.sanitizeInput(username);
        
        if (!sanitizedUsername || sanitizedUsername.length < CONFIG.VALIDATION.MIN_USERNAME_LENGTH) {
            errors.push(`Username deve avere almeno ${CONFIG.VALIDATION.MIN_USERNAME_LENGTH} caratteri`);
        }
        
        if (!SecurityUtils.validateUsername(sanitizedUsername)) {
            errors.push('Username può contenere solo lettere, numeri e underscore');
        }

        if (!password || password.length === 0) {
            errors.push('Password è obbligatoria');
        } else if (requirePasswordLength && password.length < CONFIG.VALIDATION.MIN_PASSWORD_LENGTH) {
            errors.push(`Password deve avere almeno ${CONFIG.VALIDATION.MIN_PASSWORD_LENGTH} caratteri`);
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

    static validateDate(dateString) {
        return SecurityUtils.isValidDateFormat(dateString);
    }
    
    static validateColorIndex(colorIndex) {
        const index = parseInt(colorIndex);
        return !isNaN(index) && index >= 1 && index <= CONFIG.EMPLOYEE_COLORS_COUNT;
    }
}