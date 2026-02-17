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
        id: 11,
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
        id: 4,
        name: "INSTALACIÓN DE PRÓTESIS CAPILAR",
        price: 4800,
        duration: 180,
        image: "assets/instalacio_protesis.jpeg",
        description: `Las prótesis o reemplazo capilar representan una solución innovadora y efectiva para aquellos que experimentan pérdida de cabello.
-Mejora instantánea en la apariencia y confianza.
-Solución no quirúrgica y resultados naturales.
-Personalización total y fácil mantenimiento.
-No afecta el crecimiento del cabello natural.
-Durabilidad a largo plazo.`
    },
    {
        id: 5,
        name: "MANTENIMIENTO DE PRÓTESIS CAPILAR",
        price: 650,
        duration: 120,
        image: "assets/mant_protesis.jpeg",
        description: `Limpieza profesional de prótesis capilar en uso para limpieza profunda, restauración e hidratación.
-Retiro seguro y limpieza profesional.
-Ajuste de adhesivos y colocación segura.
-Hidratación de la pieza.`
    },
    {
        id: 6,
        name: "TERAPIA INTEGRAL CAPILAR (TIC)",
        price: 550,
        duration: 60,
        image: "assets/TIC.jpeg",
        description: `Braco’s NeoCapilar: Salud y prevención de la caída del cabello. Restaura, fortalece y estimula el crecimiento natural.
-Ozonoterapia: Purifica y oxigena.
-Alta Frecuencia: Estimula irrigación sanguínea.
-Fotobiomodulación (Luz LED): Regeneración celular.
-Productos dermatológicos premium.
-Diagnóstico inicial requerido.`
    },
    {
        id: 7,
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
        id: 8,
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
        id: 9,
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
        id: 10,
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
// ============================================================================
// CARGAR SERVICIOS
// ============================================================================
async function loadServices() {
    try {
        if (typeof API !== 'undefined') {
            // API.getServices() ahora devuelve directamente el array de servicios
            const apiServices = await API.getServices();
            if (apiServices && apiServices.length > 0) {
                // Mapear servicios de API al formato de visualización
                const mappedServices = apiServices.map(s => ({
                    id: s.id,
                    name: s.name,
                    price: parseFloat(s.price),
                    duration: s.duration_minutes,
                    image: s.image_url || getServiceImage(s.name),
                    description: s.description || ''
                }));
                console.log('Servicios cargados desde API (Landing):', mappedServices);
                renderServices(mappedServices);
                return;
            }
        }
    } catch (e) {
        console.error('Error cargando servicios API en landing:', e);
    }

    // Fallback a datos locales
    console.log('Usando servicios locales (Fallback)');
    renderServices(SERVICES_DATA);
}

// Helper para obtener imagen (copiado de agendar.js para consistencia visual)
function getServiceImage(name) {
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

// ============================================================================
// RESEÑAS (LANDING)
// ============================================================================
const reviewsState = {
    initialized: false,
    loading: false,
    items: [],
    offset: 0,
    limit: 9,
    hasMore: false,
    currentPage: 0,
    perPage: getReviewsPerPage(),
    summary: {
        average_rating: 0,
        total_reviews: 0
    }
};

function getReviewsPerPage() {
    if (window.innerWidth <= 768) return 1;
    if (window.innerWidth <= 1024) return 2;
    return 3;
}

function formatReviewDate(dateStr) {
    try {
        return new Intl.DateTimeFormat('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(new Date(dateStr));
    } catch (error) {
        return '';
    }
}

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getStars(rating) {
    const safe = Math.max(1, Math.min(5, Number(rating) || 1));
    return '★'.repeat(safe) + '☆'.repeat(5 - safe);
}

function updateReviewsSummary() {
    const avgEl = document.getElementById('reviews-average-rating');
    const starsEl = document.getElementById('reviews-stars-display');
    const totalEl = document.getElementById('reviews-total-count');

    if (avgEl) {
        avgEl.textContent = Number(reviewsState.summary.average_rating || 0).toFixed(1);
    }

    if (starsEl) {
        starsEl.textContent = getStars(Math.round(reviewsState.summary.average_rating || 0));
    }

    if (totalEl) {
        totalEl.textContent = String(reviewsState.summary.total_reviews || 0);
    }
}

function renderReviewDots(totalPages) {
    const dotsContainer = document.getElementById('reviews-dots');
    if (!dotsContainer) return;

    if (totalPages <= 1) {
        dotsContainer.innerHTML = '';
        return;
    }

    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalPages; i += 1) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = `reviews-dot ${i === reviewsState.currentPage ? 'active' : ''}`;
        dot.setAttribute('aria-label', `Ir a página ${i + 1} de reseñas`);
        dot.addEventListener('click', () => {
            reviewsState.currentPage = i;
            renderReviewsPage();
        });
        dotsContainer.appendChild(dot);
    }
}

function renderReviewsPage() {
    const track = document.getElementById('reviews-track');
    const prevBtn = document.getElementById('reviews-prev');
    const nextBtn = document.getElementById('reviews-next');
    const loadMoreBtn = document.getElementById('reviews-load-more');

    if (!track) return;

    const totalItems = reviewsState.items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / reviewsState.perPage));
    reviewsState.currentPage = Math.min(reviewsState.currentPage, totalPages - 1);

    if (totalItems === 0) {
        track.style.gridTemplateColumns = '1fr';
        track.innerHTML = `
            <article class="review-card-empty">
                <p>Todavía no hay reseñas publicadas.</p>
                <small>Las nuevas reseñas aparecerán aquí después del checkout.</small>
            </article>
        `;
    } else {
        const start = reviewsState.currentPage * reviewsState.perPage;
        const visible = reviewsState.items.slice(start, start + reviewsState.perPage);
        const columns = Math.max(1, Math.min(reviewsState.perPage, visible.length));
        track.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
        track.innerHTML = visible.map(review => `
            <article class="review-card">
                <div class="review-card-top">
                    <strong class="review-card-name">${escapeHtml(review.client_name)}</strong>
                    <span class="review-card-stars">${getStars(review.rating)}</span>
                </div>
                <p class="review-card-comment">"${escapeHtml(review.comment)}"</p>
                <span class="review-card-date">${formatReviewDate(review.created_at)}</span>
            </article>
        `).join('');
    }

    if (prevBtn) {
        prevBtn.disabled = reviewsState.currentPage <= 0 || totalItems === 0;
    }

    if (nextBtn) {
        nextBtn.disabled = reviewsState.currentPage >= totalPages - 1 || totalItems === 0;
    }

    if (loadMoreBtn) {
        loadMoreBtn.style.display = reviewsState.hasMore ? 'inline-flex' : 'none';
        loadMoreBtn.disabled = reviewsState.loading;
        loadMoreBtn.textContent = reviewsState.loading ? 'Cargando...' : 'Cargar Más Reseñas';
    }

    renderReviewDots(totalPages);
    updateReviewsSummary();
}

