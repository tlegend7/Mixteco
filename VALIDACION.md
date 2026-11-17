# Implementación y comprobaciones

## Revisión del dashboard y navegación libre

Cambios:

- `src/App.vue` y `src/assets/style.css`: cabecera e introducción reducidas, distribución 32/68, escenario principal con línea temporal integrada y paneles secundarios desplegables. El escenario aparece primero en móvil.
- `src/components/FieldScene.vue`: OrbitControls, rueda, rotación, desplazamiento, teclado, gestos táctiles, restauración, límites de navegación y transiciones de 650 ms. El encuadre automático deja de actuar durante la navegación libre; un arrastre no selecciona parcelas, incluso si termina en el punto inicial.
- `src/modules/cropModel.js`: hojas lanceoladas, ramificaciones, flores de cinco pétalos y frutos alargados. Instancias por tratamiento y geometrías compartidas reducen las llamadas de dibujo. Se liberan los búferes de instancia al cambiar de semana.
- `tests/cropModel.test.js` y `tests/browser-review.js`: pruebas de órganos, conservación de observaciones y navegación real en navegador.

Comprobaciones:

- Cinco pruebas Node aprobadas. No se modificaron los archivos de datos de `public/data/`; el importador comprueba que los 40 registros siguen coincidiendo con el Excel local.
- Comprobados rueda de zoom, persistencia sin ajuste automático, límites de acercamiento, rotación, desplazamiento derecho, vistas, clic frente a arrastre y restauración con R.
- Comprobados movimiento reducido y eventos táctiles de uno y dos dedos mediante emulación de Chromium. No se probaron dispositivos físicos.
- Verificadas muestras del control de 6 y 5 plantas, flores, ceros, filtros, selección vacía y recuperación, y tiempo mediante teclado.
- Escritorio a 1366×768, 1440×900 y 1024×768: línea temporal y comparación principal dentro del área visible. Tableta y móvil a 768, 390 y 320 px: sin desbordamiento horizontal.
- Capturas revisadas en `docs/screenshots/`. La compilación de producción finaliza correctamente; Vite advierte que el paquete de Three.js supera 500 kB sin comprimir (aproximadamente 136 kB con gzip).

La publicación de esta revisión fue autorizada después de su implementación. El despliegue de producción se realiza mediante la integración existente de GitHub y Vercel al integrar la rama en `main`.

## Registro de la implementación inicial

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
