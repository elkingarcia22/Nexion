# Nexión — User Flows
Version: v1.0
Status: Draft
Owner: Product / Build System
Purpose: Definir los flujos principales de usuario y del sistema para Nexión, separando claramente operación diaria, acciones manuales, automatización y puntos de aprobación humana.

---

## 1. Alcance de este documento

Este documento describe cómo fluye la experiencia en Nexión a nivel funcional.

Cubre:
- acceso al sistema
- home operativo del día
- ingreso manual de fuentes
- análisis de fuentes
- generación y aprobación de tareas propuestas
- autoactualización diaria
- vínculo con objetivos y métricas
- consulta de módulos globales

No cubre todavía:
- detalle técnico de APIs
- diseño de base de datos
- prompts de IA
- workflows de n8n a nivel nodo por nodo

---

## 2. Principios de flujo

1. **Día > Hoy** es el home operativo real.
2. El usuario debe poder entender rápidamente qué está pasando hoy.
3. El sistema debe automatizar donde aporte valor, pero mostrar claramente qué cambió.
4. Las tareas propuestas por IA requieren aprobación humana antes de crearse como tareas definitivas.
5. Lo diario y lo global no deben mezclarse.
6. Los flujos deben minimizar trabajo manual y maximizar trazabilidad.

---

## 3. Flujo 01 — Login con Google

### Objetivo
Permitir que el usuario entre a Nexión con su cuenta de Google de trabajo.

### Disparador
El usuario abre Nexión por primera vez o vuelve a entrar.

### Flujo ideal
1. El usuario abre la pantalla de login de Nexión.
2. Ve contexto breve sobre qué hace la plataforma.
3. Ve el botón principal **Continuar con Google**.
4. Inicia sesión con Google.
5. Acepta permisos cuando el flujo de integración esté activo.
6. Nexión crea o actualiza el perfil base del usuario.
7. El usuario entra al producto.
8. Nexión lo dirige a **Día > Hoy**.

### Resultado esperado
El usuario entra sin fricción y aterriza en su home operativo real.

### Notas
- El login es simple; no hay login tradicional por email/password.
- Los permisos de Google son parte del setup del producto, no una pantalla manual del usuario dentro de Nexión.

---

## 4. Flujo 02 — Entrada al sistema en Día > Hoy

### Objetivo
Preparar al usuario para iniciar su día con claridad.

### Disparador
El usuario entra a Nexión después del login o regresa al producto.

### Flujo ideal
1. Nexión abre **Día > Hoy**.
2. El usuario ve el resumen operativo del día.
3. Ve:
   - foco del día
   - tareas pendientes más importantes
   - alertas relevantes
   - reuniones del calendario
   - tiempo en reuniones vs tiempo disponible para trabajo
   - recomendaciones de organización del día
   - actualizaciones automáticas aplicadas
   - propuestas pendientes de aprobación
4. El usuario decide si:
   - revisa el día
   - aprueba propuestas pendientes
   - entra a Fuentes
   - entra a Tareas
   - cambia de fecha

### Resultado esperado
El usuario entiende qué hacer hoy sin tener que reconstruir manualmente su contexto.

---

## 5. Flujo 03 — Añadir fuente manualmente

### Objetivo
Permitir que el usuario incorpore una fuente de información al sistema mediante un link.

### Disparador
El usuario quiere procesar una nueva fuente.

### Flujo ideal
1. El usuario entra a **Día > Fuentes** o usa el CTA visible de **Añadir recurso**.
2. Nexión abre la experiencia mínima de ingreso.
3. El usuario pega el link del recurso.
4. Nexión intenta autocompletar:
   - nombre del recurso
   - fecha
   - tipo de recurso
   - señales mínimas de completitud
5. El usuario confirma el envío.
6. El recurso queda registrado en estado **pendiente** o **procesando**.
7. Nexión lo envía al pipeline de análisis.
8. Al terminar, el recurso aparece con salida estructurada visible.

### Resultado esperado
Una fuente entra al sistema con el menor esfuerzo posible.

### Regla de producto
En Release 1, el caso soportado principal es una reunión de feedback por link.

---

## 6. Flujo 04 — Procesamiento de una fuente

### Objetivo
Transformar una fuente bruta en información estructurada.

### Disparador
Una fuente nueva entra al sistema o una fuente cambia y debe reprocesarse.

