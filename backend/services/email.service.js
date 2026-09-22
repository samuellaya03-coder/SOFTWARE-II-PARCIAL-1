import nodemailer from 'nodemailer';

/**
 * SERVICIO DE GESTIÓN Y ENVÍO DE CORREOS ELECTRÓNICOS
 * Métodos soportados:
 * 1. Google Apps Script Webhook (GOOGLE_APPS_SCRIPT_URL)
 * 2. Gmail Directo con Google App Password (GMAIL_USER + GMAIL_APP_PASSWORD)
 * 3. Servidor SMTP Estándar (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 * 4. Fallback de prueba con Ethereal Email
 */
export class EmailService {
  /**
   * Envía a través de Google Apps Script Web App si está configurado.
   */
  static async sendViaGoogleAppsScript({ to, subject, message, attachmentBase64, filename, mimeType, htmlContent }) {
    const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!scriptUrl) return null;

    console.log(`[EMAIL SERVICE] Despachando correo a través de Google Apps Script: ${to}`);

    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      body: JSON.stringify({
        to,
        subject,
        message,
        html: htmlContent,
        attachmentBase64,
        filename: filename || 'archivo_seguro.png',
        mimeType: mimeType || 'image/png'
      })
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: response.ok, raw: text };
    }

    if (!response.ok || data.success === false) {
      throw new Error(data.error || 'Fallo en la ejecución del Webhook de Google Apps Script.');
    }

    return {
      success: true,
      messageId: `gas_${Date.now()}`,
      previewUrl: null,
      mode: 'google_apps_script',
      recipient: to
    };
  }

  /**
   * Obtiene o genera el transportador de Nodemailer.
   */
  static async getTransporter() {
    // Opción 1: Gmail con Google App Password
    const gmailUser = process.env.GMAIL_USER || process.env.GOOGLE_APP_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.GOOGLE_APP_PASSWORD;

    if (gmailUser && gmailPass) {
      console.log(`[EMAIL SERVICE] Usando transporte directo de Gmail (Google App Password) para: ${gmailUser}`);
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass.replace(/\s+/g, '') // Eliminar espacios que Google suele mostrar en contraseñas de aplicación
        }
      });
      return { transporter, isTest: false, sender: gmailUser };
    }

    // Opción 2: SMTP genérico (.env)
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      console.log(`[EMAIL SERVICE] Usando servidor SMTP: ${host}:${port}`);
      const isSecure = port === 465;
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: isSecure,
        auth: { user, pass }
      });
      return { transporter, isTest: false, sender: user };
    }

    // Opción 3: Fallback a Ethereal Test Email
    console.warn(`[EMAIL SERVICE] No se detectó configuración de Gmail o SMTP real en .env. Usando buzón de prueba Ethereal Email.`);
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
    return { transporter, isTest: true, sender: testAccount.user };
  }

  /**
   * Envía un correo con un archivo esteganográfico o paquete criptográfico adjunto.
   */
  static async sendSecureFile({ to, subject, message, attachmentBase64, filename, mimeType }) {
    if (!to || !to.includes('@')) {
      throw new Error('La dirección de correo electrónico del destinatario es inválida.');
    }

    if (!attachmentBase64) {
      throw new Error('No se ha proporcionado el archivo adjunto para el envío.');
    }

    const mailSubject = subject?.trim() || '🔐 Archivo Confidencial - Laboratorio de Criptografía y Esteganografía';
    const mailText = message?.trim() || 'Se te ha enviado un archivo confidencial con información inyectada mediante técnicas de seguridad informática.';

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

    // 1. Probar primero si hay Google Apps Script configurado
    if (process.env.GOOGLE_APPS_SCRIPT_URL) {
      try {
        const gasResult = await this.sendViaGoogleAppsScript({
          to,
          subject: mailSubject,
          message: mailText,
          attachmentBase64,
          filename,
          mimeType,
          htmlContent
        });
        if (gasResult) return gasResult;
      } catch (gasErr) {
        console.warn(`[EMAIL SERVICE] Error con Google Apps Script (${gasErr.message}). Intentando transporte Nodemailer...`);
      }
    }

    // 2. Usar Nodemailer (Gmail App Password, SMTP o Ethereal)
    const { transporter, isTest, sender } = await this.getTransporter();

    // Limpiar posible prefijo data URI
    const cleanBase64 = attachmentBase64.replace(/^data:[^;]+;base64,/, '');
    const fileBuffer = Buffer.from(cleanBase64, 'base64');

    const fromAddress = process.env.SMTP_FROM || `"${sender.split('@')[0]}" <${sender}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
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
      mode: isTest ? 'test_preview' : 'real_smtp',
      recipient: to
    };
  }
}
