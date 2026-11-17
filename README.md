# Mixteco

Aplicación de visualización fenológica del chile jalapeño variedad Mixteco para el proyecto de investigación UTP–UVG. Vue 3, Vite, JavaScript y Three.js. Los registros se consultan desde JSON estático; no requiere backend ni base de datos.

## Ejecutar

Requiere Node.js 22.12 o superior.

1. `npm install`
2. `npm run dev`
3. Abrir la dirección local que muestra Vite.

`npm run build` genera `dist/`. `npm run preview` sirve esa compilación localmente.

## Datos

La fuente original es `Base de datos biometría chile jalapeño.xlsx`, hoja Hoja1. El archivo no se modifica. Hay **40 registros en total**, cuatro tratamientos por cada una de diez semanas (20 de agosto a 22 de octubre de 2026). Cada registro contiene promedios por tratamiento, cantidad evaluada y fila de origen.

Los documentos de Word y libros de Excel se conservan solo localmente y están excluidos por `.gitignore`. El repositorio incluye los JSON necesarios para ejecutar, probar y compilar la aplicación. Para regenerarlos o compararlos con el Excel, coloca el archivo original en la raíz del proyecto.

`python scripts/import_data.py` regenera `public/data/biometria.json` con la biblioteca estándar de Python 3. `python scripts/import_data.py --check` compara todos los valores exportados con el Excel y verifica su huella SHA-256. El importador rechaza fórmulas y datos incompletos para evitar copiar resultados obsoletos.

`public/data/ambiente.json` transcribe las cuatro lecturas del cuestionario de Guatemala: 32.4/33.0/33.2/38.0 °C y 72/73/72/59 % HR. Su fecha no está especificada, solo el intervalo 12:06–12:28 p. m. Se presentan por separado de la serie semanal.

El cuestionario es anterior al Excel: sus referencias a ausencia de flores, frutos o archivos Excel no describen el estado del conjunto actualizado. Para la biometría prevalece el Excel. Los descensos entre semanas, ceros y cambios de muestra se conservan.

## Interfaz

- Selección múltiple de tratamientos, incluyendo estado sin selección.
- Altura, diámetro, hojas, flores y frutos: comparación semanal y gráfica de diez semanas.
- Fichas con las cinco medidas y tamaño de muestra.
- Línea temporal mediante botones accesibles y deslizador con teclado.
- Escenario con seis plantas ilustrativas por área, sarán en tres colores y control descubierto.
- Distribución compacta de aproximadamente 32 % para datos y 68 % para el escenario; línea temporal integrada debajo del cultivo. En móvil el escenario se presenta primero.
- Cámara libre con OrbitControls: arrastre izquierdo para girar, rueda para zoom, arrastre derecho para desplazar. Un dedo gira; dos dedos permiten zoom y desplazamiento.
- Cámaras frontal/isométrica, lateral y superior, con transiciones. La vista superior oculta las cubiertas; la exploración libre vuelve a mostrarlas. Pulsar nuevamente una perspectiva recupera su encuadre.
- Botones de zoom y restauración. Con foco en el escenario, flechas para desplazar, +/− para zoom y R para restablecer. Se respeta movimiento reducido.
- Selección por clic en parcela y por botones de tratamiento con teclado.
- Tablas de valores y procedencia, lecturas ambientales y descarga de JSON.
- Diseño adaptable, preferencia de movimiento reducido, estados de carga/error y aviso si WebGL no está disponible.

La altura visual es proporcional al dato (0.055 unidades por cm). El diámetro se amplifica para ser legible. Las hojas lanceoladas se distribuyen alrededor del tallo, simplificando su cantidad a aproximadamente un elemento por 2.7 hojas promedio, con un mínimo ilustrativo de dos. Flores de cinco pétalos y frutos alargados se muestran únicamente si su promedio es mayor que cero; su tamaño visual varía con ese promedio. No son reconstrucciones individuales ni conteos reales. No se interpolan mediciones.

Las geometrías y materiales se comparten entre semanas. Las seis plantas ilustrativas de cada tratamiento se renderizan con instancias agrupadas por geometría y material, y sus búferes se liberan al cambiar de semana. Las mallas de sarán utilizan dos capas visuales, una cubierta transparente y una cuadrícula, sin atribuirles un porcentaje de sombra.

El encuadre automático solo actúa al iniciar, redimensionar una perspectiva predefinida o solicitar una vista. No se aplica durante la navegación libre. El zoom se limita entre 0.65× y 3.2×; el centro de navegación permanece dentro de un radio de tres unidades ilustrativas y la cámara se mantiene por encima del terreno.

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

`npm test` comprueba integridad, filtrado, valores particulares y rechazo de registros inválidos. Ejecutar también `python scripts/import_data.py --check` y `npm run build`.

Las cinco pruebas incluyen presencia de órganos vegetativos y reproductivos, evolución de la representación y reutilización de recursos. Para repetir las comprobaciones de navegador, iniciar el servidor local y ejecutar:

```sh
npx --yes --package @playwright/cli playwright-cli -s=mixteco open http://127.0.0.1:5173/
npx --yes --package @playwright/cli playwright-cli -s=mixteco run-code --filename tests/browser-review.js
```

El guion comprueba zoom persistente y sus límites, rotación, desplazamiento, clic frente a arrastre, restauración, movimiento reducido, teclado, gestos táctiles emulados, filtros y seis anchos de pantalla. Las capturas de la revisión se conservan en `docs/screenshots/`.

Para la revisión manual: recorrer semanas 1 y 10; seleccionar cada variable; desactivar y reactivar tratamientos; comprobar flores/frutos en semana 10; revisar las tres cámaras y selección por parcela; usar teclado y pantalla móvil. En el control revisar n=6 y n=5 en semanas 9 y 10.

## Vercel

Importar el repositorio en Vercel, seleccionar el directorio de esta aplicación, framework Vite, comando de compilación `npm run build` y salida `dist`. No requiere variables de entorno. Solo se publican los archivos generados en `dist`; los documentos originales permanecen fuera de esa salida.

La fuente tipográfica opcional procede de Google Fonts; si no está disponible se utiliza la tipografía del sistema. Referencias técnicas: [Vue](https://vuejs.org/guide/quick-start.html), [Vite](https://vite.dev/guide/) y [Three.js](https://threejs.org/docs/).
