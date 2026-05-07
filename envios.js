// ─── CONFIGURACIÓN ──────────────────────────────────────────────────────────
// Reemplaza esta URL con la URL de tu webhook de n8n en modo PRODUCCIÓN
const WEBHOOK_URL = 'https://garage-passion-scholar.ngrok-free.dev/webhook-test/justificacion';

// ─── REFERENCIAS DOM ────────────────────────────────────────────────────────
const formulario = document.getElementById('formulario-justificacion');
const resultado  = document.getElementById('resultado');
const btnEnviar  = document.getElementById('btn-enviar');
const descTextarea = document.getElementById('descripcion');
const contDesc   = document.getElementById('cont-desc');

// ─── CONTADOR DE CARACTERES ─────────────────────────────────────────────────
descTextarea.addEventListener('input', () => {
  contDesc.textContent = `${descTextarea.value.length} / 500`;
});

// ─── VALIDACIÓN ─────────────────────────────────────────────────────────────
function limpiarErrores() {
  document.querySelectorAll('.error').forEach(el => el.textContent = '');
  document.querySelectorAll('.invalido').forEach(el => el.classList.remove('invalido'));
}

function mostrarError(campoId, errId, msg) {
  const campo = document.getElementById(campoId);
  const err   = document.getElementById(errId);
  if (campo) campo.classList.add('invalido');
  if (err)   err.textContent = msg;
}

function validarFormulario(datos) {
  let valido = true;
  limpiarErrores();

  const nombre = datos.get('nombre').trim();
  if (!nombre) {
    mostrarError('nombre','err-nombre','El nombre es obligatorio.'); valido = false;
  } else if (!/^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$/.test(nombre)) {
    mostrarError('nombre','err-nombre','Solo se permiten letras y espacios.'); valido = false;
  }

  const id = datos.get('id_estudiante').trim();
  if (!id) {
    mostrarError('id_estudiante','err-id','El código es obligatorio.'); valido = false;
  } else if (!/^[0-9]{5,12}$/.test(id)) {
    mostrarError('id_estudiante','err-id','El código debe tener entre 5 y 12 dígitos numéricos.'); valido = false;
  }

  const correo = datos.get('correo').trim();
  if (!correo || !/^[^@]+@[^@]+\.[^@]+$/.test(correo)) {
    mostrarError('correo','err-correo','Ingresa un correo electrónico válido.'); valido = false;
  }

  if (!datos.get('fecha_ausencia')) {
    mostrarError('fecha_ausencia','err-fecha','La fecha es obligatoria.'); valido = false;
  }

  if (!datos.get('motivo')) {
    mostrarError('motivo','err-motivo','Debes seleccionar un motivo.'); valido = false;
  }

  const desc = datos.get('descripcion').trim();
  if (!desc || desc.length < 20) {
    mostrarError('descripcion','err-desc','La descripción debe tener al menos 20 caracteres.'); valido = false;
  }

  // Validar tamaño del archivo (máx 5MB)
  const archivo = document.getElementById('soporte').files[0];
  if (archivo && archivo.size > 5 * 1024 * 1024) {
    mostrarError('soporte','err-soporte','El archivo no puede superar 5MB.'); valido = false;
  }

  return valido;
}

// ─── ENVÍO DEL FORMULARIO ────────────────────────────────────────────────────
formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const datos = new FormData(formulario);

  // Si no hay archivo, eliminar del FormData para no enviar campo vacío
  const archivoCampo = document.getElementById('soporte');
  if (!archivoCampo.files.length) {
    datos.delete('soporte');
  }

  if (!validarFormulario(datos)) return;

  // Bloquear botón durante el envío
  btnEnviar.disabled = true;
  btnEnviar.textContent = 'Enviando...';

  try {
    const respuesta = await fetch(WEBHOOK_URL, {
      method: 'POST',
      body: datos   // No establecer Content-Type — el navegador lo hace automáticamente con boundary
    });

    if (!respuesta.ok) throw new Error(`Error del servidor: ${respuesta.status}`);

    const json = await respuesta.json();
    console.log('Respuesta n8n:', json);

    // Mostrar resultado al usuario
    resultado.style.display = 'block';
    resultado.className = 'resultado exito';
    resultado.innerHTML = `
      <strong>✅ Solicitud recibida exitosamente</strong><br>
      Tu número de solicitud es: <strong>${json.id_solicitud || 'N/A'}</strong><br>
      Recibirás una notificación con el resultado por Telegram.
    `;
    formulario.reset();
    contDesc.textContent = '0 / 500';

  } catch (error) {
    console.error('Error al enviar:', error);
    resultado.style.display = 'block';
    resultado.className = 'resultado error';
    resultado.innerHTML = '❌ Ocurrió un error al enviar tu solicitud. Inténtalo de nuevo.';
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Solicitud';
  }
});