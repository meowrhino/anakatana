
# Plan de tareas — Ana Katana
Marca cada casilla al completar. He agrupado y clarificado algunos puntos.

## Home
- [ ] Letra más pequeña en general (aunque pierda legibilidad).
- [ ] Precios alineados a la izquierda.
- [ ] Rebajas: mostrar **precio original** y luego **precio rebajado** (para que quede el bloque "blanco" a la izquierda).
- [ ] Añadir **imagen del logo** antes de todo, ocupando ~`70dvh` (`image.png`).

## Menú / Navegación
- [ ] Añadir **Newsletter** (abre popup de newsletter).
- [ ] Añadir **Políticas**: página tipo *About* con los textos de Ana Katana.

## Popups
- [ ] **Añadir al carrito**: incluir mensaje “Suscríbete para tener un 10%” y un campo de correo **(o abrir el popup de newsletter)**.
- [ ] **Newsletter** (popup): igual estilo que “Se ha añadido al carrito”, con **campo de email**, botón **“Suscribirme”** y botón **“Cerrar”** debajo.

## Newsletter (datos)
- [ ] Crear `newsletter.json` con un **array `suscritos`** que contenga **todos los correos** introducidos.

## Analíticas
- [ ] Crear `visitas.json`: **+1** cada vez que se **carga una página** (cuenta páginas y productos).
  - Ejemplo de flujo: `home → producto balakalava → home → checkout → gracias → home` ⇒ **home** suma **3** visitas.
  - No se verifica nada: **cada carga = 1 visita**.

## Checkout
- [ ] En el **campo email**, comprobar si está ya en `newsletter.json`.
  - [ ] **Si está**: aplicar **10% de descuento** (*decisión:* sobre el **subtotal del producto**).
  - [ ] **Si NO está**: mostrar **check** “Suscribirme a la NL para tener un 10% de descuento”.
    - [ ] Al activar el check: aplicar **10%** al **subtotal**.
    - [ ] Al realizar pedido con el check activo: **guardar ese correo** en `newsletter.json`.
    - [ ] Si se desactiva: **quitar** el 10% del subtotal; si se reactiva: **volver a aplicar**.

## Producto
- [ ] Tamaño del **precio** más pequeño.
- [ ] Revisar **scroll** y **responsive** (comportamientos raros) y ajustar la arquitectura para un comportamiento más estable.
- [ ] Revisar **responsive apaisado** en móvil.

---
### Notas rápidas
- Descuento del 10% → **sobre el subtotal del producto** (decisión actual).
- `newsletter.json` → estructura mínima sugerida: `{ "suscritos": ["mail@ejemplo.com", ...] }`.
- `visitas.json` → contador simple por slug/ruta; no se deduplica por sesión.




sucio: 
cosas a hacer por paginas:

home:
    más pequeña la letra en general, da igual si no se ve
    precios align left

    precios rebajas: primero precio luego precio rebajado (asi a la izq queda todo lo "blanco")

    añadir imagen logo antes de todo de la web que ocupe como 70dvh (image.png)



menu nav: 
    añadir newsletter: popup newsletrer

    añadir politicas: página como el about con los textos de ana katana



popups: 
    añadir al carrito: añadir "suscríbete para tener un 10%" y un campo para poner tu correo (o que te abra el popup de newsletter)

    newsletter: popup como el de "se ha añadido al carrito" con un campo y bajo el campo el boton de "suscribirme" y abajo el de "cerrar"



newsletter: 
    newsletter.json donde hay un array de "suscritos" con todos los correos que se han introducido



analiticas:
    visitas.json: cada vez que entras en una página +1 a un contador. este contador cuenta las páginas y los productos.

    si haces: home -> producto balakalava -> home -> checkout -> gracias -> home, efectivamente home tendria 3 visitas añadidas, cada vez que se carga una pagina es una visita, no se verifica nada 



checkout: 
    en el campo del mail verificar si el mail está ya en newsletter.json, 
        si está: añadir al calculo del precio el 10% de descuento (se aplica al total o al producto? yo creo que seria al subtotal del producto)

        si no está, añadir un check "suscribirme a la NL para tener un 10% de descuento", se activa la funcion anterior para aplicar al calculo de precio ese 10% y si se procede a realizar pedido con el check que se guarde ese correo en newsletter.json

            en caso que se desclique ese check, simplemente se quita del cálculo de ese subtotal ese 10% y ya, y si se reclicka se vuelve a activar y punch



producto:
    precio más pequeño

    scroll raro y responsive rarísimo, revisar cómo se produce todo a ver si podemos hacerlo un pelin mejor
    
    revisar responsive apaisado en movil