### Flujo ideal
1. Nexión detecta que la fuente debe analizarse.
2. El sistema valida acceso y formato mínimo.
3. El sistema extrae o lee el contenido.
4. La capa de análisis interpreta la fuente.
5. Nexión genera una salida estructurada con categorías relevantes.
6. El recurso pasa a estado **procesado** o **error**.
7. El usuario puede abrir el detalle desde el módulo Día.

### Salidas esperadas
Según el caso, la fuente puede producir:
- resumen
- feedback
- insights
- alertas
- métricas detectadas
- tareas propuestas

### Resultado esperado
El usuario deja de ver un link suelto y ve una fuente comprendida por el sistema.

---

## 7. Flujo 05 — Revisión del resumen del análisis

### Objetivo
Permitir que el usuario entienda rápidamente qué interpretó Nexión sobre las fuentes del día.

### Disparador
El usuario entra a **Día > Resumen del análisis**.

### Flujo ideal
1. Nexión consolida el resultado del día.
2. El usuario entra a la tab **Resumen del análisis**.
3. Ve una síntesis de:
   - qué fuentes se procesaron
   - qué hallazgos relevantes salieron
   - qué cambió en el día
   - qué requiere atención
4. Desde allí puede profundizar en otras tabs si necesita más detalle.

### Resultado esperado
Entender el día sin leer fuente por fuente desde cero.

---

## 8. Flujo 06 — Propuesta y aprobación de tareas

### Objetivo
Convertir hallazgos en tareas propuestas y permitir aprobación humana.

### Disparador
El sistema detecta accionables en una fuente o en el consolidado del día.

### Flujo ideal
1. Nexión detecta un posible accionable.
2. Lo clasifica como **tarea propuesta**.
3. Le asigna contexto mínimo:
   - fuente origen
   - prioridad sugerida
   - fecha detectada o urgencia
   - objetivo/KR relacionado si aplica
4. La propuesta aparece en:
   - **Día > Tareas generadas**
   - y/o en **Día > Hoy** si requiere aprobación
5. El usuario revisa la propuesta.
6. Puede:
   - aprobar
   - editar antes de aprobar
   - rechazar
7. Si aprueba, la propuesta se convierte en tarea definitiva.
8. La tarea pasa al módulo global **Tareas**.

### Resultado esperado
Las tareas no nacen a ciegas; nacen con contexto y validación humana.

### Regla crítica
La IA no crea tareas definitivas automáticamente.

---

## 9. Flujo 07 — Gestión de tareas globales

### Objetivo
Permitir el seguimiento y mantenimiento del trabajo generado.

### Disparador
El usuario entra al módulo **Tareas**.

### Flujo ideal
1. El usuario ve la lista global de tareas.
2. Puede filtrar por:
   - estado
   - prioridad
   - fecha
   - objetivo
   - fuente
3. Abre una tarea.
4. Puede:
   - cambiar estado
   - editar contenido
   - pausarla
   - marcarla como completada
   - marcarla como incompleta
   - deprecarla
5. Nexión mantiene trazabilidad con la fuente origen.

### Resultado esperado
El sistema pasa de sugerir trabajo a permitir operarlo en el tiempo.

---

## 10. Flujo 08 — Autoactualización del día

### Objetivo
Actualizar automáticamente el estado operativo del sistema después de una corrida programada.

### Disparador
Corrida diaria después de las 6:00 pm.

### Flujo ideal
1. Nexión ejecuta la corrida diaria.
2. Revisa fuentes nuevas o cambiadas.
3. Reanaliza solo lo necesario.
4. Detecta cambios posibles en:
   - tareas
   - alertas
   - insights
   - feedback
   - métricas
5. Separa cambios en dos grupos:
   - cambios aplicables automáticamente
   - propuestas que requieren aprobación
6. Actualiza la experiencia de **Día > Hoy**.
7. El usuario ve:
   - qué se autoactualizó
   - qué quedó pendiente de aprobación
8. El usuario aprueba o corrige si hace falta.

### Resultado esperado
El sistema se mantiene vivo sin volverse opaco.

---

## 11. Flujo 09 — Consulta de objetivos y vínculo con trabajo

### Objetivo
Conectar trabajo operativo con objetivos y KRs.

### Disparador
El usuario entra al módulo **Objetivos** o revisa una tarea vinculada.

