import nodemailer from 'nodemailer';

const SMTP_USER = process.env.SMTP_USER || 'dismardxy@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'uccu mnyv atvb bing';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS.replace(/\s+/g, ''), // clean spaces from app password
  },
});

export interface WelcomeEmailData {
  to: string;
  name: string;
  birthDate?: string | null;
}

export async function sendWelcomeEmail({ to, name, birthDate }: WelcomeEmailData) {
  const formattedBirthDate = birthDate ? new Date(`${birthDate}T00:00:00`).toLocaleDateString('es-ES', { dateStyle: 'long' }) : 'No especificada';
  const registrationDate = new Date().toLocaleDateString('es-ES', { dateStyle: 'full' });

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Bienvenido a ProyecAhorro!</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; padding: 32px 20px; }
    .card { background-color: #1e293b; border-radius: 20px; border: 1px solid #334155; padding: 36px 28px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4); }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); border-radius: 16px; padding: 12px; margin-bottom: 20px; }
    h1 { color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; }
    .user-info-box { background-color: #0f172a; border: 1px solid #334155; border-radius: 14px; padding: 18px 20px; margin: 24px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; font-size: 13px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; font-weight: 500; }
    .info-value { color: #f1f5f9; font-weight: 700; text-align: right; }
    .feature-grid { margin: 24px 0; }
    .feature-item { display: flex; align-items: flex-start; margin-bottom: 16px; }
    .feature-icon { background-color: rgba(79, 70, 229, 0.15); color: #818cf8; border-radius: 10px; padding: 8px; font-size: 16px; margin-right: 14px; }
    .feature-text h4 { margin: 0 0 2px 0; color: #f8fafc; font-size: 14px; font-weight: 700; }
    .feature-text p { margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.4; }
    .cta-btn { display: block; width: 100%; box-sizing: border-box; text-align: center; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff !important; font-weight: 700; font-size: 15px; padding: 14px 24px; border-radius: 12px; text-decoration: none; margin-top: 28px; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.39); }
    .footer { text-align: center; margin-top: 28px; color: #64748b; font-size: 11px; line-height: 1.5; }
    .footer strong { color: #34d399; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div style="text-align: center;">
        <div class="logo-badge">
          <span style="font-size: 28px;">💎</span>
        </div>
        <h1>¡Bienvenido a ProyecAhorro!</h1>
        <p>Hola <strong>${name}</strong>, tu cuenta ha sido creada exitosamente. Has dado el primer paso hacia tu libertad financiera y control inteligente de tu dinero.</p>
      </div>

      <!-- Resumen de Registro -->
      <div class="user-info-box">
        <div style="font-size: 11px; font-weight: 800; color: #818cf8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
          📋 Datos de tu cuenta registrada
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 6px 0; color: #64748b;">Nombre:</td>
            <td style="padding: 6px 0; color: #f1f5f9; font-weight: bold; text-align: right;">${name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 6px 0; color: #64748b;">Correo de acceso:</td>
            <td style="padding: 6px 0; color: #f1f5f9; font-weight: bold; text-align: right;">${to}</td>
          </tr>
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 6px 0; color: #64748b;">Fecha de nacimiento:</td>
            <td style="padding: 6px 0; color: #f1f5f9; font-weight: bold; text-align: right;">${formattedBirthDate}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Fecha de registro:</td>
            <td style="padding: 6px 0; color: #f1f5f9; font-weight: bold; text-align: right;">${registrationDate}</td>
          </tr>
        </table>
      </div>

      <!-- Beneficios -->
      <div style="font-size: 13px; font-weight: 700; color: #f8fafc; margin-bottom: 14px;">
        🚀 Lo que puedes hacer ahora en ProyecAhorro:
      </div>

      <div class="feature-grid">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: top; width: 36px; padding-right: 12px; padding-bottom: 14px;">
              <div style="background-color: rgba(79, 70, 229, 0.2); border-radius: 8px; width: 32px; height: 32px; text-align: center; line-height: 32px;">📅</div>
            </td>
            <td style="vertical-align: top; padding-bottom: 14px;">
              <div style="color: #ffffff; font-size: 13px; font-weight: 700;">Cronograma de Pagos Quincenal</div>
              <div style="color: #94a3b8; font-size: 12px;">Descubre exactamente qué pagar el 15, fin de mes y cuánto dinero libre te queda del sueldo.</div>
            </td>
          </tr>
          <tr>
            <td style="vertical-align: top; width: 36px; padding-right: 12px; padding-bottom: 14px;">
              <div style="background-color: rgba(16, 185, 129, 0.2); border-radius: 8px; width: 32px; height: 32px; text-align: center; line-height: 32px;">🎯</div>
            </td>
            <td style="vertical-align: top; padding-bottom: 14px;">
              <div style="color: #ffffff; font-size: 13px; font-weight: 700;">Metas de Ahorro y Proyecciones</div>
              <div style="color: #94a3b8; font-size: 12px;">Define tus objetivos (viaje, fondo de emergencia, estudios) y simula el ritmo de ahorro mensual.</div>
            </td>
          </tr>
          <tr>
            <td style="vertical-align: top; width: 36px; padding-right: 12px;">
              <div style="background-color: rgba(244, 63, 94, 0.2); border-radius: 8px; width: 32px; height: 32px; text-align: center; line-height: 32px;">⚡</div>
            </td>
            <td style="vertical-align: top;">
              <div style="color: #ffffff; font-size: 13px; font-weight: 700;">Optimizador de Deudas (Avalancha / Bola de Nieve)</div>
              <div style="color: #94a3b8; font-size: 12px;">Paga menos intereses y alcanza tu fecha libre de deudas más rápido.</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <a href="https://finanzas-ap-black.vercel.app/login" class="cta-btn">
        Comenzar en ProyecAhorro →
      </a>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin-bottom: 4px;">© 2026 <strong>ProyecAhorro</strong>. Todos los derechos reservados.</p>
      <p style="margin: 0;">Diseñado y desarrollado por <strong>DG design</strong></p>
    </div>
  </div>
</body>
</html>
  `;

  return transporter.sendMail({
    from: `"ProyecAhorro" <${SMTP_USER}>`,
    to,
    subject: `¡Bienvenido a ProyecAhorro, ${name}! Tu cuenta está lista 💎`,
    html,
  });
}

export async function sendPasswordResetEmail({ to, name, resetUrl }: { to: string; name?: string; resetUrl: string }) {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Restablecer contraseña - ProyecAhorro</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc;">
  <div style="max-width: 520px; margin: 30px auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; text-align: center;">
    <div style="font-size: 32px; margin-bottom: 12px;">🔒</div>
    <h2 style="color: #ffffff; margin: 0 0 8px 0;">Restablecer contraseña</h2>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0;">
      Hola ${name || ''}, recibimos una solicitud para restablecer la contraseña de tu cuenta de <strong>ProyecAhorro</strong>.
    </p>
    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; font-weight: bold; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none; margin-bottom: 20px;">
      Crear nueva contraseña
    </a>
    <p style="color: #64748b; font-size: 12px; margin: 0;">
      Este enlace expirará en 1 hora por seguridad. Si no solicitaste este cambio, puedes ignorar este correo con tranquilidad.
    </p>
    <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0 16px 0;" />
    <div style="color: #64748b; font-size: 11px;">
      © 2026 ProyecAhorro · Desarrollado por <strong style="color: #34d399;">DG design</strong>
    </div>
  </div>
</body>
</html>
  `;

  return transporter.sendMail({
    from: `"ProyecAhorro" <${SMTP_USER}>`,
    to,
    subject: 'Restablecer tu contraseña de ProyecAhorro',
    html,
  });
}
