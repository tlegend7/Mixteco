# Mixteco

Aplicación de visualización fenológica del chile jalapeño variedad Mixteco para el proyecto de investigación UTP–UVG. Vue 3, Vite, JavaScript y Three.js. Los registros se consultan desde JSON estático; no requiere backend ni base de datos.

## Ejecutar

Requiere Node.js 22.12 o superior.

1. `npm install`
2. `npm run dev`
3. Abrir la dirección local que muestra Vite.

`npm run build` genera `dist/`. `npm run preview` sirve esa compilación localmente.

## Datos

La fuente actual es `datos_new.xlsx`, hoja Hoja1, conservada intacta. Su copia `datos_new_normalizado.xlsx` corrige 33 fechas y convierte 6 medidas de texto a número, sin cambiar unidades. Hay **52 resúmenes de 13 semanas** (20 de agosto a 12 de noviembre de 2026), derivados de 416 espacios de muestra; 400 contienen alguna medición. `docs/data-normalization.json` registra las correcciones, huellas SHA-256 y dos valores pendientes de confirmar (G376: 20 mm; I464: 20 frutos), conservados en los cálculos.

Los documentos de Word y libros de Excel se conservan solo localmente y están excluidos por `.gitignore`. El repositorio incluye los JSON necesarios para ejecutar, probar y compilar la aplicación.

`python scripts/import_data.py "ruta/datos_new_normalizado.xlsx"` regenera `public/data/biometria.json` con la biblioteca estándar de Python 3. Añadir `--check` compara el JSON sin sobrescribirlo. El importador exige la huella de la copia auditada y valida calendario, tratamientos y muestras; futuras fuentes requieren revisar su auditoría antes de importarlas. La copia de esta actualización está en `outputs/01a1e769-datos/datos_new_normalizado.xlsx`.

El JSON conserva las observaciones individuales, filas Excel y motivos de ausencia (`blank` o `N/A`), además de las medias sin redondear y el tamaño de muestra de cada variable. Los ausentes son `null`, nunca ceros. Las medias excluyen solo los ausentes de la variable correspondiente: por ejemplo, el control de semana 12 tiene n=4 en altura y n=3 en diámetro. Las muestras de cada semana son independientes; no representan seguimiento de la misma planta. La hoja Progresión contiene tendencias estimadas y no se importa como medición. Las gráficas dejan huecos cuando faltan valores y la interfaz muestra «Sin datos».

`public/data/ambiente.json` transcribe las cuatro lecturas del cuestionario de Guatemala: 32.4/33.0/33.2/38.0 °C y 72/73/72/59 % HR. Su fecha no está especificada, solo el intervalo 12:06–12:28 p. m. Se presentan por separado de la serie semanal.

El cuestionario es anterior al Excel: sus referencias a ausencia de flores, frutos o archivos Excel no describen el estado del conjunto actualizado. Para la biometría prevalece el Excel. Los descensos entre semanas, ceros y cambios de muestra se conservan.

## Interfaz

- Selección múltiple de tratamientos, incluyendo estado sin selección.
- Altura, diámetro, hojas, flores y frutos: comparación semanal y gráfica de trece semanas.
- Fichas con las cinco medidas y tamaño de muestra.
- Línea temporal mediante botones accesibles y deslizador con teclado.
- Escenario con seis plantas ilustrativas por área, sarán en tres colores y control descubierto.
- Distribución compacta de aproximadamente 32 % para datos y 68 % para el escenario; línea temporal integrada debajo del cultivo. En móvil el escenario se presenta primero.
- Cámara libre con OrbitControls: arrastre izquierdo para girar, rueda para zoom, arrastre derecho para desplazar. Un dedo gira; dos dedos permiten zoom y desplazamiento.
- Cámaras frontal/isométrica, lateral y superior, con transiciones. La vista superior oculta las cubiertas; en las demás vistas se respeta el control Mostrar/Ocultar cubiertas. Pulsar nuevamente una perspectiva recupera su encuadre.
- Botones de zoom y restauración. Con foco en el escenario, flechas para desplazar, +/− para zoom y R para restablecer. Se respeta movimiento reducido.
- Selección por clic en parcela y por botones de tratamiento con teclado.
- Tablas de valores y procedencia, lecturas ambientales y descarga de JSON.
- Diseño adaptable, preferencia de movimiento reducido, estados de carga/error y aviso si WebGL no está disponible.

