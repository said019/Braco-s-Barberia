#!/bin/bash

# Script para agregar columnas de preferencias de notificación
# Ejecutar desde la raíz del proyecto

echo "🔧 Agregando columnas de preferencias de notificación..."

# Cargar variables de entorno
source .env

# Ejecutar migración
if [ "$USE_REMOTE" = "true" ]; then
    echo "📡 Conectando a base de datos remota..."
    psql "$REMOTE_DATABASE_URL" -f database/add_notification_preferences.sql
else
    echo "💻 Conectando a base de datos local..."
    psql -h localhost -U "$DB_USER" -d "$DB_NAME" -f database/add_notification_preferences.sql
fi

if [ $? -eq 0 ]; then
    echo "✅ Migración completada exitosamente"
    echo ""
    echo "📋 Se agregaron las siguientes columnas a la tabla 'clients':"
    echo "   - whatsapp_enabled (BOOLEAN, default: TRUE)"
    echo "   - email_enabled (BOOLEAN, default: TRUE)"
    echo ""
    echo "💡 Todos los clientes existentes ahora tienen notificaciones activadas por defecto."
else
    echo "❌ Error ejecutando migración"
    exit 1
fi
