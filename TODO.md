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
