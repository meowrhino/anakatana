// Config API (Render)
window.API_BASE = "https://anakatana-backend.onrender.com";
// Mini-guard: si por algún motivo no está definida, evita petar y avisa
if (!window.API_BASE) {
  console.warn("API_BASE no definido; usando fallback local (mismo origen)");
  window.API_BASE = ""; // fallback relativo ("/visitas", "/newsletter"...)
}
// === 1. ESTADO DEL CARRITO ===
// Cargar última zona seleccionada de localStorage
let zonaSeleccionada = localStorage.getItem("zonaSeleccionada") || "";
const carritoGuardado = localStorage.getItem("carrito");
const carrito = carritoGuardado ? JSON.parse(carritoGuardado) : [];

// === 2. FUNCIONES DE CARRITO ===

// === POPUP: añadido al carrito ===
// --- Popup "añadido al carrito" (reutiliza estilos del carrito) ---
let addedPopup;

function ensureAddedPopup() {
  if (addedPopup) return addedPopup;

  // Overlay centrado igual que el del carrito
  const overlay = document.createElement("div");
  overlay.id = "added-popup";
  overlay.className = "popup-carrito"; // MISMO overlay que el carrito

  // Panel con el mismo estilo que el carrito
  const panel = document.createElement("div");
  panel.className = "carrito-modal";
  panel.innerHTML = `
    <button class="carrito-cerrar" aria-label="Cerrar">✕</button>
    <div class="carrito-contenido">
      <p class="popup-msg">Se ha añadido al carrito</p>
      <button class="carrito-pagar" type="button">Cerrar</button>
    </div>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const close = () => overlay.classList.remove("is-open");
  panel.querySelector(".carrito-cerrar").addEventListener("click", close);
  panel.querySelector(".carrito-pagar").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  addedPopup = overlay;
  return addedPopup;
}

function showAddToCartPopup() {
  const el = ensureAddedPopup();
  el.classList.add("is-open");
}

function agregarAlCarrito(
  id,
  nombre,
  talla = null,
  peso = 0,
  precio = 0,
  img = ""
) {
  // añade 1 unidad del producto
  carrito.push({ id, nombre, talla, cantidad: 1, peso, precio, img });

  // popup informativo (mismo estilo que el modal del carrito)
  try {
    showAddToCartPopup();
  } catch (_) {}

  // persistencia + UI
  actualizarCarrito();
  actualizarContadorCarrito();
}

// expón la función globalmente para que otros scripts (producto.js) puedan llamarla
window.agregarAlCarrito = agregarAlCarrito;

function actualizarCarrito() {
  const listaCarrito = document.getElementById("carrito");
  if (listaCarrito) {
    listaCarrito.innerHTML = "";
    carrito.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.nombre} x ${item.cantidad}`;
      listaCarrito.appendChild(li);
    });
  }

  // 🧠 Guardar en localStorage
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

function actualizarContadorCarrito() {
  const total = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const contador = document.getElementById("carrito-count");
  if (contador) {
    contador.textContent = total;

    /*ANIMACION AL AÑADIR*/
    // 1) Añadimos la clase que dispara la animación
    contador.classList.add("boing");

    // 2) La quitamos tras terminar (0.5s coincide con la duración)
    setTimeout(() => {
      contador.classList.remove("boing");
    }, 500);
  }
}

/// === 3. RENDER + LÓGICA DE POPUP CARRITO ===

// 3.1. Calcula subtotal y peso total
// 3.1. Calcula subtotal y peso total
function calcularSubtotales(carrito) {
  return carrito.reduce(
    (acc, item) => {
      acc.subtotal += item.precio * item.cantidad;
      acc.pesoTotal += item.peso * item.cantidad;
      return acc;
    },
    { subtotal: 0, pesoTotal: 0 }
  );
}
window.calcularSubtotales = calcularSubtotales; // ← expone la función

