// === 1. ESTADO DEL CARRITO ===
// Cargar última zona seleccionada de localStorage
let zonaSeleccionada = localStorage.getItem("zonaSeleccionada") || "";
const carritoGuardado = localStorage.getItem("carrito");
const carrito = carritoGuardado ? JSON.parse(carritoGuardado) : [];

// === 2. FUNCIONES DE CARRITO ===
function agregarAlCarrito(
  id,
  nombre,
  talla = null,
  peso = 0,
  precio = 0,
  img = ""
) {
  carrito.push({ id, nombre, talla, cantidad: 1, peso, precio, img });
  actualizarCarrito();
  actualizarContadorCarrito();
}

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
        <p class="carrito-nombre">${item.nombre}</p>
        <p class="carrito-detalles">${item.talla || ""}</p>
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

  // 4) sección envío
  const envioWrapper = document.createElement("div");
  envioWrapper.className = "carrito-envio";
  envioWrapper.innerHTML = `
    <label for="envio-zona">Estimar envío</label>
    <select id="envio-zona">
      <option value=>elige zona</option>
      <option value="espana">España</option>
      <option value="islas">Islas</option>
      <option value="europa">Europa</option>
      <option value="eeuu">EEUU</option>
      <option value="latam">LATAM</option>
      <option value="japon">Japón</option>
    </select>
    <p id="envio-estimado"></p>
  `;

  // — aquí fijamos la zona que hubiera quedado la última vez —
  if (zonaSeleccionada) {
    envioWrapper.querySelector("#envio-zona").value = zonaSeleccionada;
    envioWrapper
      .querySelector("#envio-zona")
      // Disparamos manualmente 'change' para recalcular total con la zona anterior
      .dispatchEvent(new Event("change"));
  }

  modal.appendChild(envioWrapper);

  // 5) texto de totales + botón pago
  const resumen = document.createElement("p");
  resumen.className = "carrito-total";
  resumen.textContent = `Total productos: ${subtotal.toFixed(2)}€`;
  const btnPagar = document.createElement("button");
  btnPagar.className = "carrito-pagar";
  btnPagar.textContent = "IR AL PAGO";
  btnPagar.addEventListener("click", () => {
    window.location.href = "checkout.html";
  });
  modal.append(resumen, btnPagar);

  // 6) listener de cambio de zona (¡antes de disparar el evento!)
  const selectZona = envioWrapper.querySelector("#envio-zona");
  selectZona.addEventListener("change", (e) => {
    zonaSeleccionada = e.target.value; // guardamos
    // Guardar zona seleccionada para persistencia
    localStorage.setItem("zonaSeleccionada", zonaSeleccionada);
    const coste = calcularEnvioCoste(pesoTotal, zonaSeleccionada);
    const textoEnvio = envioWrapper.querySelector("#envio-estimado");
    if (coste !== null) {
      textoEnvio.textContent = `Envío estimado: ${coste.toFixed(2)}€`;
      resumen.textContent = `Total estimado: ${(subtotal + coste).toFixed(2)}€`;
    } else {
      textoEnvio.textContent = "";
      resumen.textContent = `Total productos: ${subtotal.toFixed(2)}€`;
    }
  });

  // Ahora sí reponemos la zona anterior y forzamos el cálculo
  if (zonaSeleccionada) {
    selectZona.value = zonaSeleccionada;
    selectZona.dispatchEvent(new Event("change"));
  }

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

  const { subtotal, pesoTotal } = calcularSubtotales(carrito);
  const envioCoste = calcularEnvioCoste(pesoTotal, zona) || 0;

  const totalSinComision = subtotal + envioCoste;
  const comision = totalSinComision * 0.014;
  const totalConComision = totalSinComision + comision;

  // Calcular número total de ítems (sumando cantidades)
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  document.getElementById("total-items").textContent = totalItems;
  document.getElementById("subtotal").textContent = subtotal.toFixed(2) + "€";
  document.getElementById("envio").textContent = envioCoste.toFixed(2) + "€";
  document.getElementById("total-pago").textContent = totalConComision.toFixed(2) + "€";
}

// Exponerla globalmente
window.actualizarTotales = actualizarTotales;