---
name: engineering-evidence-capture
description: Procedimiento estandarizado para capturar, estructurar y validar evidencia de pruebas y verificaciones técnicas para el Engineering Brain.
---

# Captura de Evidencia de Ingeniería

<!-- managed-by: alsiztech-engineering-brain -->

Esta skill establece el protocolo obligatorio para capturar evidencia técnica auditable generada durante el desarrollo o prueba de este proyecto.

## Requisitos de un paquete de evidencia válido

Un resultado `PASS` para el Engineering Brain exige estrictamente:
1. Comando de prueba real ejecutado.
2. Salida completa (stdout/stderr) capturada en un artefacto.
3. Código de salida `0`.
4. Huella criptográfica SHA-256 del artefacto generado.
5. Referencia a la versión (commit Git o snapshot manifest) del código probado.

## Pasos para capturar evidencia

1. **Ejecutar comando**: Ejecuta la prueba o suite dirigida en este proyecto.
2. **Generar reporte**: Redirige la salida a un archivo en una ruta controlada.
3. **Calcular SHA-256**: Obtén el hash SHA-256 del archivo de salida.
4. **Construir manifiesto**: Estructura el archivo JSON de evidencia conforme a `schemas/evidence.schema.json` del Engineering Brain.
5. **Validar**: Valida el manifiesto desde la raíz central con:
   ```powershell
   npm run brain:evidence:validate -- <ruta-al-archivo-evidence.json>
   ```

## Advertencia de seguridad

- Nunca incluyas tokens, claves de API, secretos ni credenciales en los archivos de evidencia.
- Utiliza variables de entorno o marcas de redacción para datos sensibles.
