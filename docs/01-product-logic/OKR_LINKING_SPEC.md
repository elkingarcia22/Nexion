# Nexión — OKR Linking Spec
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir cómo Nexión consume la fuente oficial de objetivos/KRs, cómo vincula trabajo operativo con objetivos del trimestre y cómo muestra ese impacto en el producto sin convertir a Nexión en la fuente maestra de OKRs.

---

## 1. Objetivo del documento

Este documento define:
- cómo se leen los objetivos y KRs desde la fuente oficial externa
- cómo Nexión representa objetivos y KRs dentro del sistema
- cómo tareas, hallazgos, métricas y alertas pueden vincularse a ellos
- qué parte del vínculo es automática, sugerida o manual
- cómo se refleja el impacto en módulos como Día, Tareas, Objetivos y Dashboard

No define todavía:
- credenciales finales de integración con Google Sheets
- SQL final
- mapeo exacto de columnas del Sheet
- detalle técnico del workflow de n8n

Su función es fijar la lógica funcional y de producto del vínculo entre operación y estrategia.

---

## 2. Principio general

Nexión no es la fuente maestra de OKRs.

La fuente oficial de objetivos y KRs vive en un Google Sheet externo mantenido por el equipo.
Nexión consume esa fuente, la normaliza, la relaciona con el trabajo detectado por el sistema y la usa para dar contexto estratégico al trabajo diario.

La lógica base es:

**fuente → análisis → hallazgo → tarea propuesta / tarea → objetivo / KR**

Y, en paralelo:

**métricas / alertas / insights → señal de impacto sobre objetivo o KR**

---

## 3. Fuente oficial de OKRs/KRs

### Fuente oficial
La fuente oficial de objetivos y KRs es el Google Sheet compartido por el usuario.

### Regla de negocio
- Nexión no edita la lógica maestra del framework de OKRs
- Nexión no reemplaza el Sheet como fuente de verdad
- Nexión consume, refleja y enriquece la relación entre trabajo y objetivos

### Estado previsto
La integración debe tratar la fuente como:
- externa
- viva
- actualizable
- sincronizable

---

## 4. Qué representa un Objetivo dentro de Nexión

Un **Objetivo** representa una prioridad estratégica del trimestre.

Dentro de Nexión debe permitir:
- saber qué trabajo apunta a él
- ver señales que lo impulsan o lo ponen en riesgo
- ver métricas asociadas
- consultar tareas vinculadas
- entender su contexto operativo actual

### Qué no debe asumir Nexión
Nexión no debe asumir que puede calcular por sí sola el avance oficial completo del objetivo si ese avance depende de decisiones externas o reglas no disponibles en el sistema.

---

## 5. Qué representa un KR dentro de Nexión

Un **Key Result** representa un resultado medible asociado a un objetivo.

Dentro de Nexión debe permitir:
- vincular tareas concretas
- relacionar hallazgos y métricas
- mostrar si una tarea o señal empuja, bloquea o afecta el KR
- enriquecer la lectura de cumplimiento con evidencia operativa

### Regla
Idealmente, la relación más fina del sistema debe ser:
**tarea → KR**
y por extensión:
**KR → objetivo**

---

## 6. Qué puede vincularse a objetivos y KRs

Dentro de Nexión, estas entidades pueden vincularse a un Objetivo o KR:

- Task
- TaskProposal
- Finding
- Insight
- Alert
- MetricSignal
- FeedbackItem (opcional en casos relevantes)

### Regla práctica
No todo debe vincularse obligatoriamente.
El sistema debe priorizar el vínculo cuando:
- exista evidencia clara
- el contenido lo mencione explícitamente
- el usuario lo apruebe o lo complete
- el objetivo/KR sea razonablemente inferible

---

## 7. Modos de vínculo

El vínculo con objetivos/KRs puede nacer de tres maneras:

### 7.1 Vínculo detectado automáticamente
El sistema encuentra una relación con suficiente confianza.

