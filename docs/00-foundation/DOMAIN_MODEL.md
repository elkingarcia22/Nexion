# Nexión — Domain Model
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir el modelo conceptual del dominio de Nexión para alinear producto, datos, automatización, backend y construcción en Claude Code / Antigravity.

---

## 1. Objetivo del documento

Este documento define:
- cuáles son las entidades principales de Nexión
- qué representa cada entidad
- cómo se relacionan conceptualmente
- cuáles son obligatorias desde el inicio
- cuáles pueden activarse más adelante

No define todavía tablas finales ni contratos técnicos detallados.
Su función es establecer la lógica de negocio del sistema.

---

## 2. Principio general del dominio

Nexión convierte **fuentes de información** en **salidas estructuradas y operables**.

La lógica central del dominio es:

**fuente → análisis → hallazgos → propuestas/acciones → seguimiento → impacto en objetivos**

Y, en paralelo:

**fuente → señales cuantitativas / cualitativas → visibilidad diaria y global**

---

## 3. Entidades núcleo del sistema

## 3.1 Usuario

### Qué representa
Persona que usa Nexión.

### Para qué sirve
- autenticación
- ownership
- aprobaciones
- trazabilidad de acciones
- personalización de la experiencia diaria

### Ejemplos de uso
- iniciar sesión con Google
- aprobar una tarea propuesta
- ver su día y su agenda

---

## 3.2 Fuente

### Qué representa
Cualquier recurso de información que entra a Nexión.

### Ejemplos
- nota de reunión
- transcripción
- documento
- sheet
- recurso de Drive
- reunión de feedback ingresada por link

### Para qué sirve
Es el punto de entrada base del sistema.
Todo lo demás nace directa o indirectamente de una fuente.

### Atributos conceptuales principales
- tipo de fuente
- origen
- link / referencia
- fecha asociada
- estado de procesamiento
- owner si aplica
- contexto del día

---

## 3.3 Análisis

### Qué representa
El resultado del procesamiento estructurado de una fuente.

### Para qué sirve
Transforma contenido bruto en una salida usable.

### Qué puede producir
- resumen
- temas clave
- hallazgos
- señales detectadas
- propuestas de tarea
- insights
- alertas
- métricas mencionadas
- feedback identificado

### Regla
Una fuente puede tener uno o varios análisis según versión, reanálisis o procesamiento incremental.

---

## 3.4 Hallazgo

### Qué representa
Unidad estructurada de información detectada por el análisis.

### Qué puede ser
- insight
- alerta
- feedback
- métrica identificada
- propuesta de tarea
- señal de cambio relevante

### Para qué sirve
Permite separar la interpretación del análisis en objetos utilizables.

### Regla
No todo hallazgo se convierte en tarea.
Algunos solo alimentan visibilidad, métricas o seguimiento.

---

## 3.5 Tarea

### Qué representa
Trabajo operable derivado de una o varias fuentes/hallazgos.

### Para qué sirve
Mover la operación real del usuario y conectar el sistema con ejecución.

### Regla clave
La IA puede **proponer** tareas, pero la creación definitiva requiere aprobación humana.

### Estados oficiales
- por iniciar
- completada
- incompleta
- en pausa
- deprecada

### Atributos conceptuales principales
- título
- descripción
- prioridad
- estado
- fecha objetivo si existe
- objetivo/KR relacionado
- fuente/hallazgo de origen
- aprobación requerida

---

## 3.6 Insight

### Qué representa
Hallazgo interpretativo o patrón relevante.

### Ejemplos
- fricción repetida en un flujo
- oportunidad emergente
- comportamiento relevante de usuarios
- patrón que conecta varias fuentes

### Regla
Insight y métrica no son lo mismo.
Un insight interpreta; una métrica cuantifica.

---

## 3.7 Alerta

### Qué representa
Señal que requiere atención prioritaria.

### Ejemplos
- bug crítico mencionado
- riesgo activo
- bloqueo
- problema que empeora una métrica
- alerta operativa del día

### Para qué sirve
Crear foco y seguimiento sobre lo urgente o riesgoso.

---

## 3.8 Métrica

### Qué representa
Dato cuantitativo relevante para el producto o la operación.

### Dos niveles del dominio
#### Métrica diaria
Señal cuantitativa detectada o actualizada en el contexto del día.

#### Métrica global
Indicador consolidado de negocio o usabilidad.

### Ejemplos
- ARR nuevo
- churn
- retención
- completitud
- adopción
- conversión
- funnel

### Regla
Las métricas pueden venir de:
- fuentes analizadas
- documentos externos
- sheets vivos
- integraciones futuras

---

## 3.9 Feedback

### Qué representa
Comentario, observación, dolor, sugerencia o percepción expresada en una fuente.

### Para qué sirve
Separar el feedback como categoría propia, visible tanto en el día como globalmente.

### Regla
No todo feedback es tarea.
No todo feedback es insight.
Puede alimentar ambas cosas, pero conceptualmente sigue siendo una categoría propia.

---

## 3.10 Objetivo

### Qué representa
Objetivo de negocio o producto del trimestre.

### Para qué sirve
Conectar el trabajo detectado por Nexión con el marco estratégico.

### Regla
La fuente de verdad del objetivo vive fuera de Nexión, en Google Sheets.
Nexión la consume y la enriquece con contexto y trabajo derivado.

---

## 3.11 Key Result (KR)

### Qué representa
Resultado clave asociado a un objetivo.

