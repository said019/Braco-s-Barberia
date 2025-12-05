#!/bin/bash

# =============================================
# Script de Instalación Completa
# Braco's Barbería - Sistema completo
# =============================================

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════╗"
echo "║  BRACO'S BARBERÍA - INSTALACIÓN COMPLETA     ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# 1. Verificar/Instalar Homebrew
echo -e "${YELLOW}→ Paso 1: Verificando Homebrew...${NC}"
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}→ Homebrew no está instalado. Instalando...${NC}"
    echo -e "${RED}⚠ Se te pedirá tu contraseña de administrador${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Configurar PATH para Homebrew
    if [[ $(uname -m) == 'arm64' ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/usr/local/bin/brew shellenv)"
    fi
    
    echo -e "${GREEN}✓ Homebrew instalado${NC}"
else
    echo -e "${GREEN}✓ Homebrew ya está instalado${NC}"
fi

# 2. Instalar PostgreSQL
echo -e "${YELLOW}→ Paso 2: Instalando PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    brew install postgresql@16
    brew services start postgresql@16
    
    # Agregar PostgreSQL al PATH
    if [[ $(uname -m) == 'arm64' ]]; then
        echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
        export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
    else
        echo 'export PATH="/usr/local/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
        export PATH="/usr/local/opt/postgresql@16/bin:$PATH"
    fi
    
    echo -e "${GREEN}✓ PostgreSQL instalado${NC}"
    echo -e "${YELLOW}⚠ Esperando 5 segundos para que PostgreSQL inicie...${NC}"
    sleep 5
else
    echo -e "${GREEN}✓ PostgreSQL ya está instalado${NC}"
fi

# 3. Instalar Node.js
echo -e "${YELLOW}→ Paso 3: Instalando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    brew install node@20
    
    if [[ $(uname -m) == 'arm64' ]]; then
        echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
        export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
    else
        echo 'export PATH="/usr/local/opt/node@20/bin:$PATH"' >> ~/.zshrc
        export PATH="/usr/local/opt/node@20/bin:$PATH"
    fi
    
    echo -e "${GREEN}✓ Node.js instalado${NC}"
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js ya está instalado (${NODE_VERSION})${NC}"
fi

# 4. Crear base de datos
DB_NAME="bracos_barberia"
echo -e "${YELLOW}→ Paso 4: Configurando base de datos...${NC}"

# Recargar el PATH
source ~/.zshrc 2>/dev/null || true

if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw ${DB_NAME}; then
    echo -e "${YELLOW}⚠ La base de datos '${DB_NAME}' ya existe${NC}"
else
    createdb ${DB_NAME} 2>/dev/null || {
        echo -e "${RED}✗ Error al crear la base de datos${NC}"
        echo -e "${YELLOW}Intenta ejecutar manualmente:${NC}"
        echo -e "  ${GREEN}createdb ${DB_NAME}${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ Base de datos creada${NC}"
fi

# 5. Ejecutar schema
echo -e "${YELLOW}→ Paso 5: Creando tablas...${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
psql -d ${DB_NAME} -f "${SCRIPT_DIR}/schema.sql" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Schema ejecutado correctamente${NC}"
else
    echo -e "${RED}✗ Error ejecutando el schema${NC}"
    exit 1
fi

# 6. Mostrar resumen
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${GREEN}  ✓ INSTALACIÓN COMPLETADA                    ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📦 Software instalado:${NC}"
echo -e "  ✓ Homebrew"
echo -e "  ✓ PostgreSQL 16"
echo -e "  ✓ Node.js $(node -v 2>/dev/null || echo 'pendiente')"
echo ""
echo -e "${YELLOW}🗄️ Base de datos:${NC}"
echo -e "  • Nombre: ${GREEN}${DB_NAME}${NC}"
echo -e "  • Host: ${GREEN}localhost${NC}"
echo -e "  • Puerto: ${GREEN}5432${NC}"
echo ""

# Mostrar datos cargados
SERVICES=$(psql -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM services;" 2>/dev/null | xargs)
CATEGORIES=$(psql -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM service_categories;" 2>/dev/null | xargs)
PRODUCTS=$(psql -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM products;" 2>/dev/null | xargs)

echo -e "${YELLOW}📊 Datos cargados:${NC}"
echo -e "  • ${SERVICES} servicios"
echo -e "  • ${CATEGORIES} categorías"
echo -e "  • ${PRODUCTS} productos"
echo -e "  • 3 tipos de membresía"
echo -e "  • 7 días de horarios configurados"
echo ""
echo -e "${YELLOW}🔗 Comandos útiles:${NC}"
echo -e "  Conectar a DB: ${GREEN}psql -d ${DB_NAME}${NC}"
echo -e "  Ver tablas: ${GREEN}psql -d ${DB_NAME} -c '\\dt'${NC}"
echo -e "  Ver servicios: ${GREEN}psql -d ${DB_NAME} -c 'SELECT * FROM services;'${NC}"
echo ""
echo -e "${YELLOW}⚠ IMPORTANTE: ${NC}"
echo -e "  Ejecuta ${GREEN}source ~/.zshrc${NC} para recargar el PATH"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
