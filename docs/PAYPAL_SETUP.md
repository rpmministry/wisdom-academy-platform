# Configuración de PayPal · Wisdom Academy

**Estado:** guía operativa. No contiene credenciales reales y no habilita cobros por sí sola.  
**Arquitectura verificada:** Next.js 15 + API Routes + SQLite persistente. Ver `docs/PAYPAL_AUDIT.md` y `docs/PAYPAL_DEPLOYMENT.md`.

> **Nunca escribas el Client Secret, contraseñas o tokens en el chat, en un issue, en un commit o en una captura.**
> El Client Secret solo se configura en `.env.local` o en el panel del servidor. El Client ID es público, pero tampoco es necesario publicarlo.

## 1. Antes de empezar

Necesitas:

- Una cuenta comercial de PayPal que recibirá los pagos.
- Acceso a [PayPal Developer](https://developer.paypal.com/dashboard/).
- Un dominio HTTPS para el webhook (o un túnel HTTPS para pruebas locales).
- Node.js 24 para ejecutar la plataforma.
- Acceso al panel de variables del host (Vercel, Render, Railway, Fly.io o VPS).

La aplicación **no crea cuentas de PayPal** ni puede verificar por ti la habilitación comercial. Esa parte la completa el propietario de la cuenta.

## 2. Cuenta comercial que recibe los pagos

1. Abre [PayPal Business Ecuador](https://www.paypal.com/ec/business) o el portal de empresa de tu país.
2. Crea la cuenta comercial o inicia sesión con la cuenta que ya recibe pagos.
3. Completa la verificación de identidad, correo, teléfono y datos de empresa que PayPal solicite.
4. Confirma que la cuenta puede **recibir pagos** y que la moneda de la cuenta es compatible con **USD**.
5. Revisa las opciones de retiro, comisiones, retenciones, impuestos y límites aplicables a Ecuador directamente con PayPal.

No des por hecho que la cuenta está habilitada para cobros reales hasta que PayPal lo confirme en su panel. Wisdom Academy no puede afirmarlo desde el código.

## 3. Crear la REST API app de Sandbox

1. Entra a [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. Selecciona **Apps & Credentials** (o **Mis apps y credenciales**).
3. Asegúrate de estar en el entorno **Sandbox**, no en Live.
4. Pulsa **Create App** / **Crear app**.
5. Asigna un nombre reconocible, por ejemplo `Wisdom Academy Sandbox`.
6. Selecciona el tipo de app de comercio/merchant.
7. Crea la app y abre sus credenciales.

La app de Sandbox muestra:

- **Client ID**
- **Client Secret** (usa el botón de revelar solo cuando sea necesario)

No confundas estas credenciales con las de Live. No las mezcles entre entornos.

## 4. Crear un comprador de prueba

1. En el panel de Developer, abre **Sandbox** → **Accounts** (Cuentas).
2. Crea una cuenta de tipo **Personal** para el comprador.
3. Usa un correo y contraseña de Sandbox distintos de la cuenta comercial.
4. Confirma el correo de Sandbox si PayPal lo solicita.
5. Guarda esas credenciales de prueba en un gestor de contraseñas, no en el repositorio.

El comprador de prueba se usa para aprobar la orden en el checkout Sandbox. La cuenta comercial no debe usarse como comprador de la misma operación.

## 5. Guardar las credenciales localmente

Crea `.env.local` en la raíz del proyecto (ya está excluido por `.gitignore`):

```dotenv
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=TU_CLIENT_ID_DE_SANDBOX
PAYPAL_CLIENT_SECRET=TU_CLIENT_SECRET_DE_SANDBOX
PAYPAL_WEBHOOK_ID=TU_WEBHOOK_ID_DE_SANDBOX
PAYPAL_CURRENCY=USD
APP_URL=http://localhost:3000
```

Reglas:

- No uses el prefijo `NEXT_PUBLIC_` para `PAYPAL_CLIENT_SECRET`.
- No subas `.env.local` a Git.
- No reutilices credenciales Live en desarrollo.
- Reinicia el servidor después de cambiar variables.
- Para pruebas automatizadas con el servidor simulado, `PAYPAL_API_BASE_URL` se define solo en el proceso de pruebas; no la configures en producción.

Comprueba sin revelar valores:

```powershell
npm run check:deploy
```

Debe reconocer el modo Sandbox y advertir que no procesa cobros reales. La plataforma expone únicamente `paypalConfigured` y `paypalMode` en `/api/auth/config`.

## 6. Registrar el webhook de Sandbox

El endpoint es:

```text
https://TU_DOMINIO/api/paypal/webhook
```

En la app de Sandbox de PayPal Developer:

1. Abre la app creada.
2. Busca **Webhooks** y pulsa **Add Webhook**.
3. Pega la URL HTTPS pública. Debe ser exactamente el dominio de `APP_URL` o el que recibe el tráfico.
4. Selecciona estos eventos:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `PAYMENT.CAPTURE.REVERSED`
5. Guarda el webhook.
6. Copia el **Webhook ID** que muestra PayPal y colócalo en `PAYPAL_WEBHOOK_ID`.

El webhook debe ser accesible sin sesión de usuario. La aplicación lo protege con la verificación de firma de PayPal y con límite de frecuencia, no con la cookie de sesión.

### Importante sobre pruebas locales

La implementación usa el método oficial de **postback** (`/v1/notifications/verify-webhook-signature`). PayPal documenta que ese método **no funciona con eventos simulados del Webhooks Simulator**; requiere un webhook real de una app Sandbox y un evento generado por una transacción Sandbox. Para probar sin dominio público, usa un túnel HTTPS (por ejemplo ngrok o Cloudflare Tunnel) y un comprador Sandbox real, o valida la lógica con el servidor simulado de las pruebas automatizadas.

## 7. Aplicar variables en Vercel

Vercel separa los entornos **Development**, **Preview** y **Production**. Configura las variables una por una en **Project → Settings → Environment Variables**.

| Entorno | `PAYPAL_MODE` | Credenciales | Webhook |
|---|---|---|---|
| Development | `sandbox` | App Sandbox | Sandbox, o vacío si no se prueban webhooks |
| Preview | `sandbox` | App Sandbox | Sandbox, URL del preview |
| Production | `live` solo tras autorización | App Live | Live |

Notas:

- Un cambio de variable **no afecta** a un despliegue existente hasta que se vuelve a desplegar.
- No configures secretos en `NEXT_PUBLIC_*`.
- No actives Production Live antes de completar la lista de `docs/PAYPAL_DEPLOYMENT.md`.
- En Vercel, la base SQLite no es persistente. La aplicación bloquea Production por esta razón. Configurar PayPal en Vercel no resuelve la persistencia; ver la guía de despliegue.

## 8. Credenciales Live y webhook Live

Solo cuando el propietario lo autorice:

1. En PayPal Developer cambia de **Sandbox** a **Live**.
2. Crea una REST API app Live distinta.
3. Obtén Client ID y Client Secret Live.
4. Crea un webhook Live con la URL de producción y los mismos cuatro eventos.
5. Copia el Webhook ID Live.
6. Configura las variables Live **solo** en el entorno Production del host.
7. Vuelve a desplegar y ejecuta la validación posterior.

No copies credenciales Live a `.env.local`, Preview ni Development. No ejecutes un cobro real de prueba sin autorización expresa del propietario.

## 9. Tabla de variables

| Variable | Entorno | Dónde se obtiene | Dónde se configura | Cómo comprobar | Riesgo si falta o es incorrecta |
|---|---|---|---|---|---|
| `PAYPAL_MODE` | Todos | Elección del entorno | `.env.local` / host | `/api/auth/config` devuelve `paypalMode` | Se usa Sandbox por defecto; Live no cobra |
| `PAYPAL_CLIENT_ID` | Sandbox y Live | App REST de PayPal Developer | `.env.local` / host | `paypalConfigured: true` | No se crean órdenes PayPal |
| `PAYPAL_CLIENT_SECRET` | Sandbox y Live | App REST de PayPal Developer | Solo servidor | No debe aparecer en respuestas ni en `.next` | Falla OAuth; nunca debe exponerse |
| `PAYPAL_WEBHOOK_ID` | Sandbox y Live | Webhook de la app correspondiente | `.env.local` / host | Evento de prueba real procesado | Todos los webhooks se rechazan |
| `PAYPAL_CURRENCY` | Todos | Configuración comercial | `.env.local` / host | Debe coincidir con `products.currency` | Checkout rechaza productos con otra moneda |
| `APP_URL` | Todos | Dominio público | `.env.local` / host | Webhook y retorno usan ese dominio | URLs de retorno/cancelación incorrectas |
| `PAYPAL_API_BASE_URL` | Solo pruebas | Servidor simulado | Proceso de pruebas | No debe estar en producción | Desvía llamadas a PayPal; riesgo de fraude |

## 10. Verificación de credenciales sin revelar secretos

1. Abre `/api/auth/config` en el navegador. Debe devolver `paypalConfigured: true` y el modo correcto. No debe incluir el Client Secret.
2. Ejecuta una compra de prueba con la cuenta compradora Sandbox.
3. Comprueba que la URL de aprobación pertenece al dominio Sandbox de PayPal.
4. Tras aprobar, el retorno debe llegar a `/checkout/return?wa_order=...`.
5. Revisa en la base que la orden pasó a `paid` y que existe una captura en `transactions`.
6. Revisa que `webhook_events` contiene el evento con estado `processed` o `ignored`, sin duplicados.
7. Si algo falla, revisa logs del servidor sin imprimir `Authorization`, cookies ni secretos.

## 11. Costes y disponibilidad en Ecuador

PayPal opera en Ecuador con reglas propias de verificación, recepción y retiro. Antes de habilitar Live, confirma directamente en PayPal:

- Disponibilidad de cuenta Business para la actividad educativa.
- Moneda de recepción y conversión a USD.
- Comisiones por transacción, reembolso, disputa y conversión.
- Plazos de retención y disponibilidad del dinero.
- Requisitos fiscales, de identidad y de cumplimiento.
- Límites de recepción y métodos de retiro disponibles.

La documentación del proyecto no certifica que una cuenta ecuatoriana esté habilitada. Esa confirmación debe provenir del panel y de la atención oficial de PayPal.

## 12. Qué puede hacer el agente y qué requiere al propietario

**El agente puede:** implementar y probar el código, validar tipos/build, ejecutar pruebas con mocks, revisar logs, documentar y preparar variables de ejemplo.

**El propietario debe:** crear/verificar la cuenta comercial, crear apps Sandbox/Live, obtener credenciales y Webhook IDs, crear el comprador de prueba, configurar los secretos en el host, autorizar Live y ejecutar las transacciones Sandbox/Live reales.

Ningún paso de esta guía se considera completado hasta que exista evidencia verificable en el panel, en la base de datos o en los logs.
