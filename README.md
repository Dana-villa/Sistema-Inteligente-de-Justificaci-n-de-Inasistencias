# 🎓 Sistema Inteligente de Justificación de Inasistencias

> Flujo automatizado en **n8n** que procesa, analiza y gestiona las solicitudes de justificación de inasistencias de estudiantes usando IA, OCR simulado, Google Sheets y Telegram.

---

## 📋 Descripción General

Este sistema recibe solicitudes de justificación de inasistencias a través de un formulario web, analiza los documentos adjuntos con inteligencia artificial, toma decisiones automáticas o envía los casos a revisión manual, notifica al estudiante y al administrador por Telegram, y registra todo en Google Sheets.

---

## 🏗️ Arquitectura del Flujo

El flujo está dividido en **dos pipelines independientes**:

### Pipeline 1 — Procesamiento de Solicitudes (Webhook)
```
Webhook → Validar Datos → Análisis IA+OCR → Decisión (Auto/Manual/Rechazo)
       → Google Sheets → Notificación Telegram → Respuesta HTTP
```

### Pipeline 2 — Consulta de Estado (Telegram Bot)
```
Telegram Bot → Procesar Consulta → Buscar en Google Sheets → Responder por Telegram
```

---

## 🔁 Nodos del Flujo

### 1. `Webhook - Recepción de Formulario`
- **Tipo:** Webhook (POST)
- **Ruta:** `/justificacion-inasistencias`
- **Descripción:** Recibe los datos del formulario web: nombre, ID estudiante, correo, motivo e imagen/documento adjunto en base64.

---

### 2. `Procesar y Validar Datos`
- **Tipo:** Code (JavaScript)
- **Descripción:** Extrae los campos del cuerpo de la solicitud, valida que estén completos y genera un ID único de solicitud (`SOL-<timestamp>`).
- **Campos requeridos:** `nombre`, `estudianteId`, `correo`, `motivo`
- **Formatos de archivo permitidos:** `image/jpeg`, `image/png`, `image/jpg`, `application/pdf`

---

### 3. `¿Datos Válidos?`
- **Tipo:** IF (condicional)
- **Condición:** `esValido === true AND formatoValido === true`
- **✅ Verdadero →** Continúa al análisis IA
- **❌ Falso →** Respuesta HTTP 400 con detalle de campos faltantes

---

### 4. `Análisis IA + OCR`
- **Tipo:** Code (JavaScript)
- **Descripción:** Simula un análisis OCR e IA del documento adjunto. Detecta palabras clave por categoría y calcula un nivel de confianza del 0 al 100%.

**Categorías detectadas:**
| Categoría | Palabras clave |
|---|---|
| `enfermedad` | médico, hospital, clínica, doctor, covid, fiebre... |
| `emergencia_familiar` | familia, fallecimiento, funeral, accidente... |
| `motivo_laboral` | trabajo, empresa, contrato, empleador... |
| `motivo_academico` | examen, congreso, seminario, universidad... |
| `otro` | Sin coincidencias |

**Cálculo del nivel de confianza:**
- Base: 50%
- +25% si hay archivo adjunto
- +15% si hay palabras clave relevantes
- +5% si hay 2 o más palabras clave
- -20% si el motivo tiene menos de 20 caracteres
- +5% si el motivo tiene 50 o más caracteres

---

### 5. `¿Alta Confianza? (≥75%)`
- **Tipo:** IF (condicional)
- **Condición:** `nivelConfianza >= 75`
- **✅ Verdadero →** Decisión Automática
- **❌ Falso →** Evalúa confianza media

---

### 6. `Decisión Automática (Alta Confianza)`
- **Tipo:** Code (JavaScript)
- **Lógica:**
  - Si `clasificacionIA === 'valida'` → Estado: **Aprobado** ✅
  - Si no → Estado: **Rechazado** ❌
- **Tipo de decisión:** `automatica`

---

### 7. `¿Confianza Media? (≥45%)`
- **Tipo:** IF (condicional)
- **Condición:** `nivelConfianza >= 45`
- **✅ Verdadero →** Enviar a revisión manual
- **❌ Falso →** Rechazo preventivo

---

### 8. `Enviar a Revisión Manual`
- **Tipo:** Code (JavaScript)
- **Estado:** `en_revision`
- **Acción:** Marca la solicitud para revisión manual y alerta al administrador por Telegram.

---

### 9. `Rechazo Preventivo (Baja Confianza)`
- **Tipo:** Code (JavaScript)
- **Estado:** `rechazado`
- **Descripción:** Rechaza la solicitud preventivamente por baja confianza (<45%) y solicita documentación válida.

---

### 10. `Alertar Admin por Revisión Manual`
- **Tipo:** Telegram (envío)
- **Destinatario:** Chat ID `5517523324` (administrador)
- **Descripción:** Notifica al administrador que hay una solicitud pendiente de revisión manual con los detalles del estudiante.

---

### 11. `Preparar Datos para Google Sheets`
- **Tipo:** Code (JavaScript)
- **Descripción:** Normaliza y organiza todos los campos para ser guardados en la hoja de cálculo.

---

### 12. `Guardar en Google Sheets`
- **Tipo:** Google Sheets (append)
- **Hoja:** `Solicitudes`
- **Columnas registradas:** ID Solicitud, Fecha y Hora, Nombre, ID Estudiante, Correo, Motivo, Tiene Documento, Categoría Detectada, Texto OCR, Clasificación IA, Nivel de Confianza (%), Palabras Clave, Tipo de Decisión, Estado Final.

