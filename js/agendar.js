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

// Helper para formatear fecha en formato YYYY-MM-DD sin timezone issues
function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

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
        id: 11,
        name: "DÚO",
        description: "Duración 120min (2horas)\n• Visagismo\n• Corte de cabello\n• Ritual tradicional para rasurado o arreglo de barba y bigote",
        duration_minutes: 120,
        price: 550,
        category_id: 6,
        image_url: "assets/duo.png"
    },
    {
        id: 4,
        name: "INSTALACIÓN DE PRÓTESIS CAPILAR",
        description: "Las prótesis o reemplazo capilar representan una solución innovadora y efectiva para aquellos que experimentan pérdida de cabello.\n\n• Mejora instantánea en la apariencia y confianza\n• Solución no quirúrgica y resultados naturales\n• Personalización total y fácil mantenimiento\n• No afecta el crecimiento del cabello natural\n• Durabilidad a largo plazo",
        duration_minutes: 180,
        price: 4800,
        category_id: 3,
        image_url: "assets/instalacio_protesis.jpeg"
    },
    {
        id: 5,
        name: "MANTENIMIENTO DE PRÓTESIS CAPILAR",
        description: "Limpieza profesional de prótesis capilar en uso para limpieza profunda, restauración e hidratación.\n\n• Retiro seguro y limpieza profesional\n• Ajuste de adhesivos y colocación segura\n• Hidratación de la pieza",
        duration_minutes: 120,
        price: 650,
        category_id: 3,
        image_url: "assets/mant_protesis.jpeg"
    },
    {
        id: 6,
        name: "TERAPIA INTEGRAL CAPILAR (TIC)",
        description: "Braco’s NeoCapilar: Salud y prevención de la caída del cabello. Restaura, fortalece y estimula el crecimiento natural.\n\n• Ozonoterapia: Purifica y oxigena\n• Alta Frecuencia: Estimula irrigación sanguínea\n• Fotobiomodulación (Luz LED): Regeneración celular\n• Productos dermatológicos premium\n• Diagnóstico inicial requerido",
        duration_minutes: 60,
        price: 550,
        category_id: 3,
        image_url: "assets/TIC.jpeg"
    },
    {
        id: 7,
        name: "MASCARILLA PLASTIFICADA NEGRA",
        description: "Recomendada para obtener un rostro limpio de puntos negros y espinillas.\n\nDuración 60 minutos\n• Limpieza de rostro\n• Aplicación y retiro de mascarilla\n• Aplicación de productos Premium\n• Masaje facial",
        duration_minutes: 60,
        price: 300,
        category_id: 4,
        image_url: "assets/mascarilla_negra.jpeg"
    },
    {
        id: 8,
        name: "MASCARILLA DE ARCILLA",
        description: "Después de la aplicación de la mascarilla plástica recomendamos como mantenimiento la mascarilla de arcilla que exfolia el rostro de una manera más amigable y sutil pero sin perder efectividad en el proceso.\n\nDuración 60 minutos\n• Limpieza de rostro\n• Aplicación y retiro de mascarilla\n• Aplicación de productos Premium\n• Masaje facial",
        duration_minutes: 60,
        price: 300,
        category_id: 4,
        image_url: "assets/arcilla.jpeg"
    },
    {
        id: 9,
        name: "MANICURA CABALLERO",
        description: "Duración aproximada 60 minutos\n• Retiro de cutícula\n• Exfoliación de manos\n• Recorte de uñas\n• Arreglo de uñas\n• Humectación de manos\n• Masaje de manos y dedos",
        duration_minutes: 60,
        price: 300,
        category_id: 5,
        image_url: "assets/manicura_caballero.jpeg"
    },
    {
        id: 10,
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
    try {
        // Intentar cargar servicios desde la API
        const apiServices = await API.getServices();
        if (apiServices && apiServices.length > 0) {
            // Mapear servicios de la API al formato esperado
            state.services = apiServices.map(s => ({
                id: s.id,
                name: s.name,
                description: s.description || '',
                duration_minutes: s.duration_minutes,
                price: s.price,
                category_id: s.category_id,
                image_url: s.image_url || getServiceImage(s.id, s.name)  // Use DB image or fallback
            }));
            console.log('Servicios cargados desde API:', state.services);
        } else {
            // Fallback a servicios estáticos
            state.services = SERVICIOS_BRACOS;
            console.log('Usando servicios estáticos');
        }
    } catch (error) {
        console.error('Error cargando servicios, usando fallback:', error);
        state.services = SERVICIOS_BRACOS;
    }
    renderServices(state.services);
}

