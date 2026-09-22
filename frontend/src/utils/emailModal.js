import { ApiService } from '../services/api.js';

/**
 * MODAL REUTILIZABLE PARA EL ENVÍO DE ARCHIVOS ESTEGANOGRÁFICOS Y CRIPTOGRÁFICOS POR CORREO
 */
export function openEmailModal({
  filename = 'archivo_seguro.png',
  mimeType = 'image/png',
  getAttachmentBase64,
  defaultSubject = '🔐 Archivo Confidencial - Laboratorio de Seguridad',
  defaultNote = 'Te adjunto un archivo con datos confidenciales generados en el Laboratorio Criptográfico. Descárgalo y cárgalo en el módulo correspondiente para extraer su contenido.',
  previewThumbnail = null,
  showToast
}) {
  // Eliminar modal previo si existe
  const existing = document.getElementById('secure-email-modal');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'secure-email-modal';
  backdrop.className = 'email-modal-backdrop';

  backdrop.innerHTML = `
    <div class="email-modal-card">
      <div class="email-modal-header">
        <h3 class="email-modal-title">
          <span>📧</span> Despachar por Correo Electrónico
        </h3>
        <button class="email-modal-close" id="btn-close-email-modal" title="Cerrar">✕</button>
      </div>

      <div class="email-modal-body">
        <!-- Píldora del archivo adjunto -->
        <div class="email-modal-attachment-pill">
          ${previewThumbnail 
            ? `<img src="${previewThumbnail}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover; border: 1px solid rgba(56, 189, 248, 0.4);" alt="Preview" />`
            : `<div style="font-size: 1.8rem; line-height: 1;">📦</div>`
          }
          <div style="flex: 1; overflow: hidden;">
            <div style="font-weight: 600; font-size: 0.9rem; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${filename}
            </div>
            <div style="font-size: 0.78rem; color: #38bdf8;">
              Adjunto protegido (${mimeType})
            </div>
          </div>
          <span class="badge badge-cyan" style="font-size: 0.7rem;">Listo para envío</span>
        </div>

        <div>
          <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.35rem; font-weight: 600;">
            Correo del Destinatario (Bob / Receptor):
          </label>
          <input 
            type="email" 
            id="email-modal-to" 
            placeholder="ejemplo: amigo@correo.com o tu_correo@gmail.com" 
            required 
            style="width: 100%;"
          />
        </div>

        <div>
          <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.35rem; font-weight: 600;">
            Asunto:
          </label>
          <input 
            type="text" 
            id="email-modal-subject" 
            value="${defaultSubject}" 
            style="width: 100%;"
          />
        </div>

        <div>
          <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.35rem; font-weight: 600;">
            Mensaje / Nota para el Destinatario:
          </label>
          <textarea 
            id="email-modal-message" 
            rows="3" 
            style="width: 100%; resize: vertical;"
          >${defaultNote}</textarea>
        </div>

        <div style="background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; padding: 0.6rem 0.8rem; border-radius: 4px; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">
          💡 <strong>Integridad Garantizada:</strong> El archivo se enviará como adjunto binario puro, preservando al 100% los bits de la imagen para que la extracción LSB o criptográfica funcione de inmediato.
        </div>
      </div>

      <div class="email-modal-footer">
        <button id="btn-cancel-email-modal" class="btn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1;">
          Cancelar
        </button>
        <button id="btn-submit-email-modal" class="btn btn-primary" style="display: flex; align-items: center; gap: 0.5rem;">
          🚀 Enviar Correo con Adjunto
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const inputTo = backdrop.querySelector('#email-modal-to');
  const inputSubject = backdrop.querySelector('#email-modal-subject');
  const inputMessage = backdrop.querySelector('#email-modal-message');
  const btnClose = backdrop.querySelector('#btn-close-email-modal');
  const btnCancel = backdrop.querySelector('#btn-cancel-email-modal');
  const btnSubmit = backdrop.querySelector('#btn-submit-email-modal');

  inputTo.focus();

  const closeModal = () => {
    backdrop.remove();
  };

  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  btnSubmit.addEventListener('click', async () => {
    const to = inputTo.value.trim();
    const subject = inputSubject.value.trim();
    const message = inputMessage.value.trim();

    if (!to || !to.includes('@')) {
      inputTo.focus();
      inputTo.style.borderColor = '#ef4444';
      if (showToast) {
        showToast({
          title: 'Correo Inválido',
          message: 'Por favor ingresa una dirección de correo válida.',
          icon: '⚠️',
          type: 'warning',
          duration: 2000
        });
      }
      return;
    }

    try {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '⏳ Despachando correo seguro...';
      btnCancel.disabled = true;

      // Obtener el Base64 del archivo
      const attachmentBase64 = typeof getAttachmentBase64 === 'function' 
        ? await getAttachmentBase64() 
        : getAttachmentBase64;

      const result = await ApiService.sendEmail({
        to,
        subject,
        message,
        attachmentBase64,
        filename,
        mimeType
      });

      closeModal();

      if (showToast) {
        if (result.previewUrl) {
          // Fallback Ethereal: Permitir abrir en nueva pestaña para ver el correo
          showToast({
            title: '¡Correo Despachado!',
            message: `Enviado a ${to}. Puedes inspeccionar el buzón de prueba haciendo clic en la notificación.`,
            icon: '📨',
            type: 'success',
            duration: 6000
          });
          // Abrir automáticamente la vista previa web del correo en nueva pestaña
          window.open(result.previewUrl, '_blank');
        } else {
          showToast({
            title: '¡Correo Enviado con Éxito!',
            message: `El archivo seguro fue despachado a ${to}.`,
            icon: '✅',
            type: 'success',
            duration: 3500
          });
        }
      }
    } catch (err) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '🚀 Reintentar Envío';
      btnCancel.disabled = false;
      if (showToast) {
        showToast({
          title: 'Error al Enviar',
          message: err.message,
          icon: '❌',
          type: 'danger',
          duration: 3000
        });
      }
    }
  });
}
