# TODO - Tienda AnaKatana (unificado)

> Este archivo consolida todos los TODO/tareas y notas encontradas en el proyecto. Las rutas originales están indicadas en cada sección.

## Tareas adicionales (de anakatana/TODO.md)

# TODO — Ana Katana

Guía de trabajo para dejar la tienda sólida, mantenible y lista para crecer.

---


¡Sí! Te hago una radiografía rápida de “ana katana” y dónde simplificar sin cargarte nada.

Qué ya está bien
	•	Fuente única de envíos: envios.json + window.TARIFAS_ENVIO. ✅
	•	Cálculo de envío único: window.calcularEnvioCoste compartido por popup y checkout. ✅
	•	Comisión centralizada con FEE_RATE. ✅
	•	Carrito en localStorage + popup limpio y con resumen. ✅
	•	Checkout con Stripe Checkout (redirige y no manejas tarjetas tú). ✅

Donde se nota complejidad “innecesaria”
	•	Dos UIs para zona de envío (popup: <select>, checkout: dropdown custom). Mantener dos lógicas es frágil.
	•	Algo de duplicación en cálculos de totales (popup vs checkout).
	•	Globals sueltos (mejor que vivan en un “store” o módulo único).
	•	Pesos y precios mezclan strings/números (riesgo de flotar/parseos).
	•	Tramos de peso están “hardcodeados” en la función (1kg / 2.5kg / >2.5kg). Si cambian, hay que tocar JS.

Simplificaciones inmediatas (0–1 día, sin cambiar stack)
	1.	Un único selector de zona
Usa siempre un <select> nativo estilizado (el custom del checkout te aporta poco).
→ Reutilizas el mismo listener y reduces bugs.
	2.	Un único “motor de totales”
Crea una función recalcularTotales({carrito, zona}) que devuelva {envio, comision, total} y úsala en popup y checkout.
→ Adiós a duplicados y desajustes.
	3.	Moneda y peso “a prueba de bombas”
	•	Precios en céntimos (enteros) internamente; muestra con Intl.NumberFormat.
	•	Asegura que el peso está siempre en gramos (o siempre en kg) y conviertes una sola vez.
	4.	Nombre único para todo
Cuelga todo de un único objeto global, p. ej. window.AK = { state, config, utils }.
→ Evitas colisiones tipo “ya está declarado”.
	5.	Bloquear botón de pagar
En checkout, deshabilita “Realizar pedido” hasta que haya zona válida y totales calculados.
→ Menos estados raros.

Ajustes de datos para que el JS sea más simple
	•	Pasa envios.json a tramos configurables, así no “horneas” 1kg/2.5kg en el código:

{
  "europa": [
    { "maxKg": 1.0, "price": 9 },
    { "maxKg": 2.5, "price": 12 },
    { "maxKg": null, "price": 16 }
  ],
  "entrega_mano_bcn": [{ "maxKg": null, "price": 0 }]
}

La función entonces solo hace: buscar el primer tramo donde pesoKg <= maxKg || maxKg == null.
→ 0 JS cuando cambian tarifas, solo editas el JSON.

Orden de carga (para no volverte a pegar)
	1.	app.js (define loader de envíos, labels y calcularEnvioCoste).
	2.	envio.js ya no hace falta; si se queda, que solo tenga helpers (ahora ya lo dejaste bien).
	3.	checkout.js (usa lo de arriba).
	4.	Nunca redefinir TARIFAS_ENVIO en varios sitios.

Medio plazo (1–2 semanas, sigue siendo estático)
	•	Webhook de Stripe + guardado de pedido + decremento de stock (en BBDD o JSON) → fiabilidad real.
	•	Emails (cliente/tienda) tras checkout.session.completed.
	•	SEO/Legal: metas por página, sitemap, robots, legales y cookies básicas.
	•	Imágenes: WebP/AVIF + loading="lazy" + srcset → rendimiento.

Largo (si quieres crecer)
	•	Migrar a Next.js/Astro (SSR + rutas + build).
	•	Headless simple (Supabase/Firestore/Airtable) para productos/pedidos.
	•	Integrar tarifas reales (Packlink/Sendcloud) y etiquetas de envío.

Mini checklist “de salud”
	•	FEE_RATE única y usada en FE+BE.
	•	Un solo recalcularTotales() usado en todas partes.
	•	Un solo selector de zona con el mismo listener.
	•	envios.json con tramos; JS genérico.
	•	Precios en céntimos y pesos en gramos (o documentado si usas kg).
	•	Botón pagar deshabilitado si falta zona.
	•	Webhook Stripe funcionando (idempotente).
	•	Sin window.TARIFAS_ENVIO = {...} duplicado.

Si quieres, te hago yo:
	•	El recalcularTotales() común y lo engancho en popup + checkout.
	•	El refactor de envios.json con tramos y la función genérica.
	•	El cambio del dropdown custom → <select> estilizado.

Dime por cuál empezamos y lo aplico directo.*/




## 0) Estado actual (resumen)
- **Catálogo estático** con `productos.json`, página de detalle y grid en home.
- **Carrito** con popup, persistencia en `localStorage`, contador animado.
- **Checkout** con Stripe Checkout (redirige a sesión en backend).
- **Envíos**: fuente única `envios.json` → `window.TARIFAS_ENVIO` (OK).  
  Cálculo unificado con `window.calcularEnvioCoste(peso, zona)` (OK).  
- **Comisión** (1,4%) aplicada en popup y checkout (OK).

> Lo más importante ya está: **una sola fuente de verdad para envíos** y **un solo cálculo**. Ahora toca simplificar/centralizar los puntos duplicados.

---

## 1) Fuente única y orden de carga ✅
**Objetivo:** evitar colisiones y estados “zombies”.

- [x] `envios.json` → loader que setea `window.TARIFAS_ENVIO` (ya existe).
- [x] `window.calcularEnvioCoste` único y robusto (lee de `window.TARIFAS_ENVIO`).
- [x] Eliminar tablas hardcodeadas (antes en `envio.js`).  
- [ ] **(Opcional)** quitar `<script src="js/envio.js">` si ya no aporta helpers.

**Orden recomendado de scripts:**
1. `js/app.js` (loader de envíos + helpers globales / labels)
2. `js/home.js` / `js/producto.js` (según página)
3. `checkout.js` (usa lo anterior)

---

## 2) Motor de totales unificado (FE) ⭐
**Objetivo:** que popup y checkout usen **la misma función** para totales.

```js
// /js/utils/totales.js  (o en app.js si prefieres)
const FEE_RATE = 0.014;

export function recalcularTotales({ carrito, zona, tarifas = window.TARIFAS_ENVIO }) {
  const subtotal = carrito.reduce((s, it) => s + it.precio * it.cantidad, 0);
  const pesoTotal = carrito.reduce((s, it) => s + it.peso * it.cantidad, 0);

  const envioRaw = (zona === 'entrega_mano_bcn') ? 0 : window.calcularEnvioCoste(pesoTotal, zona);
  const envio = Number.isFinite(envioRaw) ? envioRaw : 0;

  const base = subtotal + envio;
  const total = base / (1 - FEE_RATE);
  const comision = total * FEE_RATE;

  return { subtotal, pesoTotal, envio, comision, total };
}
```

**Tareas:**
- [ ] Crear `recalcularTotales(...)` y **reemplazar** el cálculo duplicado en:
  - [ ] popup del carrito
  - [ ] checkout (dropdown + submit)
- [ ] Centralizar `FEE_RATE` en un solo sitio (y usar el mismo valor en el **backend**).

---

## 3) Selector de zona (UX) ✅/🔧
**Objetivo:** una sola lógica para elegir zona, sin duplicar listeners.

- [x] Popup: `<select>` nativo poblado desde `envios.json` (OK).
- [x] Checkout: dropdown custom poblado desde `envios.json` (OK).
- [ ] **Opcional (simplificar):** usar **siempre `<select>` nativo** y estilizarlo.  
      Ganamos mantenimiento y evitamos bugs.

Reglas comunes:
- [x] Guardar `zonaSeleccionada` en `localStorage` y restaurarla.
- [x] Si `zona === 'entrega_mano_bcn'` → envío **0**.
- [x] Si el cálculo falla (`null/NaN`) → forzar **0** sin romper UI.
- [x] Deshabilitar “Realizar pedido” si no hay zona seleccionada (añadido aviso en submit).

---

## 4) Datos de envíos — Propuesta de esquema más flexible (opcional)
**Objetivo:** cambiar tarifas sin tocar JS.

**Propuesto `envios.json` por tramos:**
```json
{
  "espana": [
    { "maxKg": 1.0, "price": 5 },
    { "maxKg": 2.5, "price": 7 },
    { "maxKg": null, "price": 9 }
  ],
  "europa": [
    { "maxKg": 1.0, "price": 9 },
    { "maxKg": 2.5, "price": 12 },
    { "maxKg": null, "price": 16 }
  ],
  "entrega_mano_bcn": [
    { "maxKg": null, "price": 0 }
  ]
}
```

La función `calcularEnvioCoste` solo busca el **primer** tramo cuyo `maxKg` sea `>= pesoKg` o `null`.

**Tareas:**
- [ ] Cambiar `envios.json` a tramos (si os cuadra).
- [ ] Adaptar `calcularEnvioCoste` (~10 líneas) a tramos.  
- [ ] QA rápido con pesos 0.2kg, 1.2kg, 3kg.

---

## 5) Backend Stripe (MVP estable) 🧱
**Objetivo:** fiabilidad y registros aunque se cierre el navegador.

- [ ] Endpoint **`/crear-sesion`** (ya existe) → confirmar que recalcula totales del mismo modo que FE.
- [ ] **Webhook** `checkout.session.completed`:
  - [ ] Construir pedido (líneas, dirección, zona, envío, comisión, total).
  - [ ] Guardar en DB/archivo (idempotencia por `event.id`).
  - [ ] Disminuir stock.
  - [ ] Enviar emails (tienda + cliente).
- [ ] Alinear `FEE_RATE` con FE (constante compartida).

---

## 6) SEO / Legal / Analítica 🔍
- [ ] Metas por página (`<title>`, `description`, OG).
- [ ] `sitemap.xml` y `robots.txt`.
- [ ] Páginas legales: Aviso legal, Privacidad, Términos/Devoluciones.
- [ ] Banner cookies (básico) + Analytics (pageviews + conversión).

---