## Exploración y reproducción

- Seleccionar una parcela, una barra o un botón de tratamiento abre **Explorar tratamiento**. El encuadre se acerca al área elegida y conserva rotación, zoom, desplazamiento y las tres perspectivas. **Vista general** recupera el conjunto, respetando los filtros activos. Se puede cambiar de tratamiento directamente.
- El acercamiento modifica la cámara ortográfica, manteniéndola fuera de las estructuras. En inspección, el objetivo se limita al ancho de la parcela; **Liberar cámara** conserva la selección analítica y permite recorrer el volumen del campo. **Centrar todo** recupera la orientación y el encuadre general. Las semanas y variables no reinician la cámara.
- **Reproducir evolución** avanza por las observaciones, cada 2 segundos o 3.2 segundos con movimiento reducido. Continúa desde la semana actual; desde la última vuelve a la primera. Se detiene al llegar a la última semana disponible (13 en esta fuente).
- **Pausar** conserva la semana actual. **Reiniciar** vuelve a la primera y pausa. Elegir una semana con botones, deslizador o puntos del gráfico también pausa. Cambiar la preferencia de movimiento reducido pausa la reproducción. Al cerrar la vista se libera el temporizador.
- Los puntos de la gráfica muestran tratamiento, semana, fecha, variable, valor y unidad. Se consultan con mouse, tacto o teclado: Tab entra al gráfico, flechas cambian de punto, Enter/espacio seleccionan la semana y Escape cierra la ficha. **Consultar punto** ofrece un selector nativo, incluidos los puntos coincidentes.
- **Comparar con control** calcula tratamiento menos control en unidades originales y como porcentaje del control, aunque este esté oculto por el filtro. Si el control es cero, muestra **No definido**; si falta alguna media, muestra **Sin datos**. No se guardan valores calculados como nuevas mediciones.
- El resumen identifica la mayor altura entre los tratamientos seleccionados en la semana actual, incluyendo empates. Es descriptivo: no atribuye causalidad ni significancia estadística.

Las hojas tienen curvatura y nervadura central; los frutos, silueta curvada y variación de color por vértice; las flores, cinco pétalos con volumen, estambres y anteras. Las ramificaciones incluyen uniones. Se conservan geometrías compartidas, instancias y la escala de altura de los datos originales. Estos detalles son ilustrativos, no mediciones individuales ni texturas hiperrealistas.

La altura visual es proporcional al dato (0.055 unidades por cm). El diámetro se amplifica para ser legible. Las hojas lanceoladas se distribuyen alrededor del tallo, simplificando su cantidad a aproximadamente un elemento por 2.7 hojas promedio, con un mínimo ilustrativo de dos. Flores de cinco pétalos y frutos alargados se muestran únicamente si su promedio es mayor que cero; su tamaño visual varía con ese promedio. No son reconstrucciones individuales ni conteos reales. No se interpolan mediciones.

Las geometrías y materiales se comparten entre semanas. Las seis plantas ilustrativas de cada tratamiento se renderizan con instancias agrupadas por geometría y material, y sus búferes se liberan al cambiar de semana. Las mallas de sarán utilizan dos capas visuales, una cubierta transparente y una cuadrícula, sin atribuirles un porcentaje de sombra.

El encuadre automático solo actúa al iniciar, redimensionar una perspectiva predefinida o solicitar una vista. No se aplica durante la navegación libre. El zoom se limita entre 0.65× y 40×; la rueda acerca hacia el cursor. **Acercar a planta**, el selector **Detalle** y el doble clic por raycasting permiten enfocar estructuras. El objetivo se restringe al volumen de 15.3 × 5.8 unidades ilustrativas del campo y a alturas entre 0.25 y 2.85; la cámara mantiene un ángulo por encima del suelo. La navegación mueve la cámara, sin transformar el grupo agrícola.

