// Verificar autenticación
function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        window.location.href = '/admin/login.html';
        return false;
    }
    return true;
}

// Cerrar sesión
function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/admin/login.html';
}

// Obtener token
function getToken() {
    return localStorage.getItem('admin_token');
}

// Obtener datos del admin
function getAdminUser() {
    return JSON.parse(localStorage.getItem('admin_user') || '{}');
}

// ============================================
// MOBILE MENU FUNCTIONALITY
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobile-overlay');
    
    if (mobileToggle && sidebar && mobileOverlay) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            mobileOverlay.classList.toggle('active');
            mobileToggle.innerHTML = sidebar.classList.contains('open') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
        });
        
        mobileOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            mobileOverlay.classList.remove('active');
            mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
        });
        
        // Close menu when clicking nav items on mobile
        sidebar.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    mobileOverlay.classList.remove('active');
                    mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
                }
            });
        });
    }
});
