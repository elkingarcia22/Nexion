# Nexión — User Flows
Version: v1.0
Status: Draft
Owner: Product / Build System
Purpose: Definir los flujos principales de usuario y del sistema para Nexión.

---

## 1. Principios de flujo

1. **Día > Hoy** es el home operativo real.
2. El usuario debe poder entender rápidamente qué está pasando hoy.
3. El sistema debe automatizar donde aporte valor, pero mostrar claramente qué cambió.
4. Las tareas propuestas por IA requieren aprobación humana antes de crearse como tareas definitivas.
5. Lo diario y lo global no deben mezclarse.

---

## 2. Flujo 01 — Login con Google

**Disparador:** El usuario abre Nexión.

**Flujo ideal:**
1. Ve pantalla de login con breve contexto del producto.
2. Hace clic en **Continuar con Google**.
3. Inicia sesión y acepta permisos.
4. Nexión crea/actualiza perfil y dirige a **Día > Hoy**.

**Resultado:** El usuario entra sin fricción y aterriza en su home operativo real.

---

## 3. Flujo 02 — Entrada al sistema en Día > Hoy

**Disparador:** El usuario entra a Nexión.

**El usuario ve:**
- foco del día
- tareas pendientes más importantes
- alertas relevantes
- reuniones del calendario
- tiempo en reuniones vs tiempo disponible
- actualizaciones automáticas aplicadas
- propuestas pendientes de aprobación

**Resultado:** El usuario entiende qué hacer hoy sin reconstruir manualmente su contexto.

---

## 4. Flujo 03 — Añadir fuente manualmente

**Disparador:** El usuario quiere procesar una nueva fuente.

**Flujo ideal:**
1. Entra a **Día > Fuentes** o usa el CTA **Añadir recurso**.
2. Pega el link del recurso.
3. Nexión autocompleta: nombre, fecha, tipo.
4. El usuario confirma.
5. El recurso queda en estado **pendiente** o **procesando**.
6. Al terminar, aparece con salida estructurada visible.

**Resultado:** Una fuente entra al sistema con el menor esfuerzo posible.

---

## 5. Flujo 04 — Procesamiento de una fuente

**Disparador:** Fuente nueva o modificada.

**Flujo:** Nexión valida acceso → extrae contenido → analiza → genera salida estructurada → actualiza estado a **procesado** o **error**.

**Salidas posibles:** resumen, feedback, insights, alertas, métricas, tareas propuestas.

---

## 6. Flujo 05 — Propuesta y aprobación de tareas

**Disparador:** Sistema detecta accionables en una fuente.

**Flujo ideal:**
1. Nexión clasifica hallazgo como **tarea propuesta** con contexto mínimo.
2. La propuesta aparece en **Día > Tareas generadas** y/o **Día > Hoy**.
3. El usuario aprueba, edita o rechaza.
4. Si aprueba → tarea definitiva creada con trazabilidad completa.

**Regla crítica:** La IA no crea tareas definitivas automáticamente.

---

## 7. Flujo 06 — Autoactualización del día

**Disparador:** Corrida diaria después de las 6:00 pm.

**Flujo ideal:**
1. Nexión revisa fuentes nuevas/cambiadas.
2. Detecta cambios posibles en tareas, alertas, insights, feedback, métricas.
3. Separa en: cambios aplicables automáticamente vs propuestas que requieren aprobación.
4. El usuario ve qué se autoactualizó y qué quedó pendiente.

**Resultado:** El sistema se mantiene vivo sin volverse opaco.

---

## 8. Mapa de flujos prioritarios por release

### Release 1
- Login con Google
- Entrada a Día > Hoy
- Añadir fuente por link
- Procesamiento de fuente
- Visualización de salida estructurada

### Release 2
- Propuesta y aprobación de tareas
- Gestión global de tareas

### Release 3
- Vínculo con objetivos/KRs

### Release 4
- Métricas globales, Insights globales, Alertas globales

### Release 5
- Autoactualización diaria madura, Dashboard más potente
