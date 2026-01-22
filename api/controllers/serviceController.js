import Service from '../models/Service.js';
import { AppError } from '../middleware/errorHandler.js';

export const serviceController = {
  // GET /api/services - Obtener todos los servicios
  async getAll(req, res, next) {
    try {
      const services = await Service.getAll();

      // Agrupar por categoría
      const grouped = services.reduce((acc, service) => {
        const category = service.category_name;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          id: service.id,
          name: service.name,
          description: service.description,
          duration_minutes: service.duration_minutes,
          price: parseFloat(service.price),
          display_order: service.display_order,
          image_url: service.image_url
        });
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          services,
          grouped
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/services/categories - Obtener categorías
  async getCategories(req, res, next) {
    try {
      const categories = await Service.getCategories();
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/services/extras - Obtener servicios extras (públicos)
  async getExtras(req, res, next) {
    try {
      const extras = await Service.getExtras();
      res.json({
        success: true,
        data: extras
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/services/:id - Obtener servicio por ID
  async getById(req, res, next) {
    try {
      const service = await Service.getById(req.params.id);
      if (!service) {
        throw new AppError('Servicio no encontrado', 404);
      }
      res.json({
        success: true,
        data: service
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/services/category/:categoryId - Obtener servicios por categoría
  async getByCategory(req, res, next) {
    try {
      const services = await Service.getByCategory(req.params.categoryId);
      res.json({
        success: true,
        data: services
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/services - Crear servicio (admin)
  async create(req, res, next) {
    try {
      const service = await Service.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Servicio creado exitosamente',
        data: service
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/services/:id - Actualizar servicio (admin)
  async update(req, res, next) {
    try {
      const service = await Service.update(req.params.id, req.body);
      if (!service) {
        throw new AppError('Servicio no encontrado', 404);
      }
      res.json({
        success: true,
        message: 'Servicio actualizado exitosamente',
        data: service
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/services/:id - Eliminar servicio (admin)
  async delete(req, res, next) {
    try {
      const service = await Service.delete(req.params.id);
      if (!service) {
        throw new AppError('Servicio no encontrado', 404);
      }
      res.json({
        success: true,
        message: 'Servicio eliminado exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }
};

export default serviceController;