## 7) Limpieza y estandarización 🧹
- [ ] Precios internos en **céntimos** (enteros), output con `Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'})`.
- [ ] Pesos **siempre** en la misma unidad (kg **o** g) — documentado.
- [ ] Evitar globals sueltos → colgar configs en `window.AK = { config, utils, state }`.
- [ ] Logs discretos y controlados (quitar `console.log` ruidosos en prod).

---

## 8) QA checklist (manual)
- [ ] Añadir/eliminar productos del carrito, refrescar página → se mantiene.
- [ ] Cambiar zona en popup → Envío/Comisión/Total cambian.
- [ ] Cambiar zona en checkout → idem.
- [ ] Seleccionar **entrega en mano** → Envío 0€ en ambos.
- [ ] Submit sin zona → bloquea con aviso.
- [ ] Probar pesos: 0.2kg / 1.0kg / 1.2kg / 2.6kg.
- [ ] Stripe → sesión creada, redirección OK.
- [ ] Webhook → pedido guardado, email enviado, stock baja.

---

## 9) Roadmap por niveles (estimación rápida)
**MVP sólido** (1–2 semanas): Webhook + emails + legales/SEO + QA.  
**Estándar gestionable** (2–4 semanas): Headless simple + panel admin + stock por talla.  
**Avanzado** (4–8+ semanas): Next.js/Astro + carriers + facturas + multi-idioma/moneda.

---

## 10) Notas rápidas de implementación
- Mantener `FEE_RATE` en un único sitio (FE y BE).  
- En el FE, evita recalcular totales por tu cuenta → usa siempre `recalcularTotales(...)`.  
- Si el dropdown custom te da guerra, vuelve al `<select>` nativo estilizado, y listo.


## Tareas adicionales (de anakatana/manu/TODO.md)

# Checklist de mejoras y tareas

## 1. Centralizar la inicialización en `main.js`
- [ ] Crear `main.js` como módulo ES6 (`<script type="module" src="js/main.js">`)
- [ ] En cada archivo JS (`app.js`, `home.js`, etc.) exportar funciones `initX()`
- [ ] En `main.js` importar y llamar a todos los `initX` dentro de un único  
      `document.addEventListener("DOMContentLoaded", …)`
- [ ] Ajustar los `<script>` de los HTML para cargar **solo** `main.js` y quitar los demás

## 2. Limpiar código muerto o no usado
- [ ] Buscar y eliminar el bloque `tallas-acordeon` (JS y CSS)
- [ ] En `producto.js`, eliminar la variable `estaRebajado` si no se usa
- [ ] En `app.js`, revisar `actualizarCarrito()` y borrar o comentar partes innecesarias

## 3. Activar y modularizar el filtrado en Home
- [ ] Mover `initFiltroPanel()` a `home.js`, llamarlo antes de renderizar productos
- [ ] En `cargarProductos()`, tras obtener datos, llamar a `initFilters(productos)`  
      para poblar los `<select>`
- [ ] Hacer que el botón “Filtrar” (en `navBtns.js`) haga `toggle` del panel de filtros

## 4. Añadir “ordenar por” en la galería
- [ ] Insertar un `<select id="orden">` con opciones (`Precio ↑`, `Precio ↓`, `Título A→Z`, …)  
      encima de `#galeria-productos`
- [ ] Definir en JS un listener `change` que:
  - [ ] Copie el array original de productos  
  - [ ] Aplique `sort()` según el criterio seleccionado  
  - [ ] Llamar a `renderProductos(ordenados, contenedor)`
- [ ] Extraer el fetch de productos a una variable de más ámbito

## 5. Extender el popup de carrito con “borrar ítem”
- [x] En `abrirCarrito()`, al generar cada línea, añadir `<button class="carrito-remove">✕</button>`<
- [ ] En el listener del botón:
  - [ ] Confirmar eliminación (`confirm("¿Quieres quitar este producto?")`)  
  - [x] Filtrar el array `carrito` o usar `splice()`  
  - [x] Llamar a `actualizarCarrito()` y `actualizarContadorCarrito()`  
  - [x] Quitar el `itemDiv` del DOM

## 6. Revisar uso de `MutationObserver` vs llamada directa
- [ ] En `navBtns.js`, tras `appendChild(topRight)`, llamar directamente a `actualizarContadorCarrito()`
- [ ] Eliminar el bloque de `MutationObserver` en `app.js`

## 7. Planificar la página de checkout
- [ ] Crear `checkout.html` y `checkout.js`
- [ ] Reutilizar la lógica del popup de carrito dentro de un `<div id="checkout-container">`
- [ ] Añadir formulario de datos y `<button id="pay">Pagar</button>`
- [ ] Integrar la pasarela de pago (Stripe, PayPal…)

## 8. Explorar imágenes secundarias en detalle de producto
- [ ] Extender `productos.json` con campo `gallery: [ … ]`
- [ ] En `producto.js`, tras cargar, generar miniaturas dentro de `<div class="thumbnails">`
- [ ] Al hacer clic en miniatura, cambiar `src` de `<img class="producto-img">`
- [ ] (Opcional) Implementar lightbox/swiper con flechas “<” / “>”

## 9. Decidir lógica de cantidad en carrito
- [ ] Mantener cada artículo como único (cantidad = 1) **o** agrupar duplicados con contador
- [ ] Si se agrupa, modificar `agregarAlCarrito()` para usar `find()` y actualizar `cantidad`

## 10. Modularización ES6 vs globales en `window`
- [ ] En cada JS, cambiar a `export function initX() { … }`  
- [ ] En `main.js`, `import { initX } from './x.js'` y llamar a los inits  
- [ ] Ajustar `<script>` a módulos y comprobar paths/CORS

---

> **Tip:** Para alternar rápidamente una línea normal a checkbox en VS Code, coloca el cursor en la línea y usa la paleta de comandos (Ctrl+Shift+P / ⌘+Shift+P) → “Markdown: Toggle List Checkbox”.  
> Así marcas `[ ]` ↔ `[x]` sin escribirlo a mano.

## Tareas adicionales (de anakatana/manu/todo.txt)

1.	Centralizar la inicialización en main.js
Qué: Crear un único punto de entrada que dispare las distintas inicializaciones en el orden correcto (carrito, galería, producto, nav, logo).
Por qué: Facilita ver de un vistazo qué módulos arrancan y en qué orden, y evita los múltiples DOMContentLoaded repartidos.
Cómo:
	•	Descomenta o crea main.js como módulo ES6 (<script type="module" src="js/main.js">).
	•	En cada archivo (“app.js”, “home.js”, etc.) exporta una función init… (por ejemplo, export function initCarrito() { … }).
	•	En main.js importa esos inits y llama dentro de un único document.addEventListener("DOMContentLoaded", …).
	•	Ajusta los <script> en tus HTML para cargar solo main.js como módulo y quita los otros.
	2.	Limpiar código muerto o no usado
Qué: Elimina fragmentos que no hacen nada (“tallas-acordeon”, variable estaRebajado, etc.).
Por qué: Menos ruido, menos líneas que confunden.
Cómo:
	•	Busca tallas-acordeon y quita ese bloque (JS y cualquier estilo CSS asociado).
	•	En producto.js, elimina estaRebajado si no se usa.
	•	En app.js, revisa si realmente necesitas la parte de <ul id="carrito"> en actualizarCarrito(); si no, comenta o borra.
	3.	Activar y modularizar el filtrado en Home
Qué: Descomentar y reorganizar la lógica de filtrado (panel + función).
Por qué: Añade potencia a la galería y te servirá de base para un futuro “ordenar por”.
Cómo:
	•	Crear panel: Mueve initFiltroPanel() dentro de home.js (en lugar de navBtns.js), y llámalo justo antes de renderizar productos.
	•	Poblar filtros: En cargarProductos(), tras obtener productos, llama a initFilters(productos) para llenar los <select>.
	•	Mostrar/ocultar: En navBtns.js, deja el botón “Filtrar” como disparador de un evento que haga document.getElementById("filtros-panel").classList.toggle(...).
	4.	Hacer explícito el “ordenar por” en la galería
Qué: Añadir un <select id="orden"> con opciones (“Precio ↑”, “Precio ↓”, “Título A→Z”…) y una función applyOrder().
Por qué: Te permitirá en el futuro enlazarlo con más facilidad y refuerza la lógica de filtrado/orden.
Cómo:
	•	Inserta un pequeño panel sobre la galería (<div id="controls"><select id="orden">…</select></div>) antes de #galeria-productos.
	•	Define opciones en JS:

document.getElementById("orden").addEventListener("change", e => {
  const criterio = e.target.value;
  let ordenados = [...productos]; // copia del array original
  if (criterio === "precio-asc") ordenados.sort((a,b)=>precio(a)-precio(b));
  // etc…
  renderProductos(ordenados, contenedor);
});

•	Extrae la parte de “fetch productos” a una variable de más ámbito para poder reutilizar productos en cualquier reorder/filter.


	5.	Extender el popup de carrito con “borrar ítem”
Qué: Añadir a cada línea del carrito una minicrocx (✕) que permita eliminar ese producto.
Por qué: Mejora UX.
Cómo:
	•	En abrirCarrito(), al generar cada itemDiv, añade un botón <button class="carrito-remove">✕</button>.
	•	Dale un listener que haga:
	1.	if (!confirm("¿Quieres quitar este producto?")) return;
	2.	Filtrar el array global: carrito = carrito.filter(i=>i.id!==item.id || i.talla!==item.talla); (o splicearlo).
	3.	Llamar a actualizarCarrito() y actualizarContadorCarrito().
	4.	Remover del DOM el itemDiv.


	6.	Revisar uso de MutationObserver vs llamada directa
Qué: Quitar el observer y actualizar el contador justo después de insertar los botones de nav.
Por qué: Es más directo y menos costoso.
Cómo:
	•	En navBtns.js, tras hacer document.body.appendChild(topRight), justo después llama a actualizarContadorCarrito().
	•	Elimina todo el bloque de MutationObserver de app.js.
	7.	Planificar la página de checkout
Qué: Crear un checkout.html + checkout.js que reutilice la lógica del popup carrito, pero como página completa, e integre la pasarela de pago.
Por qué: Separar el flujo de compra del modal y facilitar futuras integraciones (Stripe, PayPal…).
Cómo:
	•	Copia el HTML del modal de carrito a un <div id="checkout-container"></div> en checkout.html.
	•	En checkout.js, importa o llama a las mismas funciones de cálculo de subtotal/envío.
	•	Añade un formulario con campos de datos de cliente y un <button id="pay">Pagar</button>.
	•	Allí enlaza con tu API de pago, o con el SDK de la pasarela que hayas elegido.
	8.	Explorar imágenes secundarias en detalle de producto