---

### 13. `Notificación Telegram`
- **Tipo:** Telegram (envío)
- **Destinatario:** Correo del estudiante usado como Chat ID
- **Descripción:** Envía al estudiante el resultado completo de su solicitud con el estado final y el nivel de confianza.

---

### 14. `Respuesta HTTP - Éxito`
- **Tipo:** Respond to Webhook
- **Código:** `200`
- **Cuerpo:** JSON con `exito: true`, `solicitudId`, `estado` y `nivelConfianza`.

---

### 15. `Respuesta HTTP - Error Validación`
- **Tipo:** Respond to Webhook
- **Código:** `400`
- **Cuerpo:** JSON con `exito: false`, lista de `camposFaltantes` y estado de `formatoValido`.

---

### 16. `Telegram Bot - Consulta de Estado`
- **Tipo:** Telegram Trigger
- **Descripción:** Escucha mensajes entrantes del bot. El estudiante puede consultar el estado de su solicitud enviando su ID.

---

### 17. `Procesar Consulta Telegram`
- **Tipo:** Code (JavaScript)
- **Comandos disponibles:**
  - `/estado <ID>` — Consulta el estado de una solicitud
  - `/historial` — Consulta el historial de solicitudes
  - `/start` o `/ayuda` — Muestra ayuda
  - Texto libre — Se interpreta como ID de solicitud

---

### 18. `Buscar en Google Sheets`
- **Tipo:** Google Sheets (lookup)
- **Búsqueda:** Por columna `ID Solicitud`
- **Descripción:** Busca la solicitud en el registro para devolver el estado actualizado.

---

### 19. `Responder Estado por Telegram`
- **Tipo:** Telegram (envío)
- **Descripción:** Responde al estudiante con el estado actual de su solicitud obtenido desde Google Sheets.

---

## 🔀 Diagrama de Decisión

```
Solicitud recibida
       │
       ▼
  ¿Datos válidos?
   ├── NO → HTTP 400 (campos faltantes)
   └── SÍ
        │
        ▼
   Análisis IA + OCR
   (nivel de confianza 0-100%)
        │
        ├── ≥ 75% → Decisión Automática
        │              ├── válida   → APROBADO ✅
        │              └── inválida → RECHAZADO ❌
        │
        ├── 45-74% → Revisión Manual ⏳
        │              └── Alerta al administrador
        │
        └── < 45%  → Rechazo Preventivo ❌
                       └── Solicita documentación válida
```

---

## 🛠️ Requisitos y Configuración

### Credenciales necesarias
| Servicio | Credencial |
|---|---|
| Google Sheets | OAuth2 (`Google Sheets account 2`) |
| Telegram | API Token (`Telegram account`) |

### Variables a configurar
| Variable | Descripción |
|---|---|
| `documentId` (Sheets formulario) | ID del Google Sheets de registro de solicitudes |
| `documentId` (Sheets consulta) | ID del Google Sheets de consulta de estado |
| Chat ID administrador | ID de Telegram del administrador (`5517523324`) |
| Webhook path | `/justificacion-inasistencias` |

---

## 📊 Estados Posibles de una Solicitud

| Estado | Descripción |
|---|---|
| `aprobado` | Justificación aprobada automáticamente (confianza ≥ 75%, clasificación válida) |
| `rechazado` | Rechazada automáticamente o por baja confianza |
| `en_revision` | Pendiente de revisión manual por el administrador (confianza 45-74%) |
| `en_proceso` | Estado inicial al recibir la solicitud |

---

## 📁 Estructura de Datos en Google Sheets

| Columna | Descripción |
|---|---|
| ID Solicitud | Identificador único `SOL-<timestamp>` |
| Fecha y Hora | Timestamp ISO de la solicitud |
| Nombre | Nombre completo del estudiante |
| ID Estudiante | Identificador institucional |
| Correo | Correo electrónico |
| Motivo | Texto de la justificación |
| Tiene Documento | `Sí` / `No` |
| Categoría Detectada | Categoría IA de la justificación |
| Texto OCR | Resultado del análisis del documento |
| Clasificación IA | `valida` / `dudosa` / `invalida` |
| Nivel de Confianza (%) | Valor numérico 0-100 |
| Palabras Clave | Palabras detectadas separadas por coma |
| Tipo de Decisión | `automatica` / `revision_manual` / `rechazo_preventivo` |
| Estado Final | Estado definitivo de la solicitud |

---

## 🚀 Cómo usar

### Enviar una solicitud (formulario web)
```bash
POST https://<tu-instancia-n8n>/webhook/justificacion-inasistencias
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "estudianteId": "EST-2024-001",
  "correo": "juan@universidad.edu",
  "motivo": "Asistí a consulta médica por fiebre alta, adjunto certificado.",
  "archivo": "<base64>",
  "tipoArchivo": "image/jpeg"
}
```

### Consultar estado por Telegram
Enviar al bot de Telegram:
```
/estado SOL-1714500000000
```
o simplemente el ID de la solicitud:
```
SOL-1714500000000
```

---

## 📝 Notas Adicionales

- El análisis OCR es **simulado** mediante detección de palabras clave. Para producción se recomienda integrar un servicio real de OCR (Google Vision API, Tesseract, etc.).
- El campo `chatId` en la notificación al estudiante usa el correo como identificador; en producción debe reemplazarse por el Chat ID real de Telegram del estudiante.
- El flujo es fácilmente extensible para agregar notificaciones por correo electrónico usando el nodo de Gmail o SMTP.