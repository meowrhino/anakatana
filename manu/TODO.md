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