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

No define todavía:
- client IDs finales
- secrets reales
- configuración exacta en Google Cloud
- variables de entorno finales
- contratos HTTP definitivos

Su función es fijar la lógica funcional y técnica de autenticación e integración.

---

## 2. Principio general

Nexión necesita dos cosas distintas:

1. **identificar al usuario**
2. **acceder a fuentes y sistemas externos autorizados**

Estas dos cosas no deben confundirse conceptualmente aunque se apoyen en Google.

### Regla principal
El sistema debe diseñarse para que:
- el usuario entre con Google
- Nexión tenga acceso a las fuentes e integraciones necesarias
- la arquitectura soporte integraciones activas y planeadas
- el producto pueda crecer sin rehacer toda la capa de auth

---

## 3. Autenticación principal del usuario

## 3.1 Proveedor de identidad inicial
- **Google**
- implementado a través de **Supabase Auth**

## 3.2 Propósito
Permitir que el usuario:
- entre con su cuenta de trabajo
- tenga identidad persistida en Nexión
- pueda asociar su experiencia diaria, aprobaciones y contexto operativo

## 3.3 Regla de producto
No habrá login tradicional con email y contraseña como flujo principal.

---

## 4. Rol de Supabase Auth

Supabase Auth debe ser la capa principal de identidad del producto.

### Qué debe resolver
- creación del usuario en Nexión
- sesión de la app
- persistencia básica de identidad
- relación entre usuario y workspace
- base para permisos internos del producto

### Qué NO debe asumir por sí solo
No reemplaza por completo la lógica de acceso a integraciones externas.
La sesión del producto y el acceso a fuentes externas deben tratarse con claridad en la documentación y build.

---

## 5. Integración con Google

Google tiene dos papeles distintos en Nexión:

### 5.1 Google como identidad
Sirve para:
- login del usuario
- email de trabajo
- identidad base

### 5.2 Google como ecosistema de datos
Sirve para:
- Drive
- Docs
- Sheets
- Calendar
- posibles recursos vinculados a Meet

### Regla
Aunque ambos papeles viven en Google, deben modelarse con claridad:
- uno es **auth**
- el otro es **acceso a fuentes**

---

## 6. Estado actual de integraciones

## 6.1 Activo hoy
- GitHub
- MCP GitHub
- n8n
- MCP n8n
- Supabase proyecto base

## 6.2 Planeado / pendiente de setup
- Google Cloud OAuth
- Google Auth productivo
- Google Drive
- Google Docs
- Google Sheets
- Google Calendar
- Gemini API
- Vercel
- Slack (opcional/futuro)

### Regla documental
Cada integración debe documentarse siempre con estado explícito:
- active
- planned
- pending_setup
- pending_credentials

---

## 7. Integraciones obligatorias para el MVP extendido

Las integraciones mínimas planeadas para el MVP expandido de Nexión son:

1. Google Auth
2. Google Drive
3. Google Docs
4. Google Sheets
5. Google Calendar
6. Supabase
7. n8n
8. Gemini API

---

## 8. Google Auth — qué debe resolver

Google Auth debe permitir:
- login del usuario
- recuperación del correo de trabajo
- asociación del usuario con su contexto operativo
- base para acceder a integraciones del ecosistema Google

### Resultado esperado
El usuario entra una sola vez y Nexión queda listo para trabajar con sus fuentes previstas, dentro del alcance definido por el producto.

---

## 9. Google Drive

## 9.1 Propósito
Permitir acceso a fuentes almacenadas o compartidas en Drive.

## 9.2 Casos de uso previstos
- leer recursos enlazados
- detectar fuentes compartidas
- consultar carpetas relevantes
- procesar documentos asociados a reuniones o notas

## 9.3 Qué debe aportar a Nexión
- acceso a metadata
- acceso a archivos/documentos según permisos
- contexto de origen de la fuente

### Regla
Drive no es el backend del producto.
Es una fuente externa de entrada.

---

## 10. Google Docs

## 10.1 Propósito
Leer el contenido estructurado de documentos que actúan como fuentes.

## 10.2 Casos de uso previstos
- notas de reuniones
- documentos compartidos
- recursos analizados manual o automáticamente

## 10.3 Qué debe aportar
- contenido textual
- metadata del documento
- trazabilidad hacia el recurso original

---

## 11. Google Sheets

## 11.1 Propósito
Consumir fuentes vivas estructuradas.

## 11.2 Casos de uso previstos
- Sheet oficial de OKRs/KRs
- posibles métricas operativas vivas
- fuentes estructuradas adicionales futuras

## 11.3 Regla principal
El Sheet de OKRs es fuente viva externa.
No se sube como copia estática ni reemplaza el modelo interno del producto.

---

## 12. Google Calendar

## 12.1 Propósito
Enriquecer el módulo Día > Hoy con agenda y capacidad real de trabajo.

## 12.2 Casos de uso previstos
- reuniones del día
- tiempo bloqueado
- tiempo disponible
- ratio reuniones vs trabajo
- sugerencia de organización del día

## 12.3 Regla
Calendar no es módulo aparte del producto.
Es contexto operativo para el Day Engine.

---

## 13. Gemini Developer API

## 13.1 Propósito
Actuar como primera capa planeada de análisis con opción gratuita inicial.

