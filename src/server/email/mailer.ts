import { appUrl, emailConfig } from '../config';

/**
 * Envío de correo transaccional mediante Resend (API HTTP, sin SDK).
 * Los enlaces contienen tokens de un solo uso; nunca se registran en logs.
 */

export type MailResult = { sent: boolean; skipped?: 'not_configured' | 'provider_error' };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(title: string, intro: string, body: string, cta?: { label: string; url: string }) {
  const base = appUrl().replace(/\/$/, '');
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f5f6f8;color:#182238;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:620px;margin:0 auto;padding:28px 18px">
      <div style="background:#0b1b33;color:#ffffff;padding:18px 22px;border-radius:14px 14px 0 0">
        <strong style="font-size:18px;letter-spacing:0.02em">Wisdom Academy</strong>
      </div>
      <div style="background:#ffffff;padding:24px 22px;border:1px solid #e2e6ee;border-top:0;border-radius:0 0 14px 14px">
        <h1 style="font-size:22px;margin:0 0 10px;color:#0b1b33">${escapeHtml(title)}</h1>
        <p style="font-size:15px;line-height:1.6;color:#3b465c;margin:0 0 16px">${escapeHtml(intro)}</p>
        ${body}
        ${
          cta
            ? `<p style="margin:22px 0 18px"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#d9a441;color:#182238;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:9px">${escapeHtml(cta.label)}</a></p>
               <p style="font-size:12px;color:#6b7486;line-height:1.5">Si el botón no funciona, copia este enlace en tu navegador:<br>${escapeHtml(cta.url)}</p>`
            : ''
        }
      </div>
      <p style="font-size:11px;color:#8a93a5;text-align:center;line-height:1.6;margin:16px 0 0">
        Wisdom Academy · Este mensaje fue enviado por una compra o solicitud de cuenta.<br>
        Si no reconoces esta operación, ignora el mensaje o escríbenos desde ${escapeHtml(base)}.
      </p>
    </div>
  </body>
</html>`;
}

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailResult> {
  const config = emailConfig();
  if (!config.configured) {
    return { sent: false, skipped: 'not_configured' };
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.from,
        to: [input.to],
        reply_to: config.replyTo || undefined,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      // No se registra el destinatario ni el cuerpo del mensaje.
      console.error('[email] Resend respondió con estado', response.status);
      return { sent: false, skipped: 'provider_error' };
    }
    return { sent: true };
  } catch (error) {
    console.error(
      '[email] Error de red al enviar correo:',
      error instanceof Error ? error.name : 'unknown'
    );
    return { sent: false, skipped: 'provider_error' };
  }
}

export async function sendRegistrationResumeEmail(input: {
  to: string;
  name: string;
  products: string[];
  url: string;
}): Promise<MailResult> {
  const items = input.products.map((name) => escapeHtml(name)).join(' · ');
  const html = layout(
    'Tu compra está confirmada',
    `Hola ${input.name || 'estudiante'}, tu pago fue confirmado. Solo falta completar tus datos para activar tu espacio de estudio.`,
    `<div style="background:#f4f7fb;border:1px solid #e2e6ee;border-radius:10px;padding:12px 14px;font-size:14px;line-height:1.6;color:#2a3448">
       <strong>Producto:</strong> ${items}
     </div>
     <p style="font-size:13px;color:#6b7486;line-height:1.5;margin-top:14px">Este enlace es personal y caduca en 30 días. No lo compartas.</p>`,
    { label: 'Completar mi registro', url: input.url }
  );
  return sendEmail({
    to: input.to,
    subject: 'Completa tu registro en Wisdom Academy',
    html,
    text: `Hola ${input.name || 'estudiante'}. Tu pago fue confirmado. Completa tu registro: ${input.url}`,
  });
}

export async function sendWelcomeEmail(input: {
  to: string;
  name: string;
  products: string[];
  loginUrl: string;
  courseUrl?: string | null;
  verifyUrl?: string | null;
}): Promise<MailResult> {
  const items = input.products.map((name) => escapeHtml(name)).join(' · ');
  const html = layout(
    'Bienvenido a Wisdom Academy',
    `Hola ${input.name}, tu cuenta y tu matrícula están listas.`,
    `<div style="background:#f4f7fb;border:1px solid #e2e6ee;border-radius:10px;padding:12px 14px;font-size:14px;line-height:1.6;color:#2a3448">
       <strong>Producto:</strong> ${items}
     </div>
     <p style="font-size:14px;line-height:1.6;color:#3b465c;margin-top:14px">Ingresa con el correo de esta compra y la contraseña que acabas de crear.</p>
     ${
       input.verifyUrl
         ? `<p style="font-size:13px;line-height:1.5;color:#6b7486">Para verificar tu correo abre este enlace: <a href="${escapeHtml(input.verifyUrl)}">${escapeHtml(input.verifyUrl)}</a></p>`
         : ''
     }`,
    {
      label: 'Entrar a mi curso',
      url: input.courseUrl || input.loginUrl,
    }
  );
  return sendEmail({
    to: input.to,
    subject: 'Bienvenido a Wisdom Academy',
    html,
    text: `Hola ${input.name}. Tu cuenta está lista. Ingresa: ${input.loginUrl}`,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  url: string;
}): Promise<MailResult> {
  const html = layout(
    'Recupera tu acceso',
    `Hola ${input.name || 'estudiante'}, recibimos una solicitud para restablecer tu contraseña. El enlace caduca en 60 minutos y solo puede usarse una vez.`,
    `<p style="font-size:13px;color:#6b7486;line-height:1.5">Si no solicitaste este cambio, ignora este mensaje. Tu contraseña actual sigue siendo válida.</p>`,
    { label: 'Crear nueva contraseña', url: input.url }
  );
  return sendEmail({
    to: input.to,
    subject: 'Recupera tu acceso a Wisdom Academy',
    html,
    text: `Restablece tu contraseña: ${input.url}`,
  });
}

export async function sendEmailVerificationEmail(input: {
  to: string;
  name: string;
  url: string;
}): Promise<MailResult> {
  const html = layout(
    'Verifica tu correo',
    `Hola ${input.name || 'estudiante'}, confirma que este correo te pertenece para completar la seguridad de tu cuenta.`,
    `<p style="font-size:13px;color:#6b7486;line-height:1.5">El enlace caduca en 48 horas y solo puede usarse una vez.</p>`,
    { label: 'Verificar mi correo', url: input.url }
  );
  return sendEmail({
    to: input.to,
    subject: 'Verifica tu correo de Wisdom Academy',
    html,
    text: `Verifica tu correo: ${input.url}`,
  });
}
