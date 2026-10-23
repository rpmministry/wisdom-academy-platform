#!/usr/bin/env bash
# ==============================================================================
# PROYECTO: Wisdom Academy Platform - Protocolo de Pruebas de la Fase 1 (Exit Gate 1)
# ARCHIVO: scripts/test-phase-1.sh
#
# PROPÓSITO ARQUITECTÓNICO:
# Verifica de manera determinista los 3 requisitos de salida (Exit Gate 1):
# 1. Existencia y completitud de los 17 activos SVG de marca en /public/brand/svg/.
# 2. Sintaxis y consistencia de orquestación en docker-compose.yml.
# 3. Creación o validación de las 14 carpetas escolares en Google Drive.
# ==============================================================================

set -e

# Códigos de colores ANSI para salida en terminal
COLOR_RESET="\033[0m"
COLOR_VERDE="\033[32m"
COLOR_ROJO="\033[31m"
COLOR_AMARILLO="\033[33m"
COLOR_AZUL="\033[34m"
COLOR_ORO="\033[38;2;197;155;39m"

echo -e "${COLOR_ORO}======================================================================${COLOR_RESET}"
echo -e "${COLOR_ORO}    WISDOM ACADEMY - SUITE DE PRUEBAS FASE 1 (EXIT GATE 1)            ${COLOR_RESET}"
echo -e "${COLOR_ORO}======================================================================${COLOR_RESET}\n"

FALLOS=0

# ------------------------------------------------------------------------------
# PRUEBA 1: Verificación de Activos Oficiales de Marca en /public/brand/
# ------------------------------------------------------------------------------
echo -e "${COLOR_AZUL}[PRUEBA 1/3] Verificando activos de marca en /public/brand/...${COLOR_RESET}"

DIR_SVG="public/brand/svg"
DIR_FAVICON="public/brand/favicon"
ARCHIVO_TOKENS="public/brand/tokens.css"

if [ ! -d "$DIR_SVG" ]; then
    echo -e "${COLOR_ROJO}✗ ERROR: El directorio $DIR_SVG no existe.${COLOR_RESET}"
    FALLOS=$((FALLOS + 1))
else
    TOTAL_SVG=$(find "$DIR_SVG" -maxdepth 1 -name "*.svg" | wc -l)
    echo -e "  Total de archivos SVG encontrados: ${COLOR_VERDE}$TOTAL_SVG / 17${COLOR_RESET}"

    # Verificación de archivos clave requeridos por el Exit Gate
    ARCHIVOS_CLAVE=(
        "wisdom-logo-horizontal-color.svg"
        "wisdom-logo-horizontal-on-dark.svg"
        "wisdom-icon-tile-gold.svg"
        "wisdom-logo-vertical-color.svg"
        "wisdom-wordmark-black.svg"
    )

    for ARCHIVO in "${ARCHIVOS_CLAVE[@]}"; do
        if [ -f "$DIR_SVG/$ARCHIVO" ]; then
            echo -e "  ✓ Encontrado: $ARCHIVO"
        else
            echo -e "${COLOR_ROJO}  ✗ Falta archivo clave: $ARCHIVO${COLOR_RESET}"
            FALLOS=$((FALLOS + 1))
        fi
    done

    if [ "$TOTAL_SVG" -ge 17 ]; then
        echo -e "${COLOR_VERDE}✓ PRUEBA 1 SUPERADA: Todos los 17 activos SVG de marca están presentes.${COLOR_RESET}\n"
    else
        echo -e "${COLOR_ROJO}✗ PRUEBA 1 FALLIDA: Se esperaban 17 archivos SVG, se encontraron $TOTAL_SVG.${COLOR_RESET}\n"
        FALLOS=$((FALLOS + 1))
    fi
fi

# ------------------------------------------------------------------------------
# PRUEBA 2: Validación de Sintaxis de docker-compose.yml
# ------------------------------------------------------------------------------
echo -e "${COLOR_AZUL}[PRUEBA 2/3] Validando configuración de docker-compose.yml...${COLOR_RESET}"

