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
    client: null,
    availableExtras: [],
    selectedExtras: []
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
    setupQuickLogin();
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
// QUICK LOGIN CON CÓDIGO DE 4 DÍGITOS
// ============================================================================
function setupQuickLogin() {
    const codeInput = document.getElementById('client-code-input');
    const btnLogin = document.getElementById('btn-quick-login');
    const btnLogout = document.getElementById('btn-logout-code');
    const hint = document.getElementById('quick-login-hint');

    if (!codeInput || !btnLogin) return;

    // Auto-format input (only numbers)
    codeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);

        // Auto-submit when 4 digits entered
        if (e.target.value.length === 4) {
            loginWithCode(e.target.value);
        }
    });

    // Submit on button click
    btnLogin.addEventListener('click', () => {
        if (codeInput.value.length === 4) {
            loginWithCode(codeInput.value);
        } else {
            hint.textContent = 'Ingresa un código de 4 dígitos';
            hint.classList.remove('success');
        }
    });

    // Submit on Enter
    codeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && codeInput.value.length === 4) {
            loginWithCode(codeInput.value);
        }
    });

    // Logout button
    if (btnLogout) {
        btnLogout.addEventListener('click', logoutQuickLogin);
    }
}

async function loginWithCode(code) {
    const hint = document.getElementById('quick-login-hint');
    const loginCard = document.querySelector('.quick-login-card');
    const welcomeCard = document.getElementById('quick-login-welcome');

    hint.textContent = 'Buscando...';
    hint.classList.remove('success');

    try {
        const response = await fetch(`${API.BASE_URL}/public/client/login/${code}`);
        const data = await response.json();

        if (data.success && data.client) {
            // Store logged in client
            state.loggedInClient = data.client;
            state.clientMemberships = data.memberships || [];

            // Show welcome message
            document.getElementById('welcome-client-name').textContent = data.client.name.split(' ')[0];
            loginCard.style.display = 'none';
            welcomeCard.classList.remove('hidden');

            // Pre-fill form if visible
            prefillClientForm(data.client);

            console.log('Client logged in:', data.client);

            // Check for pending appointments
            await checkAndShowPendingAppointment(data.client.id);
        } else {
            hint.textContent = data.error || 'Código no encontrado';
            hint.classList.remove('success');
        }
    } catch (error) {
        console.error('Login error:', error);
        hint.textContent = 'Error al buscar código';
        hint.classList.remove('success');
    }
}

function logoutQuickLogin() {
    const loginCard = document.querySelector('.quick-login-card');
    const welcomeCard = document.getElementById('quick-login-welcome');
    const codeInput = document.getElementById('client-code-input');
    const hint = document.getElementById('quick-login-hint');

    // Clear state
    state.loggedInClient = null;
    state.clientMemberships = [];
    state.pendingAppointment = null;

    // Reset UI
    loginCard.style.display = 'block';
    welcomeCard.classList.add('hidden');
    codeInput.value = '';
    hint.textContent = '';

    // Hide pending appointment section and show booking flow
    document.getElementById('pending-appointment-section')?.classList.add('hidden');
    document.querySelector('.booking-steps')?.classList.remove('hidden');
    document.getElementById('step-1')?.classList.remove('hidden');

    // Clear form
    clearClientForm();
}

function prefillClientForm(client) {
    const nameInput = document.getElementById('client-name');
    const phoneInput = document.getElementById('client-phone');
    const emailInput = document.getElementById('client-email');
    const birthdateInput = document.getElementById('client-birthdate');

    if (nameInput && client.name) {
        nameInput.value = client.name;
        nameInput.readOnly = true;
        nameInput.style.backgroundColor = 'rgba(196, 163, 90, 0.1)';
    }

    if (phoneInput && client.phone) {
        const countrySelect = document.getElementById('country-code');
        let localPhone = client.phone;

        // Intentar detectar el código de país del número guardado
        if (countrySelect) {
            const countryCodes = ['593', '502', '503', '504', '505', '506', '507', '52', '54', '55', '56', '57', '58', '64', '34', '33', '39', '44', '49', '1'];
            // Ordenar por longitud descendente para matchear primero los más largos
            countryCodes.sort((a, b) => b.length - a.length);

            for (const code of countryCodes) {
                if (client.phone.startsWith(code)) {
                    countrySelect.value = code;
                    localPhone = client.phone.substring(code.length);
                    break;
                }
            }
            countrySelect.disabled = true;
            countrySelect.style.backgroundColor = 'rgba(196, 163, 90, 0.1)';
        }

        phoneInput.value = localPhone;
        phoneInput.readOnly = true;
        phoneInput.style.backgroundColor = 'rgba(196, 163, 90, 0.1)';
    }

    if (emailInput && client.email) {
        emailInput.value = client.email;
    }

    if (birthdateInput && client.birthdate) {
        // Formatear fecha a YYYY-MM-DD para el input date
        const date = client.birthdate.split('T')[0];
        birthdateInput.value = date;
    }
}

