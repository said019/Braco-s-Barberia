// ==================== AUTHENTICATION ====================

function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        window.location.href = '/admin/login.html';
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/admin/login.html';
}

function getAuthToken() {
    return localStorage.getItem('admin_token');
}

// ==================== API CALLS ====================

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : '/api';

async function fetchWithAuth(endpoint, options = {}) {
    const token = getAuthToken();

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // Si es 401, token inválido - redirigir a login
        if (response.status === 401) {
            logout();
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error en la petición');
        }

        return data;

    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Admin API functions
const AdminAPI = {
    // Dashboard
    getDashboard: () => fetchWithAuth('/admin/dashboard'),

    // Appointments
    getAppointments: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithAuth(`/admin/appointments${query ? '?' + query : ''}`);
    },

    getAppointment: async (id) => {
        const result = await fetchWithAuth(`/admin/appointments/${id}`);
        return result?.data || result;
    },

    updateAppointment: (id, data) => fetchWithAuth(`/admin/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    createAppointment: (data) => fetchWithAuth('/admin/appointments', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    updateAppointmentStatus: (id, status) => fetchWithAuth(`/admin/appointments/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
    }),

    deleteAppointment: (id) => fetchWithAuth(`/admin/appointments/${id}`, {
        method: 'DELETE'
    }),

    // Services
    getServices: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithAuth(`/admin/services${query ? '?' + query : ''}`);
    },

    // Clients
    getClients: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithAuth(`/admin/clients${query ? '?' + query : ''}`);
    },

    getClient: (id) => fetchWithAuth(`/admin/clients/${id}`),

    createClient: (data) => fetchWithAuth('/admin/clients', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    updateClient: (id, data) => fetchWithAuth(`/admin/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    deleteClient: (id) => fetchWithAuth(`/admin/clients/${id}`, {
        method: 'DELETE'
    }),

    getClientHistory: (id) => fetchWithAuth(`/admin/clients/${id}/history`),

    // Memberships
    getMemberships: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithAuth(`/admin/memberships${query ? '?' + query : ''}`);
    },

    getMembership: (id) => fetchWithAuth(`/admin/memberships/${id}`),

    createMembership: (data) => fetchWithAuth('/admin/memberships', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    updateMembership: (id, data) => fetchWithAuth(`/admin/memberships/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    cancelMembership: (id) => fetchWithAuth(`/admin/memberships/${id}/cancel`, {
        method: 'PUT'
    }),

    // Reports
    getSalesReport: (params) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithAuth(`/admin/reports/sales?${query}`);
    },

    getServicesReport: (params) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithAuth(`/admin/reports/services?${query}`);
    },

    getMembershipsReport: (params) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithAuth(`/admin/reports/memberships?${query}`);
    }
};