Ejemplos:
- la fuente menciona explícitamente el objetivo o KR
- la tarea propuesta coincide con un KR claro
- la métrica detectada corresponde a una métrica del KR

### 7.2 Vínculo sugerido por el sistema
El sistema cree que existe relación, pero no debe asumirla como definitiva.

Ejemplos:
- la tarea parece empujar un objetivo
- una alerta afecta una métrica clave del KR
- un insight sugiere impacto sobre una iniciativa del trimestre

### 7.3 Vínculo manual
El usuario corrige, agrega o confirma el vínculo.

### Regla
Los vínculos sensibles o ambiguos deben poder revisarse manualmente.

---

## 8. Qué significa “impactar un objetivo”

Nexión no debe tratar el vínculo como una casilla vacía.
Debe poder expresar el tipo de impacto.

### Tipos de impacto sugeridos
- impulsa
- habilita
- bloquea
- pone en riesgo
- informa
- requiere validación

### Ejemplos
- una tarea que implementa una mejora clave **impulsa**
- una tarea técnica que desbloquea un lanzamiento **habilita**
- una alerta crítica que frena adopción **pone en riesgo**
- una métrica baja que requiere revisión **informa** o **requiere validación**

---

## 9. Qué debe mostrar el módulo Objetivos

La vista global de **Objetivos** debe permitir, como mínimo:

- listado de objetivos activos
- progreso visible si la fuente lo provee
- KRs asociados
- tareas vinculadas
- métricas relevantes
- alertas o riesgos asociados
- hallazgos recientes que impactan el objetivo
- relación entre trabajo detectado y resultado esperado

### Regla
Debe sentirse estratégica, pero aterrizada en evidencia operativa.

---

## 10. Qué debe mostrar Día respecto a Objetivos

### Día > Hoy
Debe mostrar solo lo más importante:
- tareas del día vinculadas a objetivos/KRs
- propuestas que impactan objetivos
- alertas relevantes para objetivos
- foco del día relacionado con prioridades estratégicas

### Día > Tareas generadas
Debe indicar:
- si una tarea propuesta o aprobada está vinculada a un objetivo/KR
- si el vínculo es detectado, sugerido o confirmado

### Día > Métricas
Debe permitir identificar si una señal del día afecta un objetivo o KR.

### Regla
Día usa contexto de objetivos para priorizar y explicar, no para reemplazar el módulo global Objetivos.

---

## 11. Relación entre métricas y OKRs

Las métricas de negocio y usabilidad pueden tener relación directa con KRs.

### Ejemplos
- completitud puede ser métrica de un KR
- engagement puede empujar un objetivo
- ARR nuevo puede servir como señal de avance
- caídas del funnel pueden poner en riesgo un KR

### Regla
Una métrica no equivale automáticamente a progreso oficial.
Puede ser:
- evidencia
- contexto
- proxy
- señal de riesgo
- señal de avance

---

## 12. Relación entre alertas y OKRs

Una alerta puede:
- bloquear un KR
- poner en riesgo un objetivo
- exigir trabajo que proteja una meta del trimestre

### Regla
Las alertas relevantes para objetivos deben ser visibles tanto en:
- el módulo global de Alertas
- como en el contexto del objetivo afectado

---

## 13. Relación entre tareas y OKRs

Una tarea puede:
- no tener objetivo asociado
- apuntar a un objetivo
- apuntar a un KR específico

### Regla de negocio
Cuando el sistema detecte un vínculo posible, debe proponerlo.
El usuario puede:
- aprobar el vínculo
- cambiarlo
- quitarlo

### Valor de producto
Esto permite responder:
- qué trabajo del día empuja qué objetivo
- cuánto esfuerzo está alineado al trimestre
- qué tareas están desconectadas de objetivos

---

## 14. Estructura mínima que Nexión necesita de la fuente externa

Aunque el Google Sheet final puede evolucionar, Nexión necesita como mínimo estas piezas lógicas:

### Para Objetivo
- objective_id o identificador equivalente
- nombre del objetivo
- descripción opcional
- estado
- owner si existe
- periodo / trimestre

