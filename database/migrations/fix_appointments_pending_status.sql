-- Fix: Agregar 'pending' al CHECK constraint de appointments.status
-- Sin esto, las citas con status 'pending' (clientes nuevos con depósito) fallan al insertarse

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'));