**Pantalla completa** amplía el mismo visor mediante Fullscreen API. Los controles de cámara siguen disponibles y la misma línea temporal pasa a una barra flotante con áreas seguras. **Salir** o Escape recuperan el dashboard conservando semana, filtros, selección, zoom y navegación. Si la API no existe o rechaza la solicitud, se usa un visor fijo dentro de la ventana con aviso y foco de teclado contenido. El logo local procede de [la página oficial de identidad visual de la UTP](https://utp.ac.pa/logos-para-medios-digitales); no se alteró el PNG.

El montaje real descrito tiene cinco camellones y 300 plantas iniciales. La distribución de colores y el porcentaje de sombra no están confirmados. La disposición de las cuatro áreas, sol y sombras son esquemáticos. No hay simulación de radiación ni predicción fenológica.

## Estructura

- `src/components/`: escenario y gráfica temporal.
- `src/modules/`: tratamientos, variables, formatos, validación y selección.
- `src/modules/cropModel.js`: geometrías y materiales compartidos del modelo vegetal.
- `src/services/`: lectura y validación de JSON.
- `src/assets/`: estilos.
- `public/data/`: biometría con procedencia y lecturas ambientales.
- `scripts/`: conversión reproducible del Excel.
- `tests/`: integridad de datos y filtrado.
- `references/`: figuras extraídas del artículo para consulta durante el desarrollo.

## Verificar

`npm test` comprueba integridad, filtrado, valores particulares y rechazo de registros inválidos. Ejecutar también `python scripts/import_data.py "ruta/datos_new_normalizado.xlsx" --check` y `npm run build`.

Las quince pruebas incluyen integridad y recálculo de todas las medias, ausentes y ceros, denominadores por variable, modelos compartidos, diferencias respecto al control, empates, límites geométricos de cámara y reproducción con reloj simulado (pausa, final, limpieza y movimiento reducido). Para repetir las comprobaciones de navegador, iniciar el servidor local y ejecutar:

```sh
npx --yes --package @playwright/cli playwright-cli -s=mixteco open http://127.0.0.1:5173/
npx --yes --package @playwright/cli playwright-cli -s=mixteco run-code --filename tests/browser-review.js
npx --yes --package @playwright/cli playwright-cli -s=mixteco run-code --filename tests/browser-phase2.js
npx --yes --package @playwright/cli playwright-cli -s=mixteco run-code --filename tests/browser-layout.js
npx --yes --package @playwright/cli playwright-cli -s=mixteco run-code --filename tests/browser-viewer.js
```

El guion comprueba zoom persistente y sus límites, rotación, desplazamiento, clic frente a arrastre, restauración, movimiento reducido, teclado, gestos táctiles emulados, filtros y seis anchos de pantalla. Las capturas de la revisión se conservan en `docs/screenshots/`.

El segundo guion verifica inspección, cambio de tratamiento, regreso a general, reproducción completa de las semanas 1–13, pausa manual, diferencias respecto al control y fichas con mouse, teclado, tacto y selector. Las comprobaciones de tacto utilizan emulación de Chromium; no equivalen a probar dispositivos físicos.

Para la revisión manual: recorrer semanas 1, 10, 12 y 13; seleccionar cada variable; desactivar y reactivar tratamientos; comprobar flores/frutos ausentes antes de semana 10 y ceros medidos en semana 12; revisar las tres cámaras y selección por parcela. Comprobar los tamaños de muestra por variable en control de semana 12 y verde de semana 13.

## Vercel

Importar el repositorio en Vercel, seleccionar el directorio de esta aplicación, framework Vite, comando de compilación `npm run build` y salida `dist`. No requiere variables de entorno. Solo se publican los archivos generados en `dist`; los documentos originales permanecen fuera de esa salida.

`vercel.json` desactiva los despliegues automáticos de `feat/treatment-exploration-playback` y `feat/advanced-field-viewer`, para revisar esas ramas mediante PR sin publicar. La rama avanzada requiere autorización antes de merge y despliegue.

La fuente tipográfica opcional procede de Google Fonts; si no está disponible se utiliza la tipografía del sistema. Referencias técnicas: [Vue](https://vuejs.org/guide/quick-start.html), [Vite](https://vite.dev/guide/) y [Three.js](https://threejs.org/docs/).
