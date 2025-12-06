// Middleware para manejo centralizado de errores
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Error de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Error de validación',
      message: 'Error de validación',
      errors: err.errors
    });
  }

  // Error de base de datos
  if (err.code) {
    // Violación de constraint único
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'El registro ya existe',
        message: 'El registro ya existe',
        detail: err.detail
      });
    }

    // Violación de foreign key
    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        error: 'Referencia inválida en la base de datos',
        message: 'Referencia inválida en la base de datos',
        detail: err.detail
      });
    }

    // Violación de not null
    if (err.code === '23502') {
      return res.status(400).json({
        success: false,
        error: 'Campo requerido faltante',
        message: 'Campo requerido faltante',
        detail: err.detail
      });
    }
  }

  // Error JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token inválido',
      message: 'Token inválido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expirado',
      message: 'Token expirado'
    });
  }

  // Error por defecto
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Error interno del servidor',
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Middleware para rutas no encontradas
export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
};

// Clase de error personalizado
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default {
  errorHandler,
  notFound,
  AppError
};
