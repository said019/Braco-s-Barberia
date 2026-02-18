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
    paymentMethod: 'efectivo',
    completedCheckoutId: null,
    selectedRating: 0,
    reviewSubmitted: false
};

// Elementos DOM
const elements = {
    steps: document.querySelectorAll('.checkout-step'),
    codeForm: document.getElementById('code-form'),
    codeInput: document.getElementById('checkout-code'),
    productsGrid: document.getElementById('products-grid'),
    useMembershipCheckbox: document.getElementById('use-membership'),
    btnCompleteCheckout: document.getElementById('btn-complete-checkout'),
    reviewModule: document.getElementById('review-module'),
    reviewForm: document.getElementById('review-form'),
    reviewStars: document.querySelectorAll('.review-star-btn'),
    reviewComment: document.getElementById('review-comment'),
    reviewCounter: document.getElementById('review-counter'),
    btnSubmitReview: document.getElementById('btn-submit-review'),
    reviewSuccessMessage: document.getElementById('review-success-message'),
    reviewErrorMessage: document.getElementById('review-error-message')
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    setupCodeInputs();
    setupEventListeners();
    loadProducts({ silent: true });
});

// ============================================================================
// CONFIGURAR INPUT DE CÓDIGO
// ============================================================================
function setupCodeInputs() {
    if (elements.codeInput) {
        // Solo permitir números
        elements.codeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
        });
    }
}

// ============================================================================
// CONFIGURAR EVENT LISTENERS
// ============================================================================
function setupEventListeners() {
    // Formulario de código
    if (elements.codeForm) {
        elements.codeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await searchCheckout();
        });
    }

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
            // Update summary to reflect cortesia selection
            if (state.checkoutData) {
                updateSummary();
            }
        });
    });

    // Botón completar checkout
    if (elements.btnCompleteCheckout) {
        elements.btnCompleteCheckout.addEventListener('click', async () => {
            await completeCheckout();
        });
    }

    // Calificación por estrellas
    elements.reviewStars.forEach(star => {
        star.addEventListener('click', () => {
            setSelectedRating(Number(star.dataset.rating));
        });
    });

    // Contador de comentario
    if (elements.reviewComment) {
        elements.reviewComment.addEventListener('input', () => {
            updateReviewCounter();
        });
    }

    // Envío de reseña
    if (elements.reviewForm) {
        elements.reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitReview();
        });
    }
}

