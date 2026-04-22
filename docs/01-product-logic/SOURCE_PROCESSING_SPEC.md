# Nexión — Source Processing Spec
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir cómo Nexión ingesta, valida, procesa, reanaliza y consolida fuentes de información, manteniendo trazabilidad, procesamiento incremental y separación clara entre orquestación, análisis y aprobación humana.

---

## 1. Objetivo del documento

Este documento define:
- qué es una fuente procesable dentro de Nexión
- cómo entra una fuente al sistema
- qué pasos sigue desde su ingreso hasta producir salida estructurada
- cómo se distingue entre ingesta manual, detección automática y reprocesamiento
- cómo se evita reprocesar innecesariamente
- qué estados de procesamiento debe manejar el sistema
- qué salidas puede producir el análisis de una fuente

No define todavía:
- prompts finales del modelo
- nodos exactos de n8n
- contratos HTTP finales
- SQL definitivo

Su función es fijar la lógica funcional del pipeline de fuentes.

---

## 2. Principio general

Nexión transforma fuentes en resultados estructurados y operables.

La lógica general del procesamiento es:

**fuente → validación → lectura/extracción → análisis → hallazgos estructurados → propuestas/salidas → consolidación diaria**

### Regla principal
Nexión no debe reanalizar todo indiscriminadamente.
Debe procesar de forma incremental, priorizando:
- fuentes nuevas
- fuentes modificadas
- fuentes reintentadas manualmente
- consolidaciones necesarias del día

---

## 3. Qué es una fuente en Nexión

Una fuente es cualquier recurso que contiene información relevante para el sistema.

### Ejemplos iniciales
- reunión de feedback ingresada por link
- nota de reunión
- transcripción
- Google Doc
- Google Sheet
- recurso compartido en Drive

### Regla de producto
El caso de uso inicial del Release 1 es:
- fuente tipo reunión de feedback por link

Pero el sistema debe diseñarse para aceptar otras fuentes después sin cambiar su lógica conceptual.

---

## 4. Formas de entrada de una fuente

## 4.1 Ingreso manual
El usuario pega un link en **Añadir recurso**.

### Propósito
Permitir incorporación rápida de una fuente específica.

### Resultado esperado
La fuente queda registrada y lista para validación/procesamiento.

---

## 4.2 Detección automática
El sistema detecta una fuente desde integraciones planeadas o activas.

### Ejemplos
- recurso nuevo en Drive
- cambio en una fuente ya registrada
- documento relevante encontrado en una carpeta conectada

### Resultado esperado
La fuente entra al sistema con trazabilidad de origen automático.

---

## 4.3 Reprocesamiento manual
El usuario fuerza nuevamente el análisis de una fuente.

### Casos típicos
- error previo
- cambio del contenido
- ajuste de criterios
- necesidad de refrescar el análisis

---

## 4.4 Corrida programada del sistema
Una corrida diaria revisa si hay fuentes nuevas o cambiadas que deban procesarse o consolidarse.

### Frecuencia inicial oficial
- diaria después de las 6:00 pm

---

## 5. Pipeline funcional de procesamiento

Toda fuente debe pasar por estas etapas lógicas.

## 5.1 Registro
La fuente entra al sistema con:
- referencia o link
- tipo detectado o supuesto inicial
- fecha
- origen
- workspace
- usuario creador si aplica

## 5.2 Validación mínima
El sistema verifica:
- que el link exista
- que el formato sea válido
- que el recurso sea accesible
- que el tipo sea soportable o clasificable
- que exista información mínima para seguir

## 5.3 Lectura / extracción
El sistema intenta leer el contenido útil de la fuente.

### Resultado esperado
Generar una versión legible o normalizada del contenido.

## 5.4 Preprocesamiento
Antes del análisis, el sistema puede:
- limpiar ruido
- recortar contenido irrelevante
- dividir contenido largo en partes
- enriquecer metadata
- identificar cambios frente a la versión anterior

## 5.5 Análisis estructurado
La capa de análisis interpreta el contenido y genera:
- resumen
- hallazgos
- señales
- categorías detectadas
- propuestas de tarea
- alerts
- métricas
- feedback
- insights

