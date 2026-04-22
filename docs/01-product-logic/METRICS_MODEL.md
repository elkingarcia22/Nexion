# Nexión — Metrics Model
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir cómo Nexión modela, interpreta, actualiza y presenta métricas de negocio y usabilidad, separando claramente señales del día, métricas globales y su relación con fuentes, tareas y objetivos.

---

## 1. Objetivo del documento

Este documento define:
- qué es una métrica dentro de Nexión
- qué diferencia hay entre métrica diaria y métrica global
- qué tipos de métricas deben existir
- cómo se alimentan desde fuentes, documentos vivos o integraciones
- cómo se actualizan
- cómo se conectan con objetivos, insights, alertas y tareas
- qué debe ver el usuario en Día > Métricas y en el módulo global Métricas

No define todavía:
- el SQL final
- fórmulas técnicas exactas por integración
- dashboards finales
- visualizaciones analíticas avanzadas

Su función es fijar la lógica funcional del modelo de métricas.

---

## 2. Principio general del modelo de métricas

En Nexión, una métrica no es solo un número mostrado en pantalla.
Es una entidad operativa que debe poder:
- rastrearse a una fuente o integración
- entenderse en contexto
- compararse en el tiempo
- conectarse con objetivos/KRs
- activar alertas o tareas cuando sea necesario

La lógica base es:

**fuente o integración → señal métrica → consolidación → lectura diaria o global → impacto operativo/estratégico**

---

## 3. Qué es una métrica en Nexión

Una métrica es un indicador cuantitativo relevante para entender:
- salud del producto
- adopción
- valor percibido
- desempeño operativo
- avance hacia objetivos
- riesgos o desviaciones

### Regla
Las métricas deben modelarse separadas de los insights.

- **Métrica** = dato cuantitativo, valor, variación, indicador
- **Insight** = interpretación o patrón relevante sobre una o varias métricas o fuentes

---

## 4. Dos niveles del modelo de métricas

## 4.1 Métricas del día

### Qué representan
Señales cuantitativas detectadas, mencionadas o actualizadas dentro del contexto operativo diario.

### Dónde viven
- Día > Métricas
- Día > Hoy, cuando una métrica es especialmente relevante para el foco diario

### Para qué sirven
- dar contexto cuantitativo inmediato
- mostrar cambios relevantes del día
- explicar por qué algo requiere atención hoy

### Ejemplos
- en una reunión se menciona una caída de completitud
- una fuente habla de baja conversión inicial
- el sistema detecta que un KPI cambió respecto al corte previo

---

## 4.2 Métricas globales

### Qué representan
Lectura consolidada de negocio y usabilidad del sistema o del producto analizado.

### Dónde viven
- módulo global Métricas
- Dashboard, en versión resumida/panorámica

### Para qué sirven
- ver evolución
- comparar contra cortes previos
- leer desempeño agregado
- relacionar métricas con objetivos/KRs

### Regla
Las métricas globales son la capa persistente y consolidada.
Las métricas del día son una vista contextual y operativa.

---

## 5. Tipos de métricas prioritarias

## 5.1 Métricas de negocio

Nexión debe soportar como prioridad inicial métricas de negocio como:
- Nuevo ARR
- Empresas NSM
- ARR empresas NSM
- cuentas pagas dentro del NSM
- churn
- retención
- activación
- adopción
- engagement
- conversión
- expansión
- avance de objetivos/OKRs cuando haya señal cuantitativa relacionada

### Nota
La lista exacta puede crecer, pero estas categorías deben quedar previstas desde el inicio.

---

## 5.2 Métricas de usabilidad

Nexión debe soportar métricas de usabilidad como:
- completitud
- completion rate
- time on task
- error rate
- drop-off
- tasa de adopción de un flujo
- uso activo del módulo o funcionalidad
- señales de fricción cuantificadas

---

## 5.3 Métricas de funnel / adopción

Deben contemplarse métricas de paso entre etapas, por ejemplo:
- activas → en línea
- en línea → módulo activo
- módulo activo → usabilidad
- usabilidad → NSM

