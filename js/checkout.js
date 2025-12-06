// ============================================================================
// CHECKOUT.JS - CHECKOUT LOGIC
// ============================================================================

// Estado de la aplicación
const state = {
    checkoutCode: null,
    checkoutData: null,
    clientMemberships: [],
    products: [],
    cart: {},
    useMembership: false,
    paymentMethod: 'efectivo'
};

// Elementos DOM
const elements = {
    steps: document.querySelectorAll('.checkout-step'),
    codeForm: document.getElementById('code-form'),
    codeDigits: document.querySelectorAll('.code-digit'),
    productsGrid: document.getElementById('products-grid'),
    useMembershipCheckbox: document.getElementById('use-membership'),
    btnCompleteCheckout: document.getElementById('btn-complete-checkout')
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    setupCodeInputs();
    setupEventListeners();
    loadProducts();
});

// ============================================================================
// CONFIGURAR INPUTS DE CÓDIGO
// ============================================================================
function setupCodeInputs() {
    elements.codeDigits.forEach((input, index) => {
        // Auto-focus en siguiente input
        input.addEventListener('input', (e) => {
            const value = e.target.value.replace(/\D/g, '');
            e.target.value = value;

            if (value && index < elements.codeDigits.length - 1) {
                elements.codeDigits[index + 1].focus();
            }
        });

        // Backspace vuelve al anterior
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                elements.codeDigits[index - 1].focus();
            }
        });

        // Paste en cualquier input
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
            paste.split('').forEach((char, i) => {
                if (elements.codeDigits[i]) {
                    elements.codeDigits[i].value = char;
                }
            });
            if (paste.length === 4) {
                elements.codeDigits[3].focus();
            }
        });
    });
}

// ============================================================================
// CONFIGURAR EVENT LISTENERS
// ============================================================================
function setupEventListeners() {
    // Formulario de código
    elements.codeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await searchCheckout();
    });

    // Checkbox de membresía
    if (elements.useMembershipCheckbox) {
        elements.useMembershipCheckbox.addEventListener('change', (e) => {
            state.useMembership = e.target.checked;
            updateSummary();
        });
    }

    // Métodos de pago
    document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.paymentMethod = e.target.value;
        });
    });

    // Botón completar checkout
    if (elements.btnCompleteCheckout) {
        elements.btnCompleteCheckout.addEventListener('click', async () => {
            await completeCheckout();
        });
    }
}