### Flujo ideal
1. Nexión toma la fuente oficial externa de OKRs/KRs.
2. El sistema muestra objetivos y KRs vigentes.
3. El usuario revisa cómo tareas, alertas o hallazgos se conectan a ellos.
4. Puede entender qué trabajo empuja qué objetivo.
5. Si hace falta, corrige o complementa el vínculo.

### Resultado esperado
El usuario deja de ver objetivos y operación como mundos separados.

---

## 12. Flujo 10 — Consulta de métricas del día y métricas globales

### Objetivo
Separar lectura operativa diaria de lectura consolidada de métricas.

### Disparadores
- el usuario entra a **Día > Métricas**
- o entra al módulo global **Métricas**

### Flujo diario
1. El usuario entra a **Día > Métricas**.
2. Ve señales cuantitativas detectadas o actualizadas ese día.
3. Usa esa información para contexto operativo inmediato.

### Flujo global
1. El usuario entra a **Métricas**.
2. Ve métricas de negocio y usabilidad consolidadas.
3. Ve comparativos, contexto y evolución general.
4. Usa esta vista para decisiones más amplias.

### Resultado esperado
Las métricas del día y las métricas globales no se confunden.

---

## 13. Flujo 11 — Consulta de insights y alertas

### Objetivo
Permitir lectura operativa y global de hallazgos y riesgos.

### Insights
1. En **Día > Insights**, el usuario ve hallazgos del día.
2. En **Insights**, ve el universo consolidado de patrones y hallazgos.

### Alertas
1. En **Día > Alertas**, el usuario ve alertas relevantes del día.
2. En **Alertas**, ve la gestión global de alertas activas o históricas.

### Resultado esperado
Lo diario sirve para acción inmediata; lo global sirve para seguimiento y consolidación.

---

## 14. Flujo 12 — Cambio de día y revisión histórica operativa

### Objetivo
Permitir revisar días anteriores sin romper la lógica del home operativo.

### Disparador
El usuario cambia la fecha desde el selector de Día.

### Flujo ideal
1. El usuario abre el selector de fecha.
2. Cambia al día anterior o a otro día de interés.
3. Nexión actualiza el contexto del módulo Día.
4. El usuario ve el equivalente de:
   - fuentes de ese día
   - resumen del análisis
   - tareas generadas
   - insights
   - métricas
   - alertas
   - feedback
5. Puede revisar qué pasó y qué quedó pendiente.

### Resultado esperado
El módulo Día funciona como centro operativo del presente y archivo navegable reciente.

---

## 15. Flujo 13 — Dashboard panorámico

### Objetivo
Ofrecer una vista global ejecutiva sin reemplazar el home operativo.

### Disparador
El usuario entra al módulo **Dashboard**.

### Flujo ideal
1. El usuario abre Dashboard.
2. Ve una lectura panorámica del sistema.
3. Identifica:
   - estado general
   - señales principales
   - carga operativa
   - focos relevantes
4. Si quiere actuar, salta a **Día > Hoy** o a un módulo global.

### Resultado esperado
Dashboard sirve para contexto general, no para operar el día a día.

---

## 16. Flujo 14 — Errores y recuperación

### Objetivo
Permitir que el usuario entienda y recupere errores sin perder el control.

### Casos esperados
- link inválido
- fuente no soportada
- recurso inaccesible
- análisis fallido
- propuesta conflictiva

### Flujo ideal
1. Nexión detecta el error.
2. Lo comunica en lenguaje simple.
3. Indica si el usuario puede corregir algo.
4. Ofrece acción clara:
   - corregir
   - reintentar
   - volver
5. Mantiene trazabilidad del intento fallido.

### Resultado esperado
Los errores no rompen el flujo ni obligan al usuario a empezar desde cero.

---

## 17. Mapa resumido de flujos prioritarios

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
- Métricas globales
- Insights globales
- Alertas globales

### Release 5
- Autoactualización diaria madura
- Dashboard más potente

---

## 18. Regla para implementación

Cualquier implementación técnica debe respetar este orden:
- primero claridad del flujo
- luego datos
- luego automatización
- luego refinamiento de inteligencia

La prioridad no es automatizar todo desde el inicio.
La prioridad es que cada flujo aporte valor real y sea comprensible para el usuario.
