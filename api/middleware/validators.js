import { body, param, query, validationResult } from 'express-validator';

// Middleware para procesar resultados de validación
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Validaciones para clientes
export const validateClient = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('phone')
    .trim()
    .notEmpty().withMessage('El teléfono es requerido')
    .matches(/^\d{7,10}$/).withMessage('El teléfono debe tener entre 7 y 10 dígitos'),
  body('email')
    .optional()
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  validate
];

// Validaciones para citas
export const validateAppointment = [
  body('client_id')
    .isInt({ min: 1 }).withMessage('ID de cliente inválido'),
  body('service_id')
    .isInt({ min: 1 }).withMessage('ID de servicio inválido'),
  body('appointment_date')
    .isDate().withMessage('Fecha inválida')
    .custom((value) => {
      // Crear fechas comparables en zona horaria de México
      const inputDate = new Date(value + 'T12:00:00'); // Mediodía para evitar problemas de borde

      const nowInMexico = new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" });
      const todayMexico = new Date(nowInMexico);
      todayMexico.setHours(0, 0, 0, 0); // Inicio del día en México

      // Normalizar inputDate para comparación de solo fecha
      const checkDate = new Date(inputDate);
      checkDate.setHours(0, 0, 0, 0);

      if (checkDate < todayMexico) {
        throw new Error('No se pueden agendar citas en fechas pasadas');
      }
      return true;
    }),
  body('start_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de inicio inválida'),
  body('end_time')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de fin inválida')
    .custom((value, { req }) => {
      if (value && value <= req.body.start_time) {
        throw new Error('La hora de fin debe ser posterior a la hora de inicio');
      }
      return true;
    }),
  validate
];

// Validaciones para servicios
export const validateService = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre del servicio es requerido')
    .isLength({ max: 100 }).withMessage('El nombre no debe exceder 100 caracteres'),
  body('category_id')
    .isInt({ min: 1 }).withMessage('ID de categoría inválido'),
  body('duration_minutes')
    .isInt({ min: 15, max: 480 }).withMessage('La duración debe estar entre 15 y 480 minutos'),
  body('price')
    .isFloat({ min: 0 }).withMessage('El precio debe ser mayor o igual a 0'),
  validate
];

// Validaciones para productos
export const validateProduct = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre del producto es requerido')
    .isLength({ max: 100 }).withMessage('El nombre no debe exceder 100 caracteres'),
  body('price')
    .isFloat({ min: 0 }).withMessage('El precio debe ser mayor o igual a 0'),
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('El stock debe ser mayor o igual a 0'),
  validate
];

// Validaciones para membresías
export const validateMembership = [
  body('client_id')
    .isInt({ min: 1 }).withMessage('ID de cliente inválido'),
  body('membership_type_id')
    .isInt({ min: 1 }).withMessage('ID de tipo de membresía inválido'),
  body('payment_method')
    .isIn(['cash', 'card', 'transfer']).withMessage('Método de pago inválido'),
  body('payment_amount')
    .isFloat({ min: 0 }).withMessage('El monto debe ser mayor o igual a 0'),
  validate
];

// Validación de parámetros ID
export const validateId = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID inválido'),
  validate
];

// Validación de UUID
export const validateUuid = [
  param('uuid')
    .isUUID().withMessage('UUID inválido'),
  validate
];

// Validación de fechas para reportes
export const validateDateRange = [
  query('startDate')
    .optional()
    .isDate().withMessage('Fecha de inicio inválida'),
  query('endDate')
    .optional()
    .isDate().withMessage('Fecha de fin inválida')
    .custom((value, { req }) => {
      if (req.query.startDate && value < req.query.startDate) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
      }
      return true;
    }),
  validate
];

export default {
  validate,
  validateClient,
  validateAppointment,
  validateService,
  validateProduct,
  validateMembership,
  validateId,
  validateUuid,
  validateDateRange
};
