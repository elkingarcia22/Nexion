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

Su función es actuar como regla madre de ejecución para build.

---

## 2. Principio general

Nexión debe construirse como un sistema incremental, trazable y flexible.

La prioridad no es construir "todo el estado final" de una sola vez.
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
Antes de decidir el siguiente paso, revisar output de n8n, SQL ejecutado, respuesta de Claude Code, cambio aplicado en repo, pantalla generada en Antigravity, resultado real de una integración.

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
- login, shell base, Día > Fuentes, añadir recurso, guardar fuente, procesar, mostrar resultado estructurado

### Ejemplo de slice incorrecto
- construir 20 tablas, 8 pantallas, 5 integraciones sin poder completar un flujo real de usuario

---

## 6. Reglas para frontend

- Frontend no orquesta el sistema
- Consumir lecturas estables
- Home operativo real es Día > Hoy
- Visión completa, profundidad incremental
- UX clara sobre magia: autoactualizaciones, propuestas pendientes y estados del sistema deben ser visibles

---

## 7. Reglas para backend y datos

- Supabase es la fuente estructurada principal
- Propuesta y entidad final deben estar separadas (TaskProposal ≠ Task)
- No romper el modelo por conveniencia
- Diseño preparado para workspace
- Sin secretos en código o docs

---

## 8. Reglas para automatización

- n8n es el orquestador principal
- Workflows pequeños y claros
- No reanalizar todo todos los días
- La corrida diaria debe ser entendible (qué corrió, qué cambió, qué falló, qué quedó pendiente)
- Cambios sensibles no se aplican silenciosamente

---

## 9. Reglas para IA

- La IA no es el orquestador
- No acoplar a un proveedor único
- Prompting con propósito: resumen, clasificación, propuestas, consolidación
- Aprobación humana en tareas
- Evitar calls gigantes innecesarias: usar chunking, análisis incremental y consolidación

---

## 10. Reglas para Antigravity

- Trabaja sobre el repo, no fuera de él
- Cambios pequeños y validables
- Usar contexto documental
- Primero shell y estructura, luego refinamiento
- No usar Antigravity como fuente de verdad del producto

---

## 11. Reglas para Claude Code

- Leer docs antes de implementar
- Proponer antes de tocar arquitectura sensible (schema, auth, integraciones, navegación, servicios, automatización)
- Respetar slices pequeños
- Priorizar reproducibilidad
- No esconder decisiones críticas en código

---

## 12. Reglas para documentación

- Documento maestro antes que implementación caótica
- Los docs mandan sobre prompts aislados
- Cada documento debe servir para build
- Si algo cambia de fondo, actualizar primero el documento madre

---

## 13. Regla de seguridad

Nunca:
- pegar secretos completos en documentación pública
- hardcodear tokens
- usar cuentas personales dispersas sin trazabilidad

Sí debe hacerse:
- documentar variables requeridas
- separar credenciales por entorno
- limitar exposición de claves sensibles

---

## 14. Orden recomendado de construcción

### Fase 1
docs base, shell del producto, login, navegación, Día > Fuentes, añadir recurso, procesamiento básico, salida estructurada

### Fase 2
propuestas de tarea, aprobación humana, tareas globales

### Fase 3
objetivos/KRs, vínculos estratégicos

### Fase 4
métricas, insights, alertas

### Fase 5
dashboard más fuerte, autoactualización madura, agenda y organización del día

---

## 15. Regla para Claude Code y Antigravity

Este documento es obligatorio para cualquier trabajo de construcción en Nexión.

Toda implementación debe respetar:
- incrementalidad real
- separación de capas
- trazabilidad
- documentación como fuente de verdad
- aprobación humana en decisiones sensibles
- uso de MCPs/APIs para acelerar sin volver opaco el sistema