Qué: Permitir un array de imágenes por producto, miniaturas y un lightbox que recorra la galería.
Por qué: Enriquece la ficha de producto.
Cómo:
	•	Extiende productos.json con un campo gallery: ["img1.jpg","img2.jpg",…].
	•	En producto.js, tras cargar el producto, genera un <div class="thumbnails"> con cada miniatura.
	•	Al clicar una miniatura, cambia el src del <img class="producto-img">.
	•	Para el lightbox, en lugar de un único imagen-popup, crea un swiper o gallery popup que reciba ese array y permita avanzar (flechas “<” / “>”) o clonar la lógica de imagen-popup añadiendo controles de siguiente/anterior.
	9.	Decidir sobre la lógica de cantidad en carrito
Qué: Mantener la actual (cada artículo es único, cantidad siempre 1), o agrupar duplicados y usar cantidad.
Por qué: Tú quieres reforzar la idea de “pieza única”, pero quizá en el futuro convenga cambiar.
Cómo:
	•	Deja agregarAlCarrito tal cual mientras cada entrada sea única.
	•	En la interfaz de carrito muestra item.nombre + (item.talla? " "+item.talla : "") y no el campo cantidad.
	•	Si más adelante cambias de opinión, basta con añadir un find() en agregarAlCarrito y modificar la cantidad en lugar de push.
	10.	Valorar la modularización ES6 vs globales en window
Qué: Pasar de funciones globales a módulos con import/export.
Pros:
	•	Encapsulas cada módulo, evitas colisiones de nombres.
	•	Herramientas modernas de bundling (tree-shaking, código dividido).
	•	Facilita testing unitario.
Contras:
	•	Necesitas un bundler (Webpack, Rollup, Vite) o servir todo con <script type="module"> (hasta IE no soportado).
	•	Requiere reestructurar tus <script> en los HTML.
Cómo:
	•	En cada JS: export function initHome() { … } y elimina código que ejecute en cuanto se carga el archivo.
	•	En main.js usa import { initHome } from './home.js' y llama.
	•	Ajusta tus <script> a módulo y comprueba en consola que no haya errores de CORS o paths.

⸻

Siguiente paso: revisa esta lista, márcame qué items quieres abordar primero (o cuáles descartas), y empezamos a implementar uno a uno con ejemplos de código. ¡Así no nos perdemos en el bosque!

---- old

	🥇 ETAPA 1: Lo esencial para navegar la tienda

Objetivo: tener una tienda navegable, visual y funcional aunque sea sin pago todavía.
	1.	producto.html
	•	Mostrar detalles del producto según ?id=...
	•	Cargar los datos desde el JSON o backend.
	•	Mostrar título, imagen, descripción completa, precio, rebajas si hay, botón “Añadir al carrito”.
	2.	about.html
	•	Contenido libre. Imagen de Ana, texto bonito, link a RRSS, etc.
	•	Puede usar el mismo CSS base.
	3.	Popup de carrito
	•	Modal fijo a la derecha o pantalla completa en móvil.
	•	Mostrar lista de productos del carrito, totales y botón “PAGAR”.
	•	Añadir botón en la esquina superior derecha para abrirlo.

⸻

🥈 ETAPA 2: Funcionalidad completa

Objetivo: permitir realizar pedidos y registrar stock.
	4.	Conectar backend en Render
	•	Subir index.js y productos.json.
	•	Actualizar fetch("./productos.json") por fetch("https://backend.render.com/productos").
	5.	Botón “PAGAR” funcional
	•	Hacer que recoja el carrito y lo envíe vía POST a /pedido.
	•	Mostrar confirmación (alerta o modal).
	6.	Stock Manager para Ana
	•	Página secreta (admin.html) con formulario de edición y subida.
	•	Mostrar lista editable de productos y/o botón para subir uno nuevo.
	•	Subida de foto = base64 o usar un servicio externo (imgur, Cloudinary).
	•	Conexión al endpoint /editar-stock.

⸻

🥉 ETAPA 3: Mejoras de experiencia y estética

Objetivo: que la tienda sea mágica y divertida.
	7.	Animaciones de aparición en scroll
	•	Cada .producto aparece con efecto (e.g. fade in + scale).
	•	Usar IntersectionObserver para activarlo al entrar en viewport.
	8.	Filtro arriba a la derecha
	•	Selector desplegable o botones: por categoría, stock, rebajas.
	•	Orden por:
	•	Categoría → orden alfabético
	•	Stock → mayor disponibilidad primero
	•	Rebajas → precio rebajado ascendente
	9.	Animaciones al añadir al carrito
	•	Efecto visual al hacer click en un producto (por ejemplo, volar la imagen al carrito).

⸻

🧪 ETAPA 4: Pagos

Objetivo: pruebas con cobros reales.
	10.	Pruebas con Stripe

	•	Registrar cuenta.
	•	Crear link de checkout rápido o integrar botón con Stripe.js.
	•	Cálculo de totales, gastos de envío, comisión (puede ir en el popup de carrito).

	11.	Panel secreto seguro

	•	Como dices: si Ana solo tiene el link, es suficiente por ahora.
	•	(En el futuro podrías añadir clave o auth básica si hace falta.)

⸻

¿Quieres que empecemos ahora con el producto.html? Puedo montarte el esqueleto base en un minuto 🏗️
    
    
    
    
    
    •	Integración con un frontend que consuma estos endpoints.
	•	Implementar el sistema de pagos con Stripe, gestionando el cálculo total del carrito (productos, envíos, impuestos).
	•	Testeo automático para robustecer el proyecto (opcional pero recomendado).
	•	Desplegar la aplicación en Render para hacerlo accesible desde Internet.

    que el raton sea custom hehe
    que las colecciones se creen a partir de lo que haya escrito ana katana
    como se ven los articulos soldout (grayscale) (o inverted) (la imagen digo eh)
    y los articulos en rebajas (igual un texto? como un sup? y que el precio esté el rebajado y el original en un sup tachado)





	revisar el responsive del produycto (de 480px a 680px de width que la imagen y el precio y titulo esten arriba hy el resto abajo?)

	2 columnas home
	test foto como fondo 

	✅ Te dejo preparado ahora el esqueleto de la función abrirCarrito() dentro de app.js.
Luego, cuando terminemos esta parte, te recordaré que nos queda pendiente:
	•	Reordenar los botones en producto.html.
	•	Ajustar la imagen y su layout.

## Notas y explicación (de anakatana/manu/explanation.txt)

Guía de Inmersión al Código de Hifas Studio

Estructura General del Proyecto

El proyecto Hifas Studio se organiza en varios archivos HTML, JavaScript y CSS, con un archivo JSON que contiene los datos de los productos. A grandes rasgos:
	•	Páginas HTML: Hay tres páginas principales:
	•	index.html – La página de inicio (home), donde se muestra la galería de productos. El <body> de esta página tiene un atributo data-page-type="home" para identificar el tipo de página ￼. En esta página se incluyen varios scripts: home.js (lógica de la galería), navBtns.js (botones de navegación fijos), app.js (funcionalidad del carrito) y logoTexture.js (efecto de logo de fondo) ￼.
	•	producto.html – La página de detalle de producto, que muestra información de un producto específico. Su <body> usa data-page-type="product" ￼. Aquí se cargan app.js (carrito), logoTexture.js (fondo), navBtns.js (navegación) y producto.js (lógica específica del producto) ￼.
	•	about.html – La página About, con información estática sobre la marca. Usa data-page-type="about" y solo necesita app.js y navBtns.js (no muestra productos) ￼.
	•	Scripts JavaScript: Cada página carga los scripts necesarios:
	•	home.js – Maneja la carga y muestra de la galería de productos en la página de inicio.
	•	producto.js – Controla la lógica de la página de detalle de producto (cargar datos del producto seleccionado, gestionar selección de talla, añadir al carrito, etc.).
	•	navBtns.js – Genera los botones de navegación fijos (como Carrito, Filtrar, Home, About, etc.) que aparecen sobreimpresos en la interfaz, según la página en la que estemos.
	•	app.js – Gestiona el carrito de compras: estado del carrito, almacenamiento local, contador de items, y la ventana modal (popup) que muestra el contenido del carrito al usuario.
	•	logoTexture.js – Controla un efecto visual de fondo con el logo (un “texture” del logo que se muestra de fondo en la página). Aunque no profundizaremos en su contenido, se encarga de animar o posicionar el elemento #logo-texture del fondo.
	•	Datos de productos: El archivo productos.json contiene la lista de productos en formato JSON (arreglo de objetos con sus propiedades). Por ejemplo, cada entrada tiene campos como id, img (ruta de imagen), titulo, precio, descripcion, tipo (categoría, p. ej. top, bottom, accesorio), colección, tallas disponibles, si está en rebaja (rebajas y precioRebajas), stock, etc. ￼. Este archivo es la fuente de datos tanto para la galería de inicio como para la página de detalle.
	•	Estilos CSS: El archivo styles.css contiene los estilos de la página (reseteo general, colores, fuentes, diseño de la galería, estilos de botones fijos, carrito, etc.). Por ejemplo, define la posición y estilo de #galeria-productos (donde se muestran los productos en la home) y de los elementos como #logo-texture de fondo ￼ ￼, entre muchos otros.

En las secciones siguientes, exploraremos cada parte del código para entender cómo funciona. Adoptaremos un enfoque paso a paso, siguiendo el recorrido típico: se carga la página de inicio con la lista de productos, el usuario puede filtrar (si estuviera activo el filtro) o navegar, al hacer clic en un producto se muestra la página de detalle, y desde cualquier página se puede usar el carrito de compras. A medida que avancemos, iremos destacando los archivos y fragmentos de código relevantes para cada funcionalidad.

Página Home: Galería de Productos

La página de inicio (home) es la entrada principal donde se listan todos los productos disponibles en una galería. Veamos cómo está construida y qué partes del código intervienen:
	•	Contenedor en HTML: En index.html hay un <div id="galeria-productos"></div> que es donde se insertará dinámicamente la galería de productos ￼. También existe un <div id="logo-texture"></div> para el gráfico de fondo del logo, pero enfocándonos en la galería: este contenedor comienza vacío y será poblado por JavaScript.
	•	Carga de productos (home.js): Al cargarse la página, el script home.js se encarga de obtener los datos de los productos y renderizarlos. Este archivo registra un evento para cuando el DOM esté listo:

document.addEventListener("DOMContentLoaded", cargarProductos);

La función cargarProductos() realiza una petición fetch al archivo JSON de productos y luego llama a renderProductos(...) para dibujar la galería ￼. En pseudocódigo simplificado, hace lo siguiente:
	1.	Fetch de datos: solicita el archivo "./productos.json" y lo convierte a objeto JavaScript (array de productos) ￼.
	2.	Referenciar contenedor: obtiene el elemento DOM galeria-productos donde irá la galería ￼.
	3.	Renderizar productos: llama a renderProductos(productos, contenedor) para generar el HTML de cada producto y añadirlo al contenedor ￼.

	•	Renderizado de la galería: La función renderProductos(productos, contenedor) recorre la lista de productos y crea los elementos HTML necesarios para mostrarlos ￼. Cada producto se muestra como una tarjeta/cuadro con su imagen, título y precio:
	•	Primero limpia el contenedor (contenedor.innerHTML = "") para evitar contenidos previos ￼.
	•	Luego itera sobre el array productos.forEach(...) ￼. Para cada producto:
	•	Crea un <div> para el producto con clase "producto" ￼.
	•	Determina si el producto está agotado (soldOut === "si" o stock en 0) y si está en rebaja (rebajas === "si" con un precio rebajado definido) ￼. Estas banderas se usan para ajustar la presentación:
	•	Si está en rebaja, prepara unas etiquetas “SALE” en las cuatro esquinas de la imagen ￼.
	•	Si está agotado, se mostrará una superposición de “SOLD OUT”.
	•	Genera el HTML para la imagen: Si el producto tiene imagen (producto.img):
	•	Define una capa contenedora con clase img-wrapper. A esta clase se le añade "soldout" si el producto está agotado y "en-rebajas" si está en oferta, cambiando la apariencia con CSS (por ejemplo, podría aplicar opacidad menor si soldout) ￼.
	•	Crea la etiqueta <img> con src apuntando a la ruta de la imagen y alt con el título ￼. Si el producto está agotado, también añade la clase especial img--soldout al <img> para estilos (p. ej., podría ponerla en blanco y negro) ￼.
	•	Añade dentro del mismo contenedor de imagen:
	•	Si agotado: un elemento overlay <div class="soldout-overlay"> con la etiqueta “SOLD OUT” en el centro ￼.
	•	Si en rebajas: las cuatro etiquetas <span class="corner-label">SALE</span> para indicar oferta en las esquinas ￼.
	•	Todo este bloque se construye como una plantilla de string en imagenHTML ￼.
	•	Si el producto no tiene imagen (campo vacío, no suele ser el caso normal), en lugar de lo anterior se pondría un <div class="no-data">no data</div> indicando ausencia de datos ￼.
	•	Construye el HTML para título y precio:
	•	Título: un <span class="titulo"> con el texto del nombre del producto ￼.
	•	Precio: prepara un bloque <div class="precios"> que contiene ya sea el precio normal o, si hay rebaja, el precio tachado original y el precio rebajado actual ￼. Por ejemplo, si enRebajas es true, insertará algo como: <span class="precio--tachado">35,00€</span> <span class="precio--rebajado">25€</span> mostrando el precio original tachado y el nuevo en rojo ￼. Si no, simplemente <span class="precio">35,00€</span> ￼. (Notar que en el JSON los precios están con coma, en la interfaz se les añade el símbolo €).
	•	Inserta en el divProducto todo el HTML preparado: la sección de imagen y un contenedor <div class="home_titulo_precio"> con el título y los precios ￼. En el código, esto se hace asignando divProducto.innerHTML = ... con la plantilla que incluye imagenHTML, tituloHTML y precioHTML ya formados.
	•	Interacción: agrega un listener de click a cada divProducto para que, al hacer clic en cualquier parte de la tarjeta, navegue a la página de detalle de ese producto ￼. En concreto, se usa window.location.href = "producto.html?id="+producto.id ￼. De este modo, cada producto de la galería funciona como un enlace que lleva a producto.html pasando el ID del producto en la URL (ej: producto.html?id=4).
	•	Finalmente, se añade este divProducto creado al contenedor de la galería en el DOM (contenedor.appendChild(divProducto)) ￼.
	•	Al terminar, la página home muestra todas las tarjetas de producto generadas dinámicamente con sus imágenes, nombres y precios. Los productos en oferta estarán marcados con “SALE”, y los agotados mostrarán un rótulo “SOLD OUT” superpuesto y su imagen aparecerá atenuada (según lo programado con clases CSS).
	•	Scroll y estilo de la galería: Según los estilos CSS, el contenedor #galeria-productos está configurado como una rejilla (grid) que ocupa la mayor parte de la pantalla, permitiendo scroll vertical ￼ ￼. Esto significa que aunque se inyecten todos los productos a la vez, el contenedor es scrollable y muestra barras de desplazamiento si excede la pantalla, manteniendo siempre visibles los botones de navegación (que son elementos fijos, veremos luego).
	•	Funcionalidad de filtrado: En el código de home.js se observa que hay funciones relacionadas con filtros de colección y tipo de prenda. Actualmente, esta funcionalidad está desactivada, pero el código sugiere cómo habría de funcionar:
	•	Existe una función initFilters(productos) que prepararía dos desplegables (selects) para filtrar por colección (por ejemplo, BASICS, BACKROOMS) y por tipo de prenda (por ejemplo, top, bottom, accesorio). Esta función obtiene los valores únicos de colecciones y tipos presentes en la lista de productos y los añade como opciones en los <select id="filtro-coleccion"> y <select id="filtro-tipo"> ￼ ￼, añadiendo además una opción vacía o default (“Todas”/“Todos”) para no filtrar.
	•	También hay una función applyFilters(productos) que filtra el array original según la selección actual en esos dropdowns y luego vuelve a llamar a renderProductos() para re-pintar la galería con solo los productos filtrados ￼ ￼.
	•	Sin embargo, en cargarProductos() la llamada a initFilters(productos) está comentada ￼, y en navBtns.js (que debería crear el panel lateral de filtros) también hay partes comentadas. Es decir, la interfaz para filtrar no llega a mostrarse con la configuración actual. Posiblemente se decidió desactivar o posponer esta característica, dejando el código preparado pero inactivo. Veremos más detalles al hablar de navBtns.js y el panel de filtros.

En resumen, la página home sirve de escaparate de todos los productos. home.js se encarga de obtener los datos desde productos.json y de construir la galería: por cada producto crea un elemento con imagen, título y precio, manejando casos especiales de stock o rebajas, y permite clicar para ver más detalles. Ahora profundizaremos en cómo se manejan la navegación (botones fijos de Carrito, Filtrar, etc.) y el funcionamiento del carrito de compras, que son partes fundamentales conectadas a esta página.

Navegación y Botones Fijos (Carrito y Filtrado)

Para mejorar la experiencia de usuario, el sitio implementa unos botones de navegación fijos que aparecen en pantalla (ya sea en la esquina superior o inferior, dependiendo de la página). Estos botones permiten acceder al carrito, abrir el panel de filtros (en home), o navegar entre páginas (p. ej., ir al About, volver al Home, etc.). Toda esta lógica está en el archivo navBtns.js.

Inserción de los botones fijos según la página

Cuando el DOM se carga, navBtns.js ejecuta su lógica para determinar qué botones mostrar. Usa el atributo data-page-type del <body> para saber en qué página estamos ￼. Según el tipo de página (home, product o about), agrega diferentes conjuntos de botones:
	•	En la página Home (data-page-type="home"): Se crea un contenedor superior derecho (topRight) con dos botones: “carrito” y “filtrar” ￼.
	•	El botón Carrito es un enlace <a href="#" id="btn-carrito" class="boton-fijo">carrito<sup id="carrito-count"></sup></a> ￼. Observa que dentro del texto lleva un <sup id="carrito-count"></sup> vacío; este elemento mostrará el número de productos en el carrito (lo actualizaremos desde app.js). Inicialmente está vacío hasta que se calcule el total.
	•	El botón Filtrar es <a href="#" id="btn-filtro" class="boton-fijo">filtrar</a> ￼. Este botón desplegará el panel lateral de filtros (cuando dicha funcionalidad esté activa).
	•	Además, para home se crea un contenedor inferior derecho (bottomRight) con enlaces a About y Mail: por ejemplo, <a href="about.html" class="boton-fijo">about</a> y un enlace mailto al correo de contacto ￼. Estos permiten ir a la página About o enviar un correo directamente.
	•	En la página de Producto (data-page-type="product"): Aquí la configuración es distinta:
	•	En la esquina inferior derecha se agrega un botón Carrito (similar al de home) para poder ver el carrito mientras uno está en la página de detalle ￼.
	•	En la esquina inferior izquierda se agregan enlaces de navegación: Mail (contacto), About, y un botón Home para volver a la página principal ￼. Esto facilita al usuario regresar a la galería o ir a About desde la página de detalle.
	•	En la página About (data-page-type="about"):
	•	En la esquina inferior derecha aparecen Home (volver al inicio) y Mail ￼.
	•	En la esquina inferior izquierda, un botón Carrito (por si el usuario quiere revisar el carrito desde la sección informativa) ￼.

Después de definir el contenido según cada caso, el código inyecta estos elementos al DOM. Solo agrega cada contenedor si contiene algo (por ejemplo, en Home no se define bottomLeft, así que solo añade topRight y bottomRight si existen) ￼. Como resultado, cada página al cargarse verá aparecer sus botones fijos correspondientes. Estos botones tienen estilo fijo (posicionamiento CSS fixed) para que siempre estén visibles en la pantalla (parte superior o inferior, derecha o izquierda según corresponda) ￼ ￼.

Comportamiento de los botones: carrito y filtro