// Helper para obtener imagen del servicio
function getServiceImage(id, name) {
    const imageMap = {
        'corte de cabello para caballero': 'assets/corte_caballero.jpeg',
        'corte de cabello niño': 'assets/corte_nino.jpeg',
        'ritual tradicional de barba': 'assets/ritual_barba.jpeg',
        'dúo': 'assets/duo.png',
        'instalación de prótesis capilar': 'assets/instalacio_protesis.jpeg',
        'mantenimiento de prótesis capilar': 'assets/mant_protesis.jpeg',
        'terapia integral capilar': 'assets/TIC.jpeg',
        'mascarilla plastificada negra': 'assets/mascarilla_negra.jpeg',
        'mascarilla de arcilla': 'assets/arcilla.jpeg',
        'manicura caballero': 'assets/manicura_caballero.jpeg',
        'pedicura caballero': 'assets/pedicura.jpeg',
        'paquete nupcial': 'assets/pqte_dlux.jpeg'
    };

    const nameLower = name.toLowerCase();
    for (const [key, value] of Object.entries(imageMap)) {
        if (nameLower.includes(key)) {
            return value;
        }
    }
    return 'assets/logo.png';
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
    // Clear hint message
    const hint = document.getElementById('time-hint');
    if (hint) hint.textContent = '';
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
        // Verificar si el cliente existe y su tipo
        let client = await API.getClientByPhone(phone);

        // Determinar si requiere depósito:
        // 1. Si NO existe (es brand new)
        // 2. Si existe PERO es tipo "Nuevo" (ID 1)
        const isBrandNew = !client;
        const isExistingNew = client && client.client_type_id === 1; // 1 = Nuevo (según update_client_types.sql)

        const requiresDeposit = isBrandNew || isExistingNew;

        // Si requiere depósito, mostrar modal
        if (requiresDeposit) {
            btnConfirm.disabled = false;
            btnConfirm.textContent = originalText;

            // Datos temporales para el modal
            const emailInput = document.getElementById('client-email');
            const email = emailInput ? emailInput.value : null;

            // Usar fecha local sin timezone issues
            const localDate = formatLocalDate(state.selectedDate);

            const data = {
                name: isBrandNew ? formData.get('name') : client.name, // Usar nombre de form o de DB
                phone: phone,
                email: email,
                notes: formData.get('notes'),
                appointment_date: localDate
            };

            state.tempClient = {
                name: data.name,
                phone: data.phone,
                service: state.selectedService.name,
                date: data.appointment_date,
                displayDate: new Date(`${data.appointment_date}T00:00:00`).toLocaleDateString('es-MX', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                }),
                time: state.selectedTime,
                start_time: state.selectedTime
            };

            try {
                // Si es nuevo de verdad, crearlo ahora
                if (isBrandNew) {
                    const newClient = await API.createClient({
                        name: data.name,
                        phone: phone,
                        email: data.email || null
                    });
                    if (newClient && newClient.id) {
                        client = newClient; // Asignar para usar abajo
                    } else {
                        throw new Error('Error al registrar cliente.');
                    }
                }

                const appointmentData = {
                    client_id: client.id,
                    service_id: state.selectedService.id,
                    appointment_date: localDate,
                    start_time: state.selectedTime,
                    notes: (data.notes || '') + ' - Pendiente de Depósito $100',
                    status: 'pending',
                    deposit_required: true,
                    deposit_amount: 100,
                    email: data.email || null
                };

                const appointment = await API.createAppointment(appointmentData);

                if (appointment && appointment.id) {
                    state.clientCode = client.code;
                    showDepositModal(state.tempClient);
                } else {
                    throw new Error('No se pudo pre-agendar la cita.');
                }

            } catch (error) {
                console.error('Error flow depósito:', error);
                showToast('Error: ' + error.message, 'error');
                btnConfirm.disabled = false;
                btnConfirm.textContent = originalText;
            }
            return; // Detener flujo normal
        }

        // =====================================================
        // RECURRING CLIENT FLOW - Show Payment Options Modal
        // =====================================================
        btnConfirm.disabled = false;
        btnConfirm.textContent = originalText;

        // Store client & form data for later use
        state.recurringClient = client;
        state.recurringFormData = {
            notes: formData.get('notes') || ''
        };

        // Check for memberships
        let memberships = [];
        try {
            memberships = await API.getClientMemberships(client.id);
            // Filter to only active with remaining services
            memberships = memberships.filter(m => m.remaining_services > 0);
        } catch (e) {
            console.log('No memberships or error fetching:', e);
        }

        state.clientMemberships = memberships;

        // Show payment options modal
        showPaymentOptionsModal(client, memberships);
        return;

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

    // Populate appointment summary
    if (state.tempClient) {
        const serviceEl = document.getElementById('deposit-service');
        const dateEl = document.getElementById('deposit-date');
        const timeEl = document.getElementById('deposit-time');

        if (serviceEl) serviceEl.textContent = state.selectedService?.name || '-';
        if (dateEl) dateEl.textContent = formatDate(state.selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (timeEl) timeEl.textContent = state.selectedTime || '-';
    }

    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('visible'), 10);
}