/* === CARGA DE TARIFAS DE ENVÍO (desde envios.json) === */
let TARIFAS_ENVIO = window.TARIFAS_ENVIO || null;
const LABELS_ZONA = {
  espana: "España",
  islas: "Islas Baleares y Canarias",
  europa: "Europa",
  eeuu: "Estados Unidos",
  latam: "Latinoamérica",
  japon: "Japón",
  entrega_mano_bcn: "entrega en mano",
};
window.LABELS_ZONA = LABELS_ZONA;
const cargarTarifasEnvio = (() => {
  let promise = null;
  return function (force = false) {
    // Si ya tenemos tabla y no forzamos, devolvemos lo que hay
    if (!force && TARIFAS_ENVIO) return Promise.resolve(TARIFAS_ENVIO);
    // Si ya hay una petición en curso y no forzamos, reutilizarla
    if (!force && promise) return promise;

    const doFetch = () =>
      fetch(`data/envios.json?v=${Date.now()}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          TARIFAS_ENVIO = data;
          window.TARIFAS_ENVIO = data; // por si otras partes lo usan
          return data;
        })
        .catch((err) => {
          console.error("No se pudieron cargar las tarifas de envío:", err);
          // Mantener lo que hubiera para no romper el flujo
          TARIFAS_ENVIO = window.TARIFAS_ENVIO || {};
          return TARIFAS_ENVIO;
        });

    // Si forzamos, no memorizamos la promesa
    return force ? doFetch() : (promise = doFetch());
  };
})();

window.cargarTarifasEnvio = cargarTarifasEnvio;

// === Cálculo de envío centralizado (lee de window.TARIFAS_ENVIO) ===
window.calcularEnvioCoste = function (peso, zona) {
  if (!zona) return null;
  if (zona === "entrega_mano_bcn") return 0;

  // Todos los pesos del catálogo están en GRAMOS → convertir SIEMPRE a KG
  var pesoKg = (Number(peso) || 0) / 1000;

  

  // Rangos: 0 (≤1kg), 1 (≤2.5kg), 2 (>2.5kg)
  var rango = pesoKg <= 1 ? 0 : pesoKg <= 2.5 ? 1 : 2;

  var tablaZona = (window.TARIFAS_ENVIO && window.TARIFAS_ENVIO[zona]) || null;
  if (!tablaZona) return null;

  // Si la tabla es array: [pequeno, mediano, grande]
  if (Array.isArray(tablaZona)) {
    return typeof tablaZona[rango] === "number" ? tablaZona[rango] : null;
  }

  // Si la tabla es objeto: { pequeno|pequeño|small, mediano|medium, grande|large }
  if (typeof tablaZona === "object") {
    var small =
      tablaZona.pequeno ??
      tablaZona["pequeño"] ??
      tablaZona.small ??
      tablaZona.s;
    var medium = tablaZona.mediano ?? tablaZona.medium ?? tablaZona.m;
    var large = tablaZona.grande ?? tablaZona.large ?? tablaZona.l;
    var arr = [small, medium, large];
    return typeof arr[rango] === "number" ? arr[rango] : null;
  }

  return null;
};

// === Comisión centralizada + motor de totales unificado ===
window.FEE_RATE = 0.014; // 1.4%

// Recalcula totales a partir del carrito y la zona
// Devuelve { subtotal, pesoTotal, envio, comision, total }
window.recalcularTotales = function (carrito, zona) {
  const subtotal = carrito.reduce((s, it) => s + it.precio * it.cantidad, 0);
  const pesoTotal = carrito.reduce((s, it) => s + it.peso * it.cantidad, 0);

  const envioRaw =
    zona === "entrega_mano_bcn"
      ? 0
      : window.calcularEnvioCoste(pesoTotal, zona);
  const envio = Number.isFinite(envioRaw) ? envioRaw : 0;

  const base = subtotal + envio;
  const total = base / (1 - window.FEE_RATE);
  const comision = total * window.FEE_RATE;

  return { subtotal, pesoTotal, envio, comision, total };
};

// 3.2. Comisión (1,4%)
function calcularComision(totalSinComision) {
  return totalSinComision * 0.014;
}

// 3.3. Crea y muestra el overlay + modal

/**
 * Muestra el popup de carrito:
 * 1) Recalcula totales, 2) Crea DOM, 3) Añade listeners, 4) Inserta en body.
 */
function abrirCarrito() {
  if (document.getElementById("popup-carrito")) return;

  // 1) recalcular totales
  const { subtotal, pesoTotal } = calcularSubtotales(carrito);

  // 2) overlay y modal
  const overlay = document.createElement("div");
  overlay.id = "popup-carrito";
  overlay.className = "popup-carrito";
  const modal = document.createElement("div");
  modal.className = "carrito-modal";

  // boton cerrar
  const btnCerrar = document.createElement("button");
  btnCerrar.className = "carrito-cerrar";
  btnCerrar.textContent = "✕";
  btnCerrar.addEventListener("click", () => overlay.remove());
  modal.appendChild(btnCerrar);

  // 3) lista de productos
  const lista = document.createElement("div");
  lista.className = "carrito-lista";
  carrito.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "carrito-producto";
    div.innerHTML = `
      <img src="${item.img}" alt="${item.nombre}" class="carrito-img"/>
      <div class="carrito-info">
        <a class="carrito-nombre" href="producto.html?id=${item.id}">${
      item.nombre
    }</a>        <p class="carrito-detalles">${item.talla || ""}</p>
        <p class="carrito-precio">${(item.precio * item.cantidad).toFixed(
          2
        )}€</p>
      </div>
      <button class="carrito-eliminar">✕</button>
    `;
    div.querySelector("button").addEventListener("click", () => {
      carrito.splice(i, 1);
      localStorage.setItem("carrito", JSON.stringify(carrito));
      actualizarContadorCarrito();
      overlay.remove();
      abrirCarrito();
    });
    lista.appendChild(div);
  });
  modal.appendChild(lista);

  // 4) Suscripción NL + acciones

  // Bloque promo NL (10% descuento) + input email
  const promoNL = document.createElement("div");
  promoNL.className = "carrito-nl";
  const savedNL = (localStorage.getItem('nl_email') || '').trim().toLowerCase();
  promoNL.innerHTML = `
    <div class="carrito-nl-box">
      <p class="carrito-nl-text">¿Quieres <strong>10% de descuento</strong> en los productos? Suscríbete a la newsletter.</p>
      <div class="carrito-nl-row">
        <input id="nl-input-carrito" class="nl-input" type="email" placeholder="tu@email" value="${savedNL}">
      </div>
    </div>
  `;

  // Botones de acción alineados: SUSCRIBIRME (izq) + IR AL PAGO (dcha)
  const actions = document.createElement('div');
  actions.className = 'carrito-actions';

  const btnNL = document.createElement('button');
  btnNL.id = 'btn-nl-suscribir';
  btnNL.type = 'button';
  btnNL.className = 'btn-nl';
  btnNL.textContent = 'suscribirme';

  const btnPagar = document.createElement("button");
  btnPagar.className = "carrito-pagar";
  btnPagar.textContent = "IR AL PAGO";
  btnPagar.addEventListener("click", () => {
    window.location.href = "checkout.html";
  });

  actions.append(btnNL, btnPagar);

  // Lógica de suscripción desde el carrito (con pre-chequeo)
  const nlInput = promoNL.querySelector('#nl-input-carrito');
  function updateNLState(){
    const hasMail = (nlInput.value || '').trim().toLowerCase().length > 3;
    btnNL.classList.toggle('is-disabled', !hasMail);
    btnNL.disabled = !hasMail;
  }
  updateNLState();
  nlInput.addEventListener('input', updateNLState);

  async function markAsSubscribed(email){
    btnNL.textContent = 'ya suscrita';
    btnNL.classList.add('is-disabled');
    btnNL.disabled = true;
    localStorage.setItem('nl_email', email);
  }

  // si ya hay un email guardado, comprobar en el back (async IIFE)
  if ((savedNL || '').length > 3) {
    (async () => {
      try {
        const chk = await fetch(`${window.API_BASE}/newsletter/${encodeURIComponent(savedNL)}`).then(r=>r.json());
        if (chk && chk.suscrito) await markAsSubscribed(savedNL);
      } catch (_) {}
    })();
  }

  btnNL.addEventListener('click', async () => {
    const email = (nlInput.value || '').trim().toLowerCase();
    if (!email) return;

    // Pre-chequeo en backend para evitar duplicados
    try {
      const chk = await fetch(`${window.API_BASE}/newsletter/${encodeURIComponent(email)}`).then(r=>r.json());
      if (chk && chk.suscrito) return markAsSubscribed(email);
    } catch (_) {}

    try {
      const r = await fetch(`${window.API_BASE}/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'error');
      // feedback mínimo
      btnNL.textContent = '¡suscrita!';
      await new Promise(res=>setTimeout(res, 1000));
      await markAsSubscribed(email);
    } catch (e) {
      console.warn('No se pudo suscribir ahora');
    }
  });

  modal.append(promoNL, actions);


  // 7) montar en DOM
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// 3.4. Observer para inicializar contador sólo cuando el DOM esté listo
const observer = new MutationObserver(() => {
  const contador = document.getElementById("carrito-count");
  if (contador) {
    actualizarContadorCarrito();
    observer.disconnect();
  }
});
observer.observe(document.body, { childList: true, subtree: true });

