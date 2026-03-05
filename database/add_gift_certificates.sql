-- =============================================
-- CERTIFICADOS DE REGALO - BRACO'S BARBERÍA
-- =============================================

CREATE TABLE IF NOT EXISTS gift_certificates (
    id            SERIAL PRIMARY KEY,
    uuid          UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,

    -- Quien compra
    buyer_name    VARCHAR(100) NOT NULL,
    buyer_phone   VARCHAR(20)  NOT NULL,
    buyer_email   VARCHAR(100),

    -- Para quién va el regalo
    recipient_name  VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(20),

    -- Cómo aparecerá el remitente en el certificado (ej: "tu papá", "tu tío")
    sender_label  VARCHAR(100),

    -- Servicios incluidos (array de objetos {id, name, price})
    services      JSONB        NOT NULL DEFAULT '[]',
    total         DECIMAL(10,2) NOT NULL,

    -- Pago
    payment_method VARCHAR(20) NOT NULL DEFAULT 'efectivo'
        CHECK (payment_method IN ('efectivo', 'tarjeta', 'transferencia')),

    -- Estado del certificado
    status        VARCHAR(20)  NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),

    -- Fechas
    redeemed_at   TIMESTAMP,
    expires_at    DATE         GENERATED ALWAYS AS
                  (CAST(created_at AS DATE) + INTERVAL '6 months') STORED,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    -- Notas internas
    notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_gift_certificates_uuid   ON gift_certificates(uuid);
CREATE INDEX IF NOT EXISTS idx_gift_certificates_status ON gift_certificates(status);
CREATE INDEX IF NOT EXISTS idx_gift_certificates_buyer  ON gift_certificates(buyer_phone);
