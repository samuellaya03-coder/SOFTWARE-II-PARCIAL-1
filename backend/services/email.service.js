import nodemailer from 'nodemailer';

/**
 * SERVICIO DE GESTIÓN Y ENVÍO DE CORREOS ELECTRÓNICOS
 * Soporta transporte SMTP real (.env) y fallback automático a Ethereal Test Email
 */
export class EmailService {
  /**
   * Obtiene o genera un transportador de Nodemailer.
   */
  static async getTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // Si existen credenciales reales en .env, usar transporte SMTP configurado
    if (host && user && pass) {
      const isSecure = port === 465;
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: isSecure,
        auth: { user, pass }
      });
      return { transporter, isTest: false };
    }

    // Fallback: Crear cuenta de prueba en Ethereal Email (no requiere configuración)
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    return { transporter, isTest: true };
  }

  /**
   * Envía un correo con un archivo esteganográfico o paquete criptográfico adjunto.
   * @param {Object} options
   * @param {string} options.to - Dirección de correo destino
   * @param {string} [options.subject] - Asunto del correo
   * @param {string} [options.message] - Mensaje explicativo o notas
   * @param {string} options.attachmentBase64 - Archivo en formato Base64
   * @param {string} options.filename - Nombre del archivo adjunto (ej. "stego_secreto.png")
   * @param {string} [options.mimeType] - Tipo MIME (ej. "image/png")
   */
  static async sendSecureFile({ to, subject, message, attachmentBase64, filename, mimeType }) {
    if (!to || !to.includes('@')) {
      throw new Error('La dirección de correo electrónico del destinatario es inválida.');
    }

    if (!attachmentBase64) {
      throw new Error('No se ha proporcionado el archivo adjunto para el envío.');
    }

    const { transporter, isTest } = await this.getTransporter();

    // Limpiar posible prefijo data URI (ej. "data:image/png;base64,")
    const cleanBase64 = attachmentBase64.replace(/^data:[^;]+;base64,/, '');
    const fileBuffer = Buffer.from(cleanBase64, 'base64');

    const mailSubject = subject?.trim() || '🔐 Archivo Confidencial - Laboratorio de Criptografía y Esteganografía';
    const mailText = message?.trim() || 'Se te ha enviado un archivo confidencial con información inyectada mediante técnicas de seguridad informática.';
    const sender = process.env.SMTP_FROM || '"CyberSec Lab" <seguridad@laboratorio.local>';

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; border-radius: 12px; max-width: 600px; margin: auto; border: 1px solid #334155;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 1.5rem; border-bottom: 1px solid #334155; padding-bottom: 1rem;">
          <h2 style="color: #38bdf8; margin: 0; font-size: 1.4rem;">🔐 Laboratorio Criptográfico & Esteganografía</h2>
        </div>
        
        <p style="font-size: 1rem; line-height: 1.5; color: #cbd5e1;">
          Has recibido un archivo con <strong>información confidencial</strong> enviado a través del laboratorio de seguridad.
        </p>

        <div style="background: rgba(30, 41, 59, 0.7); border-left: 4px solid #38bdf8; padding: 1rem; border-radius: 6px; margin: 1.5rem 0;">
          <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Nota del Remitente:</p>
          <p style="margin: 0; font-size: 0.95rem; color: #f1f5f9; white-space: pre-wrap;">${mailText}</p>
        </div>

        <div style="background: #1e293b; border: 1px dashed #64748b; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
          <h4 style="margin: 0 0 0.5rem 0; color: #34d399; font-size: 0.95rem;">📦 Instrucciones de Extracción:</h4>
          <ol style="margin: 0; padding-left: 1.25rem; font-size: 0.85rem; color: #94a3b8; line-height: 1.6;">
            <li>Descarga el archivo adjunto <code>${filename || 'archivo_adjunto'}</code> en su formato original sin comprimir.</li>
            <li>Abre la aplicación web del <strong>Laboratorio Criptográfico</strong>.</li>
            <li>Ingresa al <strong>Módulo 1</strong> (pestaña <em>"Revelar Información / Extracción LSB"</em>) o <strong>Módulo 2</strong>.</li>
            <li>Carga el archivo y proporciona la clave correspondiente para revelar el contenido oculto.</li>
          </ol>
        </div>

        <p style="font-size: 0.75rem; color: #64748b; margin: 0; text-align: center;">
          Transmisión segura generada automáticamente por el Laboratorio Web de Criptografía y Esteganografía.
        </p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: sender,
      to,
      subject: mailSubject,
      text: mailText,
      html: htmlContent,
      attachments: [
        {
          filename: filename || 'archivo_seguro.png',
          content: fileBuffer,
          contentType: mimeType || 'image/png'
        }
      ]
    });

    const previewUrl = isTest ? nodemailer.getTestMessageUrl(info) : null;

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
      mode: isTest ? 'test_preview' : 'smtp_sent',
      recipient: to
    };
  }
}
