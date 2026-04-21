# Nexión — Information Architecture
Version: v1
Status: Draft approved base
Owner: Product / Build System
Purpose: Definir la arquitectura de información, navegación visible y jerarquía de uso de Nexión para diseño, desarrollo y automatización.

---

## 1. Propósito de este documento

Este documento define cómo se organiza Nexión como sistema.
No define aún la arquitectura técnica de implementación.
Su objetivo es alinear a Claude Code, Antigravity, diseño y desarrollo sobre:

- navegación principal visible
- diferencia entre vistas operativas y vistas globales
- estructura del módulo Día
- jerarquía entre Dashboard, Día > Hoy y módulos globales
- lógica base de recorridos del usuario

---

## 2. Principio general de arquitectura de información

Nexión se organiza en dos niveles principales:

### Nivel 1 — Operación diaria
Representado por el módulo **Día**.
Es el centro operativo del sistema.
Aquí el usuario trabaja sobre lo que entró, cambió, se analizó o requiere atención en el contexto del día.

### Nivel 2 — Gestión global y profundidad
Representado por los módulos globales.
Aquí el usuario ve entidades persistentes, consolidadas o históricas del sistema.

### Regla general
- lo inmediato vive en **Día**
- lo consolidado vive en los **módulos globales**

---

## 3. Navegación visible principal

La navegación principal visible de Nexión queda definida así:

1. Dashboard
2. Día
3. Tareas
4. Objetivos
5. Métricas
6. Insights
7. Alertas

### Módulos que NO estarán visibles por ahora
- Configuración
- Boletines

### Aclaración
Estas capacidades no desaparecen del sistema.
Simplemente no forman parte del menú principal visible en esta etapa.

---

## 4. Jerarquía de navegación

### 4.1 Dashboard
Es una vista panorámica y ejecutiva.
No es el home operativo principal.
Debe servir para:
- lectura global del sistema
- visibilidad resumida
- focos ejecutivos
- señales generales del estado del trabajo

### 4.2 Día
Es el centro operativo del sistema.
Contiene el trabajo cotidiano del usuario.

### 4.3 Día > Hoy
Es el **home operativo real** de Nexión.
Debe ser la entrada principal de uso cotidiano.

### 4.4 Módulos globales
Tareas, Objetivos, Métricas, Insights y Alertas son módulos globales de profundidad, consolidación y seguimiento.

---

## 5. Diferencia entre Dashboard, Día > Hoy y módulos globales

### Dashboard responde a:
- ¿Cómo está el sistema en general?
- ¿Cuáles son los focos globales?
- ¿Qué señales ejecutivas vale la pena mirar?

### Día > Hoy responde a:
- ¿Qué pasó hoy?
- ¿Qué cambió hoy?
- ¿Qué se procesó hoy?
- ¿Qué está en foco hoy?
- ¿Qué requiere acción hoy?
- ¿Qué actualizó automáticamente el sistema?
- ¿Qué propuestas están pendientes de aprobación?
- ¿Cómo conviene organizar el día?

### Módulos globales responden a:
- ¿Cómo está esta categoría en todo el sistema?
- ¿Qué histórico o profundidad existe?
- ¿Qué debo gestionar más allá del día actual?

---

## 6. Módulo Día

El módulo **Día** es el contenedor operativo diario.
Debe mostrar el ciclo completo del trabajo cotidiano a partir de fuentes, análisis y salidas estructuradas.

### Reglas del módulo Día
- debe sentirse como el centro de trabajo diario
- debe permitir recorrer lo que entró, se procesó y se generó
- debe hacer visible la autoactualización del sistema
- debe diferenciar entre información aplicada y propuestas pendientes

---

## 7. Tabs internas del módulo Día

Dentro de Día existirán estas tabs:

1. Hoy
2. Fuentes
3. Resumen del análisis
4. Tareas generadas
5. Insights
6. Métricas
7. Alertas
8. Feedback

Estas tabs no son módulos globales separados.
Son vistas internas del contexto diario.

---

## 8. Definición de cada tab de Día

### 8.1 Hoy
Es la entrada principal real del usuario.
Debe mostrar:
- foco del día
- tareas pendientes prioritarias
- alertas importantes
- reuniones del calendario
- tiempo en reuniones vs tiempo disponible para trabajo
- recomendación de organización del día
- estado de autoactualización del sistema
- propuestas pendientes de aprobación

### 8.2 Fuentes
Muestra las fuentes del día.
Debe permitir:
- ver fuentes detectadas o añadidas
- añadir recurso manualmente
- revisar estado de procesamiento
- abrir detalle de una fuente

### 8.3 Resumen del análisis
Muestra una síntesis estructurada del análisis del día.
Debe responder:
- qué entendió Nexión del día
- qué temas surgieron
- qué señales relevantes aparecieron

### 8.4 Tareas generadas
Muestra las tareas propuestas o generadas a partir del análisis diario.
Debe diferenciar:
- tareas aprobadas
- tareas propuestas pendientes
- tareas modificadas automáticamente o sugeridas

### 8.5 Insights
Muestra hallazgos interpretativos del día.
Ejemplos:
- patrones
- oportunidades
- fricciones
- riesgos emergentes
- señales de comportamiento