### Para qué sirve
Permitir trazabilidad más fina entre trabajo detectado y cumplimiento del trimestre.

### Regla
Una tarea puede apuntar a un KR.
Un hallazgo puede sugerir impacto sobre un KR sin convertirse automáticamente en tarea.

---

## 3.12 Propuesta pendiente de aprobación

### Qué representa
Cambio sugerido por el sistema que todavía no debe aplicarse sin validación humana.

### Ejemplos
- creación de tarea
- cambio de estado de tarea
- cierre de alerta
- actualización de insight
- actualización de feedback
- ajuste de métrica interpretada

### Para qué sirve
Controlar el equilibrio entre automatización y confianza.

---

## 3.13 Actualización automática

### Qué representa
Cambio que el sistema detecta y aplica o propone durante la corrida diaria.

### Para qué sirve
Hacer visible la autoactualización del sistema.

### Debe permitir distinguir
- cambios aplicados automáticamente
- cambios propuestos pendientes de aprobación

---

## 3.14 Día

### Qué representa
Contenedor operativo del contexto diario.

### Para qué sirve
Agrupar lo que pasó, cambió, se procesó o requiere atención en una fecha concreta.

### Debe integrar
- fuentes del día
- tareas generadas
- insights del día
- métricas del día
- alertas del día
- feedback del día
- agenda del calendario
- estado de autoactualización

---

## 3.15 Dashboard

### Qué representa
Vista panorámica global del sistema.

### Para qué sirve
No es una entidad de datos, pero sí una entidad conceptual del dominio de lectura.
Consolida señales del sistema para lectura ejecutiva.

---

## 4. Entidades de soporte

## 4.1 Calendario / Evento de calendario

### Qué representa
Reuniones o bloques de agenda vinculados al usuario.

### Para qué sirve
- mostrar reuniones de hoy
- calcular tiempo en reuniones vs trabajo disponible
- ayudar a organizar el día

---

## 4.2 Producto / Área / Tema

### Qué representa
Contexto temático o de producto al que puede pertenecer una fuente, tarea, feedback o métrica.

### Para qué sirve
- segmentación
- filtrado
- consolidación
- lectura por producto

---

## 4.3 Corrida de análisis

### Qué representa
Una ejecución del sistema de análisis, manual o automática.

### Para qué sirve
- trazabilidad técnica
- auditoría mínima
- saber qué se procesó cuándo
- explicar qué actualizó el sistema

---

## 5. Relaciones conceptuales principales

## 5.1 Fuente → Análisis
- una fuente genera uno o varios análisis
- un análisis pertenece a una fuente

## 5.2 Análisis → Hallazgos
- un análisis produce múltiples hallazgos
- cada hallazgo pertenece a un análisis

## 5.3 Hallazgo → Categoría específica
- un hallazgo puede clasificarse como insight, alerta, métrica, feedback o propuesta de tarea

## 5.4 Hallazgo → Tarea
- un hallazgo puede proponer una tarea
- una tarea puede venir de uno o varios hallazgos

## 5.5 Tarea → Objetivo / KR
- una tarea puede apuntar a un objetivo
- idealmente apunta también a un KR cuando aplique

## 5.6 Fuente / Hallazgo / Tarea → Día
- todo lo que ocurre en Nexión debe poder ubicarse en un contexto diario

## 5.7 Fuente / Hallazgo / Tarea / Métrica / Alerta → Usuario
- debe poder saberse quién lo creó, revisó, aprobó o gestiona

## 5.8 Propuesta pendiente → Entidad objetivo
- toda propuesta pendiente debe apuntar a algo concreto que pueda aprobarse o rechazarse

---

## 6. Núcleo mínimo para Release 1

Para el primer release, las entidades mínimas necesarias son:
- usuario
- fuente
- análisis
- hallazgo
- día
- propuesta pendiente (mínima, si aplica)

### Regla
Tarea, objetivo, KR, métricas globales y alertas globales pueden existir conceptualmente desde ya, pero no toda su profundidad funcional debe activarse en Release 1.

---

## 7. Núcleo mínimo para Release 2

Se vuelve obligatorio profundizar en:
- tarea
- relación hallazgo → tarea
- aprobación humana de tarea propuesta

---

## 8. Núcleo mínimo para Release 3

Se vuelve obligatorio profundizar en:
- objetivo
- KR
- relación tarea ↔ objetivo/KR

---

## 9. Reglas estructurales del dominio

1. Toda información importante debe poder rastrearse a su fuente.
2. La IA propone, pero no decide sola la creación definitiva de tareas.
3. El día es una capa de operación, no solo de visualización.
4. Dashboard no reemplaza Día > Hoy.
5. Insights y métricas deben modelarse por separado.
6. El sistema debe distinguir entre cambios aplicados y cambios propuestos.
7. Los objetivos viven fuera como fuente maestra, pero dentro de Nexión se relacionan con trabajo detectado.

---

## 10. Preguntas abiertas para documentos siguientes

Estas preguntas no se cierran aquí; pasan a documentos posteriores:
- estructura exacta de estados por entidad
- granularidad final de hallazgos
- si insight, alerta, feedback y métrica serán tablas propias o subtipos de hallazgo
- modelo exacto de aprobación
- reglas de versionado de análisis
- nivel de auditoría necesario
- modelo exacto de agenda/calendario

---

## 11. Regla para Claude Code y Antigravity

Este documento define el dominio conceptual base.
No deben proponerse modelos de datos o servicios que contradigan esta lógica sin registrar primero una decisión nueva del proyecto.