function clearClientForm() {
    const nameInput = document.getElementById('client-name');
    const phoneInput = document.getElementById('client-phone');
    const emailInput = document.getElementById('client-email');

    if (nameInput) {
        nameInput.value = '';
        nameInput.readOnly = false;
        nameInput.style.backgroundColor = '';
    }

    if (phoneInput) {
        phoneInput.value = '';
        phoneInput.readOnly = false;
        phoneInput.style.backgroundColor = '';
    }

    // Reset country selector
    const countrySelect = document.getElementById('country-code');
    if (countrySelect) {
        countrySelect.value = '52'; // Default to Mexico
        countrySelect.disabled = false;
        countrySelect.style.backgroundColor = '';
    }

    if (emailInput) {
        emailInput.value = '';
    }
}

// ============================================================================
// CARGAR SERVICIOS
// ============================================================================
async function loadServices() {
    try {
        // Intentar cargar servicios desde la API
        // API.getServices() ahora devuelve directamente el array de servicios
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

    // Si es paso 3, actualizar resumen y cargar extras
    if (step === 3) {
        updateSummary();
        loadAndRenderExtras();
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
    updateTotalPrice();
}

// Actualizar precio total con extras
function updateTotalPrice() {
    const basePrice = parseFloat(state.selectedService.price);
    const extrasTotal = state.selectedExtras.reduce((sum, e) => sum + parseFloat(e.price), 0);
    const total = basePrice + extrasTotal;

    document.getElementById('summary-price').textContent = `$${total}`;

    // Mostrar desglose si hay extras
    const totalDiv = document.getElementById('extras-total');
    if (totalDiv) {
        if (state.selectedExtras.length > 0) {
            totalDiv.style.display = 'flex';
            document.getElementById('extras-total-price').textContent = `$${total}`;
        } else {
            totalDiv.style.display = 'none';
        }
    }
}

// ============================================================================
// EXTRAS (ADD-ONS)
// ============================================================================
async function loadAndRenderExtras() {
    const section = document.getElementById('extras-section');
    const grid = document.getElementById('extras-grid');

    if (!section || !grid) return;

    try {
        // Cargar extras desde API
        const response = await fetch(`${API.BASE_URL}/services/extras`);
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
            state.availableExtras = data.data;
            section.style.display = 'block';

            grid.innerHTML = state.availableExtras.map(extra => `
                <div class="extra-card" data-id="${extra.id}" onclick="toggleExtra(${extra.id})">
                    <div class="extra-checkbox">
                        <i class="fas fa-check"></i>
                    </div>
                    <div class="extra-info">
                        <div class="extra-name">${extra.name}</div>
                        <div class="extra-price">+$${parseFloat(extra.price).toFixed(0)}</div>
                    </div>
                </div>
            `).join('');

            // Restaurar selección si existe
            state.selectedExtras.forEach(e => {
                const card = grid.querySelector(`[data-id="${e.id}"]`);
                if (card) card.classList.add('selected');
            });
        } else {
            section.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading extras:', error);
        section.style.display = 'none';
    }
}

// Toggle selección de extra
function toggleExtra(extraId) {
    const extra = state.availableExtras.find(e => e.id === extraId);
    if (!extra) return;

    const card = document.querySelector(`.extra-card[data-id="${extraId}"]`);
    const index = state.selectedExtras.findIndex(e => e.id === extraId);

    if (index >= 0) {
        // Quitar
        state.selectedExtras.splice(index, 1);
        card?.classList.remove('selected');
    } else {
        // Agregar
        state.selectedExtras.push(extra);
        card?.classList.add('selected');
    }

    updateTotalPrice();
}

// Exponer funciones globalmente
window.toggleExtra = toggleExtra;

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

    // Formatear teléfono mientras se escribe (permitir hasta 15 dígitos para internacionales)
    const phoneInput = document.getElementById('client-phone');
    phoneInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 15);
    });

    // Verificar si el teléfono ya está registrado al salir del campo
    phoneInput.addEventListener('blur', async () => {
        // No verificar si ya está logueado con código o si el campo es readOnly
        if (state.loggedInClient || phoneInput.readOnly) return;

        const localPhone = phoneInput.value.replace(/\D/g, '');
        if (localPhone.length < 7) return; // No buscar si es muy corto

        const countryCode = document.getElementById('country-code')?.value || '52';
        const fullPhone = countryCode + localPhone;

        try {
            const existingClient = await API.getClientByPhone(fullPhone);
            if (existingClient && existingClient.id) {
                showPhoneExistsModal(existingClient);
            }
        } catch (e) {
            // Silenciar errores de red - no bloquear el flujo
            console.log('Error verificando teléfono:', e.message);
        }
    });
}