function actualizarTotales() {
  const carrito = JSON.parse(localStorage.getItem("carrito") || "[]");
  const zona = document.getElementById("zonaDropdown")?.dataset?.selected || "";

  const { subtotal, envio, comision, total } = window.recalcularTotales(
    carrito,
    zona
  );

  // Calcular número total de ítems (sumando cantidades)
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const subtotalEl = document.getElementById("subtotal");
  const envioEl = document.getElementById("envio");
  const totalPagoEl = document.getElementById("total-pago");
  const itemsEl = document.getElementById("total-items");

  if (itemsEl) itemsEl.textContent = totalItems;
  if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2) + "€";
  if (envioEl) envioEl.textContent = envio.toFixed(2) + "€";
  if (totalPagoEl) totalPagoEl.textContent = total.toFixed(2) + "€";
}

// Exponerla globalmente
window.actualizarTotales = actualizarTotales;

// ─── Seguimiento de visitas (auto-hook por página) ───────────────────────────
(function trackPageView(){
  try {
    const pageType = document.body.dataset.pageType || "home";
    let clave = pageType;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id");

    // Acepta "producto" (ES) o "product" (EN) y añade id si está
    if ((pageType === "producto" || pageType === "product") && id) {
      clave = `producto_${id}`;
    }

    fetch(`${window.API_BASE}/visitas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave })
    })
    .then(r => { if (!r.ok) console.warn('[visitas] respuesta no OK', r.status); })
    .catch(err => console.warn('[visitas] error de red', err));
  } catch (err) {
    console.warn('[visitas] error inesperado', err);
  }
})();