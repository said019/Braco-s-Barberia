-- Add usage_cost to services if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='usage_cost') THEN 
        ALTER TABLE services ADD COLUMN usage_cost INTEGER DEFAULT 1; 
    END IF; 
END $$;

-- Update DÚO usage cost to 2 (ID 11 confirmed)
UPDATE services SET usage_cost = 2 WHERE id = 11;

-- Modify membership_types columns
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='membership_types' AND column_name='applicable_service_id') THEN 
        ALTER TABLE membership_types DROP COLUMN applicable_service_id; 
    END IF; 
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='membership_types' AND column_name='applicable_services') THEN 
        ALTER TABLE membership_types ADD COLUMN applicable_services INTEGER[]; 
    END IF; 
END $$;

-- Clear old data (safe as per user request to restructure)
DELETE FROM membership_types;

-- Insert new Membership Types
INSERT INTO membership_types 
(name, description, total_services, validity_days, price, applicable_services, is_transferable, is_active, display_order, client_type_id) 
VALUES
('Golden Card Corte', '6 servicios de corte caballero + barba. Inversión de $1500. Intransferible.', 6, 36500, 1500.00, '{1, 3}', false, true, 1, 2),
('Golden Card NeoCapilar', '8 servicios de Tratamiento Integral Capilar (TIC). Compra 7 te regala 1. Inversión de $3850. Intransferible.', 8, 36500, 3850.00, '{6}', false, true, 2, 2),
('Black Card', '12 servicios. Paga 11 te regala 12. Transferible. Incluye: Corte, Barba, Mascarillas, Manicure, Pedicure.', 12, 36500, 3300.00, '{1, 3, 7, 8, 9, 10, 11, 12}', true, true, 3, 3);
