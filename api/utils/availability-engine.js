// ============================================================================
// BRACO'S BARBERÍA - MOTOR DE DISPONIBILIDAD INTELIGENTE
// ============================================================================

// ============================
// UTILIDADES DE TIEMPO
// ============================

/**
 * Convierte string "HH:MM" a minutos desde medianoche
 * @param {string} timeStr - Ej: "10:30"
 * @returns {number} - Ej: 630
 */
export function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
}

/**
 * Convierte minutos a string "HH:MM"
 * @param {number} minutes - Ej: 630
 * @returns {string} - Ej: "10:30"
 */
export function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Formatea minutos a "10:30 AM"
 */
export function formatTimeDisplay(minutes) {
    const hours24 = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const hours12 = hours24 > 12 ? hours24 - 12 : hours24 === 0 ? 12 : hours24;
    const period = hours24 >= 12 ? 'PM' : 'AM';
    return `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;
}

/**
 * Verifica si dos rangos de tiempo se superponen
 * CLAVE: start1 < end2 && end1 > start2
 */
export function timesOverlap(start1, end1, start2, end2) {
    return start1 < end2 && end1 > start2;
}

// ============================
// ALGORITMO PRINCIPAL
// ============================

/**
 * Genera slots disponibles considerando duración del servicio
 * 
 * @param {Object} params
 * @param {number} params.serviceDuration - Duración en minutos
 * @param {Object} params.businessHours - {open_time, close_time, break_start, break_end, is_open}
 * @param {Array} params.existingAppointments - [{start_time, end_time}, ...]
 * @param {Array} params.blockedSlots - [{start_time, end_time}, ...] horarios bloqueados
 * @param {number} params.slotInterval - Intervalo entre slots (default: 30)
 * @returns {Array} - [{time, timeDisplay, endTime, endTimeDisplay, available}, ...]
 */
export function generateAvailableSlots({
    serviceDuration,
    businessHours,
    existingAppointments = [],
    blockedSlots = [],
    slotInterval = 30
}) {
    const slots = [];

    // Si el día está cerrado, retornar vacío
    if (!businessHours || !businessHours.is_open) {
        return slots;
    }

    // Convertir horarios a minutos
    const openTime = timeToMinutes(businessHours.open_time);
    const closeTime = timeToMinutes(businessHours.close_time);
    const breakStart = timeToMinutes(businessHours.break_start);
    const breakEnd = timeToMinutes(businessHours.break_end);

    // Convertir citas existentes a minutos
    const appointments = existingAppointments.map(apt => ({
        start: timeToMinutes(apt.start_time),
        end: timeToMinutes(apt.end_time)
    }));

    // Convertir horarios bloqueados a minutos
    const blocked = blockedSlots.map(slot => ({
        start: timeToMinutes(slot.start_time),
        end: timeToMinutes(slot.end_time)
    }));

    // Iterar desde apertura hasta que ya no quepa el servicio
    let currentSlot = openTime;

    while (currentSlot + serviceDuration <= closeTime) {
        const slotEnd = currentSlot + serviceDuration;

        // Verificar disponibilidad (incluye horarios bloqueados)
        const isAvailable = checkSlotAvailability(
            currentSlot,
            slotEnd,
            breakStart,
            breakEnd,
            appointments,
            blocked
        );

        slots.push({
            time: minutesToTime(currentSlot),
            timeDisplay: formatTimeDisplay(currentSlot),
            endTime: minutesToTime(slotEnd),
            endTimeDisplay: formatTimeDisplay(slotEnd),
            available: isAvailable
        });

        currentSlot += slotInterval;
    }

    return slots;
}

/**
 * Verifica si un slot específico está disponible
 */
export function checkSlotAvailability(slotStart, slotEnd, breakStart, breakEnd, appointments, blockedSlots = []) {

    // 1. Verificar si choca con hora de descanso
    if (breakStart !== null && breakEnd !== null) {
        if (timesOverlap(slotStart, slotEnd, breakStart, breakEnd)) {
            return false;
        }
    }

    // 2. Verificar si choca con alguna cita existente
    for (const apt of appointments) {
        if (timesOverlap(slotStart, slotEnd, apt.start, apt.end)) {
            return false;
        }
    }

    // 3. Verificar si choca con algún horario bloqueado
    for (const blocked of blockedSlots) {
        if (timesOverlap(slotStart, slotEnd, blocked.start, blocked.end)) {
            return false;
        }
    }

    return true;
}

export default {
    timeToMinutes,
    minutesToTime,
    formatTimeDisplay,
    timesOverlap,
    generateAvailableSlots,
    checkSlotAvailability
};
