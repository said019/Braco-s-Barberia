#!/bin/bash

# =============================================
# Script de Instalación de Base de Datos
# Braco's Barbería
# =============================================

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║  BRACO'S BARBERÍA - DATABASE SETUP     ║"
echo "╔════════════════════════════════════════╗"
echo -e "${NC}"

# Verificar si PostgreSQL está instalado
echo -e "${YELLOW}→ Verificando PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${RED}✗ PostgreSQL no está instalado${NC}"
    echo -e "${YELLOW}→ Instalando PostgreSQL via Homebrew...${NC}"
    
    if ! command -v brew &> /dev/null; then
        echo -e "${RED}✗ Homebrew no está instalado. Por favor instala Homebrew primero:${NC}"
        echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    
    brew install postgresql@16
    brew services start postgresql@16
    
    # Agregar al PATH
    export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
    
    echo -e "${GREEN}✓ PostgreSQL instalado correctamente${NC}"
else
    echo -e "${GREEN}✓ PostgreSQL ya está instalado${NC}"
fi

# Verificar si el servicio está corriendo
echo -e "${YELLOW}→ Verificando servicio de PostgreSQL...${NC}"
if brew services list | grep -q "postgresql.*started"; then
    echo -e "${GREEN}✓ PostgreSQL está corriendo${NC}"
else
    echo -e "${YELLOW}→ Iniciando PostgreSQL...${NC}"
    brew services start postgresql@16
    sleep 3
    echo -e "${GREEN}✓ PostgreSQL iniciado${NC}"
fi

# Crear base de datos
DB_NAME="bracos_barberia"
echo -e "${YELLOW}→ Creando base de datos '${DB_NAME}'...${NC}"

if psql -lqt | cut -d \| -f 1 | grep -qw ${DB_NAME}; then
    echo -e "${YELLOW}⚠ La base de datos '${DB_NAME}' ya existe${NC}"
    read -p "¿Deseas eliminarla y recrearla? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        dropdb ${DB_NAME}
        echo -e "${GREEN}✓ Base de datos eliminada${NC}"
        createdb ${DB_NAME}
        echo -e "${GREEN}✓ Base de datos recreada${NC}"
    else
        echo -e "${YELLOW}→ Usando base de datos existente${NC}"
    fi
else
    createdb ${DB_NAME}
    echo -e "${GREEN}✓ Base de datos creada: ${DB_NAME}${NC}"
fi

# Ejecutar schema
echo -e "${YELLOW}→ Ejecutando schema SQL...${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
psql -d ${DB_NAME} -f "${SCRIPT_DIR}/schema.sql" > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Schema ejecutado correctamente${NC}"
else
    echo -e "${RED}✗ Error ejecutando el schema${NC}"
    exit 1
fi

# Verificar tablas creadas
echo -e "${YELLOW}→ Verificando tablas...${NC}"
TABLE_COUNT=$(psql -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
echo -e "${GREEN}✓ ${TABLE_COUNT} tablas creadas${NC}"

# Mostrar estadísticas
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ INSTALACIÓN COMPLETADA${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo -e "Base de datos: ${GREEN}${DB_NAME}${NC}"
echo -e "Host: ${GREEN}localhost${NC}"
echo -e "Puerto: ${GREEN}5432${NC}"
echo ""
echo -e "${YELLOW}Datos iniciales cargados:${NC}"

# Mostrar conteo de datos
SERVICES=$(psql -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM services;")
CATEGORIES=$(psql -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM service_categories;")
CLIENT_TYPES=$(psql -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM client_types;")
PRODUCTS=$(psql -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM products;")
MEMBERSHIPS=$(psql -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM membership_types;")

echo "  • Servicios: ${SERVICES}"
echo "  • Categorías: ${CATEGORIES}"
echo "  • Tipos de cliente: ${CLIENT_TYPES}"
echo "  • Productos: ${PRODUCTS}"
echo "  • Tipos de membresía: ${MEMBERSHIPS}"

echo ""
echo -e "${YELLOW}Para conectarte a la base de datos:${NC}"
echo -e "  ${GREEN}psql -d ${DB_NAME}${NC}"
echo ""
echo -e "${YELLOW}Para ver las tablas:${NC}"
echo -e "  ${GREEN}\\dt${NC} (dentro de psql)"
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
