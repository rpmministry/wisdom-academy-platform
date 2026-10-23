# ==============================================================================
# PROYECTO: Wisdom Academy Platform - Protocolo de Pruebas Fase 1 (PowerShell)
# ARCHIVO: scripts/test-phase-1.ps1
#
# PROPÓSITO ARQUITECTÓNICO:
# Ejecuta las pruebas de aceptación del Exit Gate 1 en entornos Windows PowerShell.
# ==============================================================================

Write-Host "======================================================================" -ForegroundColor Yellow
Write-Host "    WISDOM ACADEMY - SUITE DE VALIDACIÓN FASE 1 (EXIT GATE 1)         " -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Yellow

npx tsx scripts/test-phase-1.ts
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[EXIT GATE 1 COMPLETADO]: Todas las pruebas pasaron satisfactoriamente.`n" -ForegroundColor Green
} else {
    Write-Host "`n[EXIT GATE 1 ERROR]: Se detectaron fallos en la verificación.`n" -ForegroundColor Red
    exit 1
}

