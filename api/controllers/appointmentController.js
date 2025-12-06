import Appointment from '../models/Appointment.js';
import Service from '../models/Service.js';
import Client from '../models/Client.js';
import { AppError } from '../middleware/errorHandler.js';

export const appointmentController = {
  // GET /api/appointments - Obtener citas con filtros
  async getAll(req, res, next) {
    try {
      const { date, status, clientId, startDate, endDate } = req.query;
      const appointments = await Appointment.getAll({
        date,
        status,
        clientId,
        startDate,
        endDate
      });
      res.json({
        success: true,
        data: appointments,
        count: appointments.length
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/appointments/today - Obtener citas de hoy
  async getToday(req, res, next) {
    try {
      const appointments = await Appointment.getToday();
      res.json({
        success: true,
        data: appointments
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/appointments/:id - Obtener cita por ID
  async getById(req, res, next) {
    try {
      const appointment = await Appointment.getById(req.params.id);
      if (!appointment) {
        throw new AppError('Cita no encontrada', 404);
      }
      res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/appointments/available-slots - Obtener horarios disponibles
  async getAvailableSlots(req, res, next) {
    try {
      const { date, serviceId } = req.query;

      if (!date || !serviceId) {
        throw new AppError('Fecha y servicio son requeridos', 400);
      }

      const service = await Service.getById(serviceId);
      if (!service) {
        throw new AppError('Servicio no encontrado', 404);
      }

      const slots = await Appointment.getAvailableSlots(date, service.duration_minutes);

      res.json({
        success: true,
        data: {
          date,
          service: {
            id: service.id,
            name: service.name,
            duration: service.duration_minutes
          },
          slots
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/appointments - Crear cita
  async create(req, res, next) {
    try {
      const { client_id, service_id, appointment_date, start_time, notes } = req.body;
      let { end_time } = req.body;

      // Verificar que el servicio existe
      const service = await Service.getById(service_id);
      if (!service) {
        throw new AppError('Servicio no encontrado', 404);
      }

      // Verificar que el cliente existe
      const client = await Client.getById(client_id);
      if (!client) {
        throw new AppError('Cliente no encontrado', 404);
      }

      // Calcular end_time si no se proporciona
      if (!end_time) {
        const [hours, minutes] = start_time.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + service.duration_minutes;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        end_time = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
      }

      // Verificar disponibilidad
      const isAvailable = await Appointment.checkAvailability(
        appointment_date,
        start_time,
        end_time
      );

      if (!isAvailable) {
        throw new AppError('El horario seleccionado no está disponible', 409);
      }

      const appointment = await Appointment.create({
        client_id,
        service_id,
        appointment_date,
        start_time,
        end_time,
        notes
      });

      res.status(201).json({
        success: true,
        message: 'Cita creada exitosamente',
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/appointments/:id - Actualizar cita
  async update(req, res, next) {
    try {
      const { appointment_date, start_time, end_time } = req.body;

      // Si se está cambiando la fecha/hora, verificar disponibilidad
      if (appointment_date || start_time || end_time) {
        const current = await Appointment.getById(req.params.id);
        if (!current) {
          throw new AppError('Cita no encontrada', 404);
        }

        const newDate = appointment_date || current.appointment_date;
        const newStart = start_time || current.start_time;
        const newEnd = end_time || current.end_time;

        const isAvailable = await Appointment.checkAvailability(
          newDate,
          newStart,
          newEnd,
          req.params.id
        );

        if (!isAvailable) {
          throw new AppError('El horario seleccionado no está disponible', 409);
        }
      }

      const appointment = await Appointment.update(req.params.id, req.body);

      res.json({
        success: true,
        message: 'Cita actualizada exitosamente',
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/appointments/:id/status - Actualizar estado
  async updateStatus(req, res, next) {
    try {
      const { status, reason } = req.body;
      const appointment = await Appointment.updateStatus(req.params.id, status, reason);

      if (!appointment) {
        throw new AppError('Cita no encontrada', 404);
      }

      res.json({
        success: true,
        message: `Cita ${status === 'cancelled' ? 'cancelada' : 'actualizada'} exitosamente`,
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/appointments/:id/confirm - Confirmar cita
  async confirm(req, res, next) {
    try {
      const appointment = await Appointment.confirm(req.params.id);
      if (!appointment) {
        throw new AppError('Cita no encontrada', 404);
      }
      res.json({
        success: true,
        message: 'Cita confirmada exitosamente',
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/appointments/:id/cancel - Cancelar cita
  async cancel(req, res, next) {
    try {
      const { reason } = req.body;
      const appointment = await Appointment.cancel(req.params.id, reason);
      if (!appointment) {
        throw new AppError('Cita no encontrada', 404);
      }
      res.json({
        success: true,
        message: 'Cita cancelada exitosamente',
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/appointments/:id/complete - Completar cita
  async complete(req, res, next) {
    try {
      const appointment = await Appointment.complete(req.params.id);
      if (!appointment) {
        throw new AppError('Cita no encontrada', 404);
      }
      res.json({
        success: true,
        message: 'Cita completada exitosamente',
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/appointments/:id/no-show - Marcar como no show
  async markNoShow(req, res, next) {
    try {
      const appointment = await Appointment.markNoShow(req.params.id);
      if (!appointment) {
        throw new AppError('Cita no encontrada', 404);
      }
      res.json({
        success: true,
        message: 'Cita marcada como no show',
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  }
};

export default appointmentController;
