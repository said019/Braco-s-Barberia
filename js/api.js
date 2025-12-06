// ============================================================================
// API CLIENT - BRACO'S BARBERÍA
// Cliente para comunicación con el backend
// ============================================================================

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : '/api';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const API = {
    // Token de autenticación (si existe)
    token: localStorage.getItem('auth_token') || null,

    /**
     * Establece el token de autenticación
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    },

    /**
     * Obtiene headers para las peticiones
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    },

    /**
     * Maneja errores de la API
     */
    handleError(error) {
        console.error('API Error:', error);

        if (error.message === 'Failed to fetch') {
            throw new Error('No se pudo conectar con el servidor');
        }

        throw error;
    },

    // ========================================================================
    // SERVICIOS
    // ========================================================================

    /**
     * Obtiene todos los servicios
     */
    async getServices() {
        try {
            const response = await fetch(`${API_BASE_URL}/services`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            return this.handleError(error);
        }
    },

    /**
     * Obtiene un servicio por ID
     */
    async getService(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/services/${id}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            return this.handleError(error);
        }
    },

    /**
     * Obtiene servicios por categoría
     */
    async getServicesByCategory(categoryId) {
        try {
            const response = await fetch(`${API_BASE_URL}/services/category/${categoryId}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            return this.handleError(error);
        }
    },

    // ========================================================================
    // CLIENTES
    // ========================================================================

    /**
     * Busca cliente por teléfono
     */
    async getClientByPhone(phone) {
        try {
            const cleanPhone = phone.replace(/\D/g, '');
            const response = await fetch(`${API_BASE_URL}/clients/phone/${cleanPhone}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            // El backend devuelve { success: true, data: client }
            return result.data || null;
        } catch (error) {
            return this.handleError(error);
        }
    },

    /**
     * Crea un nuevo cliente
     */
    async createClient(clientData) {
        try {
            const response = await fetch(`${API_BASE_URL}/clients`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(clientData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error al crear cliente');
            }

            const result = await response.json();
            // El backend devuelve { success: true, data: client }
            return result.data;
        } catch (error) {
            return this.handleError(error);
        }
    },

    // ========================================================================
    // CITAS
    // ========================================================================

    /**
     * Obtiene slots disponibles para una fecha y servicio
     */
    async getAvailableSlots(serviceId, date) {
        try {
            const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
            const response = await fetch(
                `${API_BASE_URL}/availability/slots?service_id=${serviceId}&date=${dateStr}`,
                {
                    method: 'GET',
                    headers: this.getHeaders()
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Si el día está bloqueado o cerrado, retornar array vacío
            if (data.blocked || data.closed) {
                return [];
            }

            // Retornar solo los slots disponibles
            return data.slots || [];
        } catch (error) {
            return this.handleError(error);
        }
    },

    /**
     * Crea una nueva cita
     */
    async createAppointment(appointmentData) {
        try {
            console.log('Enviando datos de cita:', appointmentData);

            const response = await fetch(`${API_BASE_URL}/appointments`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(appointmentData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.log('Error del servidor:', errorData);

                // Si hay errores de validación específicos, mostrarlos
                if (errorData.errors && errorData.errors.length > 0) {
                    const errorMessages = errorData.errors.map(e => `${e.field}: ${e.message}`).join(', ');
                    throw new Error(errorMessages);
                }

                throw new Error(errorData.message || 'Error al crear la cita');
            }

            const result = await response.json();
            console.log('Respuesta del servidor:', result);
            // El backend devuelve { success: true, data: appointment }
            return result.data;
        } catch (error) {
            return this.handleError(error);
        }
    },

    /**
     * Cancela una cita
     */
    async cancelAppointment(appointmentId, reason = '') {
        try {
            const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/cancel`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ cancellation_reason: reason })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error al cancelar la cita');
            }

            return await response.json();
        } catch (error) {
            return this.handleError(error);
        }
    },

    // ========================================================================
    // PRODUCTOS
    // ========================================================================

    /**
     * Obtiene todos los productos
     */
    async getProducts() {
        try {
            const response = await fetch(`${API_BASE_URL}/products`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result.data || [];
        } catch (error) {
            return this.handleError(error);
        }
    },

    // ========================================================================
    // MEMBRESÍAS
    // ========================================================================

    /**
     * Obtiene tipos de membresía
     */
    async getMembershipTypes() {
        try {
            const response = await fetch(`${API_BASE_URL}/memberships/types`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            return this.handleError(error);
        }
    },

    /**
     * Obtiene membresías activas de un cliente
     */
    async getClientMemberships(clientId) {
        try {
            const response = await fetch(`${API_BASE_URL}/clients/${clientId}/active-memberships`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result.data || [];
        } catch (error) {
            return this.handleError(error);
        }
    },

    // ========================================================================
    // CHECKOUT
    // ========================================================================

    /**
     * Completa el proceso de checkout
     */
    async completeCheckout(checkoutData) {
        try {
            const response = await fetch(`${API_BASE_URL}/checkout`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(checkoutData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            return this.handleError(error);
        }
    },


    // ========================================================================
    // HEALTH CHECK
    // ========================================================================

    /**
     * Verifica estado del servidor
     */
    async healthCheck() {
        try {
            const response = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET'
            });

            return response.ok;
        } catch (error) {
            return false;
        }
    }
};

// ============================================================================
// HELPERS DE DATOS
// ============================================================================

/**
 * Datos mock para desarrollo/fallback
 */
const MOCK_DATA = {
    services: [
        { id: 1, name: 'Corte de Cabello Caballero', duration_minutes: 60, price: 300, category_id: 1 },
        { id: 2, name: 'Ritual Tradicional de Barba', duration_minutes: 60, price: 300, category_id: 2 },
        { id: 3, name: 'Perfilado de Barba', duration_minutes: 30, price: 250, category_id: 2 },
        { id: 4, name: 'Corte Infantil Premium', duration_minutes: 45, price: 250, category_id: 1 },
        { id: 5, name: 'Corte + Degradado Premium', duration_minutes: 75, price: 400, category_id: 1 },
        { id: 6, name: 'Mascarilla Facial', duration_minutes: 45, price: 350, category_id: 3 },
        { id: 7, name: 'Experiencia Royal Completa', duration_minutes: 120, price: 550, category_id: 6 },
        { id: 8, name: 'Tinte de Cabello', duration_minutes: 90, price: 600, category_id: 3 },
        { id: 9, name: 'Tratamiento Capilar', duration_minutes: 60, price: 400, category_id: 3 },
        { id: 10, name: 'Retoque Express', duration_minutes: 15, price: 100, category_id: 1 },
        { id: 11, name: 'Afeitado Clásico', duration_minutes: 30, price: 200, category_id: 2 },
        { id: 12, name: 'Tinte de Barba', duration_minutes: 45, price: 350, category_id: 2 }
    ],

    generateTimeSlots(startHour = 10, endHour = 20, intervalMinutes = 30) {
        const slots = [];
        let currentHour = startHour;
        let currentMinute = 0;

        while (currentHour < endHour || (currentHour === endHour && currentMinute === 0)) {
            // Saltar hora de comida (14:00-15:00)
            if (currentHour !== 14) {
                const time = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
                slots.push({
                    time,
                    available: Math.random() > 0.3 // 70% de slots disponibles
                });
            }

            currentMinute += intervalMinutes;
            if (currentMinute >= 60) {
                currentMinute = 0;
                currentHour++;
            }
        }

        return slots;
    }
};

// ============================================================================
// EXPORT
// ============================================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API, MOCK_DATA };
}