## 5.6 Persistencia del resultado
El sistema guarda:
- estado del procesamiento
- versión del análisis
- hallazgos
- errores si existieron
- trazabilidad de corrida

## 5.7 Consolidación diaria
Los resultados de las fuentes procesadas alimentan:
- Día > Hoy
- Día > Fuentes
- Día > Resumen del análisis
- Día > Tareas generadas
- Día > Insights
- Día > Métricas
- Día > Alertas
- Día > Feedback

---

## 6. Estados de una fuente

Toda fuente debe poder vivir, como mínimo, en uno de estos estados:

- pending
- processing
- processed
- error
- needs_review
- outdated

### Definición base

#### pending
La fuente fue registrada, pero aún no empezó procesamiento real.

#### processing
La fuente está siendo leída, analizada o consolidada.

#### processed
La fuente produjo salida estructurada usable.

#### error
La fuente no pudo completarse correctamente.

#### needs_review
La fuente se procesó parcialmente o produjo baja confianza y requiere revisión.

#### outdated
El análisis actual ya no representa la última versión útil de la fuente y debe refrescarse.

---

## 7. Causas típicas de error

Nexión debe contemplar errores como:

- link inválido
- acceso denegado
- recurso vacío
- formato no soportado
- extracción fallida
- timeout o fallo del modelo
- contenido insuficiente
- error en consolidación

### Regla UX
Los errores deben ser:
- claros
- accionables
- no técnicos para el usuario final
- trazables para el sistema

---

## 8. Qué salidas puede producir una fuente

Una fuente procesada puede producir, según el contenido:

- resumen estructurado
- findings
- feedback
- insights
- alertas
- señales métricas
- propuestas de tarea
- propuestas de actualización
- relación potencial con objetivos/KRs

### Regla
No toda fuente produce todas las categorías.
El sistema debe devolver solo lo que tenga evidencia razonable.

---

## 9. Relación entre fuente y hallazgos

Una fuente puede producir muchos hallazgos.
Todo hallazgo debe conservar referencia a:
- fuente
- análisis
- corrida de procesamiento
- fecha/contexto

### Regla
Nada importante debe perder su vínculo con la fuente original.

---

## 10. Procesamiento incremental

Nexión debe evitar reprocesar fuentes sin necesidad.

### Reglas básicas
Una fuente debe reprocesarse cuando:
- es nueva
- cambió su contenido
- fue marcada manualmente para reintento
- falló antes y se intenta recuperar
- la lógica del sistema exige consolidación nueva

### Regla de eficiencia
Si una fuente no cambió y su análisis sigue vigente, no debe reprocesarse desde cero.

---

## 11. Detección de cambio en una fuente

El sistema debe estar preparado para identificar si una fuente cambió.

### Señales posibles
- hash de contenido
- fecha de modificación
- tamaño
- versión del recurso
- timestamp de fuente externa

### Resultado esperado
Decidir si:
- no hacer nada
- reprocesar
- marcar como outdated
- consolidar de nuevo el día

---

## 12. Chunking y textos largos

Dado que el análisis puede involucrar textos extensos, Nexión debe contemplar procesamiento por partes.

### Regla funcional
Si una fuente es muy larga, el sistema debe poder:
- dividirla en segmentos
- analizar segmentos
- consolidar resultados parciales
- producir una salida única útil

### Objetivo
Evitar depender de una sola llamada gigante al modelo y reducir riesgo por límites de contexto.

---

## 13. Separación de responsabilidades

## 13.1 Orquestación
La capa de orquestación debe encargarse de:
- detectar o registrar fuentes
- validar acceso
- leer contenido
- preparar el material
- llamar a la capa de análisis
- guardar resultados
- disparar consolidación

## 13.2 Capa de análisis
Debe encargarse de:
- interpretar contenido
- clasificar señales
- proponer tareas
- detectar feedback, insights, alertas y métricas

## 13.3 Humano
Debe encargarse de:
- corregir casos ambiguos
- aprobar tareas propuestas
- aprobar cambios sensibles de autoactualización cuando aplique

---

## 14. Qué debe hacer la corrida diaria