El mero hecho de crear los botones no es suficiente; también debemos definir qué hacen cuando el usuario hace clic. navBtns.js utiliza event delegation para manejar esto de forma global:
	•	Se añade un manejador al document para el evento "click" que detecta si el elemento clicado (o alguno de sus padres inmediatos) es un enlace con clase .boton-fijo ￼. Esto cubre todos nuestros botones fijos sin registrar múltiples listeners por botón.
	•	Dentro de ese manejador:
	•	Si el elemento clicado tiene id="btn-carrito" (es decir, se pulsó el botón Carrito):
	•	Llama a e.preventDefault() para anular cualquier navegación por defecto (el enlace es href="#", así que previene el salto a top of page).
	•	Llama a la función global abrirCarrito() ￼. Esta función está definida en app.js y se encarga de desplegar la ventana modal del carrito (la veremos en detalle en la siguiente sección). En esencia, al hacer clic en Carrito, aparecerá el popup con la lista de productos añadidos.
	•	Si el elemento clicado tiene id="btn-filtro" (botón Filtrar en la home):
	•	También hace preventDefault() (no queremos navegar a “#”).
	•	Llama a toggleFiltro() ￼, función definida en el mismo navBtns.js, que abre o cierra el panel lateral de filtros.

Con esto, los botones fijos tienen funcionalidad: Carrito abre el carrito, Filtrar despliega/oculta el panel de filtros. Los demás enlaces (Home, About, Mail) son enlaces normales: About y Home cargan esas páginas, el enlace de mail abre el cliente de correo.

Panel lateral de filtros

Detengámonos un momento en el panel de filtros, ya que está conectado con lo visto en home.js:
	•	En navBtns.js hay una función initFiltroPanel() que crea el panel lateral de filtros la primera vez que se necesite ￼ ￼. Básicamente:
	•	Comprueba si ya existe un elemento con id "filtros-panel"; si no, crea un <aside> con ese id y un conjunto de clases CSS para posicionarlo fuera de la pantalla por la derecha (usando translate-x-full para ocultarlo inicialmente) ￼ ￼.
	•	Dentro de ese panel inserta HTML que incluye:
	•	Un título <h2>Filtrar</h2> y dos controles:
	•	Un <label> y <select id="filtro-coleccion"> para elegir la colección, inicializado con una opción "Todas" ￼.
	•	Un <label> y <select id="filtro-tipo"> para elegir el tipo de prenda, inicializado con opción "Todos" ￼.
	•	(Las opciones específicas se agregarían dinámicamente desde home.js mediante initFilters(productos) leyendo las colecciones y tipos reales de los productos).
	•	Finalmente adjunta este panel <aside> al document.body ￼.
	•	La función toggleFiltro() simplemente toma el panel #filtros-panel y le alterna la clase CSS que lo mueve fuera/de nuevo a la vista, logrando el efecto de deslizar el panel dentro o fuera de la pantalla ￼. Cuando el panel tiene la clase translate-x-full está desplazado hacia la derecha (oculto); al quitarla, mediante CSS transition-transform, el panel se deslizaría hacia adentro visible.

Actualmente, el código que inicializa este panel está comentado en la sección de Home de navBtns.js: originalmente, tras insertar los botones, habrían llamado a initFiltroPanel() al cargar la página home ￼, pero esa línea está comentada. Esto significa que, tal como está, al hacer clic en Filtrar en la home, toggleFiltro() intentará togglear el panel, pero si el panel nunca fue creado, no habrá efecto. En otras palabras, el botón “filtrar” en este momento no llega a funcionar porque el panel no existe (y la función toggleFiltro verifica que el panel exista ￼). Para completar la funcionalidad, habría que asegurarse de llamar a initFiltroPanel() en algún momento (por ejemplo, al cargar home, o la primera vez que se pulsa filtrar) y también llamar a initFilters(productos) después de cargar los productos para llenar las opciones. Estas conexiones están escritas en el código pero comentadas, quizás a la espera de depuración o de una decisión de UX.

En resumen, navBtns.js es el módulo que construye la navegación fija en la interfaz y define el comportamiento de sus botones:
	•	Carrito: llama a la función del carrito (en app.js) para mostrar el contenido.
	•	Filtrar: (cuando esté activo) muestra/oculta el panel de filtros.
	•	Otros enlaces (Home, About, Mail) simplemente redirigen o abren correo.
	•	La implementación actual deja preparado el panel de filtros pero sin activarlo, lo cual sugiere que es una característica en desarrollo o opcional.

A continuación, profundizaremos en la funcionalidad del carrito de compras, manejada por app.js, para entender cómo se agregan productos, se almacena el carrito y cómo se muestra la ventana modal con los detalles.

Funcionalidad del Carrito de Compras (app.js)

El carrito de compras es una pieza clave del proyecto, y está centralizado en el archivo app.js. Este módulo maneja el estado del carrito, su almacenamiento en localStorage, la actualización del contador de items y la generación de la ventana modal que lista los productos añadidos. Vamos a desglosar sus partes principales:
	•	Estado inicial del carrito: Al cargarse app.js, lo primero que hace es comprobar si hay datos de carrito guardados previamente en el localStorage del navegador ￼. Usa la clave "carrito":

const carritoGuardado = localStorage.getItem("carrito");
const carrito = carritoGuardado ? JSON.parse(carritoGuardado) : [];

Esto significa que si el usuario ya tenía un carrito (por ejemplo, agregó productos en una visita anterior), se recupera ese array; si no, se inicia con un array vacío. La variable carrito (un array de objetos producto en el carrito) existe así en ámbito global (no está dentro de ninguna función), de modo que otras partes del código pueden usarla si es necesario.

	•	Función agregarAlCarrito(...): Es la función que añade un nuevo producto al carrito ￼. Se espera que sea llamada pasando:
	•	id del producto,
	•	nombre (título),
	•	talla seleccionada (si aplica, puede ser null si no hay tallas),
	•	peso (usado para estimar envíos),
	•	precio (numérico, idealmente),
	•	img (URL de la imagen, para mostrar en la lista del carrito).
La implementación actual simplemente hace carrito.push({ id, nombre, talla, cantidad: 1, peso, precio, img }) ￼ – es decir, añade un objeto con esos datos y cantidad: 1 al array del carrito. No comprueba si el producto ya estaba en el carrito; cada llamada agrega una entrada nueva. (Como posible mejora futura, se podría verificar si ese id+talla ya existe y solo incrementar la cantidad, pero tal como está, duplicará entradas si agregas dos veces el mismo producto).
Tras hacer push, llama a actualizarCarrito() y actualizarContadorCarrito() ￼ para reflejar los cambios en la interfaz y almacenamiento.
	•	Función actualizarCarrito(): Su responsabilidad es refrescar la lista del carrito en la interfaz y guardar el estado actualizado en localStorage ￼ ￼. Busca un elemento en el DOM con id="carrito" ￼:

const listaCarrito = document.getElementById("carrito");
if (listaCarrito) {
    listaCarrito.innerHTML = "";
    carrito.forEach(item => {
        const li = document.createElement("li");
        li.textContent = `${item.nombre} x ${item.cantidad}`;
        listaCarrito.appendChild(li);
    });
}
localStorage.setItem("carrito", JSON.stringify(carrito));

Es decir, si existiera un contenedor (por ejemplo una lista <ul id="carrito">) en la página, lo llenaría con <li> por cada item indicando nombre y cantidad ￼. Sin embargo, en la estructura actual del sitio no hay un <ul id="carrito"> permanente en el HTML, ya que el carrito se muestra en un popup modal (que se crea dinámicamente). Por tanto, generalmente esta función solo cumple la parte de guardar en localStorage ￼. (Es posible que esta fuera una función pensada para un carrito visible en todo momento o un menú desplegable, pero en nuestro caso el carrito se ve en la ventana modal generada por abrirCarrito()).

	•	Función actualizarContadorCarrito(): Calcula el número total de artículos en el carrito y actualiza el pequeño contador visible en el botón del carrito ￼. Suma todas las cantidades (carrito.reduce((sum, item) => sum + item.cantidad, 0)) y coloca ese número como texto en el elemento con id "carrito-count" ￼. Recordemos que ese elemento <sup id="carrito-count"></sup> fue insertado en el botón fijo por navBtns.js. Esta función asegura que, tras agregar o quitar elementos, el numerito del carrito (badge) muestre la cantidad correcta.
	•	Función abrirCarrito(): Aquí es donde se construye la ventana modal que muestra el contenido del carrito ￼. Cuando el usuario hace clic en el botón Carrito (lo cual invoca a abrirCarrito() vía navBtns.js), esta función:
	•	Primero verifica si ya hay un popup abierto (document.getElementById("popup-carrito")); si existe, sale para no abrir múltiples instancias ￼.
	•	Crea un overlay oscuro de fondo: un <div id="popup-carrito" class="popup-carrito"></div> ￼.
	•	Dentro de ese overlay, crea el contenedor modal: <div class="carrito-modal"></div> ￼.
	•	Genera un botón de cerrar (<button class="carrito-cerrar">✕</button>) y le añade un evento para, al hacer click, simplemente overlay.remove() (quitar el popup de la página) ￼.
	•	Crea un contenedor div para la lista de productos del carrito (<div class="carrito-lista"></div>) ￼. Luego recorre el array carrito:
	•	Para cada item en el carrito, construye un div con clase "carrito-producto" que representará ese producto en la lista ￼.
	•	Dentro, crea un <img> con src apuntando a la imagen del producto y clase "carrito-img" ￼, y otro div con clase "carrito-info" donde inserta detalles: nombre del producto, la talla (si tiene, p.ej. “size: M”) y el precio multiplicado por la cantidad ￼. Esto se hace usando un template string con HTML:

info.innerHTML = `
   <p class="carrito-nombre">${item.nombre}</p>
   <p class="carrito-detalles">${item.talla ? `size: ${item.talla}` : ""}</p>
   <p class="carrito-precio">${item.cantidad} × ${item.precio.toFixed(2)}€</p>
`;

Así, cada producto listado muestra su nombre, talla seleccionada (si corresponde) y precio unitario × cantidad ￼.

	•	Se va acumulando un subtotal del carrito sumando item.precio * item.cantidad por cada producto ￼, y también un peso total sumando item.peso * item.cantidad (esto último se usará para cálculo de envío) ￼.
	•	Cada itemDiv con la info e imagen se añade al contenedor de lista (lista) ￼.

	•	Tras listar todos los productos, añade al modal una sección para calcular el envío (carrito-envio): crea un <select id="envio-zona"> con opciones de zonas (España, Islas, Europa, EEUU, LATAM, Japón) y un <p id="envio-estimado"></p> vacío para el resultado ￼ ￼. También incluye un pequeño texto “estimar envío” ￼. Esta sección permite al usuario escoger su región para ver cuánto costaría el envío de lo que hay en el carrito.
	•	Añade un párrafo con el total de productos en euros (<p class="carrito-total">Total productos: X€</p>) ￼. Inicialmente muestra el subtotal (suma de precios de los productos, sin envío) ￼.
	•	Agrega un botón “PAGAR” (que en una implementación completa enviaría el pedido o llevaría a un checkout, pero actualmente es solo un botón sin funcionalidad de envío real) ￼.
	•	Ensambla todo: añade el botón de cerrar, la lista de productos, el bloque de envío, el total y el botón pagar dentro del div.carrito-modal (modal) ￼. Luego inserta el modal en el overlay, y el overlay en el <body> ￼. Al hacer esto último, el popup se hace visible en la página (el CSS seguramente posiciona .popup-carrito como fixed, centro de pantalla, con fondo semi-transparente, etc., según styles.css).
	•	Finalmente, agrega funcionalidad al selector de envío: un event listener "change" en #envio-zona para calcular el coste estimado ￼. La lógica de cálculo:
	•	Define una tabla de precios por zona y rangos de peso (en el objeto precios) ￼. Por ejemplo, para España: [4, 6, 8] podrían ser 3€, 6€, 8€ según rangos de peso.
	•	Determina el rango según el pesoTotal del carrito: si pesa <= 1kg, rango 0; <= 2.5kg, rango 1; más de 2.5kg, rango 2 ￼.
	•	Toma el precio correspondiente de precios[zona][rango]. Si existe, muestra en el <p id="envio-estimado"> el texto "Envío estimado: X,XX€" y actualiza el texto del total para decir "Total estimado: (subtotal + envío)€" ￼. Si no hay precio (por ejemplo si zona es "" sin seleccionar), limpia el texto de envío y vuelve a mostrar "Total productos: X€" solamente ￼.
	•	De esta forma, en cuanto el usuario elige su zona, en el popup del carrito verá cuánto costaría enviar ese pedido y el total con envío incluido.

	•	Actualización inicial del contador (truco de MutationObserver): Un detalle interesante es que app.js emplea un MutationObserver para asegurarse de que el contador del carrito (#carrito-count) muestre el número correcto tan pronto como los botones de navegación se hayan insertado en la página ￼. Recordemos que navBtns.js añade el HTML del botón carrito (incluyendo el <sup id="carrito-count">) cuando se carga la página. Dependiendo del orden de carga de scripts, puede que app.js se ejecute antes de que ese elemento exista en el DOM. Por eso:
	•	Se crea un MutationObserver que observa cambios en el document.body (childList y subtree) ￼.
	•	En cada cambio, busca si ya existe un elemento con id "carrito-count" ￼.
	•	En el momento en que detecta que #carrito-count está presente, llama a actualizarContadorCarrito() para poner el número correcto ￼ y luego hace observer.disconnect() para dejar de observar.
	•	Así, aunque app.js se cargue antes o después que navBtns.js, nos aseguramos de no depender del orden: el contador se inicializará correctamente a lo que haya en localStorage. Si es la primera visita (carrito vacío), mostrará 0 (o vacío); si el usuario tenía 3 items guardados, mostrará 3, etc.

En conjunto, app.js mantiene la lógica de carrito separada de las páginas concretas:
	•	Expone funciones globales como agregarAlCarrito, abrirCarrito, etc., que otros módulos (producto o nav) pueden invocar.
	•	Conserva el estado del carrito entre sesiones (localStorage).
	•	Actualiza la interfaz del contador en el botón carrito.
	•	Crea bajo demanda un modal detallado con los productos añadidos, donde el usuario puede revisar cantidades, ver el coste, estimar el envío y eventualmente proceder al pago.

El usuario final experimenta esto de la siguiente manera: puede navegar por la tienda, y al estar en la página de detalle de un producto puede presionar “Añadir al carrito”. Al hacerlo, el número junto a “carrito” incrementa. En cualquier momento (desde home, about o la propia página de producto) puede hacer clic en el botón Carrito fijo, lo que mostrará la lista de lo que ha añadido y le permitirá calcular envío o continuar al siguiente paso (que en esta versión sería un futuro desarrollo de proceso de pago).

Ahora revisaremos precisamente cómo se añade un producto al carrito desde la página de detalle, y qué sucede en esa página específica.

Página de Detalle de Producto (producto.html & producto.js)

Cuando un usuario hace clic en un producto desde la galería de la home, es dirigido a la página detalle de producto, que corresponde al archivo producto.html. Esta página tiene una estructura sencilla: un contenedor <div id="detalle-producto"></div> donde se inyectará la información del producto seleccionado, y también carga los scripts comunes (app.js, navBtns.js, etc.) y el específico producto.js ￼.

El corazón de la lógica está en producto.js, que realiza pasos parecidos a home.js pero enfocados en un solo producto:
	•	Lectura del ID del producto desde la URL: Al cargarse el DOM de producto.html, se ejecuta un listener DOMContentLoaded en producto.js ￼. Lo primero que hace es obtener el parámetro id de la query string de la URL:

const params = new URLSearchParams(window.location.search);
const id = parseInt(params.get("id"));

De esta forma, si la URL es producto.html?id=4, la variable id contendrá el número 4 ￼. Luego selecciona el contenedor detalle-producto del DOM para poder insertar contenido ￼.
	•	Si no hubiera un id válido en la URL (por seguridad), muestra un mensaje de error “Producto no encontrado.” en el contenedor ￼ y termina.

	•	Carga de datos del producto: Igual que en home, realiza un fetch del archivo "./productos.json" para obtener la lista completa de productos ￼. Luego busca en ese array el producto cuyo p.id === id que obtuvimos ￼:

producto = productos.find(p => p.id === id);

Si no encuentra el producto (por ejemplo, el id no existe o no hay datos), inserta en la página un mensaje “Producto no disponible.” ￼ y sale de la función.

	•	Preparación de datos para mostrar: Suponiendo que encontró el objeto producto, el código extrae y prepara varios elementos antes de renderizar:
	•	Calcula banderas de estado similares a antes:
	•	const estaRebajado = producto.precio_original && producto.precio_original > producto.precio; (Esta línea parece remanente de otra versión, ya que en nuestros datos no hay precio_original separado; en su lugar usamos rebajas y precioRebajas. De hecho, el código luego usa producto.rebajas directamente para mostrar el precio tachado, así que podemos ignorar estaRebajado o considerarlo un vestigio no usado).
	•	const estaAgotado = producto.soldOut === "si" || producto.stock === 0; – esto determina si el producto está agotado, igual que en home ￼.
	•	Define un texto constante makingTime con un mensaje al usuario sobre el tiempo de fabricación artesanal de los productos ￼ (2 a 4 semanas, etc.), que se mostrará en cada ficha de producto.
	•	Prepara el bloque de tallas disponibles:
	•	Si el producto tiene un array de tallas (producto.tallas existe y tiene longitud) ￼, se construye un mini menú desplegable personalizado en HTML. El código mapea cada talla a un <div class="dropdown-option" data-index="i">talla</div> ￼. Si la talla es la que lleva el modelo (t.id === producto.tallaModelo), añade la indicación “ (seen in model)” junto al texto ￼. Luego une todas esas opciones en un solo string.
	•	Si hay más de una talla, agrega una opción extra al final para “custom (send mail)” ￼, que sugiere al usuario contactar para una talla personalizada.
	•	Finalmente forma el HTML de un componente dropdown personalizado:

<div class="talla-wrapper">
  <div class="dropdown" role="listbox" tabindex="0" data-selected="...">
    <div class="dropdown-toggle">[Texto de la talla seleccionada por defecto]</div>
    <div class="dropdown-menu">[Opciones de talla construidas arriba]</div>
  </div>
</div>

La idea es que el campo data-selected guarda el índice de la opción seleccionada (por defecto la talla del modelo, o 0 si no) ￼, y se muestra esa talla en el .dropdown-toggle. El menú completo de opciones está en el .dropdown-menu desplegable. Este control sustituye a un <select> estándar para darle estilo personalizado.

	•	Si el producto no tiene tallas (ej: es one-size), entonces tallas quedará como cadena vacía y simplemente no se mostrará un selector.

	•	Prepara la etiqueta de colección (colección a la que pertenece el producto):
	•	Si el campo "colección" existe en el objeto (en JSON aparece como "colección": "BASICS", por ejemplo), crea un párrafo <p class="coleccion">NOMBRE<sup> collection</sup></p> ￼. Por ejemplo, si producto["colección"] es "BASICS", se mostrará “BASICS collection” como categoría/colección del producto.
	•	Prepara el botón o mensaje de stock:
	•	Si estaAgotado es false (hay stock), define un botón <button class="btn-añadir-carrito">Añadir al carrito</button> ￼.
	•	Si el producto está agotado, en lugar del botón mostrará un mensaje <p class="agotado-msg">Este producto está agotado.</p> ￼ en su lugar. Esto evita que alguien intente añadir un producto sin stock.

	•	Renderizado del detalle en la página: Con todos esos fragmentos listos, se construye el HTML completo que se inserta en #detalle-producto usando contenedor.innerHTML = ... ￼ ￼. La estructura general que se inyecta es:

<div class="producto-layout">
  <div class="producto-img-container">
    <img src="[imagen]" alt="[titulo]" class="producto-img" />
  </div>
  <div class="producto-info">
    <div class="home_titulo_precio">
      <span class="titulo">[Título del producto]</span>
      <p class="precio">
        <!-- Precio o precios si rebajado -->
        ... 
      </p>
    </div>
    <p class="descripcion">[Descripción larga del producto]</p>
    [Bloque de tallas HTML construido, si aplica]
    [Etiqueta de colección, si aplica]
    <p class="making-time">[Texto makingTime sobre fabricación]</p>
    [Botón "Añadir al carrito" o mensaje de agotado]
  </div>
</div>

En el código, podemos ver por ejemplo que se agrega la imagen con su src y alt ￼, luego el título y precio con la misma lógica de tachado si está en rebaja ￼ (usando producto.rebajas === "si" para decidir mostrar el precio original tachado y el rebajado ￼), después la descripción y todos los elementos adicionales (tallas, colección, making-time, botón) en orden ￼. Al final de este paso, el usuario ve una página con la foto grande del producto a la izquierda y a la derecha todos estos detalles formateados (nombre, precio, descripción, selector de talla si hay, etc.). Si el producto estaba marcado en descuento o sin stock, la presentación refleja esos estados (precio tachado + rebajado, o mensaje de “agotado” en lugar de botón).

	•	Interactividad en la página de producto:
	•	Añadir al carrito: Después de insertar el HTML, producto.js se asegura de manejar la acción del botón “Añadir al carrito”. Para ello, registra un event listener global para clicks en el documento que detecta si el click proviene del botón con clase .btn-añadir-carrito ￼. Cuando se detecta:
	•	Obtiene nuevamente el id desde la URL (redundante, ya lo tenía en producto.id, pero usa el mismo método de URLSearchParams) ￼.
	•	Obtiene el nombre del producto desde el DOM (document.querySelector(".titulo").textContent) ￼. Alternativamente podría usar producto.titulo directamente, pero esto también funciona.
	•	Obtiene la talla seleccionada leyendo el texto del elemento .dropdown-toggle dentro del dropdown de tallas ￼. Si por alguna razón no hay dropdown (producto sin tallas), queda null. Así captura qué talla eligió el usuario.
	•	Llama a la función global agregarAlCarrito(...) pasando los datos del producto actual: producto.id, producto.titulo, la talla elegida, el producto.peso, el precio obtenido con obtenerPrecio(producto) y la imagen producto.img ￼. Aquí obtenerPrecio(producto) es una pequeña función definida al inicio que retorna el precio numérico del producto, manejando si está en rebaja (devuelve precioRebajas en número si hay rebaja, si no devuelve precio en número) ￼. Esto se hace para asegurar que pasamos un número (con punto decimal) a la función del carrito en lugar de la cadena “35,00”.
	•	Como vimos, agregarAlCarrito añadirá ese producto al array global, actualizará localStorage y llamará a las funciones para reflejar el cambio. Inmediatamente el contador en el botón carrito incrementará en 1 (gracias a actualizarContadorCarrito() que se llamó dentro). Importante: Todo esto sucede sin recargar la página; el usuario permanece en la página de detalle y puede seguir navegando o abrir el carrito.
	•	Ver imagen en grande (popup de imagen): El script implementa una característica útil: al hacer clic sobre la imagen del producto, se muestra en grande como un popup.
	•	Justo después de renderizar el contenido, producto.js crea un overlay similar al del carrito pero para la imagen ￼. Inserta un <div id="imagen-popup"> con una estructura interna que contiene otra copia de la imagen (misma src y alt) ￼. Este overlay inicialmente está en el DOM pero probablemente oculto por CSS.
	•	Luego añade: img.addEventListener("click", () => { overlay.classList.add("visible"); }); ￼, de forma que al hacer clic en la imagen del producto en la página, se añade la clase “visible” al overlay, lo que mediante CSS seguramente muestra la imagen centrada en pantalla (por ejemplo, con fondo semitransparente).
	•	También añade que al hacer clic en el overlay (cualquier parte fuera de la imagen, o en la imagen misma según implementación) se quite la clase “visible”, ocultándolo de nuevo ￼. Así, el usuario puede hacer clic fuera de la imagen ampliada para cerrarla.
	•	Esto es un pequeño detalle de usabilidad que mejora la visualización de las fotos de producto.
	•	Selector de tallas personalizado (dropdown): Recordemos que en lugar de un <select> se creó un menú desplegable personalizado. Para hacerlo funcional, producto.js agrega otro listener global a document para manejar clicks en este componente ￼ ￼:
	•	Si el usuario hace clic en el elemento con clase .dropdown-toggle (el cuadro que muestra la talla seleccionada actualmente), el código:
	•	Cierra cualquier otro dropdown abierto (removiendo la clase open de cualquier .dropdown.open que no sea el actual) ￼.
	•	Alterna la clase open en el dropdown actual (lo abre si estaba cerrado, o lo cierra si estaba abierto) ￼.
	•	Hace return para no propagar más el evento.
	•	Si el usuario hace clic en una de las opciones (.dropdown-option):
	•	Busca el contenedor .dropdown padre y el toggle dentro de él.
	•	Copia el texto de la opción seleccionada al toggle (así, el toggle ahora muestra la talla elegida por el usuario) ￼.
	•	Cierra el dropdown (removiendo la clase open).
	•	Actualiza el atributo data-selected del contenedor con el índice de la opción elegida (esto podría servir para saber qué talla en términos de array de tallas fue la seleccionada, si luego quisiéramos usar ese índice para algo) ￼.
	•	Retorna, finalizando el manejo.
	•	Si el usuario hace clic en cualquier otro lugar de la página mientras un dropdown está abierto (es decir, el evento click llega al document y no cae en un toggle u opción):
	•	Cierra cualquier dropdown abierto removiendo la clase open de todos ￼. Esto asegura que el menú desplegable de tallas se cierra cuando haces click fuera, imitando el comportamiento de un select normal.
	•	Gracias a esta lógica, el selector de tallas se comporta como un menú desplegable: clic para abrir, seleccionar opción, se cierra automáticamente y muestra la elección. El código maneja todo mediante CSS (clase open probablemente muestra/oculta el menú) y JS para la interacción.
	•	Texto “see sizes/hide sizes”: Hay un pequeño fragmento de código relacionado con un elemento .tallas-acordeon ￼. Parece un detalle para cambiar el texto de algún acordeón de tallas (“see sizes” / “hide sizes”), posiblemente pensado para una versión alternativa donde las tallas se muestran en un <details> desplegable. Sin embargo, en la versión final usamos el dropdown personalizado, así que este código no se activa (porque no existe .tallas-acordeon en el HTML generado). Podemos considerarlo un remanente o algo opcional no usado actualmente.
	•	Ajuste responsivo de imagen en móvil: Al final de producto.js hay una IIFE (función autoejecutable) que ajusta el ratio de la imagen en dispositivos móviles ￼. Si el ancho de pantalla es menor a 480px, esta rutina recorre cada contenedor de imagen .producto-img-container y calcula la relación alto/ancho natural de la imagen, aplicándola como un padding-bottom dinámico al contenedor para mantener el aspecto correcto ￼. En esencia, asegura que en móviles la imagen de producto ocupe el espacio correcto y no deforme el layout al cargar (es un truco para mantener el espacio mientras la imagen carga, evitando saltos). Si la imagen ya cargó, ajusta inmediatamente; si no, espera al evento "load" de la imagen ￼. Esto mejora la presentación en pantallas pequeñas.

Resumiendo la experiencia en la página de producto:
	•	El script busca el producto adecuado según el id de la URL y muestra toda su información de forma atractiva.
	•	Permite escoger talla cuando es pertinente.
	•	Añadir al carrito: con un clic, el producto (y la talla elegida) se envían al carrito gracias a la función global agregarAlCarrito integrada con app.js. El usuario ve inmediatamente el contador del carrito actualizarse. No hay recarga de página, todo sucede de fondo.
	•	Características extra: ver la imagen en grande con clic, control de tallas interactivo, y detalles informativos como la colección o el tiempo de producción, enriquecen la página.

Toda la lógica del detalle de producto depende de producto.js, que a su vez usa funciones globales de app.js. El HTML de producto.html solo actúa como contenedor vacío listo para ser llenado, más la inclusión de scripts para que todo funcione. Por supuesto, los botones fijos de navegación (generados por navBtns.js) también aparecen en esta página (por ejemplo, el botón Carrito abajo a la derecha, el botón Home para volver, etc., como describimos antes).

Conexión entre los Módulos JavaScript

Ahora que hemos analizado cada pieza, es útil ver cómo encajan entre sí estos módulos (home.js, producto.js, navBtns.js, app.js, etc.) para lograr el funcionamiento completo del sitio. La arquitectura es sencilla y se basa en que cada archivo se especializa en una tarea, manteniendo algunas variables globales y usando el DOM para comunicarse:
	•	Coordinación por página: Cada página HTML carga ciertos scripts en el orden necesario:
	•	Home carga primero home.js (galería), luego navBtns.js (botones fijos), luego app.js (carrito) ￼. Esto garantiza que al dispararse DOMContentLoaded, tanto home.js como navBtns.js tendrán sus event listeners listos, y las funciones globales de app.js (como abrirCarrito y agregarAlCarrito) ya estarán definidas para cuando se necesiten.
	•	Producto carga app.js primero, luego logoTexture.js, luego navBtns.js y al final producto.js ￼. Aquí se priorizó cargar el carrito antes, aunque en este caso el orden no es crítico mientras todos estén antes de que se use cada funcionalidad. Importante es que app.js esté cargado antes de que producto.js intente usar agregarAlCarrito, lo cual se cumple. navBtns.js puede ir antes o después de producto; al final del DOMContentLoaded de producto, ambos eventos (navBtns para nav y producto.js para detalle) se ejecutarán.
	•	About carga app.js y luego navBtns.js ￼, suficiente para tener carrito y navegación (no necesita home.js ni producto.js porque no lista productos).
	•	Variables y funciones globales compartidas: Debido a que ninguno de estos scripts está encapsulado en módulos ES6 (no se usan import/export en la ejecución real, aunque hay un main.js sugerido para ello), todas las funciones declaradas (ej. agregarAlCarrito, abrirCarrito, toggleFiltro, etc.) y variables globales (carrito) viven en el espacio global window. Esto permite que, por ejemplo:
	•	navBtns.js llame a abrirCarrito() sin importarlo explícitamente, porque abrirCarrito fue declarada en app.js a nivel global ￼ ￼.
	•	producto.js llame a agregarAlCarrito(...) definida en app.js ￼ ￼.
	•	El carrito (array carrito) persistente es accesible dentro de app.js y persiste entre páginas vía localStorage, pero no es manipulado directamente por otros scripts salvo a través de las funciones de app.js.
	•	navBtns.js inserta en el DOM el elemento #carrito-count y luego app.js lo detecta y actualiza su contenido ￼ ￼. Hay un claro contrato implícito: navBtns se encarga de la presentación de los botones, app.js de la lógica de carrito, y ambos usan el mismo id para comunicarse (en este caso, el contador del carrito).
	•	La función de filtro toggleFiltro de navBtns manipula el panel creado por initFiltroPanel en el DOM, y home.js (si se activara) llenaría los selects dentro de ese panel. La comunicación aquí sería a través del DOM compartido: home.js busca #filtro-coleccion y #filtro-tipo en el documento ￼ y los llena con opciones; navBtns creó esos elementos en el DOM. Además, los eventos change de esos selects están manejados en home.js (initFilters los registra para llamar a applyFilters) ￼. Esto muestra cómo un módulo inserta elementos y otro módulo les agrega comportamiento, coordinándose mediante IDs conocidos.
	•	Manejadores de eventos múltiples: Cada script agrega sus propios event listeners (DOMContentLoaded, click, etc.). Dado que se usan eventos del DOM, el navegador los ejecuta de forma independiente. Por ejemplo, en el momento en que el DOM se termina de cargar:
	•	Se ejecutará la función cargarProductos de home.js (solo en home).
	•	Se ejecutará la inicialización de navBtns (para insertar botones).
	•	Se ejecutarán las partes de producto.js (si estamos en la página de producto) que también usan DOMContentLoaded.
	•	El orden de ejecución de múltiples DOMContentLoaded handlers añadidos por distintos scripts suele ser el orden en que fueron agregados (que corresponde al orden de inclusión de los scripts). En la home, primero se agregó el de home.js, luego el de navBtns.js ￼, luego app.js no tiene DOMContentLoaded pero corrió su código directamente (como el MutationObserver) al cargar, y logoTexture.js quizás también al final. Esto significa: en home, al terminar de cargar DOM, primero cargamos productos, luego insertamos botones fijos. ¿Hay conflicto? No, porque las inserciones de navBtns.js no interfieren con el contenido de la galería, van en lugares distintos (body append al final). Y el MutationObserver de app.js captura cuando los botones se insertan para actualizar el contador.
	•	En la página de producto, el orden de scripts fue distinto, pero el principio es similar.
	•	Comunicación a través del DOM vs modular: En ausencia de un sistema de módulos (aunque se intentó esbozar uno, comentado en main.js), los archivos están algo acoplados por nombres globales y elementos DOM. Afortunadamente, los nombres elegidos son únicos y descriptivos (IDs únicos, funciones globales bien nombradas), lo que reduce problemas.
	•	Por ejemplo, toggleFiltro() asume la existencia de #filtros-panel en el DOM. abrirCarrito() asume que puede adjuntar un #popup-carrito al body y que el CSS se encargará de estilo.
	•	El flujo completo sería: usuario entra a Home → home.js lista productos, navBtns.js crea botón carrito/filtrar, app.js actualiza contador si había algo. Usuario filtra (si estuviera activo) → home.js filtra lista según selects. Usuario clica producto → navega a producto.html → producto.js carga datos, muestra info, navBtns.js pone botón carrito/home/about, app.js ya tenía carrito en memoria y actualiza contador. Usuario “Añadir al carrito” → producto.js llama app.js:agregarAlCarrito → se actualiza estado y contador. Usuario hace clic en Carrito → navBtns.js llama app.js:abrirCarrito → se muestra overlay con datos del carrito actual.
	•	Todo funciona coordinado, pese a estar en archivos separados, gracias a que comparten el entorno global y manipulan consistentemente el DOM.

En términos de diseño, se puede decir que navBtns.js y app.js actúan de soporte general (presentación de navegación y lógica de carrito) para todas las páginas, mientras home.js y producto.js manejan funcionalidades específicas de cada página. Este enfoque previene cargar código innecesario: por ejemplo, la home no carga la lógica de detalle de producto, y viceversa.

Antes de finalizar, revisemos algunas posibles mejoras o refactorizaciones que se podrían aplicar al código para hacerlo más claro o robusto, sin alterar su funcionamiento actual.

Sugerencias de Refactorización y Mejora

(Estas sugerencias no implican que el código actual esté mal; más bien son ideas para hacerlo más mantenible o claro en el futuro, manteniendo lo que ya funciona.)
	•	Unificar la inicialización en un solo punto: Actualmente, cada módulo JavaScript añade su propio listener de DOMContentLoaded por separado (home, producto, navBtns, etc.), lo que puede hacer un poco difícil seguir el orden de ejecución ￼. Una mejora de claridad sería tener un archivo principal (por ejemplo, un main.js) que se encargue de inicializar todo en orden. De hecho, en el código provisto existe un archivo main.js con una sugerencia exactamente en este sentido: importar las funciones de inicialización de cada módulo (initCarrito de app.js, initGaleria de home.js, etc.) y llamarlas todas en un solo DOMContentLoaded ￼ ￼. En un entorno con bundling (empacado) o usando <script type="module">, esto podría organizar mejor la carga y hacer explícitas las dependencias entre módulos. Si no se quiere cambiar la estructura de archivos, al menos asegurarse del orden de inclusión actual está bien; pero conceptualmente, centralizar la entrada del programa ayuda a entender qué sucede al cargar cada página.
	•	Finalizar la funcionalidad de filtrado: El código de filtrado está casi completo pero desconectado. Sería conveniente activar el panel de filtros y su lógica, ya que aportaría funcionalidad útil al usuario. Para ello:
	•	Podemos crear el panel cuando el usuario pulse el botón Filtrar (llamar a initFiltroPanel() dentro de toggleFiltro() si el panel no existe, en lugar de tenerlo comentado al cargar) o simplemente dejar descomentada la llamada en DOMContentLoaded de home para que el panel esté listo desde el inicio ￼.
	•	Llamar a initFilters(productos) una vez que cargarProductos obtenga los datos, para poblar las opciones de colección y tipo ￼. Esto podría hacerse después de renderProductos en la función cargarProductos(). Al estar en home, se podría pasar la lista de productos obtenida.
	•	Con eso, los selects tendrán opciones reales y al cambiar llamarán a applyFilters (ya implementado). El panel se abre/cierra con el botón Filtrar gracias a toggleFiltro. Esta mejora haría funcional esa parte del código que actualmente está dormida.
	•	Si por decisión de diseño no se quiere filtrar, entonces podría limpiarse el código comentado para evitar confusión. Pero dado que ya está escrito, activarlo incrementa la potencia de la página.
	•	Agrupar comportamientos relacionados: En la actualidad, navBtns.js se encarga de la interfaz de navegación y delega en app.js la acción del carrito. Esto está bien, pero por ejemplo la creación del panel de filtro en navBtns.js y la población de datos de filtro en home.js están divididas. Una posible refactorización ligera sería que un mismo módulo se encargue de toda la lógica de filtrado, o al menos documentar claramente que navBtns crea la estructura y home la rellena. Dado que el filtro es específico de la página home, quizás podría estar todo en home.js (crear panel, mostrar/ocultar, etc.) y simplificar navBtns.js. No obstante, separar UI de navegación (navBtns) de lógica de página (home) también tiene sentido. En cualquier caso, sería bueno revisar esos bloques comentados y decidir dónde deben vivir para mayor claridad.
	•	Evitar duplicación al agregar al carrito: Actualmente, cada vez que se agrega un producto al carrito, se hace un push nuevo sin comprobar duplicados. Si un usuario añade el mismo producto dos veces, en el carrito aparecerían dos líneas separadas del mismo artículo (cada una con cantidad 1). Dado que el código ya soporta un campo cantidad, se podría mejorar la robustez haciendo que agregarAlCarrito primero verifique si ya existe un item con el mismo id (y misma talla si se distingue por talla). Si existe, en lugar de push, simplemente incrementar item.cantidad += 1. Esto evitaría duplicados y aprovecharía el campo cantidad adecuadamente. La funcionalidad para el usuario sería equivalente (vería por ejemplo “Camiseta X × 2” en lugar de dos líneas de “Camiseta X × 1”), pero el manejo interno sería más consistente. Esto no cambia lo que “ya funciona” en términos de resultados, solo lo presenta de forma más limpia y previene potenciales confusiones con listas largas del mismo producto.
	•	Limpieza de código muerto o comentado: Hay algunas partes de código que parecen ser de intentos anteriores o que no se usan actualmente:
	•	El mencionado estaRebajado en producto.js que no se utiliza para nada luego (ya que se optó por usar directamente rebajas y precioRebajas).
	•	El bloque de acordeón de tallas (que no se usa porque se implementó el dropdown).
	•	En app.js, la función actualizarCarrito() creando <li> no se llega a usar en la práctica (porque no hay elemento fijo donde mostrarlos). Podría o bien eliminarse esa parte, o considerar implementar un mini-carrito desplegable fijo si se quisiera. Por ahora no hace daño, pero es código que puede inducir a error pensando que hay un <ul id="carrito"> en alguna parte.
	•	El archivo main.js está en el proyecto pero todo su contenido actualmente está comentado (sirve de guía pero no se ejecuta). Si no se va a usar un bundler o imports, podría no incluirse en producción, aunque es útil conservarlo como referencia.
	•	Comentar es bueno para explicar, pero en el código se ven secciones comentadas de funcionalidad (filtro, initFiltroPanel, etc.). Decidir activarlas o removerlas ayudaría a la claridad.
	•	Modularización más clara (opcional): Si en algún momento se quisiera escalar el proyecto, se podría convertir estos scripts en módulos ES6 usando import/export. Por ejemplo, tener funciones exportadas como initCarrito, initHome, initProducto, etc., e importarlas en un main.js. Esto requeriría servir los archivos con type=“module” o usar una herramienta de bundling (Parcel, Webpack, etc.) para generar un único archivo. Dado el tamaño del proyecto, no es estrictamente necesario, pero es algo a considerar para organización. El comentario en main.js ya sugiere esa dirección ￼. Por ahora, la forma en que está, aunque utiliza globales, es manejable y clara en un contexto de sitio pequeño.
	•	Comentarios y documentación: Mantener y quizás aumentar los comentarios en el código (en español, como ya hay algunos) puede ayudar a futuros desarrolladores – o a tu “yo del futuro” – a entender rápidamente qué hace cada sección. Ya hemos visto que en muchos lugares hay comentarios explicativos, lo cual está muy bien. Añadir alguno donde falte (por ejemplo, explicando la intención del MutationObserver, o marcando claramente qué se espera implementar más tarde como en la sección de pedido futuro en app.js que está comentada) puede ser útil.

En conjunto, el código del proyecto Hifas Studio está bien organizado por funcionalidad: archivos separados para home, producto, navegación y carrito. Las sugerencias anteriores buscan reforzar esa organización (centralizando inicialización, activando funcionalidades latentes, eliminando redundancias). Adoptando algunas de ellas, el proyecto será aún más fácil de entender y mantener, sin alterar lo que ya funciona correctamente.

¡Espero que esta guía te haya ayudado a retomar el control de tu proyecto de manera clara y amena! Hemos recorrido cada archivo clave y cómo interactúan entre sí. Ahora deberías tener una visión completa del flujo: desde cargar la página principal con sus productos, pasando por la navegación y carrito, hasta la visualización detallada de un producto y la posibilidad de añadirlo al carrito. Con este conocimiento, podrás realizar cambios con confianza y ampliar la funcionalidad cuando lo necesites. ¡Ánimo y feliz codificación!

## Notas y explicación (de __MACOSX/anakatana/manu/._explanation.txt)

    Mac OS X            	   2   q      £                                      ATTR       £      
                     
  com.apple.provenance  ÌRNµCÒ