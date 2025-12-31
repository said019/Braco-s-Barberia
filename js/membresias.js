// ============================================================================
// MEMBRESIAS.JS - MEMBERSHIPS PAGE LOGIC
// ============================================================================

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : 'https://braco-s-barberia-production.up.railway.app/api';

// Map features based on plan Name (since DB doesn't store display features)
const PLAN_FEATURES = {
    'Golden Card Tradicional': [
        '6 Servicios',
        'Corte de Caballero',
        'Ritual de Barba',
        'Servicio Dúo (Corte + Barba)',
        'Bebidas de cortesía'
    ],
    'Golden NeoCapilar': [
        'Incluye 8 sesiones',
        'Ozonoterapia',
        'Altafrecuencia',
        'Fotobiomodulación',
        'Productos Premium'
    ],
    'Terapia Integral Capilar (TIC)': [
        'Incluye 8 sesiones',
        'Ozonoterapia',
        'Altafrecuencia',
        'Fotobiomodulación',
        'Productos Premium'
    ],
    'Black Card': [
        '12 Servicios',
        'Corte de Cabello',
        'Ritual de Barba',
        'Servicio Dúo',
        'Transferible',
        'Bebidas Premium'
    ]
};

const PLAN_ICONS = {
    'Golden Card Tradicional': '<i class="fas fa-crown"></i>',
    'Golden NeoCapilar': '<i class="fas fa-seedling"></i>',
    'Terapia Integral Capilar (TIC)': '<i class="fas fa-seedling"></i>',
    'Black Card': '<i class="fas fa-gem"></i>'
};

const PLAN_BADGES = {
    'Golden Card Tradicional': 'Más Popular',
    'Golden NeoCapilar': 'Tratamiento Capilar',
    'Terapia Integral Capilar (TIC)': 'Tratamiento Capilar',
    'Black Card': 'Exclusivo'
};

const PLAN_STYLES = {
    'Golden Card Tradicional': '',
    'Golden NeoCapilar': 'tic-card',
    'Terapia Integral Capilar (TIC)': 'tic-card',
    'Black Card': 'featured' // dark theme
};

// Subtítulos para las tarjetas (vacíos para quitar el tagline)
const PLAN_SUBTITLES = {
    'Golden Card Tradicional': '',
    'Golden NeoCapilar': '',
    'Terapia Integral Capilar (TIC)': '',
    'Black Card': ''
};

document.addEventListener('DOMContentLoaded', () => {
    loadMembershipPlans();
    setupFAQ();
    setupAnimations();
});

async function loadMembershipPlans() {
    const container = document.getElementById('plans-container');

    try {
        const response = await fetch(`${API_URL}/public/membership-types`);
        if (!response.ok) throw new Error('Error al cargar membresías');

        const plans = await response.json();

        container.innerHTML = ''; // Clear loading

        plans.forEach(plan => {
            const features = PLAN_FEATURES[plan.name] || ['Servicios Premium', 'Atención Personalizada'];
            const icon = PLAN_ICONS[plan.name] || '<i class="fas fa-cut"></i>';
            const badge = PLAN_BADGES[plan.name] || 'Premium';
            const styleClass = PLAN_STYLES[plan.name] || '';
            const subtitle = PLAN_SUBTITLES[plan.name] || '';
            const isBlack = plan.name.includes('Black');
            const isTIC = plan.name.includes('TIC') || plan.name.includes('NeoCapilar');

            // Determine styling classes
            let cardClass = 'plan-card';
            if (isBlack) cardClass += ' featured';
            if (isTIC) cardClass += ' tic-card';

            // Nombre a mostrar (renombrar TIC a Golden NeoCapilar)
            let displayName = plan.name;
            if (plan.name.includes('TIC')) {
                displayName = 'Golden NeoCapilar';
            }

            const cardHTML = `
                <div class="${cardClass}">
                    <div class="plan-badge ${isBlack ? 'premium' : ''}">${badge}</div>
                    <div class="plan-header">
                        <div class="plan-icon" style="font-size: 3rem; margin-bottom: 1rem; color: var(--gold);">${icon}</div>
                        <h3 class="plan-name" style="font-size: 2rem; font-weight: 700;">${displayName}</h3>
                    </div>
                    <div class="plan-price">
                        <span class="price-amount" style="font-size: 2.5rem;">$${parseFloat(plan.price).toLocaleString()}</span>
                    </div>
                    <div class="plan-features">
                        ${features.map(f => `
                            <div class="feature-item">
                                <span class="feature-icon"><i class="fas fa-check"></i></span>
                                <span>${f}</span>
                            </div>
                        `).join('')}
                    </div>
                    <a href="https://wa.me/525573432027?text=Hola,%20me%20interesa%20la%20membresía%20${encodeURIComponent(plan.name)}"
                       class="btn-primary btn-block"
                       style="color: #000; background-color: var(--gold); border: none; font-weight: 600; white-space: normal; height: auto; padding: 15px 10px; line-height: 1.2;"
                       target="_blank">
                       ADQUIRIR ${plan.name.toUpperCase()}
                    </a>
                </div>
            `;

            container.insertAdjacentHTML('beforeend', cardHTML);
        });

        // Re-trigger animations for new elements
        setupAnimations();

    } catch (error) {
        console.error('Error loading plans:', error);
        container.innerHTML = `<p style="text-align:center; grid-column:1/-1;">No se pudieron cargar los planes. Por favor contáctanos.</p>`;
    }
}

// ... existing setupFAQ and setupAnimations ...
function setupFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
            item.classList.toggle('active');
        });
    });
}

function setupAnimations() {
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.plan-card, .step-item, .faq-item').forEach(el => {
        // Only set initial state if not already set (to avoid hiding already visible elements)
        if (!el.style.opacity) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        }
    });
}
// Smooth scroll preserved
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const offsetTop = target.offsetTop - 80;
                window.scrollTo({ top: offsetTop, behavior: 'smooth' });
            }
        }
    });
});
