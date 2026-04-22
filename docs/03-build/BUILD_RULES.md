# Nexión — Build Rules
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir las reglas obligatorias de construcción para Claude Code, Antigravity y cualquier colaborador técnico que implemente Nexión.

---

## 1. Objetivo del documento

Este documento define:
- cómo debe construirse Nexión
- qué reglas de trabajo son obligatorias
- qué no debe hacer el equipo o los agentes
- cómo iterar sin romper el sistema
- cómo tomar decisiones técnicas sin perder el marco del producto

No define todavía:
- estructura exacta del repo
- convenciones finas de código
- prompts detallados por herramienta
- roadmap técnico por sprint

Su función es actuar como regla madre de ejecución para build.

---

## 2. Principio general

Nexión debe construirse como un sistema incremental, trazable y flexible.

La prioridad no es construir “todo el estado final” de una sola vez.
La prioridad es construir slices reales de valor sin perder la arquitectura base.

### Regla principal
Toda construcción debe respetar este orden:

**claridad de producto → estructura de datos → automatización → UI → refinamiento**

---

## 3. Reglas fijas de construcción

Estas reglas son obligatorias.

### 3.1 Un paso a la vez
No avanzar varios bloques críticos simultáneamente sin validar el output del paso anterior.

### 3.2 Esperar output real
Antes de decidir el siguiente paso, revisar:
- output de n8n
- SQL ejecutado
- respuesta de Claude Code
- cambio aplicado en repo
- pantalla generada en Antigravity
- resultado real de una integración

### 3.3 No rehacer por ansiedad
Si una decisión puede resolverse con una capa intermedia o un ajuste incremental, no rehacer toda la arquitectura.

### 3.4 SQL-first cuando aplique
En Supabase, preferir SQL reproducible sobre configuración manual cuando sea razonable.

### 3.5 MCP/API-first cuando acelere de verdad
Si una tarea puede resolverse mejor con MCP o API y evita trabajo manual innecesario, usar esa ruta.

### 3.6 La plataforma es la experiencia final
El usuario final interactúa con Nexión, no con Sheets, n8n, Drive ni herramientas técnicas.

### 3.7 La fuente viva externa sigue siendo externa
Drive, Sheets y otras fuentes vivas no reemplazan el modelo interno del producto.

### 3.8 La IA propone; el humano valida
Especialmente para tareas y cambios sensibles.

### 3.9 Trazabilidad obligatoria
Toda entidad importante debe poder rastrearse a origen, corrida y decisión humana cuando aplique.

### 3.10 Documentar antes de improvisar
Si una decisión afecta estructura, navegación, datos, integraciones o automatización, primero debe quedar alineada con los docs maestros.

---

## 4. Orden de decisión recomendado

Toda decisión técnica importante debe pasar por este filtro:

1. ¿Qué problema de producto resuelve?
2. ¿Contradice el Project Master Brief?
3. ¿Contradice la arquitectura de información?
4. ¿Rompe trazabilidad?
5. ¿Obliga a rehacer algo que podría resolverse incrementalmente?
6. ¿Añade complejidad innecesaria?
7. ¿Se puede validar con un slice más pequeño?

### Regla
Si una decisión falla en estos puntos, no debe implementarse todavía.

---

## 5. Regla de slices funcionales

Nexión debe construirse por slices completos, no por capas aisladas sin valor usable.

### Ejemplo de slice correcto
- login
- shell base
- Día > Fuentes
- añadir recurso
- guardar fuente
- procesar
- mostrar resultado estructurado

### Ejemplo de slice incorrecto
- construir 20 tablas
- construir 8 pantallas
- conectar 5 integraciones
- sin poder completar un flujo real de usuario

---

## 6. Reglas para frontend

### 6.1 Frontend no orquesta el sistema
No debe cargar la lógica pesada de automatización, análisis o sincronización.

### 6.2 Consumir lecturas estables
El frontend debe leer payloads estructurados, no improvisar joins complejos desde la UI.

### 6.3 Home operativo real
El foco principal del frontend debe ser:
**Día > Hoy**

### 6.4 Visión completa, profundidad incremental
Se puede construir la shell visual completa del sistema, pero no debe sobreprometer funcionalidad inexistente.

### 6.5 UX clara sobre magia
Las autoactualizaciones, propuestas pendientes y estados del sistema deben ser visibles.

---

## 7. Reglas para backend y datos

### 7.1 Supabase es la fuente estructurada principal
No usar Google Drive o Google Sheets como backend real del producto.

### 7.2 Propuesta y entidad final deben estar separadas
TaskProposal y Task no se colapsan.
Lo mismo aplica a update proposals vs cambios aplicados.

### 7.3 No romper el modelo por conveniencia
No simplificar relaciones críticas si se pierde trazabilidad.

### 7.4 Diseño preparado para workspace
Aunque al inicio el uso sea simple, el modelo debe quedar preparado para partición por workspace.

### 7.5 Sin secretos en código o docs
Solo nombres de variables o referencias.

---

## 8. Reglas para automatización

### 8.1 n8n es el orquestador principal
Los flujos importantes deben vivir de forma trazable y versionable.

### 8.2 Workflows pequeños y claros
Preferir varios workflows con responsabilidad clara sobre un mega workflow opaco.

### 8.3 No reanalizar todo todos los días
Aplicar procesamiento incremental.

### 8.4 La corrida diaria debe ser entendible
Debe quedar claro:
- qué corrió
- qué cambió
- qué falló
- qué quedó pendiente

