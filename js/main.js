// ============================================================================
// BRACO'S BARBERÍA - MAIN JAVASCRIPT
// ============================================================================

// ============================================================================
// HEADER SCROLL BEHAVIOR
// ============================================================================
const header = document.getElementById('header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// ============================================================================
// MOBILE MENU
// ============================================================================
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileNav = document.getElementById('mobile-nav');

if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('active');
        mobileNav.classList.toggle('active');
        document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
    });

    // Cerrar menú al hacer clic en un link
    mobileNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuBtn.classList.remove('active');
            mobileNav.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
}

// ============================================================================
// ACTIVE NAVIGATION LINK
// ============================================================================
const navLinks = document.querySelectorAll('.nav-links a');
const sections = document.querySelectorAll('section[id]');

function updateActiveLink() {
    const scrollPos = window.pageYOffset + 100;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

window.addEventListener('scroll', updateActiveLink);

// ============================================================================
// SMOOTH SCROLL
// ============================================================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');

        if (href !== '#' && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);

            if (target) {
                const offsetTop = target.offsetTop - 80;

                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        }
    });
});

// ============================================================================
// INTERSECTION OBSERVER - ANIMATIONS ON SCROLL
// ============================================================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observar cards y secciones
document.querySelectorAll('.service-card, .product-card, .compact-card, .amenity-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formatea número a moneda mexicana
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0
    }).format(amount);
}

/**
 * Formatea fecha a español
 */
function formatDate(date, options = {}) {
    const defaultOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
    };

    return new Intl.DateTimeFormat('es-MX', defaultOptions).format(date);
}

// ============================================================================
// DATOS DE SERVICIOS (HARDCODED)
// ============================================================================
const SERVICES_DATA = [
    {
        id: 1,
        name: "Corte de cabello para CABALLERO",
        price: 300,
        duration: 60,
        image: "assets/corte_caballero.jpeg",
        description: `Duración aproximada 60 minutos
-Lavado de cabello
-Visagismo
-Corte de cabello
-Estilizado de peinado
-Productos Premium`
    },
    {
        id: 2,
        name: "Corte de cabello NIÑO (hasta 11 años)",
        price: 220,
        duration: 60,
        image: "assets/corte_nino.jpeg",
        description: `Duración aproximada 60 minutos
-Lavado de cabello
-Visagismo
-Corte de cabello
-Estilizado de peinado
-Productos Premium`
    },
    {
        id: 3,
        name: "Ritual Tradicional de Barba",
        price: 300,
        duration: 60,
        image: "assets/ritual_barba.jpeg",
        description: `Duración 60 minutos
-Visagismo
-Rasurado completo o arreglo de barba y bigote
-Toallas calientes
-Toallas frías 
-Masaje facial y craneal
-Aromaterapia 
-Productos Premium`
    },
    {
        id: 4,
        name: "DÚO",
        price: 550,
        duration: 120,
        image: "assets/duo.png",
        description: `Duración 120min (2horas)
-Visagismo
-Corte de cabello
-Ritual tradicional para rasurado o arreglo de barba y bigote`
    },
    {
        id: 5,
        name: "INSTALACIÓN DE PRÓTESIS CAPILAR",
        price: 4800,
        duration: 180,
        image: "assets/instalacio_protesis.jpeg",
        description: `Las prótesis o remplazo capilar es una solución inovadora y efectiva para aquellos que experimenta perida de cabello o calvicie severa
Tiempo aproximado 180 minutos (3 horas)
-Diagnostico
-Prótesis capilar
-Visagismo
-Personalización`
    },
    {
        id: 6,
        name: "MANTENIMIENTO DE PROTESIS CAPILAR",
        price: 650,
        duration: 120,
        image: "assets/mant_protesis.jpeg",
        description: `Limpieza profesional de prótesis capilar en uso para limpieza profunda, restauración e hidratación
Tiempo aproximado 120 minutos (2 horas)
-Retiro seguro
-Limpieza profesional
-Ajuste de adhesivos
-Colocación segura`
    },
    {
        id: 7,
        name: "TERAPIA INTEGRAL CAPILAR (TIC)",
        price: 550,
        duration: 60,
        image: "assets/TIC.jpeg",
        description: `Recomendado para las personas que inician con un problema de calvicie de leve a moderada 
El TIC es una terapia que se enfoca en el cuidado y limpieza del cuero cabelludo con el objetivo de lograr un cuero cabelludo sano y por lo tanto un cabello grueso y en ocasiones abundante
-Duración 60minutos
-Exfoliación capilar
-Alta Frecuencia
-Fotobiomodulación
-Ozonoterapia
-Aplicación de productos Premium`
    },
    {
        id: 8,
        name: "MASCARILLA PLASTIFICADA NEGRA",
        price: 300,
        duration: 60,
        image: "assets/mascarilla_negra.jpeg",
        description: `Recomendada para obtener un rostro limpio de puntos negros y espinillas 
-Duración 60min
-Limpieza de rostro 
-Aplicación y retiro de mascarilla
-Aplicación de productos Premium 
-Masaje facial`
    },
    {
        id: 9,
        name: "MASCARILLA DE ARCILLA",
        price: 300,
        duration: 60,
        image: "assets/arcilla.jpeg",
        description: `Después de la aplicación de la mascarilla plástica recomendamos como mantenimiento la mascarilla de arcilla que exfolia el rostro de una manera más amigable y sutil pero sin perder efectividad en el proceso 
-Duración 60 minutos
-Limpieza de rostro
-Aplicación y retiro de mascarilla 
-Aplicación de productos Premium 
-Masaje facial`
    },
    {
        id: 10,
        name: "MANICURA CABALLERO",
        price: 300,
        duration: 60,
        image: "assets/manicura_caballero.jpeg",
        description: `Duración aproximada 60 minutos 
-Retiro de cutícula
-Exfoliación de manos 
-Recorte de uñas 
-Arreglo de uñas 
-Humectación de manos 
-Masaje de manos y dedos`
    },
    {
        id: 11,
        name: "PEDICURA  CABALLERO",
        price: 300,
        duration: 60,
        image: "assets/pedicura.jpeg",
        description: `Duración aproximada 60 minutos
-Retiro de cutícula
-Exfoliación de pies
-Recorte y limado de uñas 
-Limado de callosidad 
-Humectación de pies
-Masaje de pies`
    },
    {
        id: 12,
        name: "PAQUETE NUPCIAL D’lux",
        price: 1200,
        duration: 240,
        image: "assets/pqte_dlux.jpeg",
        description: `Eleva tu imagen con un ritual completo de elegancia masculina. Ese es el mejor día de tu vida…Y la mejor versión de ti 
Duración 240minutos (4horas)
-Visagismo 
-Corte de cabello
-Ritual de barba o rasurado clásico 
-Mascarilla de carbón activado o mascarilla de arcilla natural 
-Manicura SPA`
    }
];