async function loadReviews({ append = false } = {}) {
    if (reviewsState.loading || typeof API === 'undefined' || typeof API.getPublicReviews !== 'function') {
        return;
    }

    reviewsState.loading = true;
    renderReviewsPage();

    try {
        const nextOffset = append ? reviewsState.offset : 0;
        const result = await API.getPublicReviews({
            limit: reviewsState.limit,
            offset: nextOffset
        });

        const payload = result.data || {};
        const incoming = Array.isArray(payload.reviews) ? payload.reviews : [];

        if (append) {
            const existingIds = new Set(reviewsState.items.map(item => item.id));
            const newItems = incoming.filter(item => !existingIds.has(item.id));
            reviewsState.items = [...reviewsState.items, ...newItems];
            reviewsState.offset = nextOffset + incoming.length;
        } else {
            reviewsState.items = incoming;
            reviewsState.offset = incoming.length;
            reviewsState.currentPage = 0;
        }

        reviewsState.hasMore = Boolean(payload.pagination?.has_more);
        reviewsState.summary = payload.summary || reviewsState.summary;
    } catch (error) {
        console.error('Error cargando reseñas:', error);
    } finally {
        reviewsState.loading = false;
        renderReviewsPage();
    }
}

function setupReviewsSection() {
    if (reviewsState.initialized) return;

    const track = document.getElementById('reviews-track');
    if (!track) return;

    const prevBtn = document.getElementById('reviews-prev');
    const nextBtn = document.getElementById('reviews-next');
    const loadMoreBtn = document.getElementById('reviews-load-more');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (reviewsState.currentPage > 0) {
                reviewsState.currentPage -= 1;
                renderReviewsPage();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(reviewsState.items.length / reviewsState.perPage);
            if (reviewsState.currentPage < totalPages - 1) {
                reviewsState.currentPage += 1;
                renderReviewsPage();
            }
        });
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async () => {
            await loadReviews({ append: true });
        });
    }

    const handleResize = debounce(() => {
        const newPerPage = getReviewsPerPage();
        if (newPerPage === reviewsState.perPage) return;

        const firstVisibleIndex = reviewsState.currentPage * reviewsState.perPage;
        reviewsState.perPage = newPerPage;
        reviewsState.currentPage = Math.floor(firstVisibleIndex / reviewsState.perPage);
        renderReviewsPage();
    }, 180);

    window.addEventListener('resize', handleResize);

    reviewsState.initialized = true;
    renderReviewsPage();
    loadReviews();
}