// ============================================================================
// BUSCAR CHECKOUT POR CÓDIGO
// ============================================================================
async function searchCheckout() {
    const code = Array.from(elements.codeDigits).map(i => i.value).join('');

    if (code.length !== 4) {
        showToast('Ingresa los 4 dígitos del código', 'error');
        return;
    }

    state.checkoutCode = code;

    // Mostrar loading
    const btn = elements.codeForm.querySelector('button');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Buscando...';

    try {
        // Buscar checkout (simulación - ajustar cuando el endpoint esté listo)
        const checkoutData = await getCheckoutData(code);

        if (!checkoutData) {
            throw new Error('Código no encontrado');
        }

        state.checkoutData = checkoutData;

        // Cargar membresías del cliente si existe
        if (checkoutData.client_id) {
            await loadClientMemberships(checkoutData.client_id);
        }

        // Mostrar pantalla de checkout
        showCheckoutScreen();

    } catch (error) {
        console.error('Error:', error);
        showToast(error.message || 'Error al buscar el código', 'error');
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// ============================================================================
// OBTENER DATOS DE CHECKOUT DESDE API REAL
// ============================================================================
async function getCheckoutData(code) {
    const response = await fetch(`${API_BASE_URL}/appointments/by-code/${code}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.error || 'Código no encontrado');
    }

    // Transformar respuesta de la API al formato esperado
    return {
        id: data.data.id,
        checkout_code: data.data.checkout_code,
        client_id: data.data.client_id,
        client_name: data.data.client_name,
        client_phone: data.data.client_phone,
        service_id: data.data.service_id,
        service_name: data.data.service_name,
        service_price: parseFloat(data.data.service_price),
        appointment_date: data.data.appointment_date,
        start_time: data.data.start_time,
        status: data.data.status
    };
}

// ============================================================================
// CARGAR MEMBRESÍAS DEL CLIENTE
// ============================================================================
async function loadClientMemberships(clientId) {
    try {
        const memberships = await API.getClientMemberships(clientId);
        state.clientMemberships = memberships.filter(m => m.services_remaining > 0);

        if (state.clientMemberships.length > 0) {
            displayActiveMembership(state.clientMemberships[0]);
        }
    } catch (error) {
        console.error('Error loading memberships:', error);
        state.clientMemberships = [];
    }
}

// ============================================================================
// MOSTRAR MEMBRESÍA ACTIVA
// ============================================================================
function displayActiveMembership(membership) {
    const card = document.getElementById('membership-card');
    const useMembershipContainer = document.getElementById('use-membership-container');
    const getMembershipBtn = document.getElementById('get-membership-btn');

    card.classList.add('active');

    document.getElementById('membership-name').textContent = membership.membership_type_name;
    document.getElementById('membership-details').textContent =
        `Servicios restantes: ${membership.services_remaining} | Válida hasta: ${formatDate(new Date(membership.end_date), { day: 'numeric', month: 'short', year: 'numeric' })}`;

    useMembershipContainer.style.display = 'flex';
    getMembershipBtn.style.display = 'none';
}

// ============================================================================
// CARGAR PRODUCTOS
// ============================================================================
async function loadProducts() {
    try {
        state.products = await API.getProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        // Productos mock
        state.products = [
            { id: 1, name: 'Aceite para Barba Premium', description: '30ml', price: 450, stock: 10 },
            { id: 2, name: 'Cera Moldeadora Ultra-Hold', description: '85g', price: 380, stock: 15 }
        ];
    }
}

// ============================================================================
// MOSTRAR PANTALLA DE CHECKOUT
// ============================================================================
function showCheckoutScreen() {
    // Ocultar código, mostrar checkout
    document.getElementById('step-code').classList.add('hidden');
    document.getElementById('step-checkout').classList.remove('hidden');

    // Llenar información
    document.getElementById('display-code').textContent = state.checkoutCode;
    document.getElementById('client-name').textContent = state.checkoutData.client_name;
    document.getElementById('service-name').textContent = state.checkoutData.service_name;
    document.getElementById('appointment-date').textContent = formatDate(
        new Date(state.checkoutData.appointment_date),
        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    );
    document.getElementById('appointment-time').textContent = state.checkoutData.start_time;

    // Renderizar productos
    renderProducts();

    // Actualizar resumen
    updateSummary();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// RENDERIZAR PRODUCTOS
// ============================================================================
function renderProducts() {
    elements.productsGrid.innerHTML = state.products.map(product => `
        <div class="product-checkout-card" data-id="${product.id}">
            <div class="product-checkout-info">
                <h4>${product.name}</h4>
                <p>${product.description}</p>
                <span class="product-price">$${product.price}</span>
            </div>
            <div class="product-quantity">
                <button class="qty-btn qty-minus" data-id="${product.id}">−</button>
                <span class="qty-display" id="qty-${product.id}">0</span>
                <button class="qty-btn qty-plus" data-id="${product.id}">+</button>
            </div>
        </div>
    `).join('');

    // Event listeners
    document.querySelectorAll('.qty-minus').forEach(btn => {
        btn.addEventListener('click', () => updateProductQuantity(parseInt(btn.dataset.id), -1));
    });

    document.querySelectorAll('.qty-plus').forEach(btn => {
        btn.addEventListener('click', () => updateProductQuantity(parseInt(btn.dataset.id), 1));
    });
}

// ============================================================================
// ACTUALIZAR CANTIDAD DE PRODUCTO
// ============================================================================
function updateProductQuantity(productId, change) {
    const product = state.products.find(p => p.id === productId);
    const currentQty = state.cart[productId] || 0;
    const newQty = Math.max(0, Math.min(product.stock, currentQty + change));

    if (newQty === 0) {
        delete state.cart[productId];
    } else {
        state.cart[productId] = newQty;
    }

    // Actualizar display
    document.getElementById(`qty-${productId}`).textContent = newQty;

    // Actualizar resumen
    updateSummary();
}

// ============================================================================
// ACTUALIZAR RESUMEN DE PAGO
// ============================================================================
function updateSummary() {
    const servicePrice = state.checkoutData.service_price;

    // Calcular productos
    const productsTotal = Object.entries(state.cart).reduce((sum, [id, qty]) => {
        const product = state.products.find(p => p.id == id);
        return sum + (product ? product.price * qty : 0);
    }, 0);

    const productsCount = Object.values(state.cart).reduce((sum, qty) => sum + qty, 0);

    // Calcular descuento por membresía
    let discount = 0;
    let finalServicePrice = servicePrice;

    if (state.useMembership && state.clientMemberships.length > 0) {
        discount = servicePrice;
        finalServicePrice = 0;
    }

    const total = finalServicePrice + productsTotal;

    // Actualizar DOM
    document.getElementById('summary-service-price').textContent = `$${servicePrice}`;
    document.getElementById('products-count').textContent = productsCount;
    document.getElementById('summary-products-price').textContent = `$${productsTotal}`;
    document.getElementById('summary-total').textContent = `$${total}`;

    // Mostrar/ocultar descuento
    const discountRow = document.getElementById('membership-discount');
    const productsRow = document.getElementById('products-summary');

    if (discount > 0) {
        discountRow.style.display = 'flex';
        document.getElementById('summary-discount').textContent = `- $${discount}`;
    } else {
        discountRow.style.display = 'none';
    }

    if (productsCount > 0) {
        productsRow.style.display = 'flex';
    } else {
        productsRow.style.display = 'none';
    }
}

// ============================================================================
// COMPLETAR CHECKOUT
// ============================================================================
async function completeCheckout() {
    const btn = elements.btnCompleteCheckout;
    const originalText = btn.textContent;

    btn.disabled = true;
    btn.textContent = 'Procesando pago...';

    try {
        // Preparar datos del checkout
        const checkoutPayload = {
            use_membership: state.useMembership,
            payment_method: state.paymentMethod,
            products: Object.entries(state.cart).map(([id, qty]) => ({
                product_id: parseInt(id),
                quantity: qty
            }))
        };

        // Enviar a API (adaptar cuando esté disponible)
        // const result = await API.completeCheckout(state.checkoutData.id, checkoutPayload);

        // Simulación
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mostrar pantalla de éxito
        showSuccessScreen();

    } catch (error) {
        console.error('Error:', error);
        showToast(error.message || 'Error al completar el checkout', 'error');
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// ============================================================================
// MOSTRAR PANTALLA DE ÉXITO
// ============================================================================
function showSuccessScreen() {
    // Calcular total final
    const servicePrice = state.useMembership ? 0 : state.checkoutData.service_price;
    const productsTotal = Object.entries(state.cart).reduce((sum, [id, qty]) => {
        const product = state.products.find(p => p.id == id);
        return sum + (product ? product.price * qty : 0);
    }, 0);
    const total = servicePrice + productsTotal;

    // Ocultar checkout, mostrar éxito
    document.getElementById('step-checkout').classList.add('hidden');
    document.getElementById('step-success').classList.remove('hidden');

    // Llenar datos
    document.getElementById('final-total').textContent = `$${total}`;
    document.getElementById('final-method').textContent =
        state.paymentMethod === 'efectivo' ? 'Efectivo' :
            state.paymentMethod === 'tarjeta' ? 'Tarjeta' : 'Transferencia';
    document.getElementById('final-date').textContent = formatDate(new Date(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
