# Nexión — Credentials and Setup Checklist
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Centralizar el checklist de credenciales, configuraciones, accesos, variables de entorno y precondiciones necesarias para construir y operar Nexión sin depender del chat ni de memoria informal.

---

## 1. Objetivo del documento

Este documento define:
- qué accesos y credenciales necesita Nexión
- qué setups deben existir por herramienta o integración
- qué variables de entorno deben prepararse
- qué está disponible, qué está pendiente y qué no debe compartirse en documentación pública
- qué prerrequisitos deben cumplirse antes de abrir ciertos slices de implementación

No define todavía:
- valores reales de secretos
- permisos finales por entorno
- políticas de rotación detalladas
- setup enterprise de seguridad

Su función es servir como checklist operativo para preparar el proyecto y desbloquear implementación real.

---

## 2. Principio general

Nexión debe poder construirse y operarse sin depender de secretos pegados en chats, documentos o código.

### Regla principal
Todo acceso o credencial debe existir en uno de estos estados:

- available
- pending_creation
- pending_credentials
- pending_validation
- not_needed_yet

### Regla crítica
Los documentos y el repo deben referenciar:
- nombre de la variable
- propósito
- entorno donde vive
- estado

Nunca el valor real del secreto.

---

## 3. Reglas de seguridad

1. No pegar tokens o secrets completos en chats, docs o repo.
2. No hardcodear credenciales en código.
3. Usar variables de entorno y gestores de secretos según el entorno.
4. Separar credenciales por entorno cuando aplique.
5. Si un secreto se expuso accidentalmente, debe rotarse.
6. Documentar el nombre del secreto, no el valor.
7. El acceso de construcción no debe confundirse con el acceso operativo final del producto.

---

## 4. Estado actual conocido del proyecto

## 4.1 Ya existe
- GitHub repo
- Supabase proyecto base
- n8n Cloud
- acceso de trabajo con Antigravity
- acceso de trabajo con Claude Code
- Google Sheet oficial de OKRs/KRs
- carpeta base de Drive definida, aunque aún sin estructura madura

## 4.2 Pendiente o no activado aún
- proyecto de Vercel
- Google Cloud project para OAuth
- client ID / client secret de Google
- lista final de scopes de Google
- credenciales de Gemini API
- integración de Google Calendar
- integración Google Drive/Docs/Sheets productiva completa
- Slack opcional/futuro

---

## 5. Checklist maestro por bloque

---

## 5.1 GitHub

### Propósito
Repositorio central de código, docs, migraciones y convenciones.

### Requisitos
- repo creado
- acceso del owner confirmado
- acceso de Antigravity confirmado
- acceso de Claude Code confirmado
- estructura inicial del repo preparada

### Variables / secretos típicos
- `GITHUB_TOKEN` si se requiere automatización fuera del entorno asistido

### Estado esperado
- available

### Validación
- se puede clonar / leer / escribir en el repo
- los cambios de Antigravity y Claude Code quedan reflejados en GitHub

---

## 5.2 Supabase

### Propósito
Fuente de verdad estructurada del producto.

### Requisitos
- proyecto Supabase activo
- URL del proyecto disponible
- clave pública disponible
- service role key disponible solo para backend/automatización si aplica
- acceso a SQL Editor o CLI
- proyecto enlazado por CLI si se trabajará por migraciones