// ============================================================================
// BUSCAR CITA POR CÓDIGO DE CLIENTE
// ============================================================================
async function searchCheckout() {
    const code = elements.codeInput.value.replace(/\D/g, '');

    if (code.length !== 4) {
        showToast('Ingresa los 4 dígitos de tu código de cliente', 'error');
        return;
    }

    state.checkoutCode = code;
    resetReviewState();

    // Mostrar loading
    const btn = elements.codeForm.querySelector('button');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Buscando...';

    try {
        // Buscar cita de hoy por código de cliente
        const checkoutData = await getCheckoutData(code);

        if (!checkoutData) {
            throw new Error('No se encontró ninguna cita pendiente con tu código de cliente');
        }

        state.checkoutData = checkoutData;

        // Si la cita ya está completada, buscar checkout existente y estado de reseña
        if (checkoutData.status === 'completed') {
            await loadCompletedCheckoutData(checkoutData.id);
            showSuccessScreen();
            return;
        }

        // Refrescar productos justo antes del checkout para evitar precios desactualizados
        await loadProducts({ silent: true });

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
// CARGAR DATOS DE CHECKOUT COMPLETADO (checkout existente + reseña)
// ============================================================================
async function loadCompletedCheckoutData(appointmentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/checkout/by-appointment/${appointmentId}`);
        const data = await response.json();

        if (response.ok && data.success && data.data.checkout) {
            state.completedCheckoutId = data.data.checkout.id;

            // Guardar datos del checkout para mostrar en la pantalla de éxito
            state.completedCheckoutInfo = data.data.checkout;

            // Si ya existe una reseña, guardarla para mostrar en modo lectura
            if (data.data.review) {
                state.existingReview = data.data.review;
            } else {
                state.existingReview = null;
            }
        } else {
            // No hay checkout para esta cita (puede ser walk-in manejado por admin)
            state.completedCheckoutId = null;
            state.existingReview = null;
            state.completedCheckoutInfo = null;
        }
    } catch (error) {
        console.error('Error loading completed checkout data:', error);
        state.completedCheckoutId = null;
        state.existingReview = null;
        state.completedCheckoutInfo = null;
    }
}

// ============================================================================
// CARGAR MEMBRESÍAS DEL CLIENTE
// ============================================================================
async function loadClientMemberships(clientId) {
    try {
        const memberships = await API.getClientMemberships(clientId);
        // Backend devuelve 'remaining_services', no 'services_remaining'
        state.clientMemberships = memberships.filter(m => m.remaining_services > 0);

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

    // Backend devuelve 'membership_name' y 'remaining_services'
    document.getElementById('membership-name').textContent = membership.membership_name;
    document.getElementById('membership-details').textContent =
        `Servicios restantes: ${membership.remaining_services}`;

    useMembershipContainer.style.display = 'flex';
    getMembershipBtn.style.display = 'none';
}

// ============================================================================
// CARGAR PRODUCTOS
// ============================================================================
async function loadProducts({ silent = false } = {}) {
    try {
        state.products = await API.getProducts();
        return state.products;
    } catch (error) {
        console.error('Error loading products:', error);
        state.products = [];
        if (!silent) {
            showToast('No se pudieron cargar los productos en este momento', 'error');
        }
        return state.products;
    }
}

// ============================================================================
// MOSTRAR PANTALLA DE CHECKOUT
// ============================================================================
function showCheckoutScreen() {
    // Ocultar código, mostrar checkout
    document.getElementById('step-code').classList.add('hidden');
    document.getElementById('step-checkout').classList.remove('hidden');
    document.getElementById('step-success').classList.add('hidden');
    resetReviewUI();

    // Llenar información
    document.getElementById('display-code').textContent = state.checkoutCode;
    document.getElementById('client-name').textContent = state.checkoutData.client_name;
    document.getElementById('service-name').textContent = state.checkoutData.service_name;

    // Fix timezone: parse date string and create at noon to avoid day shift
    const dateStr = state.checkoutData.appointment_date;
    const datePart = typeof dateStr === 'string' && dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [year, month, day] = datePart.split('-').map(Number);
    const appointmentDate = new Date(year, month - 1, day, 12, 0, 0); // Noon local time

    document.getElementById('appointment-date').textContent = formatDate(
        appointmentDate,
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
    // Si no hay productos, mostrar mensaje
    if (!state.products || state.products.length === 0) {
        elements.productsGrid.innerHTML = `
            <div class="no-products-message">
                <i class="fas fa-box-open"></i>
                <p>No hay productos disponibles en este momento</p>
            </div>
        `;
        return;
    }

    elements.productsGrid.innerHTML = state.products.map(product => {
        const stockClass = product.stock <= 0 ? 'out-of-stock' : product.stock <= 3 ? 'low-stock' : '';
        const stockText = product.stock <= 0 ? 'Agotado' : product.stock <= 3 ? `¡Solo ${product.stock}!` : `${product.stock} disponibles`;
        const isDisabled = product.stock <= 0;
        const currentQty = state.cart[product.id] || 0;

        // Mostrar imagen si existe, sino mostrar icono
        const imageHtml = product.image_url
            ? `<img src="${product.image_url}" alt="${product.name}" onerror="this.onerror=null; this.parentNode.innerHTML='<i class=\\'fas fa-pump-soap\\'></i>';">`
            : `<i class="fas fa-pump-soap"></i>`;

        return `
            <div class="product-checkout-card ${stockClass}" data-id="${product.id}">
                <div class="product-checkout-image">
                    ${imageHtml}
                </div>
                <div class="product-checkout-info">
                    <h4>${product.name}</h4>
                    <p>${product.description || 'Producto profesional'}</p>
                    <div class="product-meta">
                        <span class="product-price">$${product.price}</span>
                        <span class="product-stock ${stockClass}">${stockText}</span>
                    </div>
                </div>
                <div class="product-quantity">
                    <button class="qty-btn qty-minus" data-id="${product.id}" ${currentQty <= 0 ? 'disabled' : ''}>−</button>
                    <span class="qty-display" id="qty-${product.id}">${currentQty}</span>
                    <button class="qty-btn qty-plus" data-id="${product.id}" ${isDisabled || currentQty >= product.stock ? 'disabled' : ''}>+</button>
                </div>
            </div>
        `;
    }).join('');

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

    // Check if cortesia is selected
    const isCourtesy = state.paymentMethod === 'cortesia';

    // Calcular productos
    const productsTotal = Object.entries(state.cart).reduce((sum, [id, qty]) => {
        const product = state.products.find(p => p.id == id);
        return sum + (product ? product.price * qty : 0);
    }, 0);

    const productsCount = Object.values(state.cart).reduce((sum, qty) => sum + qty, 0);

    // Calcular descuento por membresía
    let discount = 0;
    let finalServicePrice = servicePrice;

    if (isCourtesy) {
        // Cortesía: Service is free
        discount = servicePrice;
        finalServicePrice = 0;
    } else if (state.useMembership && state.clientMemberships.length > 0) {
        discount = servicePrice;
        finalServicePrice = 0;
    }

    const total = finalServicePrice + productsTotal;

    // Actualizar DOM
    if (isCourtesy) {
        document.getElementById('summary-service-price').innerHTML = '<span style="color: var(--gold); font-weight: 600;">CORTESÍA</span>';
    } else {
        document.getElementById('summary-service-price').textContent = `$${servicePrice}`;
    }
    document.getElementById('products-count').textContent = productsCount;
    document.getElementById('summary-products-price').textContent = `$${productsTotal}`;
    document.getElementById('summary-total').textContent = `$${total}`;

    // Mostrar/ocultar descuento
    const discountRow = document.getElementById('membership-discount');
    const productsRow = document.getElementById('products-summary');

    if (discount > 0 && !isCourtesy) {
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
        // Calcular totales
        const servicePrice = parseFloat(state.checkoutData.service_price);

        // Calcular total de productos
        const productsTotal = Object.entries(state.cart).reduce((sum, [id, qty]) => {
            const product = state.products.find(p => p.id == id);
            return sum + (product ? parseFloat(product.price) * qty : 0);
        }, 0);

        // Calcular descuento
        let discount = 0;
        if (state.useMembership && state.clientMemberships.length > 0) {
            discount = servicePrice;
        }

        const total = (servicePrice + productsTotal) - discount;

        // Mapear método de pago
        // Map payment methods - cortesia has special handling
        const paymentMethodMap = {
            'efectivo': 'cash',
            'tarjeta': 'card',
            'transferencia': 'transfer',
            'cortesia': 'courtesy'
        };
        const backendPaymentMethod = paymentMethodMap[state.paymentMethod] || 'cash';

        // If courtesy, set service price to 0 (no charge for the service)
        const isCourtesy = state.paymentMethod === 'cortesia';
        const finalServiceCost = isCourtesy ? 0 : servicePrice;
        const finalTotal = isCourtesy ? productsTotal : total; // Only products if there are any

        // Preparar datos del checkout
        const checkoutPayload = {
            appointment_id: state.checkoutData.id,
            client_id: state.checkoutData.client_id,
            service_cost: finalServiceCost,
            products_cost: productsTotal,
            discount: isCourtesy ? servicePrice : discount, // Mark original price as discount for courtesy
            total: finalTotal,
            use_membership: state.useMembership,
            payment_method: backendPaymentMethod,
            is_courtesy: isCourtesy, // Flag for backend to not generate transaction
            products: Object.entries(state.cart).map(([id, qty]) => ({
                product_id: parseInt(id),
                quantity: qty
            })),
            notes: isCourtesy
                ? `SERVICIO DE CORTESÍA - Checkout desde web - Código: ${state.checkoutData.checkout_code}`
                : `Checkout desde web - Código: ${state.checkoutData.checkout_code}`
        };

        // Enviar a API
        const result = await API.completeCheckout(checkoutPayload);

        if (result.success) {
            state.completedCheckoutId = result.checkout_id || null;
            // Mostrar pantalla de éxito
            showSuccessScreen();
        } else {
            throw new Error(result.message || 'Error al procesar el pago');
        }

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
    // Si es una cita ya completada, usar datos del checkout existente
    if (state.checkoutData?.status === 'completed' && state.completedCheckoutInfo) {
        const info = state.completedCheckoutInfo;
        const paymentMethodMap = {
            'cash': 'Efectivo',
            'card': 'Tarjeta',
            'transfer': 'Transferencia',
            'membership': 'Membresía',
            'courtesy': 'Cortesía'
        };

        document.getElementById('final-total').textContent = `$${parseFloat(info.total).toFixed(0)}`;
        document.getElementById('final-method').textContent = paymentMethodMap[info.payment_method] || info.payment_method;
        document.getElementById('final-date').textContent = formatDate(new Date(info.completed_at), {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        // Calcular total final desde el carrito actual (checkout recién hecho)
        const servicePrice = (state.useMembership || state.paymentMethod === 'cortesia') ? 0 : state.checkoutData.service_price;
        const productsTotal = Object.entries(state.cart).reduce((sum, [id, qty]) => {
            const product = state.products.find(p => p.id == id);
            return sum + (product ? product.price * qty : 0);
        }, 0);
        const total = servicePrice + productsTotal;

        document.getElementById('final-total').textContent = `$${total}`;
        document.getElementById('final-method').textContent =
            state.paymentMethod === 'efectivo' ? 'Efectivo' :
                state.paymentMethod === 'tarjeta' ? 'Tarjeta' :
                    state.paymentMethod === 'cortesia' ? 'Cortesía' : 'Transferencia';
        document.getElementById('final-date').textContent = formatDate(new Date(), {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Ocultar code/checkout steps, mostrar éxito
    document.getElementById('step-code').classList.add('hidden');
    document.getElementById('step-checkout').classList.add('hidden');
    document.getElementById('step-success').classList.remove('hidden');

    configureReviewModule();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// RESEÑAS
// ============================================================================
function resetReviewState() {
    state.completedCheckoutId = null;
    state.completedCheckoutInfo = null;
    state.existingReview = null;
    state.selectedRating = 0;
    state.reviewSubmitted = false;
}

function resetReviewUI() {
    if (elements.reviewModule) {
        elements.reviewModule.classList.add('hidden');
    }

    // Limpiar bloque de reseña existente si existe
    const existingBlock = document.getElementById('existing-review-block');
    if (existingBlock) {
        existingBlock.remove();
    }

    // Restaurar títulos del módulo de reseña
    const reviewTitle = elements.reviewModule?.querySelector('.review-title');
    if (reviewTitle) {
        reviewTitle.textContent = 'Califica tu experiencia';
    }
    const reviewSubtitle = elements.reviewModule?.querySelector('.review-subtitle');
    if (reviewSubtitle) {
        reviewSubtitle.textContent = 'Tu reseña aparece en nuestra página principal y solo puedes enviarla una vez por checkout.';
    }

    if (elements.reviewForm) {
        elements.reviewForm.reset();
        elements.reviewForm.classList.remove('hidden');
    }

    setSelectedRating(0);
    updateReviewCounter();

    if (elements.reviewSuccessMessage) {
        elements.reviewSuccessMessage.classList.add('hidden');
    }

    if (elements.reviewErrorMessage) {
        elements.reviewErrorMessage.classList.add('hidden');
        elements.reviewErrorMessage.textContent = '';
    }

    if (elements.btnSubmitReview) {
        elements.btnSubmitReview.disabled = false;
        elements.btnSubmitReview.textContent = 'Enviar Reseña';
    }

    if (elements.reviewComment) {
        elements.reviewComment.disabled = false;
    }

    elements.reviewStars.forEach(star => {
        star.disabled = false;
    });
}

function setSelectedRating(rating) {
    state.selectedRating = rating;
    elements.reviewStars.forEach(star => {
        const starRating = Number(star.dataset.rating);
        star.classList.toggle('active', starRating <= rating);
    });
}

function updateReviewCounter() {
    if (!elements.reviewCounter || !elements.reviewComment) return;
    const length = elements.reviewComment.value.trim().length;
    elements.reviewCounter.textContent = `${length}/500`;
}

function configureReviewModule() {
    resetReviewUI();

    const canReview = state.completedCheckoutId && state.checkoutData?.client_id;
    if (!canReview || !elements.reviewModule) {
        return;
    }

    elements.reviewModule.classList.remove('hidden');

    // Si ya existe una reseña, mostrarla en modo lectura
    if (state.existingReview) {
        showExistingReview(state.existingReview);
    }
}

// ============================================================================
// MOSTRAR RESEÑA EXISTENTE (MODO LECTURA)
// ============================================================================
function showExistingReview(review) {
    // Ocultar el formulario
    if (elements.reviewForm) {
        elements.reviewForm.classList.add('hidden');
    }

    // Mostrar las estrellas en modo lectura
    setSelectedRating(review.rating);
    elements.reviewStars.forEach(star => {
        star.disabled = true;
    });

    // Crear/mostrar el bloque de reseña existente
    let existingBlock = document.getElementById('existing-review-block');
    if (!existingBlock) {
        existingBlock = document.createElement('div');
        existingBlock.id = 'existing-review-block';
        existingBlock.className = 'existing-review-block';
        elements.reviewModule.appendChild(existingBlock);
    }

    const reviewDate = formatDate(new Date(review.created_at), {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    existingBlock.innerHTML = `
        <div class="existing-review-stars" style="text-align: center; margin-bottom: 0.5rem;">
            ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
        </div>
        <p class="existing-review-comment" style="font-style: italic; color: var(--text-secondary); text-align: center; margin-bottom: 0.5rem;">"${review.comment}"</p>
        <p class="existing-review-date" style="font-size: 0.8rem; color: var(--text-muted); text-align: center;">${reviewDate}</p>
    `;
    existingBlock.style.cssText = 'padding: 1rem; border: 1px solid var(--gold-dim, #b8860b33); border-radius: 8px; margin-top: 1rem;';

    // Cambiar título del módulo
    const reviewTitle = elements.reviewModule.querySelector('.review-title');
    if (reviewTitle) {
        reviewTitle.textContent = 'Tu reseña';
    }
    const reviewSubtitle = elements.reviewModule.querySelector('.review-subtitle');
    if (reviewSubtitle) {
        reviewSubtitle.textContent = '¡Gracias por compartir tu experiencia!';
    }

    // Ocultar mensajes de éxito/error
    if (elements.reviewSuccessMessage) {
        elements.reviewSuccessMessage.classList.add('hidden');
    }
    if (elements.reviewErrorMessage) {
        elements.reviewErrorMessage.classList.add('hidden');
    }
}

async function submitReview() {
    if (!state.completedCheckoutId) {
        showToast('No se encontró el checkout para registrar tu reseña', 'error');
        return;
    }

    if (state.selectedRating < 1 || state.selectedRating > 5) {
        showToast('Selecciona una calificación de 1 a 5 estrellas', 'error');
        return;
    }

    const comment = elements.reviewComment?.value.trim() || '';
    if (comment.length < 8) {
        showToast('Escribe un comentario de al menos 8 caracteres', 'error');
        return;
    }

    const submitBtn = elements.btnSubmitReview;
    const originalText = submitBtn ? submitBtn.textContent : 'Enviar Reseña';

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
    }

    if (elements.reviewErrorMessage) {
        elements.reviewErrorMessage.classList.add('hidden');
        elements.reviewErrorMessage.textContent = '';
    }

    try {
        const response = await API.submitReview({
            checkout_id: state.completedCheckoutId,
            client_id: state.checkoutData.client_id,
            rating: state.selectedRating,
            comment
        });

        if (!response.success) {
            throw new Error(response.message || 'No se pudo guardar la reseña');
        }

        state.reviewSubmitted = true;

        if (elements.reviewSuccessMessage) {
            elements.reviewSuccessMessage.classList.remove('hidden');
        }

        if (elements.reviewForm) {
            elements.reviewForm.classList.add('hidden');
        }

        showToast('Gracias por tu reseña', 'success');
    } catch (error) {
        const message = error.message || 'No se pudo enviar la reseña';

        if (elements.reviewErrorMessage) {
            elements.reviewErrorMessage.textContent = message;
            elements.reviewErrorMessage.classList.remove('hidden');
        }

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}