// ============================================================================
// MODAL: TELÉFONO YA REGISTRADO
// ============================================================================
function showPhoneExistsModal(client) {
    const modal = document.getElementById('phone-exists-modal');
    if (!modal) return;

    document.getElementById('pe-client-name').textContent = client.name;
    document.getElementById('pe-client-code').textContent = client.client_code || client.code || '----';

    // Botón "Sí, soy yo" → pre-llenar formulario con datos del cliente
    const btnYes = document.getElementById('pe-btn-yes');
    btnYes.onclick = () => {
        // Normalizar el campo code para consistencia
        client.code = client.client_code || client.code;

        // Guardar cliente como logueado
        state.loggedInClient = client;

        // Pre-llenar el formulario
        prefillClientForm(client);

        // Mostrar bienvenida si existe el área de quick login
        const loginCard = document.querySelector('.quick-login-card');
        const welcomeCard = document.getElementById('quick-login-welcome');
        if (loginCard && welcomeCard) {
            document.getElementById('welcome-client-name').textContent = client.name.split(' ')[0];
            loginCard.style.display = 'none';
            welcomeCard.classList.remove('hidden');
        }

        // Cargar membresías
        API.getClientMemberships(client.id).then(memberships => {
            state.clientMemberships = (memberships || []).filter(m => m.remaining_services > 0);
        }).catch(() => {});

        closePhoneExistsModal();
        showToast(`¡Bienvenido de vuelta, ${client.name.split(' ')[0]}!`, 'success');
    };

    // Botón "No, soy otra persona" → limpiar teléfono para que pongan otro
    const btnNo = document.getElementById('pe-btn-no');
    btnNo.onclick = () => {
        const phoneInput = document.getElementById('client-phone');
        if (phoneInput) {
            phoneInput.value = '';
            phoneInput.focus();
        }
        closePhoneExistsModal();
        showToast('Ingresa un número de teléfono diferente', 'info');
    };

    modal.classList.remove('hidden');
}

function closePhoneExistsModal() {
    const modal = document.getElementById('phone-exists-modal');
    if (modal) modal.classList.add('hidden');
}

