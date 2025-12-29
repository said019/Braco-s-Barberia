// Sidebar Toggle Mobile - Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const sidebar = document.getElementById('sidebar');

    console.log('Sidebar.js loaded', { mobileMenuToggle, mobileOverlay, sidebar });

    if (mobileMenuToggle && sidebar) {
        mobileMenuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Menu toggle clicked');
            sidebar.classList.toggle('open');
            if (mobileOverlay) {
                mobileOverlay.classList.toggle('active');
            }
        });
    }

    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', function() {
            console.log('Overlay clicked');
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