La corrida diaria de después de las 6:00 pm debe:

1. revisar fuentes nuevas o cambiadas
2. procesar lo necesario
3. evitar reprocesar lo que no cambió
4. consolidar resultados del día
5. actualizar el contexto de Día
6. generar propuestas pendientes si corresponde
7. registrar qué se actualizó automáticamente

### Resultado esperado
El usuario entra a Día > Hoy y entiende:
- qué pasó
- qué se procesó
- qué se autoactualizó
- qué requiere aprobación

---

## 15. Qué debe mostrar Día > Fuentes

La tab de **Fuentes** debe reflejar el pipeline real.

Debe mostrar por fuente:
- nombre/título
- origen
- tipo
- fecha/hora
- estado
- si fue añadida manual o automáticamente
- acceso a detalle del resultado
- posibilidad de reprocesar cuando aplique

### Regla
La tab Fuentes no es solo lista de links.
Es la bandeja operativa del pipeline diario.

---

## 16. Qué debe mostrar el detalle de una fuente

Cuando el usuario abre una fuente, debe poder ver:
- metadata básica
- estado del procesamiento
- resultado estructurado
- resumen
- categorías detectadas
- tareas propuestas si existen
- alertas o errores
- origen y trazabilidad

---

## 17. Relación con Día y Dashboard

## 17.1 Día
Las fuentes procesadas alimentan directamente el contexto diario.

## 17.2 Dashboard
No debe mostrar todas las fuentes, pero sí:
- volumen de procesamiento
- señales globales
- focos importantes derivados del conjunto

---

## 18. Relación con tareas

Una fuente no crea tareas definitivas directamente.
Primero genera hallazgos y, si aplica, propuestas de tarea.

### Regla crítica
Toda tarea definitiva requiere aprobación humana.

---

## 19. Relación con métricas, insights y alertas

Una fuente puede:
- mencionar una métrica
- originar un insight
- disparar una alerta
- consolidar feedback

### Regla
Estas salidas deben poder existir aunque la fuente no genere tareas.

---

## 20. Relación con objetivos/KRs

Desde Release 3 en adelante, el análisis de una fuente puede:
- sugerir relación con un objetivo
- sugerir relación con un KR
- producir señales que afecten objetivos

### Regla
El vínculo puede ser detectado, sugerido o manual, nunca asumido ciegamente.

---

## 21. Releases y profundidad

### Release 1
Debe soportar:
- ingreso manual por link
- validación básica
- procesamiento de una fuente tipo reunión de feedback
- resultado estructurado
- estados base

### Release 2
Debe soportar:
- propuestas de tarea
- reprocesamiento más claro
- mejor trazabilidad en el pipeline

### Release 3
Debe soportar:
- vínculo con objetivos/KRs
- más señales estructuradas maduras

### Release 4+
Debe soportar:
- múltiples tipos de fuente
- mayor automatización
- consolidación más robusta
- reglas más ricas de actualización

---

## 22. Qué no debe hacer el sistema

Nexión no debe:
- tratar todos los recursos como iguales sin clasificar
- reprocesar todo todos los días
- ocultar errores de acceso o análisis
- crear tareas definitivas automáticamente
- mezclar resultado estructurado con ruido bruto
- perder trazabilidad entre fuente, análisis y salidas

---

## 23. Preguntas abiertas para el siguiente nivel

Estas decisiones pasan a documentos posteriores:
- tipos finales de fuente soportados en cada release
- reglas exactas de deduplicación
- hashing/versionado de contenido
- tamaño máximo por chunk
- definición exacta de confianza para needs_review
- reintentos automáticos vs manuales
- storage final del contenido extraído

---

## 24. Regla para Claude Code y Antigravity

Este documento debe usarse como fuente de verdad para diseñar o construir:
- el módulo Añadir recurso
- Día > Fuentes
- el pipeline de procesamiento
- estados de fuente
- servicios de análisis y consolidación

Toda implementación debe respetar la lógica:
- entrada mínima
- procesamiento incremental
- trazabilidad total
- separación entre hallazgo y tarea
- aprobación humana para tareas definitivas
