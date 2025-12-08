// ============================================================================
// AGENDAR.JS - BOOKING LOGIC
// ============================================================================

// Estado de la aplicación
const state = {
    currentStep: 1,
    selectedService: null,
    selectedDate: null,
    selectedTime: null,
    currentMonth: new Date(),
    availableSlots: [],
    services: [],
    client: null
};

// ============================================================================
// SERVICIOS ESTÁTICOS (12 servicios completos)
// ============================================================================
const SERVICIOS_BRACOS = [
    {
        id: 1,
        name: "Corte de cabello para CABALLERO",
        description: "Duración aproximada 60 minutos\n• Lavado de cabello\n• Visagismo\n• Corte de cabello\n• Estilizado de peinado\n• Productos Premium",
        duration_minutes: 60,
        price: 300,
        category_id: 1,
        image_url: "assets/corte_caballero.jpeg"
    },
    {
        id: 2,
        name: "Corte de cabello NIÑO (hasta 11 años)",
        description: "Duración aproximada 60 minutos\n• Lavado de cabello\n• Visagismo\n• Corte de cabello\n• Estilizado de peinado\n• Productos Premium",
        duration_minutes: 60,
        price: 220,
        category_id: 1,
        image_url: "assets/corte_nino.jpeg"
    },
    {
        id: 3,
        name: "Ritual Tradicional de Barba",
        description: "Duración 60 minutos\n• Visagismo\n• Rasurado completo o arreglo de barba y bigote\n• Toallas calientes\n• Toallas frías\n• Masaje facial y craneal\n• Aromaterapia\n• Productos Premium",
        duration_minutes: 60,
        price: 300,
        category_id: 2,
        image_url: "assets/ritual_barba.jpeg"
    },
    {
        id: 4,
        name: "DÚO",
        description: "Duración 120min (2horas)\n• Visagismo\n• Corte de cabello\n• Ritual tradicional para rasurado o arreglo de barba y bigote",
        duration_minutes: 120,
        price: 550,
        category_id: 6,
        image_url: "assets/duo.png"
    },
    {
        id: 5,
        name: "INSTALACIÓN DE PRÓTESIS CAPILAR",
        description: "Las prótesis o reemplazo capilar representan una solución innovadora y efectiva para aquellos que experimentan pérdida de cabello.\n\n• Mejora instantánea en la apariencia y confianza\n• Solución no quirúrgica y resultados naturales\n• Personalización total y fácil mantenimiento\n• No afecta el crecimiento del cabello natural\n• Durabilidad a largo plazo",
        duration_minutes: 180,
        price: 4800,
        category_id: 3,
        image_url: "assets/instalacio_protesis.jpeg"
    },
    {
        id: 6,
        name: "MANTENIMIENTO DE PRÓTESIS CAPILAR",
        description: "Limpieza profesional de prótesis capilar en uso para limpieza profunda, restauración e hidratación.\n\n• Retiro seguro y limpieza profesional\n• Ajuste de adhesivos y colocación segura\n• Hidratación de la pieza",
        duration_minutes: 120,
        price: 650,
        category_id: 3,
        image_url: "assets/mant_protesis.jpeg"
    },
    {
        id: 7,
        name: "TERAPIA INTEGRAL CAPILAR (TIC)",
        description: "Braco’s NeoCapilar: Salud y prevención de la caída del cabello. Restaura, fortalece y estimula el crecimiento natural.\n\n• Ozonoterapia: Purifica y oxigena\n• Alta Frecuencia: Estimula irrigación sanguínea\n• Fotobiomodulación (Luz LED): Regeneración celular\n• Productos dermatológicos premium\n• Diagnóstico inicial requerido",
        duration_minutes: 60,
        price: 550,
        category_id: 3,
        image_url: "assets/TIC.jpeg"
    },
    {
        id: 8,
        name: "MASCARILLA PLASTIFICADA NEGRA",
        description: "Recomendada para obtener un rostro limpio de puntos negros y espinillas.\n\nDuración 60 minutos\n• Limpieza de rostro\n• Aplicación y retiro de mascarilla\n• Aplicación de productos Premium\n• Masaje facial",
        duration_minutes: 60,
        price: 300,
        category_id: 4,
        image_url: "assets/mascarilla_negra.jpeg"
    },
    {
        id: 9,
        name: "MASCARILLA DE ARCILLA",
        description: "Después de la aplicación de la mascarilla plástica recomendamos como mantenimiento la mascarilla de arcilla que exfolia el rostro de una manera más amigable y sutil pero sin perder efectividad en el proceso.\n\nDuración 60 minutos\n• Limpieza de rostro\n• Aplicación y retiro de mascarilla\n• Aplicación de productos Premium\n• Masaje facial",
        duration_minutes: 60,
        price: 300,
        category_id: 4,
        image_url: "assets/arcilla.jpeg"
    },
    {
        id: 10,
        name: "MANICURA CABALLERO",
        description: "Duración aproximada 60 minutos\n• Retiro de cutícula\n• Exfoliación de manos\n• Recorte de uñas\n• Arreglo de uñas\n• Humectación de manos\n• Masaje de manos y dedos",
        duration_minutes: 60,
        price: 300,
        category_id: 5,
        image_url: "assets/manicura_caballero.jpeg"
    },
    {
        id: 11,
        name: "PEDICURA CABALLERO",
        description: "Duración aproximada 60 minutos\n• Retiro de cutícula\n• Exfoliación de pies\n• Recorte y limado de uñas\n• Limado de callosidad\n• Humectación de pies\n• Masaje de pies",
        duration_minutes: 60,
        price: 300,
        category_id: 5,
        image_url: "assets/pedicura.jpeg"
    },
    {
        id: 12,
        name: "PAQUETE NUPCIAL D'Lux",
        description: "Eleva tu imagen con un ritual completo de elegancia masculina. Ese es el mejor día de tu vida…Y la mejor versión de ti.\n\nDuración 240 minutos (4 horas)\n• Visagismo\n• Corte de cabello\n• Ritual de barba o rasurado clásico\n• Mascarilla de carbón activado o mascarilla de arcilla natural\n• Manicura SPA",
        duration_minutes: 240,
        price: 1200,
        category_id: 6,
        image_url: "assets/pqte_dlux.jpeg"
    }
];