// ============================================================================
// CARGAR SERVICIOS
// ============================================================================
function loadServices() {
    // Usamos los datos locales directamente
    renderServices(SERVICES_DATA);
}

/**
 * Renderiza los servicios en la página
 */
function renderServices(services) {
    const servicesContainer = document.querySelector('.services-featured');
    if (!servicesContainer) return;

    servicesContainer.innerHTML = '';

    services.forEach(service => {
        const card = document.createElement('article');
        card.className = 'service-card featured';

        // Procesar descripción
        const lines = service.description.split('\n');
        let descriptionHTML = '';
        let featuresHTML = '<ul class="service-features">';

        lines.forEach(line => {
            line = line.trim();
            if (!line) return;

            if (line.startsWith('-')) {
                featuresHTML += `<li>${line.substring(1).trim()}</li>`;
            } else {
                descriptionHTML += `<p>${line}</p>`;
            }
        });
        featuresHTML += '</ul>';

        card.innerHTML = `
            <div class="service-image">
                <img src="${service.image}" alt="${service.name}" loading="lazy" onerror="this.src='assets/logo.png'">
            </div>
            <div class="service-content">
                <div class="service-meta">
                    <span class="service-duration">${service.duration} min</span>
                    <span class="service-price">$${service.price}</span>
                </div>
                <h3 class="service-name">${service.name}</h3>
                <div class="service-description">
                    ${descriptionHTML}
                    ${featuresHTML}
                </div>
                <a href="agendar.html?service=${service.id}" class="service-cta">Agendar →</a>
            </div>
        `;

        servicesContainer.appendChild(card);
    });
}

// Cargar servicios al cargar la página
if (document.querySelector('.services-featured')) {
    loadServices();
}

/**
 * Formatea teléfono
 */
function formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
    }

    return phone;
}

/**
 * Valida número de teléfono mexicano
 */
function validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10;
}

/**
 * Valida email
 */
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Muestra notificación toast
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : 'var(--gold)'};
        color: ${type === 'info' ? 'var(--charcoal-dark)' : 'white'};
        padding: 1rem 2rem;
        border-radius: 4px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        font-size: 0.9rem;
        max-width: 300px;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Obtener parámetros de URL
 */
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * Loading spinner
 */
function showLoading(element) {
    if (!element) return;

    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
        <div style="
            border: 3px solid rgba(196, 163, 90, 0.3);
            border-top: 3px solid var(--gold);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 2rem auto;
        "></div>
    `;

    element.innerHTML = '';
    element.appendChild(spinner);
}

function hideLoading(element, content) {
    if (!element) return;
    element.innerHTML = content;
}

// Agregar animación de spinner al documento
if (!document.querySelector('#spinner-animation')) {
    const style = document.createElement('style');
    style.id = 'spinner-animation';
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ============================================================================
// EXPORT UTILITIES (si se usa con módulos)
// ============================================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatCurrency,
        formatDate,
        formatPhone,
        validatePhone,
        validateEmail,
        showToast,
        debounce,
        getUrlParameter,
        showLoading,
        hideLoading
    };
}