if [ ! -f "docker-compose.yml" ]; then
    echo -e "${COLOR_ROJO}✗ ERROR: docker-compose.yml no fue encontrado en la raíz.${COLOR_RESET}"
    FALLOS=$((FALLOS + 1))
else
    if command -v docker &> /dev/null; then
        if docker compose config --quiet 2>/dev/null; then
            echo -e "${COLOR_VERDE}✓ docker compose config validado con código de salida 0.${COLOR_RESET}"
            echo -e "${COLOR_VERDE}✓ PRUEBA 2 SUPERADA: Sintaxis de docker-compose.yml 100% correcta.${COLOR_RESET}\n"
        else
            echo -e "${COLOR_ROJO}✗ ERROR: docker compose config reportó errores en la sintaxis YAML.${COLOR_RESET}"
            docker compose config
            FALLOS=$((FALLOS + 1))
        fi
    else
        echo -e "${COLOR_AMARILLO}  [AVISO] El comando 'docker' no está en el PATH local actual.${COLOR_RESET}"
        echo -e "  Validando sintaxis YAML de docker-compose.yml mediante script de análisis de TypeScript..."
        if npx tsx -e "
            const fs = require('fs');
            const yaml = require('js-yaml');
            try {
                const doc = yaml.load(fs.readFileSync('docker-compose.yml', 'utf8'));
                if (doc.services && doc.services['wisdom-mariadb'] && doc.services['wisdom-moodle'] && doc.services['wisdom-openmaic']) {
                    console.log('  ✓ Servicios requeridos verificados: mariadb, moodle, openmaic.');
                    process.exit(0);
                } else {
                    process.exit(1);
                }
            } catch (e) {
                console.error(e);
                process.exit(1);
            }
        "; then
            echo -e "${COLOR_VERDE}✓ PRUEBA 2 SUPERADA: Sintaxis YAML válida y microservicios completos.${COLOR_RESET}\n"
        else
            echo -e "${COLOR_ROJO}✗ PRUEBA 2 FALLIDA: Error al validar estructura de docker-compose.yml.${COLOR_RESET}\n"
            FALLOS=$((FALLOS + 1))
        fi
    fi
fi

# ------------------------------------------------------------------------------
# PRUEBA 3: Inicialización y Verificación de las 14 Carpetas Escolares en Drive
# ------------------------------------------------------------------------------
echo -e "${COLOR_AZUL}[PRUEBA 3/3] Ejecutando script de inicialización de Google Drive...${COLOR_RESET}"

if npx tsx scripts/init-google-drive-folders.ts; then
    echo -e "${COLOR_VERDE}✓ PRUEBA 3 SUPERADA: Estructura de 14 años escolares y curriculo_anual.json inicializados con éxito.${COLOR_RESET}\n"
else
    echo -e "${COLOR_ROJO}✗ PRUEBA 3 FALLIDA: Falló la ejecución de scripts/init-google-drive-folders.ts.${COLOR_RESET}\n"
    FALLOS=$((FALLOS + 1))
fi

# ------------------------------------------------------------------------------
# REPORTE FINAL DEL EXIT GATE 1
# ------------------------------------------------------------------------------
echo -e "${COLOR_ORO}======================================================================${COLOR_RESET}"
if [ $FALLOS -eq 0 ]; then
    echo -e "${COLOR_VERDE} ★★★ EXIT GATE 1 APROBADO: TODAS LAS PRUEBAS DE LA FASE 1 PASARON CON ÉXITO ★★★${COLOR_RESET}"
    echo -e "${COLOR_ORO}======================================================================${COLOR_RESET}"
    exit 0
else
    echo -e "${COLOR_ROJO} ⚠ EXIT GATE 1 NO APROBADO: Se detectaron $FALLOS error(es). Revisa los registros arriba.${COLOR_RESET}"
    echo -e "${COLOR_ORO}======================================================================${COLOR_RESET}"
    exit 1
fi

