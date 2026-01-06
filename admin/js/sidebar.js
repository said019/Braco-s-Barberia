// Sidebar Toggle Mobile - Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const sidebar = document.getElementById('sidebar');

    if (mobileMenuToggle && sidebar) {
        mobileMenuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            sidebar.classList.toggle('open');
            if (mobileOverlay) {
                mobileOverlay.classList.toggle('active');
            }
            // NO cambiar el icono - siempre mantener hamburguesa
        });
    }

    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', function() {
            if (sidebar) {
                sidebar.classList.remove('open');
            }
            mobileOverlay.classList.remove('active');
        });
    }

    // Close sidebar on navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function(item) {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                if (sidebar) {
                    sidebar.classList.remove('open');
                }
                if (mobileOverlay) {
                    mobileOverlay.classList.remove('active');
                }
            }
        });
    });
});
