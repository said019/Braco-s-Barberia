#!/bin/bash

# Configuración
LOCAL_DB_NAME="bracos_barberia"
DUMP_FILE="local_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "╔══════════════════════════════════════════════╗"
echo "║     MIGRACIÓN DE DATOS LOCAL -> REMOTO       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Verificar herramientas
if ! command -v pg_dump &> /dev/null; then
    echo "❌ Error: pg_dump no está instalado."
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql no está instalado."
    exit 1
fi

echo "1. Creando respaldo de la base de datos local ($LOCAL_DB_NAME)..."
# Dump data only usually safer for migrations if schema is already there, 
# but for a fresh remote DB, complete dump (schema + data) is better.
# We'll do a full dump but with --no-owner --no-acl to avoid permission issues.
pg_dump --no-owner --no-acl -h localhost -d "$LOCAL_DB_NAME" > "$DUMP_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Error al crear el respaldo local. Verifica que postgres esté corriendo."
    exit 1
fi

echo "✅ Respaldo creado: $DUMP_FILE"
echo ""
echo "2. Ahora necesitamos conectarnos a la base de datos remota (Railway)."
echo "   Por favor, pega la 'DATABASE_PUBLIC_URL' de Railway."
echo "   Debe verse como: postgresql://postgres:password@host:port/railway"
echo ""
read -p "Pegar URL aquí: " REMOTE_URL

if [ -z "$REMOTE_URL" ]; then
    echo "❌ URL vacía. Cancelando."
    rm "$DUMP_FILE"
    exit 1
fi

echo ""
echo "3. Restaurando datos en el servidor remoto..."
echo "   ⚠️  ESTO SOBREESCRIBIRÁ LOS DATOS EN EL REMOTO."
echo "   ⏳ Esto puede tardar unos segundos..."

psql "$REMOTE_URL" < "$DUMP_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Migración completada exitosamente!"
    echo "   Tus datos locales ahora están en Railway."
else
    echo ""
    echo "❌ Hubo errores durante la restauración."
    echo "   Revisa los mensajes de error arriba."
fi

# Limpieza
# rm "$DUMP_FILE" # Opcional: descomentar para borrar el archivo temporal
echo ""
echo "El archivo de respaldo se guardó como: $DUMP_FILE"
