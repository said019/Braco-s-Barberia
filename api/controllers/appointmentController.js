import Appointment from '../models/Appointment.js';
import Service from '../models/Service.js';
import Client from '../models/Client.js';
import { AppError } from '../middleware/errorHandler.js';
import emailService from '../services/emailService.js';
import whatsappService from '../services/whatsappService.js';
import * as googleCalendar from '../services/googleCalendarService.js';
import db from '../config/database.js';

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

  // GET /api/appointments/by-code/:code - Buscar cita por código de cliente o checkout
  async getByCheckoutCode(req, res, next) {
    try {
      const { code } = req.params;

      if (!code || code.length !== 4) {
        throw new AppError('Código inválido', 400);
      }

      // Solo buscar por código de cliente (ya no se acepta checkout_code)
      const appointment = await Appointment.getByClientCode(code);

      if (!appointment) {
        throw new AppError('No se encontró ninguna cita pendiente con ese código de cliente', 404);
      }

      res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/appointments - Crear cita
  async create(req, res, next) {
    try {
      const { client_id, service_id, appointment_date, start_time, notes, email, is_full_payment } = req.body;
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
        notes,
        status: req.body.status // Pass status if provided (e.g., 'pending')
      });

      console.log(`[CREATE APPT] Created: ID=${appointment.id}, Code=${appointment.checkout_code}, ClientID=${client_id}, Status=${appointment.status}`);

      // ==========================================
      // SOLO ENVIAR CONFIRMACIONES SI NO ES PENDING
      // Citas 'pending' son de clientes nuevos que requieren validar depósito
      // ==========================================
      const shouldSendConfirmation = appointment.status !== 'pending';

      if (!shouldSendConfirmation) {
        console.log(`[CREATE APPT] Skipping email/WhatsApp - cita en estado PENDING (requiere validación de depósito)`);
      }

      // Send confirmation email if email provided AND enabled AND not pending
      const clientEmail = email || client.email;
      console.log(`[CREATE APPT] Attempting email to: ${clientEmail} (Provided: ${email}, Client: ${client.email})`);

      if (shouldSendConfirmation && clientEmail && client.email_enabled !== false) {
        try {
          const dateObj = new Date(appointment_date + 'T12:00:00');
          const formattedDate = dateObj.toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          });

          const emailRes = await emailService.sendBookingConfirmation({
            email: clientEmail,
            name: client.name,
            service: service.name,
            date: formattedDate,
            time: start_time,
            code: client.client_code || '----'
          });

          if (emailRes.success) console.log(`[CREATE APPT] Email SENT: ${emailRes.id}`);
          else console.error(`[CREATE APPT] Email FAILED: ${emailRes.error}`);

        } catch (emailError) {
          console.error('[CREATE APPT] Error sending booking confirmation email:', emailError);
          // Don't fail the request if email fails
        }
      } else {
        console.warn('[CREATE APPT] No email available for client, skipping notification.');
      }

      // Send WhatsApp confirmation if phone provided AND enabled AND not pending
      if (shouldSendConfirmation && client.phone && client.whatsapp_enabled !== false) {
        try {
          const dateObj = new Date(appointment_date + 'T12:00:00');
          const formattedDate = dateObj.toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          });

          const whatsappRes = await whatsappService.sendWhatsAppBookingConfirmation({
            phone: client.phone,
            name: client.name,
            service: service.name,
            date: formattedDate,
            time: start_time,
            code: client.client_code || '----'
          });

          if (whatsappRes.success) {
            console.log(`[CREATE APPT] WhatsApp SENT: ${whatsappRes.id}`);

            // Enviar políticas después de la confirmación
            setTimeout(async () => {
              try {
                const policiesRes = await whatsappService.sendPolicies(client.phone);
                if (policiesRes.success) {
                  console.log(`[CREATE APPT] Policies WhatsApp SENT: ${policiesRes.id}`);
                }
              } catch (e) {
                console.error('[CREATE APPT] Error sending policies:', e.message);
              }
            }, 2000); // Esperar 2 segundos para no saturar
          } else {
            console.error(`[CREATE APPT] WhatsApp FAILED: ${whatsappRes.error}`);
          }
        } catch (whatsappError) {
          console.error('[CREATE APPT] Error sending WhatsApp:', whatsappError);
          // Don't fail the request if WhatsApp fails
        }
      } else {
        console.warn('[CREATE APPT] No phone available for client, skipping WhatsApp.');
      }

      // ==========================================
      // NOTIFICACIÓN AL ADMIN (Validación)
      // ==========================================
      try {
        // Solo si hay teléfono de admin configurado
        if (process.env.TWILIO_ADMIN_PHONE) {
          const dateObj = new Date(appointment_date + 'T12:00:00');
          const formattedDate = dateObj.toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          });

          // Detectar si es cliente nuevo (sin visitas anteriores Y sin membresía activa)
          const hasNoVisits = !client.total_visits || client.total_visits === 0;

          // Verificar si tiene membresía activa
          const membershipCheck = await db.query(
            `SELECT 1 FROM client_memberships WHERE client_id = $1 AND status = 'active' LIMIT 1`,
            [client.id]
          );
          const hasActiveMembership = membershipCheck.rows.length > 0;

          // Solo marcar como NUEVO si no tiene visitas Y no tiene membresía
          const isNewClient = hasNoVisits && !hasActiveMembership;
          const clientIndicator = isNewClient ? '🆕 NUEVO - VALIDAR DEPÓSITO' : '';

          // Nombre del cliente con indicador si es nuevo
          const clientDisplayName = isNewClient
            ? `${client.name} (NUEVO - VALIDAR DEPÓSITO)`
            : client.name;

          console.log(`[CREATE APPT] Client ${client.name}: visits=${client.total_visits}, hasMembership=${hasActiveMembership}, isNew=${isNewClient}`);

          // Lógica de notificación al admin:
          // - Si es pago completo → SOLO enviar notificación de pago completo (cita confirmada automáticamente)
          // - Si NO es pago completo → SOLO enviar notificación de nueva cita (requiere validación)
          if (is_full_payment) {
            // Pago completo - Cita confirmada automáticamente
            await whatsappService.sendAdminFullPayment({
              clientName: client.name,
              serviceName: service.name,
              amount: `$${service.price}`,
              date: formattedDate
            });
            console.log(`[CREATE APPT] Admin Full Payment Notification SENT (auto-confirmed).`);
          } else if (isNewClient) {
            // SOLO notificar al admin si es cliente NUEVO que requiere validación
            await whatsappService.sendAdminNewAppointment({
              clientName: clientDisplayName,
              serviceName: service.name,
              date: formattedDate,
              time: start_time
            });
            console.log(`[CREATE APPT] Admin New Appointment Notification SENT. IsNewClient: ${isNewClient}`);
          } else {
            // Cliente recurrente - NO enviar notificación al admin
            console.log(`[CREATE APPT] Skipping admin notification - recurring client ${client.name}`);
          }

          // Enviar mensaje de bienvenida con código de cliente para NUEVOS clientes
          if (isNewClient && client.phone && client.client_code) {
            try {
              await whatsappService.sendWelcomeWithClientCode({
                phone: client.phone,
                name: client.name,
                clientCode: client.client_code
              });
              console.log(`[CREATE APPT] Welcome message with client code sent to ${client.name}`);
            } catch (welcomeError) {
              console.error('[CREATE APPT] Welcome message error:', welcomeError);
            }
          }
        }
      } catch (adminError) {
        console.error('[CREATE APPT] Admin Notification Error:', adminError);
      }

      // Sync to Google Calendar (don't fail if Google Calendar fails)
      try {
        const appointmentData = {
          ...appointment,
          client_name: client.name,
          client_phone: client.phone,
          service_name: service.name
        };
        await googleCalendar.createEvent(appointmentData);
        console.log(`[CREATE APPT] Synced to Google Calendar: appointment ${appointment.id}`);
      } catch (gcalError) {
        console.error('[CREATE APPT] Google Calendar sync error:', gcalError.message);
        // Continue even if sync fails
      }

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

      // Sync Google Calendar
      try {
        const fullAppointment = await Appointment.getById(req.params.id);
        await googleCalendar.updateEvent(req.params.id, fullAppointment);
        console.log(`[UPDATE APPT] Synced update to Google Calendar: ${req.params.id}`);
      } catch (gcalError) {
        console.error('[UPDATE APPT] Google Calendar sync error:', gcalError.message);
      }

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

      // Sync Google Calendar (siempre update, nunca delete para mantener historial)
      try {
        const fullAppointment = await Appointment.getById(req.params.id);
        await googleCalendar.updateEvent(req.params.id, fullAppointment);
        console.log(`[STATUS APPT] Updated Google Calendar status to ${status}: ${req.params.id}`);
      } catch (gcalError) {
        console.error('[STATUS APPT] Google Calendar sync error:', gcalError.message);
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

      // Sync Google Calendar (Update status/color)
      try {
        const fullAppointment = await Appointment.getById(req.params.id);
        await googleCalendar.updateEvent(req.params.id, fullAppointment);
      } catch (gcalError) {
        console.error('[CONFIRM APPT] Google Calendar sync error:', gcalError.message);
      }

      // Send deposit accepted email if client has email AND enabled
      const clientData = await Client.getById(appointment.client_id);

      // Helper para formatear fecha correctamente
      const formatAppointmentDate = (dateValue) => {
        let dateStr = dateValue;
        // Si es un objeto Date, convertir a ISO string
        if (dateValue instanceof Date) {
          dateStr = dateValue.toISOString().split('T')[0];
        } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
          dateStr = dateValue.split('T')[0];
        }
        // Crear fecha con hora fija para evitar problemas de timezone
        const dateObj = new Date(dateStr + 'T12:00:00');
        return dateObj.toLocaleDateString('es-MX', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
      };

      const formattedDate = formatAppointmentDate(appointment.appointment_date);

      if (appointment.client_email && clientData.email_enabled !== false) {
        try {
          await emailService.sendDepositAccepted({
            email: appointment.client_email,
            name: appointment.client_name,
            service: appointment.service_name,
            date: formattedDate,
            time: appointment.start_time,
            code: clientData.client_code || '----'
          });
        } catch (emailError) {
          console.error('Error sending deposit accepted email:', emailError);
        }
      }

      // Send WhatsApp deposit confirmation if enabled
      if (appointment.client_phone && clientData.whatsapp_enabled !== false) {
        try {
          await whatsappService.sendWhatsAppDepositAccepted({
            phone: appointment.client_phone,
            name: appointment.client_name,
            service: appointment.service_name,
            date: formattedDate,
            time: appointment.start_time,
            code: clientData.client_code || '----'
          });
          console.log('[CONFIRM APPT] WhatsApp deposit notification sent');
        } catch (whatsappError) {
          console.error('[CONFIRM APPT] Error sending WhatsApp deposit:', whatsappError);
        }
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

      // Obtener datos completos ANTES de cancelar para la notificación
      const fullAppointment = await Appointment.getById(req.params.id);
      if (!fullAppointment) {
        throw new AppError('Cita no encontrada', 404);
      }

      const appointment = await Appointment.cancel(req.params.id, reason);

      // Sync Google Calendar (Update con estado cancelado, no delete)
      try {
        await googleCalendar.updateEvent(req.params.id, appointment);
        console.log(`[CANCEL APPT] Updated Google Calendar (cancelled): ${req.params.id}`);
      } catch (gcalError) {
        console.error('[CANCEL APPT] Google Calendar sync error:', gcalError.message);
      }

      // Notificar al admin sobre la cancelación
      try {
        // Helper para formatear fecha correctamente
        const formatDate = (dateValue) => {
          let dateStr = dateValue;
          if (dateValue instanceof Date) {
            dateStr = dateValue.toISOString().split('T')[0];
          } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
            dateStr = dateValue.split('T')[0];
          }
          const dateObj = new Date(dateStr + 'T12:00:00');
          return dateObj.toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          });
        };

        const formattedDate = formatDate(fullAppointment.appointment_date);

        await whatsappService.sendAdminCancellation({
          clientName: fullAppointment.client_name,
          clientPhone: fullAppointment.client_phone,
          serviceName: fullAppointment.service_name,
          date: formattedDate,
          time: fullAppointment.start_time
        });
        console.log(`[CANCEL APPT] Admin cancellation notification sent`);
      } catch (adminError) {
        console.error('[CANCEL APPT] Admin notification error:', adminError);
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

      // Sync Google Calendar (Update color)
      try {
        const fullAppointment = await Appointment.getById(req.params.id);
        await googleCalendar.updateEvent(req.params.id, fullAppointment);
      } catch (e) { }

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

      // Sync Google Calendar (Update con estado no_show, no delete)
      try {
        const fullAppointment = await Appointment.getById(req.params.id);
        await googleCalendar.updateEvent(req.params.id, fullAppointment);
        console.log(`[NOSHOW APPT] Updated Google Calendar (no_show): ${req.params.id}`);
      } catch (gcalError) {
        console.error('[NOSHOW APPT] Google Calendar sync error:', gcalError.message);
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
