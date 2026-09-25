/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: WEBHOOK DE ENVÍO DE CORREOS CON ADJUNTOS
 * Laboratorio de Criptografía y Esteganografía
 * ==============================================================================
 * 
 * INSTRUCCIONES DE INSTALACIÓN EN GOOGLE APPS SCRIPT:
 * 
 * 1. Abre tu proyecto en Google Apps Script:
 *    https://script.google.com
 * 
 * 2. Borra cualquier código existente en el archivo `Código.gs` (o `Code.gs`) y
 *    pega exactamente todo este contenido.
 * 
 * 3. Haz clic en "Guardar" (icono de disquete).
 * 
 * 4. Haz clic en el botón azul "Implementar" (arriba a la derecha) -> "Administrar implementaciones".
 *    - Haz clic en el icono del Lápiz (Editar) en tu implementación activa.
 *    - En "Versión", selecciona SIEMPRE "Nueva versión".
 *    - Asegúrate de que:
 *        * "Ejecutar como": "Yo (tu_cuenta@gmail.com)"
 *        * "Quién tiene acceso": "Cualquiera" (Anyone)  <--- ¡MUY IMPORTANTE!
 *    - Haz clic en "Implementar".
 * 
 * 5. Si te pide autorizar permisos, haz clic en "Revisar permisos" -> Selecciona tu cuenta ->
 *    "Configuración avanzada" -> "Ir a Proyecto (no seguro)" -> "Permitir".
 * 
 * Tu URL actual de implementación ya configurada en el backend es:
 * https://script.google.com/macros/s/AKfycbynl1ZENubbdfTvh46arYO66a57128bU5QW5XJMpb7gRlzWXhRluA_jHSTDNLTOVSaK/exec
 * ==============================================================================
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ONLINE',
    system: 'Webhook de Despacho de Correo - Laboratorio Criptográfico',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('No se recibieron datos en el cuerpo de la petición POST.');
    }

    var data = JSON.parse(e.postData.contents);
    var to = data.to;
    if (!to || to.indexOf('@') === -1) {
      throw new Error('La dirección de correo electrónico del destinatario no es válida.');
    }

    var subject = data.subject || '🔐 Archivo Confidencial - Laboratorio Criptográfico';
    var textBody = data.text || data.message || 'Se te ha enviado un archivo confidencial adjunto.';
    var htmlBody = data.html || ('<p>' + textBody + '</p>');

    var emailAttachments = [];

    // Procesar adjunto (soporta array de attachments o clave directa)
    if (data.attachments && data.attachments.length > 0) {
      for (var i = 0; i < data.attachments.length; i++) {
        var att = data.attachments[i];
        if (att && att.content) {
          var cleanContent = att.content.replace(/^data:[^;]+;base64,/, '');
          var decoded = Utilities.base64Decode(cleanContent);
          var blob = Utilities.newBlob(decoded, att.contentType || 'image/png', att.filename || 'archivo_seguro.png');
          emailAttachments.push(blob);
        }
      }
    } else if (data.attachmentBase64) {
      var cleanContent = data.attachmentBase64.replace(/^data:[^;]+;base64,/, '');
      var decoded = Utilities.base64Decode(cleanContent);
      var blob = Utilities.newBlob(decoded, data.mimeType || 'image/png', data.filename || 'archivo_seguro.png');
      emailAttachments.push(blob);
    }

    // Enviar a través de la cuota de Gmail del propietario del script
    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: textBody,
      htmlBody: htmlBody,
      attachments: emailAttachments
    });

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Correo despachado exitosamente hacia: ' + to,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