Estas métricas son clave porque ayudan a:
- detectar la mayor caída
- priorizar investigación
- convertir números en tareas o alertas

---

## 6. Fuentes de alimentación de métricas

Las métricas pueden entrar al sistema desde varias fuentes:

### 6.1 Fuentes analizadas por Nexión
Ejemplos:
- reuniones
- notas
- transcripciones
- documentos
- comentarios donde se mencionan números o estados cuantitativos

### 6.2 Fuentes vivas externas
Ejemplos:
- Google Sheets vivos
- documentos operativos de métricas
- hojas de seguimiento del negocio

### 6.3 Integraciones futuras
Ejemplos:
- herramientas de analítica
- producto
- CRM
- sistemas de reporting

### Regla
Toda métrica debe registrar su origen principal:
- detectada en fuente analizada
- sincronizada desde fuente externa
- consolidada internamente

---

## 7. Estructura conceptual mínima de una métrica

Toda métrica debe poder contemplar estos campos conceptuales:
- id
- nombre de la métrica
- categoría
- subtipo
- nivel (diario o global)
- valor actual
- unidad o formato
- valor anterior si existe
- delta absoluto
- delta porcentual
- fecha de corte
- fuente u origen
- producto / área / tema asociado
- objetivo o KR relacionado si aplica
- contexto interpretativo breve
- estado de actualización

---

## 8. Métrica vs señal métrica

Para evitar confusión, Nexión debe distinguir entre:

### 8.1 MetricSignal
Señal cuantitativa detectada en una fuente o corrida.
Ejemplo:
- “Completitud: 10.21%” detectado en una nota
- “Mayor caída: activas → elementos en línea”

### 8.2 MetricRecord global
Estado consolidado y persistente de una métrica relevante.
Ejemplo:
- la métrica global Completitud del producto Encuestas al corte del día

### Regla
Una misma métrica global puede alimentarse de múltiples señales a lo largo del tiempo.

---

## 9. Comparación temporal

Toda métrica relevante debe poder compararse contra un punto anterior.

### Comparativos prioritarios
- valor actual vs valor anterior
- corte de hoy vs corte anterior
- estado actual vs hace 15 días

### Regla operativa inicial
La frecuencia base deseada es:
- **actualización diaria a las 6:00 pm**

### Comparativo clave
Para el módulo global Métricas, Nexión debe estar preparado para responder:
- cómo vamos hoy vs hace 15 días
- qué mejoró
- qué empeoró
- qué está plano

---

## 10. Relación con objetivos y KRs

Las métricas deben poder conectarse con:
- objetivos
- KRs
- tareas
- alertas
- insights

### Casos típicos
- una métrica alimenta el avance de un KR
- una caída en una métrica genera una alerta
- una oportunidad sobre una métrica genera una tarea propuesta
- varias fuentes explican un cambio cuantitativo y producen un insight

### Regla
No toda métrica debe tener vínculo estratégico explícito.
Pero el sistema debe poder sugerirlo cuando exista evidencia.

---

## 11. Relación entre métricas e insights

No deben mezclarse.

### Ejemplo correcto
- **Métrica**: Completitud = 10.21%
- **Insight**: la baja completitud puede estar explicada por fricción en activación inicial

### Regla
El insight puede usar una o varias métricas como soporte, pero no reemplaza la métrica.

---

## 12. Relación entre métricas y alertas

Una métrica puede activar o alimentar una alerta cuando:
- cruza un umbral crítico
- empeora significativamente
- contradice el avance esperado de un objetivo
- revela una caída importante en el funnel

### Ejemplos
- completitud baja
- caída fuerte en activación inicial
- churn subiendo
- un paso del funnel muy por debajo del esperado

### Regla
La alerta debe conservar referencia a la métrica y al corte que la disparó.

---

## 13. Relación entre métricas y tareas

Una métrica no crea tareas por sí sola en automático, pero puede generar:
- tarea propuesta
- investigación sugerida
- análisis adicional
- seguimiento

### Ejemplo
- si la mayor caída está en “Activas → Elementos en línea”, Nexión puede proponer una tarea de investigación o análisis.