// Elementos DOM
const elements = {
    steps: document.querySelectorAll('.booking-step'),
    stepIndicators: document.querySelectorAll('.step'),
    servicesGrid: document.getElementById('services-grid'),
    calendarDays: document.getElementById('calendar-days'),
    currentMonth: document.getElementById('current-month'),
    timeSlots: document.getElementById('time-slots'),
    selectedDateLabel: document.getElementById('selected-date-label'),
    btnToStep3: document.getElementById('btn-to-step3'),
    bookingForm: document.getElementById('booking-form')
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadServices();
    setupEventListeners();
    renderCalendar();

    // Check if service is pre-selected from URL
    const serviceId = getUrlParameter('service');
    if (serviceId) {
        setTimeout(() => {
            const card = document.querySelector(`[data-id="${serviceId}"]`);
            if (card) {
                card.click();
            }
        }, 500);
    }
});

// ============================================================================
// CARGAR SERVICIOS
// ============================================================================
async function loadServices() {
    // Usar servicios estáticos directamente
    state.services = SERVICIOS_BRACOS;
    renderServices(state.services);
}

// ============================================================================
// RENDERIZAR SERVICIOS
// ============================================================================
function renderServices(services) {
    elements.servicesGrid.innerHTML = services.map(service => {
        const descriptionLines = service.description ? service.description.split('\n').filter(line => line.trim()) : [];
        const firstLine = descriptionLines[0] || '';

        return `
        <div class="service-select-card" 
             data-id="${service.id}" 
             data-category="${service.category_id}">
            <div class="service-card-image">
                <img src="${service.image_url}" alt="${service.name}" loading="lazy">
            </div>
            <div class="service-card-content">
                <h3 class="service-name">${service.name}</h3>
                <p class="service-brief">${firstLine}</p>
                <div class="service-meta">
                    <span class="service-duration">⏱ ${service.duration_minutes} min</span>
                    <span class="service-price">$${service.price}</span>
                </div>
            </div>
        </div>
    `;
    }).join('');

    // Event listeners para selección
    document.querySelectorAll('.service-select-card').forEach(card => {
        card.addEventListener('click', () => selectService(card));
    });
}

// ============================================================================
// FILTRAR SERVICIOS POR CATEGORÍA
// ============================================================================
function filterServices(category) {
    const filtered = category === 'all'
        ? state.services
        : state.services.filter(s => s.category_id == category);

    renderServices(filtered);
}

// ============================================================================
// SELECCIONAR SERVICIO
// ============================================================================
function selectService(card) {
    document.querySelectorAll('.service-select-card').forEach(c =>
        c.classList.remove('selected')
    );
    card.classList.add('selected');

    const serviceId = parseInt(card.dataset.id);
    state.selectedService = state.services.find(s => s.id === serviceId);

    // Ir al paso 2
    setTimeout(() => goToStep(2), 300);
}