// ==================== FORMATTING ====================

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(date) {
    // Evitar conversión de timezone - si es solo fecha (YYYY-MM-DD), agregarle T12:00:00
    let dateStr = date;
    if (typeof date === 'string' && date.length === 10) {
        dateStr = date + 'T12:00:00';
    } else if (typeof date === 'string' && date.includes('T')) {
        // Si ya tiene T, extraer solo la fecha y agregar T12:00:00
        dateStr = date.split('T')[0] + 'T12:00:00';
    }
    return new Date(dateStr).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function formatDateTime(datetime) {
    // Evitar conversión de timezone
    let dateStr = datetime;
    if (typeof datetime === 'string' && datetime.length === 10) {
        dateStr = datetime + 'T12:00:00';
    }
    return new Date(dateStr).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTime(time) {
    if (time.length === 8) {
        return time.slice(0, 5); // HH:MM:SS -> HH:MM
    }
    return time;
}

function formatPhone(phone) {
    // 5551234567 -> (555) 123-4567
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
}

// ==================== MODALS ====================

class Modal {
    constructor(id) {
        this.id = id;
        this.overlay = null;
        this.modal = null;
    }

    create(title, content, footer) {
        // Remove existing modal
        this.destroy();

        const html = `
            <div class="modal-overlay" id="${this.id}">
                <div class="modal">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" onclick="window.${this.id}.close()">×</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        this.overlay = document.getElementById(this.id);
        this.modal = this.overlay.querySelector('.modal');

        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Close on ESC
        this.escHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', this.escHandler);

        // Store in window for easy access
        window[this.id] = this;
    }

    open() {
        if (this.overlay) {
            setTimeout(() => {
                this.overlay.classList.add('active');
            }, 10);
        }
    }

    close() {
        if (this.overlay) {
            this.overlay.classList.remove('active');
            setTimeout(() => {
                this.destroy();
            }, 300);
        }
    }

    destroy() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
            this.modal = null;
        }
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
        }
        delete window[this.id];
    }
}

function showModal(id, title, content, footer = '') {
    const modal = new Modal(id);
    modal.create(title, content, footer);
    modal.open();
    return modal;
}

function showConfirm(title, message, onConfirm) {
    const content = `<p>${message}</p>`;
    const footer = `
        <button class="btn btn-secondary" onclick="window.confirmModal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="window.confirmCallback(); window.confirmModal.close();">Confirmar</button>
    `;

    window.confirmCallback = onConfirm;
    window.confirmModal = showModal('confirmModal', title, content, footer);
}

function showAlert(title, message, type = 'success') {
    const content = `<div class="alert ${type}">${message}</div>`;
    const footer = `<button class="btn btn-primary" onclick="window.alertModal.close()">Cerrar</button>`;

    window.alertModal = showModal('alertModal', title, content, footer);
}

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'success', duration = 3000) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) {
        existing.remove();
    }

    const colors = {
        success: '#4CAF50',
        error: '#E53935',
        warning: '#FF9800',
        info: '#2196F3'
    };

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: ${colors[type] || colors.success};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 4px;
        font-size: 0.9rem;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Add animations
if (!document.querySelector('#toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// ==================== VALIDATIONS ====================

function validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateRequired(value) {
    return value && value.toString().trim().length > 0;
}

// ==================== DATE UTILITIES ====================

function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

function getMonthStart(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}

function isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString();
}

function isToday(date) {
    return isSameDay(date, new Date());
}

// ==================== EXPORT TO EXCEL ====================

function exportToExcel(data, filename) {
    // Simple CSV export (can be improved with a library like xlsx)
    if (data.length === 0) {
        showToast('No hay datos para exportar', 'warning');
        return;
    }

    // Get headers
    const headers = Object.keys(data[0]);

    // Build CSV
    let csv = headers.join(',') + '\n';

    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csv += values.join(',') + '\n';
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Archivo descargado correctamente', 'success');
}

// ==================== TABLE UTILITIES ====================

function createTable(data, columns) {
    if (!data || data.length === 0) {
        return '<p class="empty-message">No hay datos para mostrar</p>';
    }

    let html = '<table class="data-table"><thead><tr>';

    // Headers
    columns.forEach(col => {
        html += `<th>${col.label}</th>`;
    });
    html += '</tr></thead><tbody>';

    // Rows
    data.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            let value = row[col.field];

            // Apply formatter if provided
            if (col.format && typeof col.format === 'function') {
                value = col.format(value, row);
            }

            // Add data-label for responsive mobile view
            const dataLabel = col.label !== 'Acciones' ? col.label : '';
            html += `<td data-label="${dataLabel}">${value !== null && value !== undefined ? value : '-'}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
}

// ==================== LOADING STATE ====================

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Cargando...</p>
            </div>
        `;
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const loading = element.querySelector('.loading');
        if (loading) {
            loading.remove();
        }
    }
}

// ==================== COLOR UTILITIES ====================

function getRandomColor() {
    const colors = [
        '#C4A35A', '#4CAF50', '#2196F3', '#FF9800',
        '#9C27B0', '#E91E63', '#00BCD4', '#8BC34A'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function getClientColor(clientId) {
    // Generate consistent color based on ID
    const hue = (clientId * 137.508) % 360; // Golden angle
    return `hsl(${hue}, 60%, 60%)`;
}

// ==================== DEBOUNCE ====================

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

// ==================== NAVIGATION ====================

function setActiveNavItem() {
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href && currentPath.includes(href)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Set active nav on page load
document.addEventListener('DOMContentLoaded', setActiveNavItem);

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
        // Función para actualizar el icono del botón
        function updateToggleIcon() {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                if (sidebar.classList.contains('open')) {
                    icon.className = 'fas fa-times';
                } else {
                    icon.className = 'fas fa-bars';
                }
            }
        }
        
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
            updateToggleIcon();
        });
        
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            updateToggleIcon();
        });
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                    updateToggleIcon();
                }
            });
        });
        
        // Asegurar que el icono esté correcto al cargar
        updateToggleIcon();
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
