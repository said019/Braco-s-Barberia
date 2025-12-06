import { transaction } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export const Checkout = {
    // Procesar checkout completo
    async process(data) {
        console.log('Processing checkout with data:', JSON.stringify(data, null, 2));
        return transaction(async (client) => {
            const {
                appointment_id,
                client_id,
                service_cost,
                products_cost = 0,
                discount = 0,
                total,
                payment_method,
                use_membership,
                products = [],
                notes
            } = data;

            // ... (rest of code)



            // 1. Verificar estado de la cita
            const appointmentCheck = await client.query(
                'SELECT status, service_id, checkout_code FROM appointments WHERE id = $1',
                [appointment_id]
            );

            if (appointmentCheck.rows.length === 0) {
                throw new AppError('Cita no encontrada', 404);
            }

            if (['completed', 'cancelled'].includes(appointmentCheck.rows[0].status)) {
                throw new AppError('Esta cita ya ha sido procesada o cancelada', 400);
            }

            const serviceId = appointmentCheck.rows[0].service_id;
            let membershipId = null;

            // 2. Procesar membresía si se solicita
            if (use_membership) {
                // Buscar membresía activa válida para este servicio
                // Nota: Por ahora asumimos que cualquier membresía activa cubre el servicio
                // En un futuro se podría validar tipos de servicio específicos
                const membershipResult = await client.query(`
          SELECT cm.*, mt.name as membership_name 
          FROM client_memberships cm
          JOIN membership_types mt ON cm.membership_type_id = mt.id
          WHERE cm.client_id = $1 
          AND cm.status = 'active'
          AND cm.expiration_date >= CURRENT_DATE
          AND (cm.total_services - cm.used_services) > 0
          ORDER BY cm.expiration_date ASC
          LIMIT 1
        `, [client_id]);

                if (membershipResult.rows.length === 0) {
                    throw new AppError('No hay membresía activa con servicios disponibles', 400);
                }

                const membership = membershipResult.rows[0];
                membershipId = membership.id;

                // Descontar servicio
                await client.query(`
          UPDATE client_memberships 
          SET used_services = used_services + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [membershipId]);

                // Registrar uso en bitácora
                await client.query(`
          INSERT INTO membership_usage (membership_id, appointment_id, service_id, service_name)
          SELECT $1, $2, s.id, s.name
          FROM services s WHERE s.id = $3
        `, [membershipId, appointment_id, serviceId]);
            }

            // 3. Crear registro de checkout
            const checkoutResult = await client.query(`
        INSERT INTO checkouts (
          appointment_id, service_cost, products_cost, 
          discount, total, payment_method, used_membership, 
          membership_id, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, uuid
      `, [
                appointment_id, service_cost, products_cost,
                discount, total, payment_method, use_membership,
                membershipId, notes
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

            // 5. Actualizar estado de la cita
            await client.query(
                "UPDATE appointments SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [appointment_id]
            );

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
                    client_id,
                    `Pago de servicio/productos (Cita #${appointmentCheck.rows[0].checkout_code})`,
                    total,
                    payment_method
                ]);
            }

            // 7. Actualizar estadísticas del cliente
            await client.query(`
        UPDATE clients 
        SET total_visits = total_visits + 1,
            total_spent = total_spent + $1,
            last_visit_date = CURRENT_DATE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [total, client_id]);

            return {
                success: true,
                checkout_id: checkoutId,
                message: 'Checkout procesado exitosamente'
            };
        });
    }
};

export default Checkout;