// ============================================================================
// ENVIAR RESERVACIÓN
// ============================================================================
async function submitBooking() {
    const btnConfirm = document.getElementById('btn-confirm');
    const originalText = btnConfirm.textContent;

    // Validar campos obligatorios antes de procesar
    const nameInput = document.getElementById('client-name');
    const phoneInput = document.getElementById('client-phone');

    const name = nameInput?.value?.trim();
    const phoneVal = phoneInput?.value?.trim();

    const missingFields = [];
    if (!name) missingFields.push('Nombre Completo');
    if (!phoneVal || phoneVal.length < 7) missingFields.push('Teléfono (mínimo 7 dígitos)');

    if (missingFields.length > 0) {
        showToast(`⚠️ Campos obligatorios: ${missingFields.join(', ')}`, 'error');

        if (!name && nameInput) {
            nameInput.style.borderColor = '#e74c3c';
            nameInput.focus();
        }
        if ((!phoneVal || phoneVal.length < 10) && phoneInput) {
            phoneInput.style.borderColor = '#e74c3c';
            if (name) phoneInput.focus();
        }
        return;
    }

    // Restaurar bordes normales
    if (nameInput) nameInput.style.borderColor = '';
    if (phoneInput) phoneInput.style.borderColor = '';

    btnConfirm.disabled = true;
    btnConfirm.textContent = 'Procesando...';

    const formData = new FormData(elements.bookingForm);
    // Combinar código de país + número local
    const countryCode = document.getElementById('country-code')?.value || '52';
    const localPhone = formData.get('phone').replace(/\D/g, '');
    const phone = countryCode + localPhone;

    try {
        // =====================================================
        // MODIFICATION FLOW - Si está modificando cita existente
        // =====================================================
        if (state.modifyingAppointment && state.pendingAppointment) {
            const localDate = formatLocalDate(state.selectedDate);
            
            try {
                const result = await API.modifyAppointment(
                    state.pendingAppointment.id,
                    state.loggedInClient?.id || state.pendingAppointment.clientId,
                    {
                        date: localDate,
                        time: state.selectedTime,
                        serviceId: state.selectedService.id
                    }
                );

                if (result.success) {
                    // Limpiar estado de modificación
                    state.modifyingAppointment = false;
                    state.modifyType = null;
                    state.pendingAppointment = null;

                    // Mostrar éxito
                    showToast('¡Cita modificada exitosamente!', 'success');
                    
                    // Mostrar pantalla de éxito con datos actualizados
                    showSuccess({
                        checkout_code: state.loggedInClient?.code || '----',
                        service_name: state.selectedService.name,
                        appointment_date: localDate,
                        start_time: state.selectedTime,
                        price: state.selectedService.price
                    });
                } else {
                    throw new Error(result.error || 'Error al modificar la cita');
                }
            } catch (modifyError) {
                console.error('Error modificando cita:', modifyError);
                showToast(modifyError.message || 'Error al modificar la cita', 'error');
                btnConfirm.disabled = false;
                btnConfirm.textContent = originalText;
            }
            return;
        }

        // Si hay cliente logueado con código, usarlo directamente
        let client = state.loggedInClient || await API.getClientByPhone(phone);

        // Determinar si requiere depósito:
        // Solo clientes nuevos (brand new o tipo "Nuevo" ID 1)
        // Montos según servicio:
        //   - PAQUETE NUPCIAL D'Lux: $400
        //   - TIC y DÚO: $200
        //   - Otros: $100
        const isBrandNew = !client;
        const isExistingNew = client && client.client_type_id === 1; // 1 = Nuevo (según update_client_types.sql)
        const isNewClient = isBrandNew || isExistingNew;

        const svcName = state.selectedService.name.toLowerCase();
        const isNupcialPackage = svcName.includes('nupcial');
        const isTIC = svcName.includes('tic');
        const isDUO = svcName.includes('dúo') || svcName.includes('duo');

        const requiresDeposit = isNewClient;
        let depositAmount = 100; // Default para clientes nuevos
        if (isNupcialPackage) depositAmount = 400;
        else if (isTIC || isDUO) depositAmount = 200;

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
                    const birthdateInput = document.getElementById('client-birthdate');
                    const newClient = await API.createClient({
                        name: data.name,
                        phone: phone,
                        email: data.email || null,
                        birthdate: birthdateInput?.value || null
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
                    notes: (data.notes || '') + ` - Pendiente de Depósito $${depositAmount}`,
                    status: 'pending',
                    deposit_required: true,
                    deposit_amount: depositAmount,
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
            notes: formData.get('notes') || '',
            // Guardar datos necesarios para re-intentar post-cancelación
            rawFormData: {
                // Copiar los valores del form manualmente ya que FormData no se puede clonar fácilmente
                name: formData.get('name'),
                phone: phone, // Ya procesado con lada
                email: formData.get('email'),
                notes: formData.get('notes'),
                birthdate: formData.get('birthdate')
            }
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

        // Manejar conflicto de cita existente (409)
        if (error.conflict) { // Ahora sí tenemos acceso a error.conflict gracias al cambio en api.js
            showConflictModal(error.conflict);
            btnConfirm.disabled = false;
            btnConfirm.textContent = originalText;
            return;
        }

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

    // Llenar datos - Siempre mostrar el código del cliente, no el de la cita
    const clientCode = state.loggedInClient?.code || state.clientCode || appointmentData.client_code || '----';
    document.getElementById('success-code').textContent = clientCode;
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
        const amountEl = document.getElementById('deposit-amount');

        if (serviceEl) serviceEl.textContent = state.selectedService?.name || '-';
        if (dateEl) dateEl.textContent = formatDate(state.selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (timeEl) timeEl.textContent = state.selectedTime || '-';

        // Monto según servicio (Nupcial = $200, otros = $100)
        const isNupcial = state.selectedService?.name?.toLowerCase().includes('nupcial');
        if (amountEl) amountEl.textContent = isNupcial ? '200' : '100';
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

    // Llenar datos - Mostrar código del cliente (aunque sea depósito pendiente)
    const clientCode = state.clientCode || state.loggedInClient?.code || '----';
    document.getElementById('success-code').textContent = clientCode;
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
        const message = `Hola, soy *${clientName}*.
Quiero agendar una cita para:
🗓 *${dateFormatted}* a las *${time}*
💇‍♂️ *${serviceName}*

Soy cliente nuevo, anexo mi depósito de $100 para confirmar mi asistencia.`;
        const whatsappUrl = `https://wa.me/525573432027?text=${encodeURIComponent(message)}`;

        successNotice.innerHTML = `
            <div style="background: linear-gradient(135deg, rgba(255, 193, 7, 0.15), rgba(255, 193, 7, 0.05)); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <p style="color: #FFC107; margin-bottom: 1rem; font-size: 1.1rem;">
                    <i class="fas fa-exclamation-triangle"></i> <strong>DEPÓSITO REQUERIDO</strong>
                </p>
                
                <!-- CRONÓMETRO VISUAL -->
                <div style="background: linear-gradient(135deg, rgba(231, 76, 60, 0.2), rgba(231, 76, 60, 0.1)); border: 2px solid rgba(231, 76, 60, 0.5); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; text-align: center;">
                    <p style="color: #e74c3c; font-weight: 600; margin-bottom: 1rem; font-size: 0.9rem;">
                        <i class="fas fa-hourglass-half" style="animation: pulse 1s infinite;"></i> TIEMPO RESTANTE PARA DEPOSITAR
                    </p>
                    <div id="deposit-countdown" style="display: flex; justify-content: center; gap: 0.5rem; align-items: center;">
                        <div style="background: linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%); border: 2px solid var(--gold); border-radius: 10px; padding: 1rem 1.5rem; min-width: 80px; box-shadow: 0 4px 15px rgba(196, 163, 90, 0.3);">
                            <span id="countdown-minutes" style="font-family: 'Courier New', monospace; font-size: 2.5rem; font-weight: bold; color: var(--gold); text-shadow: 0 0 10px rgba(196, 163, 90, 0.5);">59</span>
                            <p style="font-size: 0.7rem; color: rgba(255,255,255,0.6); margin: 0.25rem 0 0 0; text-transform: uppercase;">Min</p>
                        </div>
                        <span style="font-size: 2rem; color: var(--gold); animation: blink 1s infinite;">:</span>
                        <div style="background: linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%); border: 2px solid var(--gold); border-radius: 10px; padding: 1rem 1.5rem; min-width: 80px; box-shadow: 0 4px 15px rgba(196, 163, 90, 0.3);">
                            <span id="countdown-seconds" style="font-family: 'Courier New', monospace; font-size: 2.5rem; font-weight: bold; color: var(--gold); text-shadow: 0 0 10px rgba(196, 163, 90, 0.5);">59</span>
                            <p style="font-size: 0.7rem; color: rgba(255,255,255,0.6); margin: 0.25rem 0 0 0; text-transform: uppercase;">Seg</p>
                        </div>
                    </div>
                    <p style="color: #e74c3c; font-size: 0.85rem; margin-top: 1rem; opacity: 0.9;">
                        <i class="fas fa-exclamation-circle"></i> Tu horario se cancelará automáticamente si no depositas
                    </p>
                </div>
                
                <p style="margin-bottom: 1rem;">Como eres cliente nuevo, necesitamos un depósito de <strong>$100 MXN</strong> para confirmar tu cita. Este monto se descuenta del total.</p>

                <p style="font-weight: 600; margin-bottom: 0.75rem;"><i class="fas fa-university"></i> Datos para Transferencia:</p>
                <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 4px; cursor: pointer;" onclick="copyToClipboard('638180000176357788')">
                        <span><strong>NU México:</strong> <code style="color: var(--gold);">638180000176357788</code></span>
                        <i class="fas fa-copy" style="opacity: 0.5;"></i>
                    </div>
                    <p style="font-size: 0.8rem; opacity: 0.7; margin-top: 0.75rem; text-align: center;">Beneficiario: Miguel Alejandro Trujillo Revuelta</p>
                </div>

                <a href="${whatsappUrl}" target="_blank" style="display: block; background: #25D366; color: white; text-align: center; padding: 1rem; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 1rem;">
                    <i class="fab fa-whatsapp"></i> Enviar Comprobante por WhatsApp
                </a>
            </div>
            
            <style>
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0.3; }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
            </style>
        `;

        // Iniciar cronómetro de 1 hora
        startDepositCountdown();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Función para iniciar el cronómetro de depósito
function startDepositCountdown() {
    let totalSeconds = 60 * 60; // 1 hora = 3600 segundos

    const minutesEl = document.getElementById('countdown-minutes');
    const secondsEl = document.getElementById('countdown-seconds');

    if (!minutesEl || !secondsEl) return;

    const updateCountdown = () => {
        if (totalSeconds <= 0) {
            minutesEl.textContent = '00';
            secondsEl.textContent = '00';
            minutesEl.style.color = '#e74c3c';
            secondsEl.style.color = '#e74c3c';
            return;
        }

        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        minutesEl.textContent = String(minutes).padStart(2, '0');
        secondsEl.textContent = String(seconds).padStart(2, '0');

        // Cambiar a rojo cuando queden menos de 10 minutos
        if (totalSeconds < 600) {
            minutesEl.style.color = '#e74c3c';
            secondsEl.style.color = '#e74c3c';
            minutesEl.style.textShadow = '0 0 10px rgba(231, 76, 60, 0.5)';
            secondsEl.style.textShadow = '0 0 10px rgba(231, 76, 60, 0.5)';
        }

        totalSeconds--;
    };

    updateCountdown(); // Mostrar inmediatamente
    setInterval(updateCountdown, 1000);
}

function sendDepositWhatsApp() {
    if (!state.tempClient) return;

    const name = state.tempClient.name;
    const dateFormatted = formatDate(state.selectedDate, { weekday: 'long', day: 'numeric', month: 'long' });
    const time = state.selectedTime;
    const serviceName = state.selectedService.name;

    const message = `Hola, soy *${name}*.
Quiero agendar una cita para:
🗓 *${dateFormatted}* a las *${time}*
💇‍♂️ *${serviceName}*

Soy cliente nuevo, anexo mi depósito de $100 para confirmar mi asistencia.`;

    const whatsappUrl = `https://wa.me/525573432027?text=${encodeURIComponent(message)}`;
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
        const message = `Hola, soy *${client.name}*.
He agendado mi cita para el *${formatDate(state.selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}* a las *${state.selectedTime}*.

Anexo mi comprobante de pago anticipado.`;
        const whatsappUrl = `https://wa.me/525573432027?text=${encodeURIComponent(message)}`;
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

        // Guardar código del cliente para mostrar en pantalla de éxito
        state.clientCode = client.code;

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

    // Llenar datos - Siempre mostrar el código del cliente
    const clientCode = client?.code || state.loggedInClient?.code || state.clientCode || '----';
    document.getElementById('success-code').textContent = clientCode;
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
        const message = `Hola, soy *${clientName}*.
He agendado mi cita para:
🗓 *${dateFormatted}* a las *${time}*
💇‍♂️ *${serviceName}*
💰 *$${price}*

Anexo mi comprobante de pago anticipado.`;
        const whatsappUrl = `https://wa.me/525573432027?text=${encodeURIComponent(message)}`;

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

        // Guardar código del cliente para mostrar en pantalla de éxito
        state.clientCode = client.code;

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

// ============================================================================
// PENDING APPOINTMENTS MANAGEMENT
// ============================================================================

// Check and show pending appointment after login
async function checkAndShowPendingAppointment(clientId) {
    try {
        const result = await API.getPendingAppointments(clientId);

        if (result.success && result.hasPending && result.appointment) {
            state.pendingAppointment = result.appointment;
            renderPendingAppointment(result.appointment);

            // Hide the booking steps when showing pending appointment
            document.querySelector('.booking-steps')?.classList.add('hidden');
            document.getElementById('step-1')?.classList.add('hidden');
        } else {
            state.pendingAppointment = null;
            // Make sure booking flow is visible
            document.querySelector('.booking-steps')?.classList.remove('hidden');
            document.getElementById('step-1')?.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error checking pending appointments:', error);
    }
}

// Render the pending appointment card
function renderPendingAppointment(apt) {
    const section = document.getElementById('pending-appointment-section');
    if (!section) return;

    // Format date
    const dateFormatted = formatDateDisplay(apt.date);
    const timeFormatted = formatTimeDisplay(apt.time);

    // Update DOM elements
    document.getElementById('pending-service-name').textContent = apt.service.name;
    document.getElementById('pending-date').textContent = dateFormatted;
    document.getElementById('pending-time').textContent = timeFormatted;
    document.getElementById('pending-price').textContent = apt.service.price;
    document.getElementById('pending-duration').textContent = apt.service.duration;

    // Show/hide warning based on canModify
    const warning = document.getElementById('pending-warning');
    const actions = section.querySelector('.pending-actions');

    if (!apt.canModify) {
        warning?.classList.remove('hidden');
        if (actions) {
            actions.querySelectorAll('button').forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            });
        }
    } else {
        warning?.classList.add('hidden');
        if (actions) {
            actions.querySelectorAll('button').forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            });
        }
    }

    // Show the section
    section.classList.remove('hidden');
}

// Format date for display (YYYY-MM-DD -> "Lunes, 20 de Enero 2026")
function formatDateDisplay(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    let formatted = date.toLocaleDateString('es-MX', options);
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Format time for display (HH:MM -> "2:00 PM")
function formatTimeDisplay(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Open modify modal
function openModifyModal() {
    if (!state.pendingAppointment || !state.pendingAppointment.canModify) return;

    const apt = state.pendingAppointment;
    const modal = document.getElementById('modal-modify-appointment');

    // Update modal content
    document.getElementById('modify-current-service').textContent = apt.service.name;
    document.getElementById('modify-current-date').textContent = formatDateDisplay(apt.date);
    document.getElementById('modify-current-time').textContent = formatTimeDisplay(apt.time);

    modal?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Close modify modal
function closeModifyModal() {
    const modal = document.getElementById('modal-modify-appointment');
    modal?.classList.add('hidden');
    document.body.style.overflow = '';
}

// ============================================================================
// CONFLICT APPOINTMENT MODAL
// ============================================================================

function showConflictModal(conflictData) {
    const modal = document.getElementById('modal-conflict-appointment');
    if (!modal) return;

    // Guardar datos del conflicto en state
    state.conflictData = conflictData;

    // Poblar datos
    const apt = conflictData.appointment;
    document.getElementById('conflict-service').textContent = apt.service_name;

    // Formatear fecha
    const dateObj = new Date(apt.appointment_date + 'T12:00:00');
    const formattedDate = dateObj.toLocaleDateString('es-MX', {
        weekday: 'long', day: 'numeric', month: 'long'
    });
    document.getElementById('conflict-date').textContent = formattedDate;

    // Formatear hora (HH:MM -> 12h)
    const [hours, minutes] = apt.start_time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const timeFormatted = `${hour12}:${minutes} ${ampm}`;

    document.getElementById('conflict-time').textContent = timeFormatted;

    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('visible'), 10);
}

function closeConflictModal() {
    const modal = document.getElementById('modal-conflict-appointment');
    modal.classList.remove('visible');
    setTimeout(() => modal.classList.add('hidden'), 300);
    state.conflictData = null;
}

async function handleConflictOption(option) {
    if (!state.conflictData) return;

    const conflictApt = state.conflictData.appointment;

    if (option === 'keep_old') {
        // Conservar cita anterior = Cancelar intento actual
        closeConflictModal();
        showToast('Solicitud descartada. Tu cita anterior sigue activa.', 'info');

    } else if (option === 'modify_old') {
        // Modificar cita existente
        closeConflictModal();

        // Simular que estamos viendo la cita en "Mis Reservaciones"
        // Necesitamos formatear los datos como espera openModifyModal
        state.pendingAppointment = {
            id: conflictApt.id,
            clientId: conflictApt.client_id,
            date: conflictApt.appointment_date,
            time: conflictApt.start_time,
            service: {
                id: conflictApt.service_id,
                name: conflictApt.service_name,
                price: conflictApt.service_price || conflictApt.service?.price // Handle potential structure differences
            },
            canModify: true // Asumimos true ya que estamos ofreciendo la opción, o el backend ya filtró
        };

        openModifyModal();

    } else if (option === 'cancel_old') {
        // Cancelar Anterior y Agendar Esta
        closeConflictModal();

        // Mostrar modal de confirmación de cancelación (el normal)
        // Pero necesitamos interceptar la confirmación para que luego agende la nueva
        showCancelConfirmationForConflict(conflictApt);
    }
}

function showCancelConfirmationForConflict(apt) {
    const modal = document.getElementById('modal-cancel-appointment');

    // Poblar modal cancelación
    document.getElementById('cancel-service').textContent = apt.service_name;
    // Formato fecha
    const dateObj = new Date(apt.appointment_date + 'T12:00:00');
    const dateFormatted = dateObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
    document.getElementById('cancel-date').textContent = dateFormatted;
    document.getElementById('cancel-time').textContent = apt.start_time;

    // Cambiar comportamiento del botón confirmar
    const btnConfirm = document.getElementById('btn-confirm-cancel');

    // Guardar el handler original para restaurarlo después
    if (!state.originalCancelHandler) {
        state.originalCancelHandler = btnConfirm.onclick;
        // Note: onclick property might not be set if it was addEventListener. 
        // Logic assumes we attach a new listener and somehow bypass original or check flag.
        // Better: Set a flag in state that 'confirmCancel' checks.
    }

    state.isConflictResolution = true;
    state.conflictAptId = apt.id;

    modal.classList.remove('hidden');
}

// Interceptar la cancelación en el main flow (necesitaremos modificar la funcion confirmCancel existente o crear una nueva si esta inline)
// Revisando el HTML, el boton de cancelar tiene id="btn-confirm-cancel".
// Necesitamos ver donde está el listener. Parece que no está en el snippet visto anteriormente, probablemente al final de 'setupEventListeners'.

// Make global
window.closeConflictModal = closeConflictModal;
window.handleConflictOption = handleConflictOption;

// Open cancel modal
function openCancelModal() {
    if (!state.pendingAppointment || !state.pendingAppointment.canModify) return;

    const apt = state.pendingAppointment;
    const modal = document.getElementById('modal-cancel-appointment');

    // Update modal content
    document.getElementById('cancel-service').textContent = apt.service.name;
    document.getElementById('cancel-date').textContent = formatDateDisplay(apt.date);
    document.getElementById('cancel-time').textContent = formatTimeDisplay(apt.time);

    // Clear reason field
    const reasonField = document.getElementById('cancel-reason');
    if (reasonField) reasonField.value = '';

    modal?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Close cancel modal
function closeCancelModal() {
    const modal = document.getElementById('modal-cancel-appointment');
    modal?.classList.add('hidden');
    document.body.style.overflow = '';

    // Reset conflict resolution state if user closed without confirming
    if (state.isConflictResolution) {
        state.isConflictResolution = false;
        state.conflictAptId = null;
        // Don't nullify conflictData yet as they might want to return to conflict modal?
        // Actually, if they close cancel modal, they are back to conflict modal?
        // No, both modals are overlays. If they close cancel modal, they see the conflict modal underneath?
        // Standard modal implementation usually has z-index.
        // Let's assume they want to "cancel the cancel".
        // If they close cancel modal, they should probably go back to conflict modal if it was open.
        // Current implementation hides cancel modal.
        // If conflict modal is still visible (it wasn't hidden, just covered), then we are fine.
        // But in `handleConflictOption('cancel_old')` we called `closeConflictModal()` first.
        // So conflict modal is hidden.

        // If they close the cancel confirmation, they effectively canceled the action.
        // We should probably re-show the conflict modal or just let them stay on the form.
        // For now, just resetting state is safe.
    }
}

// Confirm cancel appointment
async function confirmCancelAppointment() {
    // Si es flujo de resolución de conflictos (cancelar anterior para agendar nueva)
    if (state.isConflictResolution && state.conflictAptId) {
        const btn = document.getElementById('btn-confirm-cancel');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelando...';

        try {
            // Usar API pública para cancelar (asumiendo que tenemos clientID o auth)
            // Si estamos en este flujo, tenemos state.loggedInClient o state.tempClient (pero tempClient no tiene ID validado aun)
            // PERO, si saltó el conflicto, es porque el backend detectó cliente por ID (loggedIn) o por teléfono.
            // Necesitamos el ID del cliente para cancelar.

            // Si no hay loggedInClient, ¿cómo sabemos que es él?
            // El backend detectó conflicto por el client_id asociado al teléfono o session.
            // Si el usuario "invitado" puso un teléfono que ya existe, el backend devolvió el conflicto.
            // El backend sabe quién es. Pero el frontend quizás no tiene el ID si es guest.

            // Requerimiento: "Cancelar Anterior".
            // Para cancelar necesitamos appointmentID y clientID (por seguridad en backend logic).
            // Si el usuario no está logueado, no tenemos clientID en state.loggedInClient.
            // Pero el appointment conflictivo tiene client_id (ver Appointment.js query).
            // state.conflictData.appointment tiene todos los datos.

            const conflictApt = state.conflictData.appointment;

            // Usamos endpoint publico. Cancelamos cita conflictiva.
            // Usamos el client_id que viene en la cita conflictiva.
            await API.cancelAppointmentByClient(
                conflictApt.id,
                conflictApt.client_id,
                'Cancelación por traslape con nueva cita'
            );

            showToast('Cita anterior cancelada. Procesando nueva cita...', 'success');
            closeCancelModal();

            // Limpiar estado de conflicto
            state.isConflictResolution = false;
            state.conflictAptId = null;
            state.conflictData = null;

            // REINTENTAR AGENDAR LA NUEVA CITA de inmediato
            setTimeout(() => {
                submitBooking();
            }, 500);

        } catch (error) {
            console.error('Error cancelando cita conflictiva:', error);
            showToast('Error al cancelar la cita anterior: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
        return;
    }

    // Flujo normal de cancelación (Mis Reservas)
    if (!state.pendingAppointment || !state.loggedInClient) return;

    const btn = document.getElementById('btn-confirm-cancel');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelando...';

    try {
        const reason = document.getElementById('cancel-reason')?.value || '';

        const result = await API.cancelAppointmentByClient(
            state.pendingAppointment.id,
            state.loggedInClient.id,
            reason
        );

        if (result.success) {
            closeCancelModal();

            // Show success modal
            document.getElementById('modal-cancel-success')?.classList.remove('hidden');

            // Clear pending appointment state
            state.pendingAppointment = null;
        } else {
            alert(result.error || 'Error al cancelar la cita');
        }
    } catch (error) {
        console.error('Cancel error:', error);
        alert('Error al cancelar la cita');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Close success modal and start new booking
function closeSuccessAndBookNew() {
    document.getElementById('modal-cancel-success')?.classList.add('hidden');
    document.body.style.overflow = '';

    // Hide pending section and show booking flow
    document.getElementById('pending-appointment-section')?.classList.add('hidden');
    document.querySelector('.booking-steps')?.classList.remove('hidden');
    document.getElementById('step-1')?.classList.remove('hidden');
}

// Start flow for changing service (modify with new service)
function startChangeServiceFlow() {
    if (!state.pendingAppointment) return;

    state.modifyingAppointment = true;
    state.modifyType = 'service';

    closeModifyModal();

    // Hide pending section and show service selection
    document.getElementById('pending-appointment-section')?.classList.add('hidden');
    document.querySelector('.booking-steps')?.classList.remove('hidden');
    document.getElementById('step-1')?.classList.remove('hidden');

    // Show message that user is modifying
    const stepTitle = document.querySelector('#step-1 .step-title');
    if (stepTitle) {
        stepTitle.innerHTML = '¿Qué servicio deseas ahora? <small style="display:block;font-size:0.6em;color:var(--gold);margin-top:0.5rem;">(Modificando cita existente)</small>';
    }
}

// Start flow for changing date/time only
function startChangeDateTimeFlow() {
    if (!state.pendingAppointment) return;

    state.modifyingAppointment = true;
    state.modifyType = 'datetime';

    // Pre-select the current service
    const currentServiceId = state.pendingAppointment.service.id;
    const service = SERVICIOS_BRACOS.find(s => s.id === currentServiceId);

    if (service) {
        state.selectedService = service;
        closeModifyModal();

        // Go directly to date selection (step 2)
        document.getElementById('pending-appointment-section')?.classList.add('hidden');
        goToStep(2);
    } else {
        alert('Error: Servicio no encontrado');
    }
}

// Book another appointment (keep existing one)
function bookAnotherAppointment() {
    // Just show the normal booking flow
    document.getElementById('pending-appointment-section')?.classList.add('hidden');
    document.querySelector('.booking-steps')?.classList.remove('hidden');
    document.getElementById('step-1')?.classList.remove('hidden');
}

// Initialize pending appointment event listeners
function initPendingAppointmentListeners() {
    // Modify button
    document.getElementById('btn-modify-appointment')?.addEventListener('click', openModifyModal);

    // Cancel button
    document.getElementById('btn-cancel-appointment')?.addEventListener('click', openCancelModal);

    // Book another button
    document.getElementById('btn-book-another')?.addEventListener('click', bookAnotherAppointment);

    // Modal: Change service
    document.getElementById('btn-change-service')?.addEventListener('click', startChangeServiceFlow);

    // Modal: Change date/time
    document.getElementById('btn-change-datetime')?.addEventListener('click', startChangeDateTimeFlow);

    // Modal: Confirm cancel
    document.getElementById('btn-confirm-cancel')?.addEventListener('click', confirmCancelAppointment);

    // Modal: After cancel - book new
    document.getElementById('btn-after-cancel')?.addEventListener('click', closeSuccessAndBookNew);

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.add('hidden');
                document.body.style.overflow = '';
            }
        });
    });
}

// Export modal functions for inline onclick handlers
window.closeModifyModal = closeModifyModal;
window.closeCancelModal = closeCancelModal;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initPendingAppointmentListeners();
});