// ============================================================================
// NAVEGACIÓN ENTRE PASOS
// ============================================================================
function goToStep(step) {
    console.log('goToStep called with step:', step);
    state.currentStep = step;

    // Actualizar indicadores
    elements.stepIndicators.forEach((indicator, index) => {
        indicator.classList.remove('active', 'completed');
        if (index + 1 < step) indicator.classList.add('completed');
        if (index + 1 === step) indicator.classList.add('active');
    });

    // Mostrar/ocultar secciones (solo los pasos numerados, no el success)
    const stepSections = ['step-1', 'step-2', 'step-3'];
    stepSections.forEach((stepId, index) => {
        const section = document.getElementById(stepId);
        if (section) {
            section.classList.toggle('hidden', index + 1 !== step);
        }
    });

    // Asegurar que el paso success esté oculto durante la navegación normal
    const successStep = document.getElementById('step-success');
    if (successStep) {
        successStep.classList.add('hidden');
    }

    // Si es paso 2 y hay fecha seleccionada, cargar disponibilidad
    if (step === 2 && state.selectedDate) {
        loadAvailability(state.selectedDate);
    }

    // Si es paso 3, actualizar resumen
    if (step === 3) {
        updateSummary();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
// Exponer función goToStep globalmente para uso en HTML onclick
window.goToStep = goToStep;

// ============================================================================
// RENDERIZAR CALENDARIO
// ============================================================================
function renderCalendar() {
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();

    elements.currentMonth.textContent = new Intl.DateTimeFormat('es-MX', {
        month: 'long',
        year: 'numeric'
    }).format(state.currentMonth);

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = '';

    // Días del mes anterior
    for (let i = 0; i < startPadding; i++) {
        html += '<div class="calendar-day other-month"></div>';
    }

    // Días del mes actual
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const isPast = date < today;
        const isToday = date.getTime() === today.getTime();
        const isSunday = date.getDay() === 0;
        const isDisabled = isPast || isSunday;
        const isSelected = state.selectedDate &&
            date.toDateString() === state.selectedDate.toDateString();

        let classes = 'calendar-day';
        if (isDisabled) classes += ' disabled';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';

        html += `<div class="${classes}" data-date="${date.toISOString()}">${day}</div>`;
    }

    elements.calendarDays.innerHTML = html;

    // Event listeners
    document.querySelectorAll('.calendar-day:not(.disabled):not(.other-month)').forEach(day => {
        day.addEventListener('click', () => selectDate(day));
    });
}

// ============================================================================
// SELECCIONAR FECHA
// ============================================================================
async function selectDate(dayElement) {
    document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
    dayElement.classList.add('selected');

    state.selectedDate = new Date(dayElement.dataset.date);
    state.selectedTime = null;
    elements.btnToStep3.disabled = true;

    elements.selectedDateLabel.textContent = new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }).format(state.selectedDate);

    await loadAvailability(state.selectedDate);
}

// ============================================================================
// CARGAR DISPONIBILIDAD
// ============================================================================
async function loadAvailability(date) {
    const dateStr = date.toISOString().split('T')[0];

    showLoading(elements.timeSlots);

    try {
        state.availableSlots = await API.getAvailableSlots(state.selectedService.id, dateStr);
    } catch (error) {
        console.error('Error loading availability:', error);
        // Generar slots de ejemplo
        state.availableSlots = MOCK_DATA.generateTimeSlots();
    }

    renderTimeSlots();
}

// ============================================================================
// RENDERIZAR SLOTS DE TIEMPO
// ============================================================================
function renderTimeSlots() {
    if (state.availableSlots.length === 0) {
        elements.timeSlots.innerHTML = '<p class="no-selection">No hay horarios disponibles para esta fecha</p>';
        return;
    }

    elements.timeSlots.innerHTML = state.availableSlots.map(slot => `
        <button class="time-slot ${slot.available ? '' : 'disabled'}" 
                data-time="${slot.time}"
                ${!slot.available ? 'disabled' : ''}>
            ${slot.time}
        </button>
    `).join('');

    document.querySelectorAll('.time-slot:not(.disabled)').forEach(slot => {
        slot.addEventListener('click', () => selectTime(slot));
    });
}

// ============================================================================
// SELECCIONAR HORA
// ============================================================================
function selectTime(slotElement) {
    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
    slotElement.classList.add('selected');

    state.selectedTime = slotElement.dataset.time;
    elements.btnToStep3.disabled = false;
}

// ============================================================================
// ACTUALIZAR RESUMEN
// ============================================================================
function updateSummary() {
    document.getElementById('summary-service').textContent = state.selectedService.name;
    document.getElementById('summary-date').textContent = new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(state.selectedDate);
    document.getElementById('summary-time').textContent = state.selectedTime;
    document.getElementById('summary-duration').textContent = `${state.selectedService.duration_minutes} minutos`;
    document.getElementById('summary-price').textContent = `$${state.selectedService.price}`;
}