function closeDepositModal() {
    const modal = document.getElementById('deposit-modal');
    modal.classList.remove('visible');
    setTimeout(() => {
        modal.classList.add('hidden');
        // Mostrar pantalla de éxito con info de depósito pendiente
        showSuccessWithDepositInfo();
    }, 300);
}

function showSuccessWithDepositInfo() {
    // Ocultar todos los pasos
    elements.steps.forEach(s => s.classList.add('hidden'));

    // Mostrar pantalla de éxito
    const successStep = document.getElementById('step-success');
    successStep.classList.remove('hidden');

    // Llenar datos
    document.getElementById('success-code').textContent = '----';
    document.getElementById('success-service').textContent = state.selectedService.name;
    document.getElementById('success-datetime').textContent =
        `${formatDate(state.selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })} a las ${state.selectedTime}`;
    document.getElementById('success-price').textContent = `$${state.selectedService.price}`;

    // Cambiar título de éxito
    const successTitle = document.querySelector('.success-title');
    if (successTitle) {
        successTitle.textContent = '¡Cita Pre-Agendada!';
        successTitle.style.color = '#FFC107';
    }

    const successMessage = document.querySelector('.success-message');
    if (successMessage) {
        successMessage.innerHTML = 'Tu cita requiere un <strong>depósito de $100 MXN</strong> para confirmarse';
    }

    // Agregar aviso de depósito pendiente con botón de WhatsApp
    const successNotice = document.querySelector('.success-notice');
    if (successNotice) {
        const clientName = state.tempClient?.name || 'Cliente';
        const dateFormatted = formatDate(state.selectedDate, { weekday: 'long', day: 'numeric', month: 'long' });
        const time = state.selectedTime;
        const serviceName = state.selectedService.name;
        const message = `Hola, soy *${clientName}*.%0AQuiero agendar una cita para:%0A🗓 *${dateFormatted}* a las *${time}*%0A💇‍♂️ *${serviceName}*%0A%0ASoy cliente nuevo, anexo mi depósito de $100 para confirmar mi asistencia.`;
        const whatsappUrl = `https://wa.me/525573432027?text=${message}`;

        successNotice.innerHTML = `
            <div style="background: linear-gradient(135deg, rgba(255, 193, 7, 0.15), rgba(255, 193, 7, 0.05)); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <p style="color: #FFC107; margin-bottom: 1rem; font-size: 1.1rem;">
                    <i class="fas fa-exclamation-triangle"></i> <strong>DEPÓSITO REQUERIDO</strong>
                </p>
                <p style="margin-bottom: 1rem;">Como eres cliente nuevo, necesitamos un depósito de <strong>$100 MXN</strong> para confirmar tu cita. Este monto se descuenta del total.</p>

                <p style="font-weight: 600; margin-bottom: 0.75rem;"><i class="fas fa-university"></i> Datos para Transferencia:</p>
                <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 4px; cursor: pointer;" onclick="copyToClipboard('638180000176357788')">
                        <span><strong>NU México:</strong> <code style="color: var(--gold);">638180000176357788</code></span>
                        <i class="fas fa-copy" style="opacity: 0.5;"></i>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 4px; cursor: pointer;" onclick="copyToClipboard('722969010620447083')">
                        <span><strong>Mercado Pago:</strong> <code style="color: var(--gold);">722969010620447083</code></span>
                        <i class="fas fa-copy" style="opacity: 0.5;"></i>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 4px; cursor: pointer;" onclick="copyToClipboard('4217470097744441')">
                        <span><strong>OXXO:</strong> <code style="color: var(--gold);">4217 4700 9774 4441</code></span>
                        <i class="fas fa-copy" style="opacity: 0.5;"></i>
                    </div>
                    <p style="font-size: 0.8rem; opacity: 0.7; margin-top: 0.75rem; text-align: center;">Beneficiario: Miguel Alejandro Trujillo Revuelta</p>
                </div>

                <a href="${whatsappUrl}" target="_blank" style="display: block; background: #25D366; color: white; text-align: center; padding: 1rem; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 1rem;">
                    <i class="fab fa-whatsapp"></i> Enviar Comprobante por WhatsApp
                </a>
            </div>
        `;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // Después de enviar WhatsApp, mostrar pantalla de éxito
    closeDepositModal();
}

function toggleBankDetails() {
    const card = document.getElementById('bank-details-card');
    const btn = document.getElementById('btn-show-bank-details');

    if (card.classList.contains('hidden')) {
        card.classList.remove('hidden');
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-chevron-up"></i> Ocultar Datos';
    } else {
        card.classList.add('hidden');
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-credit-card"></i> Ver Datos Bancarios';
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('¡Copiado al portapapeles!', 'success');
    }).catch(err => {
        console.error('Error al copiar:', err);
    });
}

