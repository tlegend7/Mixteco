# Visor 3D ampliado y exploración cercana

Base: `11ce8d2` de main. Rama: `feat/advanced-field-viewer`.

## Interfaz y estado compartido

El mismo componente Three.js y la misma línea temporal permanecen montados en pantalla normal y ampliada. No se duplican identificadores, semanas ni temporizadores de reproducción. Los filtros y los datos siguen en el estado de App.vue.

- **Pantalla completa** solicita Fullscreen API sobre el panel del visor. Los eventos `fullscreenchange` actualizan la interfaz; **Salir** y Escape devuelven al dashboard. Se conserva el foco anterior y se contiene Tab dentro del visor ampliado. Si el navegador no admite la API o rechaza el permiso, se ofrece el mismo diseño dentro de la ventana con un aviso explícito.
- La línea temporal pasa a una barra inferior semitransparente con bordes redondeados, desplazamiento horizontal y márgenes de área segura. Sigue seleccionando las 13 semanas y actualizando escenario, gráficas y datos; reproducción, pausa y reinicio usan el temporizador existente.
- Las herramientas nuevas se superponen de forma compacta en el área del visor, sin añadir una fila al dashboard. La aclaración científica que estaba debajo del escenario pasa al final del panel izquierdo, conservando el texto completo. En móvil se aumenta la altura mínima del escenario de 280 a 320 px; se mantiene la distribución general y la tarjeta experimental.
- El logo local es el PNG oficial sin modificar de [Logos para Medios Digitales de la UTP](https://utp.ac.pa/logos-para-medios-digitales): [archivo original](https://utp.ac.pa/sites/default/files/documentos/2024/imagen/6_logo_utp_-_rgb_oficial.png). Se guarda en `public/images/utp-oficial.png` (28,440 bytes, 800 × 800). Se presenta a 44 px en escritorio y 32 px en móvil, con proporciones y colores originales y texto alternativo institucional.

## Navegación

La selección analítica y el encuadre se gestionan por separado: **Liberar cámara** no cambia filtros, tratamiento seleccionado ni mediciones. Se puede seleccionar de nuevo una parcela, y **Centrar todo** recupera la orientación y el encuadre de las cuatro áreas tanto en modo normal como ampliado.

La cámara es ortográfica, con zoom entre 0.65× y 40×. La rueda amplía hacia el cursor y se conservan los gestos táctiles de OrbitControls. **Acercar a planta**, el selector **Detalle** (flor/fruto) y el doble clic por raycasting centran el objetivo en una estructura concreta. Las opciones de flor y fruto se deshabilitan si el promedio correspondiente no es positivo. El objetivo enfocado acompaña los cambios de altura promedio al cambiar de semana sin reiniciar zoom ni orientación. Si ya no existe una estructura reproductiva medida, se enfoca el tallo ilustrativo y se avisa; no se inventa una flor o fruto.

El objetivo de navegación se limita al campo de 15.3 × 5.8 unidades ilustrativas y a alturas de 0.25–2.85. En inspección de parcela también se limita el ancho alrededor del tratamiento. OrbitControls restringe los ángulos y mantiene la cámara elevada; el zoom ortográfico conserva la cámara fuera de la estructura en lugar de atravesarla. Los desplazamientos se aplican al objetivo y la cámara, nunca al grupo agrícola. La lectura de estado de cámara expuesta por el componente es de solo lectura y permite verificar posición, orientación, proyección y ausencia de transformaciones del campo en las pruebas.

**Mostrar/Ocultar cubiertas** afecta solo a su visibilidad. La vista superior siempre las oculta y las otras perspectivas respetan la elección del usuario. Las estructuras y los filtros experimentales no cambian.

## Detalle visual y alcance científico

`cropModel.js` conserva materiales y geometrías compartidas e instancias. Se añaden pétalos con volumen y curvatura, cinco estambres y anteras, nervadura central de hojas, uniones de ramas y variación sutil de color por vértice en frutos. No se incorporan texturas externas ni modelos pesados.

Las flores y frutos siguen apareciendo únicamente con promedios positivos; los ausentes no se convierten en cero. Altura y diámetro conservan sus escalas anteriores. Cada planta es una representación ilustrativa del promedio del tratamiento, no una reconstrucción individual ni una medición del tamaño de la flor o fruto. No se modifican los JSON, las observaciones, n por variable, advertencias de procedencia o importador.

## Archivos

- `src/App.vue`: controles y estado del visor, logo y reubicación de la aclaración científica.
- `src/components/FieldScene.vue`: enfoque de planta/estructuras, raycasting, límites, cubiertas y redimensionamiento.
- `src/modules/navigation.js`: límites geométricos compartidos y comprobables.
- `src/modules/useViewerFullscreen.js`: Fullscreen API, alternativa, eventos, teclado y limpieza.
- `src/modules/cropModel.js`: detalles de geometría y materiales compartidos.
- `src/assets/style.css`: área ampliada, herramientas, barra temporal flotante y responsive.
- `public/images/utp-oficial.png`: asset institucional oficial.
- `tests/navigation.test.js`, `tests/cropModel.test.js`, `tests/browser-viewer.js`: límites, detalle y nueva exploración. Los guiones previos se adaptan al nombre Centrar todo, al nuevo rango y a la ubicación de la aclaración.
- `vercel.json`: se desactiva el despliegue automático de esta rama para revisar el PR sin publicar.

## Verificación y límites

Resultado de la revisión: **15/15 pruebas Node aprobadas**, build de producción correcto y los cuatro guiones de navegador aprobados sin excepciones JavaScript. Se comprobó además por diff que `public/data/biometria.json`, `public/data/ambiente.json` y `scripts/import_data.py` no cambian respecto a main.

Las pruebas Node incluyen integridad de datos, medias y muestras, modelos compartidos y condiciones reproductivas, navegación geométrica, comparación con control y reproducción con reloj simulado. El guion `browser-viewer.js` comprueba la Fullscreen API real de Chromium, entrada/salida con botón y Escape, conservación exacta del estado ortográfico, ausencia de controles repetidos, selección de semanas, reproducción, enfoque de flor/fruto, raycasting, zoom máximo, pan repetido, cámara elevada y grupo agrícola sin transformar. También cubre la API ausente y el permiso rechazado con foco de teclado contenido.

Las revisiones responsive cubren 1920 × 1080, 1440 × 900, 1366 × 768, 1280 × 720, 1024 × 768, 768 × 1024, 390 × 844 y 320 × 640. Las capturas locales quedan en `output/playwright/viewer-*.png` y `layout-*.png`. El guion del visor bloquea las fuentes externas durante las pruebas para usar el respaldo del sistema y evitar que una descarga de Google Fonts afecte a la ejecución; el producto conserva su tipografía opcional.

Comandos: `npm test`, `npm run build` y, con el servidor local abierto en Playwright CLI, `run-code --filename tests/browser-viewer.js`, `tests/browser-layout.js`, `tests/browser-review.js` y `tests/browser-phase2.js`.

No se han probado dispositivos físicos ni navegadores Safari/Firefox. La alternativa de pantalla completa se comprueba en Chromium con API ausente y permiso rechazado. No hay simulación óptica, colisión física ni inferencia agronómica. El aviso previo de tamaño del paquete Three.js sigue presente. La entrega se prepara por PR, sin merge ni despliegue hasta autorización del usuario.
