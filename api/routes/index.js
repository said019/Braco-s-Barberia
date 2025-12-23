import express from 'express';
import servicesRoutes from './services.js';
import clientsRoutes from './clients.js';
import appointmentsRoutes from './appointments.js';
import availabilityRoutes from './availability.js';
import adminRoutes from './admin.js';
import checkoutRoutes from './checkout.js';
import productsRoutes from './products.js';
import publicRoutes from './public.js';
import systemRoutes from './system.js'; // Added system routes import
import webhookRoutes from './webhook.js';

const router = express.Router();

// Ruta de health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: "Braco's Barbería API está funcionando",
    timestamp: new Date().toISOString()
  });
});

// Montar rutas
router.use('/services', servicesRoutes);
router.use('/clients', clientsRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/availability', availabilityRoutes);
router.use('/admin', adminRoutes);
router.use('/public', publicRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/products', productsRoutes);

router.use('/system', systemRoutes); // TEMPORARY SYSTEM ROUTES
router.use('/webhooks', webhookRoutes);

export default router;