if (document.getElementById('reviews-track')) {
    setupReviewsSection();
}

// ============================================================================
// CARGAR PRODUCTOS
// ============================================================================
async function loadProducts() {
    try {
        if (typeof API !== 'undefined') {
            const apiProducts = await API.getProducts();
            if (apiProducts && apiProducts.length > 0) {
                console.log('Productos cargados desde API (Landing):', apiProducts);
                renderProducts(apiProducts);
                return;
            }
        }
    } catch (e) {
        console.error('Error cargando productos API en landing:', e);
    }
}

function renderProducts(products) {
    const productsContainer = document.querySelector('.products-grid');
    if (!productsContainer) return;

    productsContainer.innerHTML = '';

    const formatPrice = (price) => new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0
    }).format(price);

    products.forEach(product => {
        if (!product.is_active) return;

        const card = document.createElement('article');
        card.className = 'product-card';

        // Use uploaded image or fallback loop
        let imageSrc = product.image_url;
        if (!imageSrc) {
            imageSrc = getProductImageFallback(product.name);
        }

        const stockStatus = product.stock > 0 ? '✓ Disponible' : 'Agotado';
        const stockClass = product.stock > 0 ? 'product-stock' : 'product-stock out-of-stock'; // Add css for out-of-stock if needed

        card.innerHTML = `
            <div class="product-image">
                <img src="${imageSrc}" alt="${product.name}" style="object-fit: cover; width: 100%; height: 100%;">
            </div>
            <div class="product-content">
                <h3 class="product-name">${product.name} <img src="assets/logo.png" alt="Braco's" style="height: 1.2em; vertical-align: middle; display: inline-block;"></h3>
                <p class="product-description">
                    ${product.description || ''}
                </p>
                <div class="product-meta">
                    <span class="${stockClass}">${stockStatus}</span>
                </div>
                <div class="product-footer">
                    <span class="product-price">${formatPrice(product.price)}</span>
                    <a href="checkout.html" class="btn-outline btn-small">Comprar</a>
                </div>
            </div>
        `;

        productsContainer.appendChild(card);
    });
}

function getProductImageFallback(name) {
    const n = name.toLowerCase();
    if (n.includes('shampoo')) return 'assets/shampoo.jpeg';
    if (n.includes('aceite')) return 'assets/aceite.jpeg';
    return 'assets/logo.png';
}

// Cargar productos al cargar la página
if (document.querySelector('.products-grid')) {
    loadProducts();
}

/**
 * Formatea teléfono (soporta internacionales)
 */
function formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');

    // Formato mexicano (10 dígitos)
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
    }

    // Formato internacional con código de país
    if (cleaned.length > 10) {
        return `+${cleaned}`;
    }

    return phone;
}

/**
 * Valida número de teléfono (internacional: 7-15 dígitos)
 */
function validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 7 && cleaned.length <= 15;
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