// Make functions global
window.showDepositModal = showDepositModal;
window.closeDepositModal = closeDepositModal;
window.sendDepositWhatsApp = sendDepositWhatsApp;
window.toggleBankDetails = toggleBankDetails;
window.copyToClipboard = copyToClipboard;

// ============================================================================
// PAYMENT OPTIONS MODAL (RECURRING CLIENTS)
// ============================================================================

function showPaymentOptionsModal(client, memberships) {
    const modal = document.getElementById('payment-options-modal');

    // Populate data
    document.getElementById('po-client-name').textContent = client.name.split(' ')[0]; // First name
    document.getElementById('po-service').textContent = state.selectedService?.name || '-';
    document.getElementById('po-date').textContent = formatDate(state.selectedDate, { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('po-time').textContent = state.selectedTime || '-';

    // Show membership option if available
    const membershipOption = document.getElementById('po-membership-option');
    if (memberships && memberships.length > 0) {
        membershipOption.classList.remove('hidden');
        const m = memberships[0];
        document.getElementById('po-membership-name').textContent = `${m.membership_name} (${m.remaining_services} servicios)`;
        state.selectedMembership = m;
    } else {
        membershipOption.classList.add('hidden');
        state.selectedMembership = null;
    }

    // Hide bank details initially
    document.getElementById('po-bank-details').classList.add('hidden');

    // Show modal
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('visible'), 10);
}

function closePaymentOptionsModal() {
    const modal = document.getElementById('payment-options-modal');
    modal.classList.remove('visible');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

async function selectPaymentOption(option) {
    const client = state.recurringClient;
    const notes = state.recurringFormData?.notes || '';

    let appointmentNotes = notes;

    if (option === 'membership') {
        // Record intent to use membership
        const m = state.selectedMembership;
        appointmentNotes = `${notes} [INTENCIÓN: Usar membresía ${m.membership_name}]`.trim();
        await createRecurringAppointment(client, appointmentNotes);
        closePaymentOptionsModal();

    } else if (option === 'prepay') {
        // Show bank details section
        document.getElementById('po-bank-details').classList.remove('hidden');
        // Scroll to it
        document.getElementById('po-bank-details').scrollIntoView({ behavior: 'smooth' });

    } else if (option === 'skip') {
        // Just create appointment normally
        await createRecurringAppointment(client, appointmentNotes);
        closePaymentOptionsModal();
    }
}

async function confirmPrepayOption() {
    const client = state.recurringClient;
    const notes = state.recurringFormData?.notes || '';

    const appointmentNotes = `${notes} [PREPAGO: Cliente indicó que transferirá por adelantado]`.trim();
    // Enviar flag de pago completo
    const result = await createRecurringAppointmentWithResult(client, appointmentNotes, { is_full_payment: true });
    closePaymentOptionsModal();

    if (result) {
        // Mostrar pantalla de éxito con datos de pago
        showSuccessWithPaymentInfo(result, client);

        // Open WhatsApp for sending proof
        const message = `Hola, soy *${client.name}*.%0AHe agendado mi cita para el *${formatDate(state.selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}* a las *${state.selectedTime}*.%0A%0AAnexo mi comprobante de pago anticipado.`;
        const whatsappUrl = `https://wa.me/525573432027?text=${message}`;
        window.open(whatsappUrl, '_blank');
    }
}

// Versión que retorna el resultado para uso en confirmPrepayOption
async function createRecurringAppointmentWithResult(client, notes, extraData = {}) {
    try {
        const emailInput = document.getElementById('client-email');
        const email = emailInput ? emailInput.value : null;

        const bookingData = {
            client_id: client.id,
            service_id: state.selectedService.id,
            appointment_date: formatLocalDate(state.selectedDate),
            start_time: state.selectedTime,
            notes: notes || null,
            status: 'scheduled',
            email: email || null,
            ...extraData
        };

        const result = await API.createAppointment(bookingData);
        return result;
    } catch (error) {
        console.error('Error creating appointment:', error);
        showToast(error.message || 'Error al crear la cita', 'error');
        return null;
    }
}

// Pantalla de éxito con datos de pago (para clientes recurrentes que eligen "Pagar Ahora")
function showSuccessWithPaymentInfo(appointmentData, client) {
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

    // Cambiar título
    const successTitle = document.querySelector('.success-title');
    if (successTitle) {
        successTitle.textContent = '¡Cita Confirmada!';
        successTitle.style.color = '#4CAF50';
    }

    const successMessage = document.querySelector('.success-message');
    if (successMessage) {
        successMessage.innerHTML = 'Tu cita está confirmada. <strong>Envía tu comprobante de pago por WhatsApp.</strong>';
    }

    // Agregar datos bancarios en la pantalla de éxito
    const successNotice = document.querySelector('.success-notice');
    if (successNotice) {
        const clientName = client?.name || 'Cliente';
        const dateFormatted = formatDate(state.selectedDate, { weekday: 'long', day: 'numeric', month: 'long' });
        const time = state.selectedTime;
        const serviceName = state.selectedService.name;
        const price = state.selectedService.price;
        const message = `Hola, soy *${clientName}*.%0AHe agendado mi cita para:%0A🗓 *${dateFormatted}* a las *${time}*%0A💇‍♂️ *${serviceName}*%0A💰 *$${price}*%0A%0AAnexo mi comprobante de pago anticipado.`;
        const whatsappUrl = `https://wa.me/525573432027?text=${message}`;

        successNotice.innerHTML = `
            <div style="background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05)); border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <p style="color: #4CAF50; margin-bottom: 1rem; font-size: 1.1rem;">
                    <i class="fas fa-check-circle"></i> <strong>PAGO ANTICIPADO</strong>
                </p>
                <p style="margin-bottom: 1rem;">Has elegido pagar por adelantado. Transfiere el monto de <strong>$${price} MXN</strong> y envía tu comprobante.</p>

                <p style="font-weight: 600; margin-bottom: 0.75rem;"><i class="fas fa-university"></i> Datos para Transferencia:</p>
                <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 4px; cursor: pointer;" onclick="copyToClipboard('638180000176357788')">
                        <span><strong>NU México:</strong> <code style="color: var(--gold);">638180000176357788</code></span>
                        <i class="fas fa-copy" style="opacity: 0.5;"></i>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 4px; cursor: pointer;" onclick="copyToClipboard('722969010620447083')">
                        <span><strong>Mercado Pago:</strong> <code style="color: var(--gold);">722969010620447083</code></span>
                        <i class="fas fa-copy" style="opacity: 0.5;"></i>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 4px; cursor: pointer;" onclick="copyToClipboard('4217470097744441')">
                        <span><strong>OXXO:</strong> <code style="color: var(--gold);">4217 4700 9774 4441</code></span>
                        <i class="fas fa-copy" style="opacity: 0.5;"></i>
                    </div>
                    <p style="font-size: 0.8rem; opacity: 0.7; margin-top: 0.75rem; text-align: center;">Beneficiario: Miguel Alejandro Trujillo Revuelta</p>
                </div>

                <a href="${whatsappUrl}" target="_blank" style="display: block; background: #25D366; color: white; text-align: center; padding: 1rem; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 1rem;">
                    <i class="fab fa-whatsapp"></i> Enviar Comprobante por WhatsApp
                </a>
            </div>
        `;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function createRecurringAppointment(client, notes, extraData = {}) {
    try {
        // Get email from form if available
        const emailInput = document.getElementById('client-email');
        const email = emailInput ? emailInput.value : null;

        const bookingData = {
            client_id: client.id,
            service_id: state.selectedService.id,
            appointment_date: formatLocalDate(state.selectedDate),
            start_time: state.selectedTime,
            notes: notes || null,
            status: 'scheduled', // Recurring clients get scheduled directly
            email: email || null,
            ...extraData // Include optional flags (like is_full_payment)
        };

        const result = await API.createAppointment(bookingData);
        showSuccess(result);
    } catch (error) {
        console.error('Error creating appointment:', error);
        showToast(error.message || 'Error al crear la cita', 'error');
    }
}

// Cerrar modal y ver datos en pantalla (sin abrir WhatsApp automáticamente)
async function confirmPrepayLater() {
    const client = state.recurringClient;
    const notes = state.recurringFormData?.notes || '';

    const appointmentNotes = `${notes} [PREPAGO: Cliente indicó que transferirá por adelantado]`.trim();
    // Enviar flag de pago completo
    const result = await createRecurringAppointmentWithResult(client, appointmentNotes, { is_full_payment: true });
    closePaymentOptionsModal();

    if (result) {
        // Mostrar pantalla de éxito con datos de pago (sin abrir WhatsApp)
        showSuccessWithPaymentInfo(result, client);
    }
}

// Export payment options functions
window.showPaymentOptionsModal = showPaymentOptionsModal;
window.closePaymentOptionsModal = closePaymentOptionsModal;
window.selectPaymentOption = selectPaymentOption;
window.confirmPrepayOption = confirmPrepayOption;
window.confirmPrepayLater = confirmPrepayLater;