### Para KR
- key_result_id o identificador equivalente
- objective_id relacionado
- nombre del KR
- meta o target si existe
- valor actual si existe
- estado si existe
- owner si existe

### Regla
Si el Sheet no trae todos estos campos, Nexión debe adaptar el vínculo a lo disponible sin inventar datos faltantes.

---

## 15. Sincronización con la fuente oficial

### Frecuencia deseada
- actualización diaria a las 6:00 pm como mínimo
- posibilidad de refresco manual posterior

### Qué debe traer la sincronización
- objetivos activos
- KRs activos
- estados visibles
- progreso si existe
- cambios recientes si se pueden inferir

### Qué no debe hacer Nexión
No debe sobreescribir la fuente oficial como si fuera la verdad maestra del sistema de OKRs.

---

## 16. Vínculos sugeridos y aprobación humana

Los vínculos con objetivos/KRs pueden necesitar aprobación humana cuando:
- la confianza del sistema sea baja
- existan varios KRs posibles
- la tarea sea ambigua
- el hallazgo pueda interpretarse de varias maneras

### Acciones humanas posibles
- aprobar vínculo sugerido
- editar vínculo
- eliminar vínculo
- dejar sin vínculo

---

## 17. Señales que Nexión debe mostrar sobre alineación

Nexión debe ser capaz de responder visualmente:
- qué porcentaje del trabajo del día está vinculado a objetivos
- qué objetivos tienen más trabajo asociado
- qué objetivos tienen más alertas o riesgos
- qué KRs están siendo más impactados
- qué tareas importantes no están alineadas con objetivos

### Regla
Estas señales son orientativas y operativas.
No deben venderse como “medición oficial de estrategia” si dependen de lógica incompleta.

---

## 18. Estados conceptuales del vínculo

Un vínculo entre entidad operativa y objetivo/KR puede estar en alguno de estos estados:

- detected
- suggested
- confirmed
- edited
- removed

### Propósito
Permitir trazabilidad sobre qué fue inferido por el sistema y qué fue validado por una persona.

---

## 19. Qué no debe hacer el sistema

Nexión no debe:
- asumir que toda tarea debe tener objetivo
- crear vínculos ficticios por llenar campos
- interpretar toda métrica como progreso real
- cambiar el avance oficial del OKR sin base suficiente
- esconder que un vínculo fue sugerido y no confirmado
- convertir el módulo de objetivos en una copia del Google Sheet

---

## 20. Relación con releases

### Release 1
No requiere vínculo operativo real con OKRs.
Solo debe dejar prevista la estructura.

### Release 2
Puede aparecer el campo conceptual de objetivo/KR en tareas propuestas, pero aún sin profundidad total.

### Release 3
Se vuelve obligatorio:
- sincronizar objetivos/KRs
- mostrar módulo Objetivos
- permitir vínculo tarea ↔ objetivo/KR
- mostrar señales de impacto

### Release 4+
Se profundiza en:
- métricas ligadas a KRs
- alertas por objetivo
- insights ligados a objetivos
- lectura más rica de avance y riesgo

---

## 21. Preguntas abiertas para el siguiente nivel

Estas preguntas pasan a especificaciones posteriores:
- estructura exacta del Google Sheet y mapping de columnas
- si Objective y KeyResult se versionan dentro de Nexión
- cómo representar múltiples KRs en una misma tarea
- cómo mostrar progreso sin sobreprometer exactitud
- si habrá scoring de alineación
- si el usuario podrá crear vínculos manuales desde UI

---

## 22. Regla para Claude Code y Antigravity

Este documento debe usarse como fuente de verdad para cualquier diseño o implementación relacionada con:
- módulo Objetivos
- vínculo entre tareas y estrategia
- lectura diaria con contexto de OKRs
- sincronización conceptual con la fuente oficial externa

No debe diseñarse Nexión como si los OKRs vivieran nativamente en el producto.
Nexión los consume, los representa y los conecta con trabajo operativo.