## 13.2 Casos de uso previstos
- resumen de fuentes
- extracción de hallazgos
- clasificación de categorías
- tareas propuestas
- insights
- alertas
- feedback
- métricas detectadas

## 13.3 Regla
La arquitectura debe dejar la capa de IA desacoplada del proveedor.
Gemini es la primera opción planeada, no un acoplamiento irreversible.

---

## 14. n8n como orquestador de integraciones

n8n debe ser la capa principal de orquestación entre Nexión y sistemas externos.

### Debe encargarse de:
- schedules
- triggers
- lectura de fuentes
- sincronización de Sheets
- lectura de Calendar
- llamadas HTTP a IA
- actualización de contexto diario
- propuestas pendientes de aprobación

### Regla
Las integraciones externas no deben depender del frontend como capa principal de orquestación.

---

## 15. Relación entre Supabase y n8n

### Supabase
Es la fuente estructurada de verdad del producto.

### n8n
Lee fuentes externas, orquesta procesamiento y escribe/actualiza datos estructurados.

### Regla
- Supabase = persistencia del producto
- n8n = automatización y sincronización
- frontend = experiencia del usuario

---

## 16. Estados de autenticación e integración que el producto debe contemplar

El sistema debe poder representar visual y funcionalmente estados como:

### Auth
- not_authenticated
- authenticated
- session_expired

### Integraciones
- not_connected
- connected
- partially_connected
- pending_setup
- access_error
- pending_reauth

### Regla
El usuario debe poder entender si el problema es:
- de login
- de permisos
- de acceso a fuente
- o de integración incompleta

---

## 17. Permisos / scopes conceptuales necesarios

Sin fijar aún la lista técnica exacta, Nexión debe prever permisos para:

### Identidad
- perfil básico
- correo

### Drive / Docs / Sheets
- lectura de recursos necesarios
- acceso a contenido o metadata según el caso

### Calendar
- lectura de agenda y eventos necesarios para contexto diario

### Regla
La documentación técnica posterior deberá mapear estos permisos conceptuales a scopes concretos de Google.

---

## 18. Criterios para pedir permisos

Nexión debe pedir permisos con esta lógica:
- solo los necesarios para el alcance real
- documentados con propósito claro
- explicados en producto con lenguaje simple
- visibles como parte de la confianza del sistema

### Regla de UX
El usuario debe entender para qué Nexión necesita cada acceso importante.

---

## 19. Slack

### Estado
- opcional / futuro
- no es prioridad visible del producto actual

### Posible uso
- salida automática resumida
- notificaciones
- distribución de señales o resultados

### Regla
Aunque Slack exista como capacidad futura, no debe condicionar la arquitectura principal del MVP.

---

## 20. Vercel

## 20.1 Propósito
Despliegue del frontend del producto.

## 20.2 Estado
- planeado
- pendiente de crear

## 20.3 Regla
Vercel sirve como hosting/app delivery.
No cambia la lógica de autenticación ni el backend estructurado.

---

## 21. MCPs y herramientas de construcción

## 21.1 MCP GitHub
Se usa para acelerar trabajo sobre repo.

## 21.2 MCP n8n
Se usa para acelerar construcción o lectura de workflows.

## 21.3 MCPs planeados
Pueden añadirse más después si simplifican trabajo real.

### Regla
Los MCPs son herramientas de construcción y operación asistida.
No deben confundirse con la base operativa final del producto.

---

## 22. Qué necesita el sistema para considerarse “integrado”

Un conector no está realmente integrado solo porque exista conceptualmente.
Para considerarlo integrado debe existir:
1. definición funcional clara
2. credenciales/configuración disponibles
3. flujo documentado de uso
4. rol claro en la arquitectura
5. salida útil dentro del producto

---

## 23. Qué no debe pasar

Nexión no debe:
- depender de credenciales personales dispersas sin documentar
- mezclar auth de usuario con lógica técnica de sincronización sin claridad
- usar Drive o Sheets como backend central del producto
- asumir que una integración planeada ya está lista
- hardcodear secretos o credenciales
- ocultar errores de acceso o permisos

---

## 24. Documentos relacionados

Este documento debe leerse junto con:
- PROJECT_MASTER_BRIEF
- TECH_ARCHITECTURE
- SOURCE_PROCESSING_SPEC
- OKR_LINKING_SPEC
- DAY_ENGINE_SPEC

---

## 25. Pendientes que pasan al siguiente nivel

Estas decisiones pasan a documentos posteriores o setup real:
- Google Cloud project
- client ID / client secret
- lista final de scopes
- variables de entorno
- setup de Vercel
- setup de Gemini API
- setup opcional de Slack
- definición técnica exacta de renovación/errores de sesión

---

## 26. Regla para Claude Code y Antigravity

Este documento debe usarse como fuente de verdad para cualquier decisión relacionada con:
- login
- auth
- permisos
- conexiones externas
- lectura de fuentes desde Google
- relación entre Supabase, n8n y ecosistema externo

No deben asumirse integraciones “como si ya existieran” sin marcar explícitamente su estado.
Toda implementación debe distinguir claramente entre:
- identidad
- acceso a datos
- automatización
- persistencia estructurada
