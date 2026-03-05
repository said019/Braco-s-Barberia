-- Tabla para solicitudes de certificados de regalo desde el sitio público
-- Clientes llenan el formulario → admin recibe y crea el certificado real

CREATE TABLE IF NOT EXISTS gift_certificate_requests (
    id                  SERIAL PRIMARY KEY,
    buyer_name          VARCHAR(100) NOT NULL,
    buyer_phone         VARCHAR(20)  NOT NULL,
    recipient_name      VARCHAR(100) NOT NULL,
    recipient_phone     VARCHAR(20),
    sender_label        VARCHAR(100) NOT NULL,  -- Cómo aparece: "tu papá", "tu tío"
    services_requested  TEXT NOT NULL,           -- Servicios solicitados (texto)
    personal_message    TEXT,
    status              VARCHAR(20)  NOT NULL DEFAULT 'pending',
        -- pending: esperando contacto con el comprador
        -- in_progress: admin ya habló con el comprador
        -- completed: certificado creado y enviado
        -- cancelled: cancelado
    admin_notes         TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gcr_status     ON gift_certificate_requests(status);
CREATE INDEX IF NOT EXISTS idx_gcr_buyer      ON gift_certificate_requests(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_gcr_created_at ON gift_certificate_requests(created_at DESC);