// ============================================================================
// CONFIGURAR EVENT LISTENERS
// ============================================================================
function setupEventListeners() {
    // Navegación del calendario
    document.getElementById('prev-month').addEventListener('click', () => {
        state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
        renderCalendar();
    });

    // Botones "Atrás" - usando event listeners en lugar de onclick inline (bloqueado por CSP)
    const btnBackToStep1 = document.getElementById('btn-back-to-step1');
    if (btnBackToStep1) {
        btnBackToStep1.addEventListener('click', () => goToStep(1));
    }

    const btnBackToStep2 = document.getElementById('btn-back-to-step2');
    if (btnBackToStep2) {
        btnBackToStep2.addEventListener('click', () => goToStep(2));
    }

    // Botón continuar a paso 3
    elements.btnToStep3.addEventListener('click', () => goToStep(3));

    // Tabs de categorías
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const category = tab.dataset.category;
            filterServices(category);
        });
    });

    // Formulario de confirmación
    elements.bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitBooking();
    });

    // Formatear teléfono mientras se escribe
    const phoneInput = document.getElementById('client-phone');
    phoneInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });
}

// ============================================================================
// ENVIAR RESERVACIÓN
// ============================================================================
async function submitBooking() {
    const btnConfirm = document.getElementById('btn-confirm');
    const originalText = btnConfirm.textContent;

    btnConfirm.disabled = true;
    btnConfirm.textContent = 'Procesando...';

    const formData = new FormData(elements.bookingForm);
    const phone = formData.get('phone').replace(/\D/g, '');

    try {
        // Verificar si el cliente existe
        let client = await API.getClientByPhone(phone);

        // Si no existe (es nuevo), mostrar modal de depósito
        if (!client) {
            btnConfirm.disabled = false;
            btnConfirm.textContent = originalText;

            // Guardar datos temporales para el mensaje de WhatsApp
            state.tempClient = {
                name: formData.get('name'),
                phone: phone,
                notes: formData.get('notes')
            };

            showDepositModal();
            return;
        }

        /* 
        // Lógica anterior de creación automática
        if (!client) {
            client = await API.createClient({
                name: formData.get('name'),
                phone: phone
            });
        }
        */

        // Crear la cita
        const bookingData = {
            client_id: client.id,
            service_id: state.selectedService.id,
            appointment_date: state.selectedDate.toISOString().split('T')[0],
            start_time: state.selectedTime,
            notes: formData.get('notes') || null
        };

        const result = await API.createAppointment(bookingData);

        // Mostrar pantalla de éxito
        showSuccess(result);

    } catch (error) {
        console.error('Error:', error);
        showToast(error.message || 'Error al agendar la cita', 'error');
        btnConfirm.disabled = false;
        btnConfirm.textContent = originalText;
    }
}

// ============================================================================
// MOSTRAR PANTALLA DE ÉXITO
// ============================================================================
function showSuccess(appointmentData) {
    // Ocultar todos los pasos
    elements.steps.forEach(s => s.classList.add('hidden'));

    // Mostrar pantalla de éxito
    const successStep = document.getElementById('step-success');
    successStep.classList.remove('hidden');

    // Llenar datos
    document.getElementById('success-code').textContent = appointmentData.checkout_code || '----';
    document.getElementById('success-service').textContent = state.selectedService.name;
    document.getElementById('success-datetime').textContent =
        `${formatDate(state.selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })} a las ${state.selectedTime}`;
    document.getElementById('success-price').textContent = `$${state.selectedService.price}`;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// DEPOSIT MODAL LOGIC
// ============================================================================

function showDepositModal() {
    const modal = document.getElementById('deposit-modal');
    modal.classList.remove('hidden');
    // Ensure modal is displayed
    setTimeout(() => modal.classList.add('visible'), 10);
}

function closeDepositModal() {
    const modal = document.getElementById('deposit-modal');
    modal.classList.remove('visible');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function sendDepositWhatsApp() {
    if (!state.tempClient) return;

    const name = state.tempClient.name;
    const dateFormatted = formatDate(state.selectedDate, { weekday: 'long', day: 'numeric', month: 'long' });
    const time = state.selectedTime;
    const serviceName = state.selectedService.name;

    const message = `Hola, soy *${name}*.%0AQuiero agendar una cita para:%0A🗓 *${dateFormatted}* a las *${time}*%0A💇‍♂️ *${serviceName}*%0A%0ASoy cliente nuevo, anexo mi depósito de $100 para confirmar mi asistencia.`;

    const whatsappUrl = `https://wa.me/525573432027?text=${message}`;
    window.open(whatsappUrl, '_blank');

    closeDepositModal();
}

// Make functions global
window.showDepositModal = showDepositModal;
window.closeDepositModal = closeDepositModal;
window.sendDepositWhatsApp = sendDepositWhatsApp;
