# Nexión — Integrations and Auth
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir la estrategia de autenticación, permisos, integraciones externas y estados de activación de conectores en Nexión para alinear producto, desarrollo, automatización y seguridad.

---

## 1. Objetivo del documento

Este documento define:
- cómo debe autenticarse el usuario en Nexión
- cómo deben integrarse Google, Supabase, n8n y servicios externos
- qué permisos necesita el sistema y para qué
- qué integraciones están activas, planeadas o pendientes
- cómo separar identidad, acceso a datos y automatización

---

## 2. Principio general

Nexión necesita dos cosas distintas:
1. **identificar al usuario**
2. **acceder a fuentes y sistemas externos autorizados**

Estas dos cosas no deben confundirse conceptualmente aunque se apoyen en Google.

---

## 3. Autenticación principal

- Proveedor de identidad: **Google** vía **Supabase Auth**
- No habrá login tradicional con email y contraseña como flujo principal.
- Supabase Auth es la capa principal de identidad del producto.

---

## 4. Google en Nexión

Google tiene dos papeles distintos:
- **Google como identidad**: login, email, identidad base
- **Google como ecosistema de datos**: Drive, Docs, Sheets, Calendar

### Regla
Aunque ambos papeles viven en Google, deben modelarse con claridad: uno es auth, el otro es acceso a fuentes.

---

## 5. Estado actual de integraciones

### Activo hoy
- GitHub, MCP GitHub, n8n, MCP n8n, Supabase proyecto base

### Planeado / pendiente de setup
- Google Cloud OAuth, Google Auth productivo, Google Drive, Google Docs, Google Sheets, Google Calendar, Gemini API, Vercel, Slack (opcional/futuro)

### Regla documental
Cada integración debe documentarse siempre con estado explícito: active / planned / pending_setup / pending_credentials

---

## 6. Integraciones obligatorias para el MVP extendido

1. Google Auth
2. Google Drive
3. Google Docs
4. Google Sheets
5. Google Calendar
6. Supabase
7. n8n
8. Gemini API

---

## 7. Google Drive

- Casos de uso: leer recursos enlazados, detectar fuentes compartidas, consultar carpetas relevantes
- **Regla**: Drive no es el backend del producto. Es una fuente externa de entrada.

---

## 8. Google Docs

- Casos de uso: notas de reuniones, documentos compartidos, recursos analizados manual o automáticamente
- Aporta: contenido textual, metadata, trazabilidad hacia el recurso original

---

## 9. Google Sheets

- Casos de uso: Sheet oficial de OKRs/KRs, métricas operativas vivas
- **Regla principal**: El Sheet de OKRs es fuente viva externa. No se sube como copia estática ni reemplaza el modelo interno.

---

## 10. Google Calendar

- Casos de uso: reuniones del día, tiempo bloqueado, tiempo disponible, ratio reuniones vs trabajo, sugerencia de organización del día
- **Regla**: Calendar no es módulo aparte del producto. Es contexto operativo para el Day Engine.

---

## 11. Gemini Developer API

- Casos de uso: resumen de fuentes, extracción de hallazgos, clasificación de categorías, tareas propuestas, insights, alertas, feedback, métricas detectadas
- **Regla**: La arquitectura debe dejar la capa de IA desacoplada del proveedor. Gemini es la primera opción planeada, no un acoplamiento irreversible.

---

## 12. n8n como orquestador de integraciones

n8n debe ser la capa principal de orquestación entre Nexión y sistemas externos.

- Schedules, triggers, lectura de fuentes, sincronización de Sheets, lectura de Calendar, llamadas HTTP a IA, actualización de contexto diario, propuestas pendientes de aprobación
- **Regla**: Las integraciones externas no deben depender del frontend como capa principal de orquestación.

---

## 13. Estados que el producto debe contemplar

### Auth
- not_authenticated, authenticated, session_expired

### Integraciones
- not_connected, connected, partially_connected, pending_setup, access_error, pending_reauth

---

## 14. Criterios para pedir permisos

Nexión debe pedir permisos:
- solo los necesarios para el alcance real
- documentados con propósito claro
- explicados en producto con lenguaje simple
- **Regla de UX**: El usuario debe entender para qué Nexión necesita cada acceso importante.

---

## 15. Qué no debe pasar

Nexión no debe:
- depender de credenciales personales dispersas sin documentar
- mezclar auth de usuario con lógica técnica de sincronización sin claridad
- usar Drive o Sheets como backend central del producto
- asumir que una integración planeada ya está lista
- hardcodear secretos o credenciales
- ocultar errores de acceso o permisos

---

## 16. Pendientes para el siguiente nivel

- Google Cloud project, client ID / client secret, lista final de scopes, variables de entorno, setup de Vercel, setup de Gemini API, setup opcional de Slack, renovación/errores de sesión

---

## 17. Regla para Claude Code y Antigravity

Este documento debe usarse como fuente de verdad para cualquier decisión relacionada con login, auth, permisos, conexiones externas, lectura de fuentes desde Google, relación entre Supabase, n8n y ecosistema externo.

Toda implementación debe distinguir claramente entre identidad, acceso a datos, automatización y persistencia estructurada.
