const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : '/api';

const api = {
    async request(method, endpoint, data = null) {
        const token = localStorage.getItem('admin_token');

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, options);

            // Si el token es inválido o expiró, redirigir a login
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_user');
                window.location.href = '/admin/login.html';
                throw new Error('Sesión expirada. Redirigiendo a login...');
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error en la solicitud');
            }

            return result;
        } catch (error) {
            // Si es error de aborto (usuario navegó a otra página)
            if (error.name === 'AbortError') {
                throw error; // Re-throw para que el caller lo maneje
            }
            // Si es error de red o el servidor no responde
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
                console.error('Error de conexión:', error);
                throw new Error('No se pudo conectar con el servidor');
            }
            console.error('API request failed:', error);
            throw error;
        }
    },

    get(endpoint) {
        return this.request('GET', endpoint);
    },

    post(endpoint, data) {
        return this.request('POST', endpoint, data);
    },

    put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    },

    delete(endpoint) {
        return this.request('DELETE', endpoint);
    }
};

// Expose globally
window.api = api;
window.API = api; // Alias for backward compatibility

// ==================== LAYOUT & RESPONSIVENESS (Injected) ====================
document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Injection
    if (!document.querySelector('.mobile-menu-toggle')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'mobile-menu-toggle';
        toggleBtn.id = 'mobile-menu-toggle';
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
        document.body.appendChild(toggleBtn);
    }
    if (!document.querySelector('.mobile-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        overlay.id = 'mobile-overlay';
        document.body.appendChild(overlay);
    }
    const toggleBtn = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar');
    const overlay = document.querySelector('.mobile-overlay');
    if (toggleBtn && sidebar && overlay) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                }
            });
        });
    }
    // Calendar Responsive Fix
    const calendarGrid = document.querySelector('.calendar-grid');
    if (calendarGrid && !calendarGrid.parentElement.classList.contains('calendar-container')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'calendar-container';
        calendarGrid.parentNode.insertBefore(wrapper, calendarGrid);
        wrapper.appendChild(calendarGrid);
    }
});