### Regla crítica
La creación definitiva de tareas sigue requiriendo revisión humana.

---

## 14. Qué debe mostrar Día > Métricas

La tab diaria de métricas debe mostrar:
- métricas mencionadas o actualizadas hoy
- cambios relevantes del día
- señales numéricas que afectan foco, alertas o tareas
- variaciones importantes respecto al corte anterior si existen
- contexto breve de lectura

### Qué no debe ser
No debe ser un dashboard pesado.
Debe ser una vista operativa, ligera y útil.

---

## 15. Qué debe mostrar el módulo global Métricas

El módulo global Métricas debe mostrar:
- métricas prioritarias de negocio
- métricas prioritarias de usabilidad
- comparativos temporales
- lectura por producto / área / tema
- relación con objetivos/KRs cuando aplique
- explicación mínima de por qué importa cada KPI
- focos relevantes derivados de los números

### Ejemplo de salida esperada
Una métrica global puede mostrarse así:
- valor actual
- contexto
- comparación vs corte anterior
- lectura breve
- focos sugeridos

---

## 16. Frecuencia de actualización

### Frecuencia inicial oficial
- corrida diaria después de las **6:00 pm**

### Qué debe pasar en la corrida
- detectar señales nuevas de métricas
- consolidar valores actualizados
- comparar contra cortes anteriores
- proponer cambios relevantes
- reflejar esos cambios en Día > Hoy, Día > Métricas y módulo global Métricas

---

## 17. Autoactualización y aprobación

El sistema puede:
- actualizar señales métricas automáticamente
- proponer interpretación o cambio de estado cuando haya suficiente evidencia

### Debe hacerse visible
- qué métricas se actualizaron automáticamente
- qué interpretación o ajuste quedó propuesto
- qué está pendiente de aprobación

### Regla
Si el cambio implica decisión sensible o alteración interpretativa importante, debe quedar como propuesta pendiente.

---

## 18. Núcleo mínimo por release

## Release 1
No requiere módulo completo de métricas.
Solo puede existir detección conceptual mínima de señales cuantitativas.

## Release 2
Las métricas pueden seguir siendo secundarias respecto al motor de tareas.

## Release 3
Empieza a cobrar valor la relación con objetivos y KRs.

## Release 4
Se vuelve obligatorio profundizar en:
- Día > Métricas
- módulo global Métricas
- comparativos
- relación con objetivos
- señales cuantitativas más maduras

## Release 5
Puede profundizarse en:
- Dashboard con mejor lectura de métricas
- mayor automatización de consolidación
- reglas más sofisticadas de alertado

---

## 19. Qué no debe hacer el modelo de métricas

Nexión no debe:
- mezclar métricas con insights
- mostrar números sin contexto
- actualizar métricas opacamente
- crear dashboards decorativos sin propósito
- perder trazabilidad de origen
- asumir que toda cifra detectada es una métrica global consolidada

---

## 20. Ejemplo de lectura esperada

Para una métrica de producto como Encuestas, Nexión debe estar preparado para estructurar lecturas del tipo:
- estado rápido
- KPIs clave
- contexto de por qué importan
- foco de la semana
- relación con OKRs
- recomendación de acción

### Regla
Aunque no habrá módulo visible de boletines por ahora, el sistema sí debe poder construir lectura editorial interna a partir de métricas.

---

## 21. Preguntas abiertas para el siguiente nivel

Estas decisiones pasan a documentos posteriores:
- estructura exacta de tablas de métricas
- si MetricSignal y MetricRecord estarán separados físicamente
- reglas de deduplicación
- umbrales de alertas por métrica
- catálogo oficial final de KPIs
- definición exacta de fórmulas por integración
- nivel de aprobación requerido por tipo de cambio

---

## 22. Regla para Claude Code y Antigravity

Este documento define la lógica funcional del modelo de métricas.

Toda implementación debe respetar estas reglas:
- separar métrica diaria de métrica global
- no mezclar métricas con insights
- mantener origen y contexto
- reflejar comparativos y cortes
- mostrar cambios automáticos con claridad
- preservar relación con objetivos, alertas y tareas cuando exista