### 8.6 Métricas
Muestra señales cuantitativas visibles en el contexto diario.
No reemplaza el módulo global de métricas.
Se enfoca en:
- métricas mencionadas hoy
- cambios relevantes del día
- señales cuantitativas derivadas del análisis

### 8.7 Alertas
Muestra lo urgente o anómalo dentro del día.
Ejemplos:
- bugs
- riesgos
- bloqueos
- desviaciones
- temas que requieren atención inmediata

### 8.8 Feedback
Muestra el feedback consolidado del día como categoría separada.
Debe permitir ver:
- observaciones
- quejas
- solicitudes
- comentarios relevantes provenientes de fuentes

---

## 9. Módulos globales

## 9.1 Tareas
Vista global de tareas del sistema.
Debe servir para:
- seguimiento
- priorización
- edición
- cambio de estado
- relación con objetivos
- histórico

## 9.2 Objetivos
Vista global de objetivos y KRs.
Debe servir para:
- ver avance
- vincular tareas y hallazgos
- entender impacto en objetivos
- consultar relación entre trabajo diario y estrategia

## 9.3 Métricas
Vista global de métricas de negocio y usabilidad.
Debe servir para:
- lectura consolidada
- comparativos
- evolución
- señales globales
- contexto frente a metas

## 9.4 Insights
Vista global de insights estructurados.
Debe servir para:
- revisar patrones agregados
- consultar hallazgos por categoría
- encontrar señales relevantes más allá del día

## 9.5 Alertas
Vista global de alertas activas o relevantes.
Debe servir para:
- monitoreo transversal
- atención prioritaria
- revisión de alertas históricas y abiertas

---

## 10. Qué NO debe mezclarse

### 10.1 Insights y Métricas
No deben mezclarse visual ni conceptualmente.

- **Insights** = interpretación, patrón, hallazgo
- **Métricas** = dato cuantitativo, indicador, número, comparación

### 10.2 Dashboard y Día > Hoy
No deben mezclarse.

- **Dashboard** = lectura panorámica global
- **Día > Hoy** = home operativo real

### 10.3 Tabs de Día y módulos globales
No deben asumirse como equivalentes.

Ejemplo:
- **Día > Métricas** = señales del día
- **Módulo Métricas** = vista consolidada global

---

## 11. Autoactualización visible del sistema

La arquitectura de información debe hacer visible que Nexión se actualiza automáticamente.

### Qué debe poder ver el usuario
- qué se actualizó automáticamente
- qué cambios fueron propuestos pero no aplicados
- qué propuestas están pendientes de aprobación
- cuándo fue la última actualización
- cuál es la próxima corrida esperada

### Dónde debe verse principalmente
- en **Día > Hoy**
- y donde aplique, en tabs diarias relacionadas

---

## 12. Acciones principales visibles

### Dentro de Día
Las acciones más visibles deben ser:
- Añadir recurso
- Analizar día
- aprobar/rechazar propuestas pendientes
- navegar entre tabs del día

### Dentro de módulos globales
Las acciones deben responder a la lógica de cada entidad.
Ejemplo:
- Tareas: editar, completar, cambiar estado
- Objetivos: revisar relación con trabajo
- Alertas: revisar, cerrar, escalar

---

## 13. Pantallas prioritarias del sistema

### Prioridad alta
- Login
- Dashboard
- Día > Hoy
- Día > Fuentes
- Día > Resumen del análisis
- Día > Tareas generadas

### Prioridad media
- Día > Insights
- Día > Métricas
- Día > Alertas
- Día > Feedback
- Tareas global
- Objetivos global

### Prioridad posterior
- Métricas global
- Insights global
- Alertas global

---

## 14. Lógica de recorrido principal del usuario

### Recorrido operativo principal
1. entra a Nexión
2. llega a Día > Hoy
3. entiende foco, agenda, alertas y pendientes
4. revisa fuentes del día
5. ve análisis estructurado
6. revisa tareas propuestas o generadas
7. aprueba o gestiona cambios relevantes
8. consulta módulos globales si necesita profundidad

---

## 15. Regla de diseño para desarrollo

La arquitectura de información debe implementarse con visión completa de producto, pero sin obligar a construir toda la profundidad funcional desde el primer release.

### Regla práctica
- la navegación puede existir completa visualmente
- el alcance funcional real puede activarse por etapas
- la presencia visual de un módulo no implica que su profundidad ya esté desarrollada

---

## 16. Decisiones fijas

Quedan fijas estas decisiones:
- Dashboard existe como módulo global visible
- Día es el centro operativo del sistema
- Día > Hoy es el home operativo real
- Insights y Métricas son categorías separadas
- Boletines no será módulo visible
- Configuración no será módulo visible
- la autoactualización del sistema debe ser visible al usuario

---

## 17. Elementos flexibles

Pueden cambiar con aprendizaje:
- profundidad interna de cada módulo global
- orden fino de tabs dentro de Día
- densidad de contenido de Dashboard
- detalle de aprobaciones visibles
- nivel de acciones rápidas por módulo

---

## 18. Regla para Claude Code y Antigravity

Este documento debe usarse como fuente de verdad para:
- navegación
- jerarquía de pantallas
- organización del sistema
- separación entre nivel diario y nivel global

No deben proponerse nuevas estructuras de navegación que contradigan este documento sin registrar primero una nueva decisión del proyecto.