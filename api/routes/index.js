import express from 'express';
import servicesRoutes from './services.js';
import clientsRoutes from './clients.js';
import appointmentsRoutes from './appointments.js';
import availabilityRoutes from './availability.js';
import adminRoutes from './admin.js';
import checkoutRoutes from './checkout.js';

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
router.use('/checkout', checkoutRoutes);

export default router;