### 8.5 Cambios sensibles no se aplican silenciosamente
Especialmente:
- creación de tareas
- cierres/deprecaciones
- cambios interpretativos relevantes

---

## 9. Reglas para IA

### 9.1 La IA no es el orquestador
La IA es un servicio de análisis llamado por la automatización o por backend.

### 9.2 No acoplar a un proveedor único
Gemini es la primera opción planeada, no una dependencia irreversible.

### 9.3 Prompting con propósito
Los prompts deben diseñarse para:
- resumen
- clasificación
- propuestas
- consolidación
- no para comportamiento ambiguo o excesivamente abierto

### 9.4 Aprobación humana en tareas
Toda tarea definitiva debe pasar por revisión humana.

### 9.5 Evitar calls gigantes innecesarias
Usar chunking, análisis incremental y consolidación.

---

## 10. Reglas para Antigravity

### 10.1 Trabaja sobre el repo, no fuera de él
Todo cambio útil debe terminar versionado en GitHub.

### 10.2 Cambios pequeños y validables
No pedirle refactors masivos sin razón clara.

### 10.3 Usar contexto documental
Antigravity debe partir de los docs maestros, no de intuiciones sueltas.

### 10.4 Primero shell y estructura, luego refinamiento
Especialmente en frontend.

### 10.5 No usar Antigravity como fuente de verdad del producto
El repo y la documentación son la fuente de verdad.

---

## 11. Reglas para Claude Code

### 11.1 Leer docs antes de implementar
No asumir navegación, entidades o flujos sin revisar los documentos maestros.

### 11.2 Proponer antes de tocar arquitectura sensible
Si el cambio afecta:
- schema
- auth
- integraciones
- navegación
- servicios
- automatización
debe explicitar qué documento impacta.

### 11.3 Respetar slices pequeños
No intentar resolver todo el sistema de una vez.

### 11.4 Priorizar reproducibilidad
Código, SQL, scripts y configuración deben ser repetibles.

### 11.5 No esconder decisiones críticas en código
Si una regla es importante, debe existir también en documento.

---

## 12. Reglas para documentación

### 12.1 Documento maestro antes que implementación caótica
Si un área aún no está clara, primero se documenta.

### 12.2 Los docs mandan sobre prompts aislados
Los prompts pueden acelerar, pero no reemplazan el marco documental.

### 12.3 Cada documento debe servir para build
La documentación no es decorativa.
Debe poder usarse directamente por Claude Code, Antigravity o el equipo.

### 12.4 Si algo cambia de fondo, actualizar primero el documento madre
Especialmente:
- Project Master Brief
- Information Architecture
- Tech Architecture
- Schema Spec
- Automation Architecture

---

## 13. Reglas sobre integraciones no activas

Nexión puede documentar y diseñar integraciones que aún no están activas.

### Estados permitidos
- active
- planned
- pending_setup
- pending_credentials

### Regla
No bloquear el diseño por falta de credenciales hoy, pero tampoco asumir que algo ya funciona si no está activado.

---

## 14. Regla de manejo de incertidumbre

Cuando haya incertidumbre técnica o funcional:
1. no improvisar como definitivo
2. dejar explícito qué está decidido y qué no
3. escoger la opción más reversible
4. validar con el slice más pequeño posible

---

## 15. Regla de seguridad

Nunca:
- pegar secretos completos en documentación pública
- hardcodear tokens
- usar cuentas personales dispersas sin trazabilidad
- asumir que los secretos vivirán solo en local

### Sí debe hacerse
- documentar variables requeridas
- separar credenciales por entorno
- limitar exposición de claves sensibles

---

## 16. Regla de observabilidad mínima

Todo bloque crítico debe dejar rastro suficiente para entender:
- qué se ejecutó
- cuándo
- sobre qué entidades
- con qué resultado
- qué error ocurrió
- qué aprobó o rechazó el humano

---

## 17. Regla de priorización técnica

Cuando haya varias opciones técnicas, se prioriza:
1. simplicidad
2. trazabilidad
3. reproducibilidad
4. bajo esfuerzo operativo
5. flexibilidad futura
6. costo razonable
7. velocidad de validación

No se prioriza:
- sofisticación innecesaria
- arquitectura “bonita” pero vacía
- optimización prematura

---

## 18. Qué no debe hacerse

No se debe:
- construir todo el estado final antes de validar slices
- depender de un solo documento vivo externo como si fuera backend
- mezclar visiones de producto con hacks temporales sin documentar
- usar el frontend para resolver carencias de backend/orquestación
- crear tareas definitivas automáticamente
- rehacer pantallas o schema enteros por ajustes menores
- perder alineación entre repo y documentación

---

## 19. Orden recomendado de construcción

### Fase 1
- docs base
- shell del producto
- login
- navegación
- Día > Fuentes
- añadir recurso
- procesamiento básico
- salida estructurada

### Fase 2
- propuestas de tarea
- aprobación humana
- tareas globales

### Fase 3
- objetivos/KRs
- vínculos estratégicos

### Fase 4
- métricas
- insights
- alertas

### Fase 5
- dashboard más fuerte
- autoactualización madura
- agenda y organización del día

---

## 20. Regla para Claude Code y Antigravity

Este documento es obligatorio para cualquier trabajo de construcción en Nexión.

Toda implementación debe respetar:
- incrementalidad real
- separación de capas
- trazabilidad
- documentación como fuente de verdad
- aprobación humana en decisiones sensibles
- uso de MCPs/APIs para acelerar sin volver opaco el sistema
