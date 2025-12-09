// ============================================================================
// MEMBRESIAS.JS - MEMBERSHIPS PAGE LOGIC
// ============================================================================

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : 'https://braco-s-barberia-production.up.railway.app/api';

// Map features based on plan Name (since DB doesn't store display features)
const PLAN_FEATURES = {
    'Golden Card Corte': [
        '6 Servicios al mes',
        'Corte de Cabello',
        'Ritual de Barba',
        'Servicio Dúo (Corte + Barba)',
        'Bebidas de cortesía',
        'Prioridad en agenda'
    ],
    'Golden NeoCapilar': [
        '4 Sesiones al mes',
        'Terapia Integral Capilar (TIC)',
        'Mantenimiento de Prótesis',
        'Mascarillas Faciales',
        'Incluye lavado y peinado',
        'Bebidas Premium'
    ],
    'Black Card': [
        'Servicios ILIMITADOS de Corte',
        'Servicios ILIMITADOS de Barba',
        'Acceso a todos los servicios',
        'Máxima prioridad en agenda',
        'Descuentos en productos',
        'Membresía Vitalicia (Renovación anual opcional)'
    ]
};

const PLAN_ICONS = {
    'Golden Card Corte': '👑',
    'Golden NeoCapilar': '💆',
    'Black Card': '⚜️'
};

const PLAN_BADGES = {
    'Golden Card Corte': 'Más Popular',
    'Golden NeoCapilar': 'Especializado',
    'Black Card': 'Exclusivo'
};

const PLAN_STYLES = {
    'Golden Card Corte': '',
    'Golden NeoCapilar': '', // standard
    'Black Card': 'featured' // dark theme
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
            const icon = PLAN_ICONS[plan.name] || '✂️';
            const badge = PLAN_BADGES[plan.name] || 'Premium';
            const styleClass = PLAN_STYLES[plan.name] || '';
            const isBlack = plan.name.includes('Black');

            // Determine styling classes
            let cardClass = 'plan-card';
            if (isBlack) cardClass += ' featured'; // Black card gets featured dark style

            const cardHTML = `
                <div class="${cardClass}">
                    <div class="plan-badge ${isBlack ? 'premium' : ''}">${badge}</div>
                    <div class="plan-header">
                        <div class="plan-icon">${icon}</div>
                        <h3 class="plan-name">${plan.name}</h3>
                        <p class="plan-tagline">
                           ${isBlack ? 'Acceso Total Ilimitado' : `Include ${plan.total_services} servicios`}
                        </p>
                    </div>
                    <div class="plan-price">
                        <span class="price-amount">$${parseFloat(plan.price).toLocaleString()}</span>
                        <span class="price-period">/ ${plan.duration_days} días</span>
                    </div>
                    <div class="plan-features">
                        ${features.map(f => `
                            <div class="feature-item">
                                <span class="feature-icon">✓</span>
                                <span>${f}</span>
                            </div>
                        `).join('')}
                    </div>
                    <a href="https://wa.me/525573432027?text=Hola,%20me%20interesa%20la%20membresía%20${encodeURIComponent(plan.name)}" 
                       class="${isBlack ? 'btn-outline' : 'btn-primary'} btn-block" target="_blank">
                       Adquirir ${plan.name}
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
