# Implementación y comprobaciones

## Fases realizadas

| Fase | Archivos principales | Resultado y comprobación |
| --- | --- | --- |
| 1. Fuentes y conversión | scripts/import_data.py, public/data/biometria.json, public/data/ambiente.json | Se leyeron los dos DOCX y el Excel. Se extrajeron las figuras del paper a references. Conversión de 40 observaciones con fila de origen y huella del Excel. Comparación completa con --check satisfactoria. |
| 2. Aplicación y diseño | package.json, vite.config.js, src/main.js, src/App.vue, src/assets/style.css | Vue y Vite con dos paneles y adaptación a móvil. Revisión visual en navegador a 1440 px y 390 px; sin desbordamiento horizontal. |
| 3. Datos, gráficas y filtros | src/modules/experiment.js, src/services/data.js, src/components/TemporalChart.vue | Cinco variables, selección múltiple, estado vacío y recuperación. Pruebas con valores nulos, duplicados, ausentes y datos de control. Se verificaron ceros y disminuciones sin corrección automática. |
| 4. Escenario y cámaras | src/components/FieldScene.vue | Cuatro áreas con varias plantas. Vistas frontal, lateral y superior. Revisión de las tres vistas y encuadre durante transiciones. Selección de sarán rojo por clic real sobre la parcela comprobada. |
| 5. Evolución temporal | src/App.vue, src/components/FieldScene.vue, src/components/TemporalChart.vue | Semana, indicadores, ficha y modelos comparten el mismo estado. Cambios entre semanas 1, 9 y 10 comprobados, incluido control con 6 y 5 plantas. Deslizador probado con Home y End. |
| 6. Verificación y preparación | tests/data.test.js, package-lock.json, README.md, dist/ | Tres pruebas automatizadas aprobadas, JSON íntegro y compilación final aprobada. Instrucciones locales y de Vercel documentadas. |

## Navegador

Las comprobaciones de interacción y capturas se guardaron en output/playwright. Se recorrieron las cinco variables, filtros, selección vacía, recuperación por botones, controles de cámara, selección de parcela por raycasting, teclado y pantalla móvil. Las capturas desktop.png, mobile.png, superior-field.png y lateral-field.png se inspeccionaron visualmente.

Se simuló una respuesta HTTP 503 al cargar biometria.json: se mostró el error, se retiró la simulación y el botón Reintentar recuperó datos y escenario. Ese 503 esperado aparece en la consola de la sesión de prueba. No se detectaron excepciones JavaScript en las comprobaciones.

La instalación informó cero vulnerabilidades en sus dependencias en el momento de ejecutarse.

## Límites vigentes

El escenario es esquemático y representa promedios. La fecha de las lecturas ambientales, el porcentaje de sombra y la distribución real por camellón siguen sin confirmarse. No se publicaron cambios en Vercel ni se modificó el artículo. La compatibilidad se comprobó en el navegador automatizado de este equipo; no se ejecutó una matriz de navegadores o dispositivos físicos.