### Variables típicas
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_URL` o equivalente solo si realmente se necesita
- `SUPABASE_ACCESS_TOKEN` si se usa CLI autenticado en CI o local

### Estado actual
- proyecto base disponible
- credenciales sensibles no deben volver a compartirse en chat

### Validación
- login correcto
- lectura/escritura básica
- migraciones aplicables
- auth utilizable

---

## 5.3 n8n Cloud

### Propósito
Orquestación principal del sistema.

### Requisitos
- instancia activa
- acceso al workspace correcto
- API key válida si se usará desde automatización o tooling
- capacidad de exportar/versionar workflows
- convención de nombres de workflows definida

### Variables típicas
- `N8N_BASE_URL`
- `N8N_API_KEY`

### Estado actual
- base URL disponible
- API key debe tratarse como secreta y rotarse si se expuso

### Validación
- se puede entrar a n8n
- se puede crear un workflow mínimo
- se puede exportar o inspeccionar workflow

---

## 5.4 Vercel

### Propósito
Despliegue del frontend.

### Requisitos
- proyecto Vercel creado
- repo conectado
- variables de entorno base cargadas
- preview deploys y producción definidos si aplica

### Variables típicas
- mismas del frontend público/servidor que correspondan
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- otras según slice real

### Estado actual
- pending_creation

### Validación
- primer deploy exitoso
- app accesible
- variables resueltas correctamente

---

## 5.5 Google Cloud OAuth

### Propósito
Base de login con Google y acceso a APIs del ecosistema Google.

### Requisitos
- proyecto en Google Cloud creado
- OAuth consent screen configurado
- app/client OAuth creado
- redirect URLs definidas
- scopes conceptuales confirmados
- dominio y branding básico cuando aplique

### Variables típicas
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Estado actual
- pending_creation

### Validación
- login con Google funciona
- Supabase Auth puede completar el flujo
- el usuario entra al producto y llega a Día > Hoy

---

## 5.6 Google Drive

### Propósito
Leer fuentes y carpetas conectadas.

### Requisitos
- scopes correctos definidos
- estrategia clara de lectura:
  - recursos enlazados manualmente
  - carpetas conectadas
  - recursos compartidos
- carpeta base de trabajo definida
- reglas de acceso corporativo entendidas

### Variables típicas
- normalmente se apoya en OAuth de Google; no suele requerir variables separadas si la app usa el mismo consentimiento

### Estado actual
- planned / pending_setup

### Validación
- se puede listar metadata de recursos autorizados
- se puede leer un recurso fuente real
- se puede registrar origen de la fuente correctamente

---

## 5.7 Google Docs

### Propósito
Leer contenido estructurado de notas o documentos.

### Requisitos
- acceso a Docs API mediante OAuth configurado
- lectura de contenido validada
- mapeo mínimo de contenido → texto normalizado

### Estado actual
- planned / pending_setup

### Validación
- se puede leer un documento real
- el contenido entra al pipeline de procesamiento

---

## 5.8 Google Sheets

### Propósito
Consumir fuentes vivas estructuradas, especialmente OKRs/KRs.

### Requisitos
- acceso al Sheet oficial
- mapeo mínimo de columnas definido
- estrategia de sync diaria definida
- manejo de cambios del Sheet previsto

### Variables típicas
- normalmente cubiertas por OAuth Google
- si se usa service account en algún caso interno futuro, deberá documentarse aparte

### Estado actual
- fuente oficial definida
- integración productiva aún pendiente

### Validación
- se puede leer el Sheet
- se pueden normalizar Objective y KeyResult
- el sync actualiza representación interna sin sobrescribir la fuente oficial

---

## 5.9 Google Calendar

### Propósito
Enriquecer Día > Hoy con agenda real.

### Requisitos
- permisos de lectura de eventos
- timezone del usuario disponible
- lectura de eventos del día
- cálculo básico de ocupación vs tiempo libre

### Estado actual
- planned / pending_setup

### Validación
- se pueden leer eventos del día
- se puede poblar el bloque de reuniones y tiempo disponible en Día > Hoy

---

## 5.10 Gemini Developer API

### Propósito
Primera capa planeada de análisis real.

### Requisitos
- proyecto o cuenta configurada
- API key creada
- límites básicos entendidos
- endpoint probado
- prompt base de análisis validado

### Variables típicas
- `GEMINI_API_KEY`
- `GEMINI_MODEL` opcional

### Estado actual
- pending_creation

### Validación
- se puede llamar al modelo
- devuelve JSON estructurado utilizable
- se puede procesar una fuente real pequeña

---

## 5.11 Slack (opcional / futuro)

### Propósito
Posible notificación o distribución de salidas futuras.

### Requisitos
- workspace objetivo confirmado
- canal objetivo confirmado
- método de integración definido:
  - webhook
  - app
  - bot token
- alcance real validado

### Variables típicas
- `SLACK_WEBHOOK_URL`
- o variables de app/bot si luego aplica

### Estado actual
- not_needed_yet / future

### Validación
- solo cuando el producto realmente lo necesite

---

## 5.12 Atlassian / Jira (solo si entra más adelante)

### Propósito
Integración futura opcional para backlog o tareas externas.

### Requisitos
- definir caso de uso real primero
- no activar por anticipación

### Variables típicas
- `ATLASSIAN_API_TOKEN`
- `ATLASSIAN_BASE_URL`
- `ATLASSIAN_EMAIL` o equivalente

### Estado actual
- not_needed_yet

### Regla
No meter Jira al scope técnico activo si todavía no forma parte del slice actual.

---

## 6. Variables de entorno mínimas por fase

## 6.1 Fase 0–1 (docs + shell + repo)
No requiere secretos profundos si solo se trabaja UI estática o mockeada.

### Útiles si se conectará frontend real pronto
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 6.2 Fase 2 (auth)
Obligatorias:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Posibles adicionales según stack:
- URL base del sitio para redirects
- callbacks de auth según framework

---

## 6.3 Fase 3–4 (sources + processing base)
Obligatorias:
- variables de Supabase
- variables mínimas de auth
- acceso a n8n si el flujo ya sale del frontend
- acceso a fuente real o mock confiable

Útiles:
- `N8N_BASE_URL`
- `N8N_API_KEY`

---

## 6.4 Fase 5–6 (automatización + análisis IA)
Obligatorias:
- variables de Supabase
- variables de n8n
- `GEMINI_API_KEY`

Si se activa lectura de Google:
- OAuth y permisos correspondientes

---

## 6.5 Fase 7+ (calendar, objetivos, integraciones completas)
Obligatorias según slice:
- variables Google activas
- access a Sheets
- access a Calendar
- configuración Vercel si ya se despliega producción/preview

---

## 7. Checklist de setup por entorno

## 7.1 Local / desarrollo
Debe existir:
- `.env.local` o equivalente
- acceso al repo
- acceso a Supabase
- acceso a n8n si aplica
- scripts claros para arrancar

### Regla
No se debe asumir que local tendrá todos los secretos de producción.

---

## 7.2 Preview / testing
Debe existir:
- entorno conectado al repo
- variables mínimas cargadas
- auth funcionando si ya se está probando login
- datos o mocks adecuados

---

## 7.3 Producción
Debe existir:
- variables separadas
- credenciales finales
- revisión de seguridad mínima
- trazabilidad de quién puede administrar cada servicio

---

## 8. Checklist de preparación antes de abrir el primer slice funcional real

Antes de abrir el slice:
**login + Día > Fuentes + Añadir recurso + procesamiento + resultado estructurado**

deben estar resueltos como mínimo:

### Producto / docs
- docs base en repo
- roadmap aprobado
- schema base definido

### Repo / app
- shell base creada
- estructura del repo lista
- convenciones visibles

### Auth
- Supabase listo
- Google OAuth listo o a punto de probarse

### Datos
- migración inicial lista para ejecutar

### Automatización
- n8n accesible
- workflow mínimo planificado

### IA
- estrategia de análisis decidida
- credencial de Gemini pendiente o lista

---

## 9. Checklist de validación rápida por bloque

## GitHub
- [ ] repo accesible
- [ ] estructura inicial creada
- [ ] docs subidos
- [ ] branching/commits claros

## Supabase
- [ ] proyecto activo
- [ ] URL disponible
- [ ] anon key disponible
- [ ] service role protegida
- [ ] CLI o acceso SQL funcionando

## n8n
- [ ] instancia accesible
- [ ] API key protegida
- [ ] naming de workflows definido
- [ ] export/versionado previsto

## Google OAuth
- [ ] project creado
- [ ] consent screen
- [ ] client ID
- [ ] client secret
- [ ] redirect URLs

## Google Drive / Docs / Sheets / Calendar
- [ ] scopes definidos
- [ ] lectura probada al menos una vez
- [ ] estrategia de uso clara por integración

## Gemini
- [ ] API key creada
- [ ] endpoint probado
- [ ] output JSON probado

## Vercel
- [ ] proyecto creado
- [ ] repo conectado
- [ ] variables cargadas

---

## 10. Qué no debe pasar

No debe pasar que:
- los secretos vivan en el repo
- las claves se compartan completas por chat
- una integración se marque como lista solo porque “conceptualmente ya existe”
- se intente construir auth o automatización sin setup mínimo
- el proyecto dependa de una sola persona que sabe dónde están los accesos

---

## 11. Pendientes que deben actualizarse con el tiempo

Este documento debe actualizarse cuando cambie cualquiera de estos puntos:
- nueva integración activa
- nuevas variables obligatorias
- rotación de credenciales
- nuevo entorno
- cambio del proveedor de IA
- incorporación de Slack/Jira u otra herramienta real
- cambios en la estrategia de auth

---

## 12. Regla para Claude Code y Antigravity

Este documento debe usarse como checklist previo a cualquier implementación que dependa de:
- auth
- secretos
- integraciones
- despliegue
- automatización real

Si una credencial o setup no existe aún, la herramienta no debe asumirla como disponible.
Debe marcarse explícitamente como:
- pendiente
- bloqueante
- o no necesaria todavía para el slice actual
