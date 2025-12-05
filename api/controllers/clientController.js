import Client from '../models/Client.js';
import { AppError } from '../middleware/errorHandler.js';

export const clientController = {
  // GET /api/clients - Obtener todos los clientes
  async getAll(req, res, next) {
    try {
      const { search, limit } = req.query;
      const clients = await Client.getAll({ search, limit });
      res.json({
        success: true,
        data: clients,
        count: clients.length
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/clients/:id - Obtener cliente por ID
  async getById(req, res, next) {
    try {
      const client = await Client.getById(req.params.id);
      if (!client) {
        throw new AppError('Cliente no encontrado', 404);
      }
      res.json({
        success: true,
        data: client
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/clients/phone/:phone - Buscar cliente por teléfono
  async getByPhone(req, res, next) {
    try {
      const client = await Client.getByPhone(req.params.phone);
      res.json({
        success: true,
        data: client || null
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/clients/:id/appointments - Obtener historial de citas
  async getAppointments(req, res, next) {
    try {
      const appointments = await Client.getAppointmentHistory(req.params.id);
      res.json({
        success: true,
        data: appointments
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/clients/:id/memberships - Obtener membresías activas
  async getMemberships(req, res, next) {
    try {
      const memberships = await Client.getActiveMemberships(req.params.id);
      res.json({
        success: true,
        data: memberships
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/clients - Crear cliente
  async create(req, res, next) {
    try {
      // Verificar si el teléfono ya existe
      const existing = await Client.getByPhone(req.body.phone);
      if (existing) {
        throw new AppError('Ya existe un cliente con este teléfono', 409);
      }

      const client = await Client.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        data: client
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/clients/:id - Actualizar cliente
  async update(req, res, next) {
    try {
      const client = await Client.update(req.params.id, req.body);
      if (!client) {
        throw new AppError('Cliente no encontrado', 404);
      }
      res.json({
        success: true,
        message: 'Cliente actualizado exitosamente',
        data: client
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/clients/:id - Eliminar cliente
  async delete(req, res, next) {
    try {
      const client = await Client.delete(req.params.id);
      if (!client) {
        throw new AppError('Cliente no encontrado', 404);
      }
      res.json({
        success: true,
        message: 'Cliente eliminado exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }
};

export default clientController;
