# 📋 Sistema de Justificación de Inasistencias

Sistema automatizado para la recepción, evaluación con IA y gestión de solicitudes de justificación de inasistencia estudiantil. Integra un formulario web con flujos de automatización en **n8n**, **Google Gemini**, **Google Sheets** y **Telegram**.

---

## 📁 Estructura del Proyecto

```
├── index.html              # Formulario web de solicitud
├── estilos.css             # Estilos del formulario
├── envios.js               # Lógica de validación y envío al webhook
├── flujo_principal.json    # Flujo n8n: recepción y evaluación IA
└── flujo_confirmacion.json # Flujo n8n: gestión de respuestas del docente
```

---

## ⚙️ Cómo Funciona

El sistema opera en dos etapas automatizadas mediante flujos n8n independientes.

### Flujo 1 — Recepción y Evaluación (`flujo_principal.json`)

```
Webhook → Edit Fields → Basic LLM Chain (Gemini) → Merge
       → Append/Update Google Sheets → Response 200
       → Switch → [Telegram: Notificación al docente]
```

1. **Webhook** recibe el `POST` del formulario en `/webhook/justificacion` con los datos del estudiante y el archivo adjunto opcional.
2. **Edit Fields** extrae y normaliza los campos: nombre, código, correo, fecha de ausencia, motivo, descripción, y genera un `id_solicitud` único con formato `REQ-YYYYMMDD-XXXXXX`.
3. **Basic LLM Chain** (modelo Google Gemini) evalúa la solicitud con el siguiente prompt estructurado:
   - Analiza coherencia entre motivo y descripción.
   - Clasifica la solicitud como `VÁLIDA`, `INVÁLIDA` o `DUDOSA`.
   - Devuelve un JSON con `clasificacion`, `confianza` (0.0–1.0) y `razonamiento`.
4. **Structured Output Parser** garantiza que la respuesta de Gemini sea un JSON válido.
5. **Merge** combina los datos del formulario con el resultado del análisis de IA.
6. **Append or Update Google Sheets** registra la solicitud completa (incluyendo clasificación IA) en la hoja de cálculo.
7. **Response Code 200** devuelve el `id_solicitud` al formulario web para confirmación inmediata al estudiante.
8. **Switch** enruta la notificación Telegram según la clasificación:
   - `VÁLIDA` → Mensaje directo al docente informando aprobación sugerida.
   - `INVÁLIDA` → Mensaje directo informando rechazo sugerido.
   - `DUDOSA` → Mensaje con botón interactivo solicitando decisión manual al docente.

---

### Flujo 2 — Gestión de Respuestas del Docente (`flujo_confirmacion.json`)

```
Telegram Trigger → Switch
  ├── [Consulta] → Edit Fields → Get row(s) in sheet → Send a text message
  └── [Decisión] → Edit Fields1 → Switch1
                     ├── Update row in sheet  (Aprobado)
                     └── Update row in sheet1 (Rechazado)
                   → Send a text message1
```

1. **Telegram Trigger** escucha mensajes del docente, incluyendo respuestas a botones (`callback_query`) y mensajes de texto.
2. **Switch** distingue entre:
   - **Consulta de solicitud** (output 0): el docente solicita ver los detalles de una solicitud por ID.
   - **Decisión sobre solicitud** (output 1): el docente aprueba o rechaza una solicitud.
3. **Rama de consulta:**
   - Edit Fields extrae el ID de solicitud del mensaje.
   - Get row(s) in sheet busca la fila correspondiente en Google Sheets.
   - Send a text message devuelve los detalles al docente vía Telegram.
4. **Rama de decisión:**
   - Edit Fields1 normaliza la decisión recibida.
   - Switch1 separa entre aprobación y rechazo.
   - Update row in sheet / Update row in sheet1 actualiza el estado en Google Sheets.
   - Send a text message1 notifica al docente la confirmación del cambio.

---

## 🌐 Formulario Web

El formulario (`index.html` + `estilos.css` + `envios.js`) permite al estudiante enviar su solicitud con los siguientes campos:

| Campo | Tipo | Validación |
|---|---|---|
| Nombre completo | Texto | Solo letras y espacios, obligatorio |
| Código / Matrícula | Texto | 5–12 dígitos numéricos |
| Correo electrónico | Email | Formato válido |
| Fecha de inasistencia | Fecha | Obligatorio |
| Tipo de motivo | Selección | Cita médica, enfermedad, urgencia familiar, calamidad, trámite oficial, otro |
| Descripción detallada | Textarea | Mínimo 20 caracteres, máximo 500 |
| Documento de soporte | Archivo | PDF, JPG, PNG — máximo 5 MB (opcional) |

Al enviarse con éxito, el formulario muestra el `id_solicitud` generado e informa al estudiante que recibirá una notificación por Telegram.

---

## 🛠️ Tecnologías Utilizadas

| Componente | Tecnología |
|---|---|
| Formulario web | HTML5, CSS3, JavaScript (Vanilla) |
| Automatización | n8n |
| Modelo de IA | Google Gemini (via n8n LangChain) |
| Base de datos | Google Sheets |
| Notificaciones | Telegram Bot API |
| Exposición local | ngrok |

---

## 🚀 Instalación y Configuración

### Requisitos previos
- Instancia de **n8n** activa (self-hosted o cloud).
- Bot de **Telegram** creado vía [@BotFather](https://t.me/BotFather).
- Cuenta de **Google** con acceso a Google Sheets y credenciales de API configuradas en n8n.
- Credenciales de **Google Gemini** configuradas en n8n.

### Pasos

1. **Importar los flujos en n8n:**
   - Ir a n8n → *Workflows* → *Import from file*.
   - Importar `flujo_principal.json` y `flujo_confirmacion.json` por separado.

2. **Configurar credenciales en n8n:**
   - Google Sheets: vincular cuenta de Google con permisos de lectura y escritura.
   - Google Gemini: agregar API Key de Google AI Studio.
   - Telegram: agregar el token del bot en las credenciales de n8n.

3. **Configurar la hoja de Google Sheets:**
   - Crear una hoja con columnas: `id_solicitud`, `nombre`, `id_estudiante`, `correo`, `fecha_ausencia`, `motivo`, `descripcion`, `tiene_archivo`, `clasificacion`, `confianza`, `razonamiento`, `estado`.

4. **Activar los flujos** en n8n y copiar la URL del Webhook del `flujo_principal`.

5. **Configurar el formulario web:**
   - Editar `envios.js` y reemplazar `WEBHOOK_URL` con la URL del webhook de producción:
     ```javascript
     const WEBHOOK_URL = 'https://TU-DOMINIO/webhook/justificacion';
     ```

6. **Desplegar el formulario** en cualquier servidor web estático (GitHub Pages, Netlify, servidor propio, etc.).

---

## 🔒 Consideraciones de Seguridad

- El webhook de n8n debe estar expuesto mediante HTTPS en producción (no usar ngrok en producción).
- Validar en el backend los tipos y tamaños de archivo recibidos.
- Restringir el acceso al bot de Telegram únicamente al chat ID del docente autorizado.
- No exponer credenciales de API en el código fuente del formulario.

---

## 📌 Variables de Entorno Clave

| Variable | Descripción |
|---|---|
| `WEBHOOK_URL` | URL del webhook n8n en producción (en `envios.js`) |
| Telegram Bot Token | Token del bot configurado en las credenciales de n8n |
| Google Sheets ID | ID de la hoja de cálculo destino |
| Gemini API Key | Clave de API de Google AI Studio |