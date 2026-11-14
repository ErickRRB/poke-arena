# Estadísticas durante una pulsación mantenida

La mano muestra una capa sobre la carta después de mantenerla apretada durante 250 ms. Se oculta al soltar, cancelar, salir de sus límites, cambiar de selección, pausar, perder foco o sustituir la carta. Salir y volver a entrar sin soltar no vuelve a abrirla.

La capa usa posición fija y no recibe eventos del puntero. Conserva el clic, el arrastre y la cancelación existentes. El teclado admite mantener Espacio o Enter con foco en la carta. Enter conserva la selección nativa al comenzar; Espacio largo descarta el clic que el botón genera al soltar.

## Integración

La integración está incorporada en `dist/app.js` y `dist/index.html`: el primero importa `bindQuickStats` y el segundo carga `quick-stats.css`. Después de declarar `game` y `selected`:

```js
const quickStats = bindQuickStats({
  hand: $('hand'),
  cards: CARDS,
  getCard: element => CARDS[game?.hands[0][Number(element.dataset.card)]],
  isPlaying: () => game?.state === 'playing' && !document.body.classList.contains('menu-mode'),
  getSelection: () => selected,
});
```

El manejador de clic de la mano comprueba `!quickStats.isHoldClick(event)` antes de `choose()`. El módulo identifica el clic final de una consulta mantenida; no llama a `preventDefault()`, `stopPropagation()` ni `setPointerCapture()`.

`cancelSelection()` y `togglePause()` llaman a `quickStats.hide()` para ocultar la capa en el mismo evento. Los getters y el observador también cubren cambios externos de estado o de mano.

El `keydown` global deja que los botones de la mano resuelvan sus teclas nativas:

```js
if (event.target.closest?.('#hand [data-card]') && ['Space', 'Enter'].includes(event.code)) return;
```

Esto evita que Enter despliegue una selección previa mientras el foco está en otra carta. Escape sigue llegando al manejador habitual. La función devuelta `quickStats()` elimina escuchas, observador y capa al desmontar la mano.

## Datos

Se muestran como máximo tres estadísticas calculadas con el catálogo efectivo del motor, incluidas sus referencias de balance actuales:

- Hechizos inmediatos: daño a tropas, daño a torres y radio, recorrido o tiempo de congelación.
- Zonas persistentes: daño por segundo, daño a torres por segundo o «No afecta», y duración. Se explicita el multiplicador de aire o estructuras.
- Invocaciones: cantidad y especie, daño por golpe de cada invocación y vida o duración. No se interpreta su daño directo cero como ausencia de daño de las tropas.
- Unidades: vida por cuerpo, daño por golpe o ráfaga y cadencia. Los atacantes que buscan estructuras identifican el daño a torres.
- Apoyos y estructuras pasivas: curación, reflejo o frecuencia de invocación en lugar de un ataque inexistente. Los grupos mixtos usan rangos reales de sus integrantes.

La capa usa texto DOM y `aria-describedby` temporal, restaura las descripciones anteriores y respeta tanto `prefers-reduced-motion` como la preferencia propia `.reduced-motion`.

## Verificación

`node --test tests/quick-stats.test.mjs` comprueba ocho casos, con cobertura de las 121 claves y sus límites de datos. `node scripts/qa-quick-stats.mjs` prueba el navegador real en 390 × 844, 768 × 1024 y 1440 × 980. Usa Edge en Windows y un servidor local temporal, o `POKE_ARENA_TEST_URL` cuando se proporciona. Playwright puede indicarse con `POKE_ARENA_PLAYWRIGHT_MODULE`.

El guion verifica clic corto, pulsación mantenida, clic final, arrastre hacia la arena y despliegue, cambios de selección, pausa, desenfoque, cancelación, teclado, movimiento reducido y limpieza. En móvil y tablet genera entrada táctil mediante CDP: comprueba que el navegador emita `TouchEvent` y `PointerEvent` de tipo `touch` con `isTrusted=true`. Incluye una pulsación mantenida, arrastre gradual hacia la arena y despliegue, además de salida y reentrada sin soltar. Compara los rectángulos de arena, mano, cada carta, elixir y próxima carta antes, durante y después de mostrar la capa; la tolerancia es 0,1 px.

`verification.json` identifica el árbol de trabajo probado, el commit base y los hashes de `app.js`, `index.html`, ambos módulos y los guiones de prueba. Para cada tamaño verifica que app, HTML y CSS servidos coincidan con esos archivos y que la hoja enlazada en el HTML se haya aplicado. La instrumentación añade únicamente accesores `__qa` al app servido; no agrega imports, bindings, handlers ni estilos, y no modifica el HTML. La prueba falla si falta la integración real. Las capturas y las trazas completas quedan en `qa/quick-stats/` y no se copian al código distribuido.
