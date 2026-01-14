/**
 * Google Translate Integration for Braco's Barbería
 * Provides ES/EN language toggle functionality
 */

// Initialize Google Translate
function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'es',
        includedLanguages: 'en,es',
        autoDisplay: false
    }, 'google_translate_element');
}

// Set language function
function setLanguage(lang) {
    const select = document.querySelector('.goog-te-combo');
    if (select) {
        select.value = lang === 'en' ? 'en' : 'es';
        select.dispatchEvent(new Event('change'));
    } else if (lang === 'es') {
        // Reset to original
        const frame = document.querySelector('.goog-te-banner-frame');
        if (frame) {
            const btn = frame.contentDocument.querySelector('.goog-close-link');
            if (btn) btn.click();
        }
        // Fallback: reload without translation
        if (document.cookie.includes('googtrans')) {
            document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + location.hostname;
            location.reload();
        }
    }
    // Update active state
    const esBtn = document.getElementById('lang-es');
    const enBtn = document.getElementById('lang-en');
    if (esBtn) esBtn.classList.toggle('active', lang === 'es');
    if (enBtn) enBtn.classList.toggle('active', lang === 'en');
    localStorage.setItem('preferredLang', lang);
}

// Check saved preference on load
document.addEventListener('DOMContentLoaded', function () {
    const saved = localStorage.getItem('preferredLang');
    if (saved === 'en') {
        setTimeout(() => setLanguage('en'), 1000);
    }
});

// Inject language toggle HTML
function injectLanguageToggle() {
    const toggle = document.createElement('div');
    toggle.className = 'lang-toggle';
    toggle.innerHTML = `
        <button onclick="setLanguage('es')" class="active" id="lang-es">ES</button>
        <button onclick="setLanguage('en')" id="lang-en">EN</button>
    `;
    document.body.insertBefore(toggle, document.body.firstChild);

    // Add hidden Google Translate container
    const gtContainer = document.createElement('div');
    gtContainer.id = 'google_translate_element';
    gtContainer.style.display = 'none';
    document.body.insertBefore(gtContainer, document.body.firstChild);
}

// Auto-inject on load
document.addEventListener('DOMContentLoaded', injectLanguageToggle);

// Load Google Translate script
(function () {
    const script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.head.appendChild(script);
})();
