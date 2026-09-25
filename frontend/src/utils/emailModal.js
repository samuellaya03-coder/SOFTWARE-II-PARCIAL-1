import { ApiService } from '../services/api.js';

/**
 * MODAL REUTILIZABLE PARA EL ENVÍO DE ARCHIVOS ESTEGANOGRÁFICOS Y CRIPTOGRÁFICOS POR CORREO
 */
export function openEmailModal({
  filename = 'archivo_seguro.png',
  mimeType = 'image/png',
  getAttachmentBase64,
  defaultSubject = '<span class="micon" aria-hidden="true">key</span>  Archivo Confidencial - Laboratorio de Seguridad',
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
          <span><span class="micon" aria-hidden="true">mail</span> </span> Despachar por Correo Electrónico
        </h3>
        <button class="email-modal-close" id="btn-close-email-modal" title="Cerrar"><span class="micon" aria-hidden="true">close</span> </button>
      </div>

      <div class="email-modal-body">
        <!-- Píldora del archivo adjunto -->
        <div class="email-modal-attachment-pill" style="padding: 1rem 1.25rem;">
          ${previewThumbnail 
            ? `<img src="${previewThumbnail}" style="width: 52px; height: 52px; border-radius: 6px; object-fit: cover; border: 1px solid rgba(56, 189, 248, 0.4);" alt="Preview" />`
            : `<div style="font-size: 2.2rem; line-height: 1;"><span class="micon" aria-hidden="true">inventory_2</span> </div>`
          }
          <div style="flex: 1; overflow: hidden;">
            <div style="font-weight: 700; font-size: 1.05rem; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${filename}
            </div>
            <div style="font-size: 0.95rem; color: #38bdf8; font-weight: 600; margin-top: 0.2rem;">
              Adjunto protegido (${mimeType})
            </div>
          </div>
          <span class="badge badge-cyan" style="font-size: 0.92rem; padding: 0.4rem 0.85rem; font-weight: 700;">Listo para envío</span>
        </div>

        <div>
          <label style="display: block; font-size: 1rem; color: var(--text-secondary); margin-bottom: 0.4rem; font-weight: 700;">
            Correo del Destinatario (Bob / Receptor):
          </label>
          <input 
            type="email" 
            id="email-modal-to" 
            placeholder="ejemplo: amigo@correo.com o tu_correo@gmail.com" 
            required 
            style="width: 100%; font-size: 1rem; padding: 0.75rem 1rem;"
          />
        </div>

        <div>
          <label style="display: block; font-size: 1rem; color: var(--text-secondary); margin-bottom: 0.4rem; font-weight: 700;">
            Asunto:
          </label>
          <input 
            type="text" 
            id="email-modal-subject" 
            value="${defaultSubject}" 
            style="width: 100%; font-size: 1rem; padding: 0.75rem 1rem;"
          />
        </div>

        <div>
          <label style="display: block; font-size: 1rem; color: var(--text-secondary); margin-bottom: 0.4rem; font-weight: 700;">
            Mensaje / Nota para el Destinatario:
          </label>
          <textarea 
            id="email-modal-message" 
            rows="3" 
            style="width: 100%; resize: vertical; font-size: 1rem; padding: 0.75rem 1rem; line-height: 1.5;"
          >${defaultNote}</textarea>
        </div>

        <div style="background: rgba(16, 185, 129, 0.08); border-left: 4px solid #10b981; padding: 0.85rem 1.1rem; border-radius: 8px; font-size: 0.95rem; color: var(--text-secondary); line-height: 1.55;">
          <span class="micon" aria-hidden="true" style="font-size: 1.35rem; vertical-align: middle; margin-right: 0.35rem;">lightbulb</span> <strong>Integridad Garantizada:</strong> El archivo se enviará como adjunto binario puro, preservando al 100% los bits de la imagen para que la extracción LSB o criptográfica funcione de inmediato.
        </div>
      </div>

      <div class="email-modal-footer" style="padding: 1.15rem 1.5rem;">
        <button id="btn-cancel-email-modal" class="btn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; font-size: 1.05rem; padding: 0.75rem 1.35rem; font-weight: 700; min-height: 48px;">
          Cancelar
        </button>
        <button id="btn-submit-email-modal" class="btn btn-primary" style="display: flex; align-items: center; gap: 0.6rem; font-size: 1.1rem; padding: 0.75rem 1.5rem; font-weight: 800; min-height: 48px;">
          <span class="micon" aria-hidden="true" style="font-size: 1.4rem;">rocket_launch</span>  Enviar Correo con Adjunto
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
          icon: '<span class="micon" aria-hidden="true">warning</span> ',
          type: 'warning',
          duration: 2000
        });
      }
      return;
    }

    try {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span class="micon" aria-hidden="true">hourglass_top</span>  Despachando correo seguro...';
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
            title: 'Modo de Prueba (Ethereal)',
            message: `El correo se envió al buzón de prueba. Para recibirlo en tu bandeja real de Gmail, configura tu Google App Password o Google Apps Script en el backend .env. Se abrió la vista previa.`,
            icon: '📨',
            type: 'warning',
            duration: 6000
          });
          // Abrir automáticamente la vista previa web del correo en nueva pestaña
          window.open(result.previewUrl, '_blank');
        } else {
          showToast({
            title: '¡Correo Enviado con Éxito!',
            message: `El archivo seguro fue despachado a la bandeja real de ${to}.`,
            icon: '<span class="micon" aria-hidden="true">check_circle</span> ',
            type: 'success',
            duration: 4000
          });
        }
      }
    } catch (err) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<span class="micon" aria-hidden="true">rocket_launch</span>  Reintentar Envío';
      btnCancel.disabled = false;
      if (showToast) {
        showToast({
          title: 'Error al Enviar',
          message: err.message,
          icon: '<span class="micon" aria-hidden="true">cancel</span> ',
          type: 'danger',
          duration: 3000
        });
      }
    }
  });
}
