import { transaction } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export const Checkout = {
    // Procesar checkout completo
    async process(data) {
        console.log('Processing checkout with data:', JSON.stringify(data, null, 2));
        return transaction(async (client) => {
            const {
                appointment_id = null,
                client_id = null,
                service_cost = 0,
                products_cost = 0,
                discount = 0,
                total = 0,
                payment_method = 'cash',
                use_membership = false,
                products = [],
                notes = ''
            } = data;

            // ... (rest of code)


            // 1. Verificar estado de la cita (Si existe)
            let appointmentData = null;
            let serviceId = null;

            if (appointment_id) {
                const appointmentCheck = await client.query(
                    `SELECT status, service_id, checkout_code, deposit_required, deposit_amount, deposit_paid 
                     FROM appointments WHERE id = $1`,
                    [appointment_id]
                );

                if (appointmentCheck.rows.length === 0) {
                    throw new AppError('Cita no encontrada', 404);
                }

                appointmentData = appointmentCheck.rows[0];

                if (['completed', 'cancelled'].includes(appointmentData.status)) {
                    throw new AppError('Esta cita ya ha sido procesada o cancelada', 400);
                }
                serviceId = appointmentData.service_id;
            }

            // 1.5 Obtener datos del cliente
            let clientData = null;
            let clientName = 'Público General';
            let clientPhone = '';

            if (client_id) {
                const clientResult = await client.query('SELECT name, phone FROM clients WHERE id = $1', [client_id]);
                if (clientResult.rows.length > 0) {
                    clientData = clientResult.rows[0];
                    clientName = clientData.name;
                    clientPhone = clientData.phone;
                }
            }

            // Service ID extracted above
            let membershipId = null;

            // 3. Procesar membresía si se solicita
            if (use_membership) {
                // Buscar membresía activa válida para este servicio
                const membershipResult = await client.query(`
          SELECT cm.*, mt.name as membership_name, mt.applicable_services
          FROM client_memberships cm
          JOIN membership_types mt ON cm.membership_type_id = mt.id
          WHERE cm.client_id = $1 
          AND cm.status = 'active'
          AND (cm.expiration_date IS NULL OR cm.expiration_date >= CURRENT_DATE)
          AND (cm.total_services - cm.used_services) > 0
          AND $2 = ANY(mt.applicable_services)
          ORDER BY cm.expiration_date ASC NULLS LAST
          LIMIT 1
        `, [client_id, serviceId]);

                if (membershipResult.rows.length === 0) {
                    throw new AppError('No hay membresía activa válida para este servicio', 400);
                }

                const membership = membershipResult.rows[0];
                membershipId = membership.id;

                // Obtener costo de uso del servicio (sellos)
                const serviceInfo = await client.query('SELECT usage_cost FROM services WHERE id = $1', [serviceId]);
                const usageCost = serviceInfo.rows[0]?.usage_cost || 1;

                // Verificar si alcanzan los sellos
                if ((membership.total_services - membership.used_services) < usageCost) {
                    throw new AppError(`Membresía insuficiente. Se requieren ${usageCost} sellos, tienes ${membership.total_services - membership.used_services}`, 400);
                }

                // Descontar servicio(s)
                await client.query(`
          UPDATE client_memberships 
          SET used_services = used_services + $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [membershipId, usageCost]);

                // Registrar uso en bitácora con valor del servicio
                await client.query(`
          INSERT INTO membership_usage (
            membership_id, appointment_id, service_id, service_name,
            service_value, stamps_used
          )
          SELECT $1, $2, s.id, s.name, s.price, $4
          FROM services s WHERE s.id = $3
        `, [membershipId, appointment_id, serviceId, usageCost]);
            }

            // 4. Verificar si hay depósito pagado para aplicar como descuento
            let depositApplied = 0;

            if (appointmentData && appointmentData.deposit_paid && appointmentData.deposit_amount > 0) {
                depositApplied = Number(appointmentData.deposit_amount);
                console.log(`Aplicando depósito de $${depositApplied} como descuento`);
            }

            // Calcular total final con depósito aplicado
            const finalDiscount = Number(discount) + depositApplied;
            const finalTotal = Math.max(0, Number(total) - depositApplied);

            // Calcular subtotal (Requerido por DB producción)
            const subtotal = Number(service_cost) + Number(products_cost);

            // 5. Crear registro de checkout
            const checkoutResult = await client.query(`
        INSERT INTO checkouts (
          appointment_id, client_id, client_name, client_phone,
          service_cost, products_cost, subtotal, 
          discount, total, payment_method, used_membership, 
          membership_id, notes, deposit_applied
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, uuid
      `, [
                appointment_id, client_id, clientName, clientPhone,
                service_cost, products_cost, subtotal,
                finalDiscount, finalTotal, payment_method, use_membership,
                membershipId, notes, depositApplied
            ]);

            const checkoutId = checkoutResult.rows[0].id;

            // 4. Registrar productos vendidos
            if (products.length > 0) {
                for (const product of products) {
                    // Verificar stock
                    const stockCheck = await client.query(
                        'SELECT stock, name, price FROM products WHERE id = $1',
                        [product.product_id]
                    );

                    if (stockCheck.rows.length === 0) {
                        throw new AppError(`Producto ID ${product.product_id} no encontrado`, 404);
                    }

                    if (stockCheck.rows[0].stock < product.quantity) {
                        throw new AppError(`Stock insuficiente para ${stockCheck.rows[0].name}`, 400);
                    }

                    // Descontar stock
                    await client.query(
                        'UPDATE products SET stock = stock - $1 WHERE id = $2',
                        [product.quantity, product.product_id]
                    );

                    // Registrar en checkout_products
                    await client.query(`
            INSERT INTO checkout_products (
              checkout_id, product_id, product_name, quantity, unit_price, subtotal
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
                        checkoutId,
                        product.product_id,
                        stockCheck.rows[0].name,
                        product.quantity,
                        stockCheck.rows[0].price,
                        product.quantity * stockCheck.rows[0].price
                    ]);
                }
            }

            // 5. Actualizar estado de la cita (Si existe)
            if (appointment_id) {
                await client.query(
                    "UPDATE appointments SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                    [appointment_id]
                );
            }

            // 6. Crear transacción financiera
            // Si se usó membresía para el servicio, el monto de la transacción solo incluye productos
            // O si el total es > 0 (ej. propina o productos)
            // 6. Crear transacción financiera
            // Si se usó membresía para el servicio, el monto de la transacción solo incluye productos
            // O si el total es > 0 (ej. propina o productos)
            if (total > 0) {
                console.log('Creating transaction for client:', client_id);
                await client.query(`
          INSERT INTO transactions (
            checkout_id, client_id, type, description, 
            amount, payment_method, transaction_date
          )
          VALUES ($1, $2, 'service', $3, $4, $5, CURRENT_DATE)
        `, [
                    checkoutId,
                    client_id, // Can be null
                    appointmentData
                        ? `Pago de servicio/productos (Cita #${appointmentData.checkout_code})`
                        : `Venta de mostrador${clientName ? ' - ' + clientName : ''}`,
                    total,
                    payment_method
                ]);
            }

            // 7. Actualizar estadísticas del cliente (Si existe)
            if (client_id) {
                await client.query(`
                    UPDATE clients 
                    SET total_visits = total_visits + 1,
                        total_spent = total_spent + $1,
                        last_visit_date = CURRENT_DATE,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                `, [total, client_id]);
            }

            return {
                success: true,
                checkout_id: checkoutId,
                message: 'Checkout procesado exitosamente'
            };
        });
    }
};

export default Checkout;
