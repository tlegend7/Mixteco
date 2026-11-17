# Distribución compacta con 13 semanas

Rama local: `fix/compact-thirteen-week-layout`, basada en `6f508576`.

## Causa y comparación

- `c3a5f562` redujo el encabezado y trasladó la información experimental al panel izquierdo. El encabezado y la tarjeta siguen conservados en la versión actual.
- `acb55969` contuvo el desbordamiento de la gráfica y su leyenda con desplazamiento vertical interno del panel de datos. Se conserva esta corrección.
- `6f508576` sustituyó las diez columnas de semanas por `repeat(auto-fit, minmax(44px, 1fr))`. Al faltar ancho, la línea temporal añadía filas. La regla móvil de cinco columnas seguía activa: trece semanas necesitaban tres filas. Las nuevas indicaciones de n y de valores ausentes también requieren espacio, y se conservan completas.

## Cambio aplicado

- `src/assets/style.css`: fila flexible sin saltos, botones con ancho mínimo y desplazamiento horizontal limitado a las semanas. Se mantienen 32/68, las alturas del escenario y el encabezado compacto. El foco se dibuja dentro de los botones para evitar recortes. En móvil y con puntero táctil los botones tienen al menos 44 px de altura y 60 px de ancho.
- `src/App.vue`: referencia visual a la fila y ajuste de su `scrollLeft` tras seleccionar/reproducir una semana o redimensionar la ventana. El ajuste conserva visible la semana seleccionada y no desplaza la página. Se libera el listener al desmontar.
- `tests/browser-layout.js`: comprobaciones de geometría, acceso a semanas 1 y 13, teclado, reproducción, reinicio, scroll de la selección y gesto táctil emulado.

No se modificaron los JSON experimentales, el importador, las medias, los tamaños de muestra, los formatos de datos ausentes ni la lógica de reproducción, filtros o cámara.

## Verificación

Las 12 pruebas Node y `npm run build` pasan. Persiste el aviso previo de tamaño del paquete de Three.js. Los tres guiones de navegador (`browser-layout.js`, `browser-review.js` y `browser-phase2.js`) pasan sin excepciones JavaScript. Se verifican controles de cámara, inspección, filtros, gráficas, ausencia frente a cero, n por variable, comparación con control, tooltips, reproducción 1–13 y tacto emulado.

| Resolución | Alto del escenario 3D | Alto de la línea temporal | Scroll de semanas |
| --- | ---: | ---: | --- |
| 1920 × 1080 | 661.4 px | 86 px | No necesario |
| 1440 × 900 | 481.4 px | 86 px | No necesario |
| 1366 × 768 | 349.4 px | 86 px | No necesario |
| 1280 × 720 | 288.8 px | 86 px | No necesario |
| 1024 × 768 | 330.8 px | 86 px | Horizontal interno |
| 768 × 1024 | 512 px | 86 px | No necesario |
| 390 × 844 | 303.8 px | 114 px | Horizontal interno |
| 320 × 640 | 280 px | 133 px | Horizontal interno |

En las ocho resoluciones las semanas forman una sola fila, la selección queda visible y no hay desbordamiento horizontal de la página ni superposición entre escenario, selectores, ficha, leyenda o notas. Los controles superiores de la línea temporal se reorganizan en el ancho de 320 px para conservar la legibilidad. En dispositivos con puntero táctil la fila puede requerir scroll también en tablet debido al mayor tamaño de los botones.

La comparación visual usa una copia aislada de `c3a5f562` en `output/approved-header/`, sin restaurar archivos sobre el proyecto. A 1440 × 900 el escenario del diseño aprobado y el corregido miden 481.4 px de alto, y la línea temporal 86 px. En 390 px el escenario conserva 303.8 px, mientras la línea temporal pasa de 151 px del diseño aprobado de diez semanas a 114 px con trece semanas. Las diferencias restantes corresponden a los datos y aclaraciones conservados de la actualización.

Capturas locales de las ocho resoluciones: `output/playwright/layout-<ancho>x<alto>.png`. Referencias aprobadas: `output/playwright/approved-c3a5f56-<ancho>.png` (1440, 1024 y 390). Para repetir la revisión, abrir el servidor local con Playwright CLI y ejecutar `run-code --filename tests/browser-layout.js`.

No se probaron dispositivos físicos.
