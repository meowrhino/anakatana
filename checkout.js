document.addEventListener("DOMContentLoaded", initCheckout);

function initCheckout() {
  // 1. Obtener carrito de localStorage

  const lista = document.getElementById("lista-carrito");
  lista.innerHTML = "";
  let subtotal = 0;
  let totalItems = 0;

  // 2. Renderizar ítems del carrito
  carrito.forEach((item, index) => {
    totalItems += item.cantidad;
    const itemTotal = item.precio * item.cantidad;
    subtotal += itemTotal;

    const row = document.createElement("div");
    row.className = "checkout-item";
    row.innerHTML = `
  <div class="checkout-item-info">
    <img src="${item.img}" alt="${item.nombre}" class="checkout-img">
    <div>
      <p>${item.nombre}</p>
      <p>${item.talla ? "" + item.talla : ""}</p>
        <div class="checkout-item-actions">
    <button class="btn-ver">Ver</button>
    <button class="btn-eliminar">Eliminar</button>
  </div>
    </div>
  </div>
  <p class="checkout-item-total">${itemTotal.toFixed(2)}€</p>
  <!-- ← AÑADIDO: acciones Ver / Eliminar -->

`;

    // En checkout.js, debajo de row.innerHTML = `…`;
    row.querySelector(".btn-ver").addEventListener("click", () => {
      window.location.href = `producto.html?id=${item.id}`;
    });
    row.querySelector(".btn-eliminar").addEventListener("click", () => {
      carrito.splice(index, 1);
      actualizarCarrito();
      actualizarContadorCarrito();
      initCheckout();
    });
    lista.appendChild(row);
  });

  // 3. Calcular y mostrar totales (sin comisión hasta seleccionar zona)
  const envioCoste = 0; // envío por defecto sin elegir zona
  document.getElementById("total-items").textContent = totalItems;
  document.getElementById("subtotal").textContent = subtotal.toFixed(2) + "€";
  document.getElementById("envio").textContent = "n/a";
  document.getElementById("comision").textContent = "n/a"; // comisión en cero hasta selección
  document.getElementById("total-pago").textContent = subtotal.toFixed(2) + "€";

  // 4. Manejar envío del formulario
  // Reemplaza sólo la sección del formulario (sección 4) en checkout.js por esto:

  const stripe = Stripe(
    "pk_test_51RoOoQFQj6tWq4QNfffOAGTbBIexuM9SlmkQwRAweiulKua0pt7OqE2m5XpBxLtEQcs42NVp0LKEt2G1QVtf0s9i00kN3iJFCk"
  ); // ← Cambia aquí tu clave pública

  // Manejar envío del formulario
  // 4. Manejar envío del formulario
  const form = document.getElementById("form-checkout");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (
        !form.elements["nombre"] ||
        !form.elements["direccion"] ||
        !form.elements["ciudad"] ||
        !form.elements["pais"]
      ) {
        alert(
          "Faltan campos obligatorios en el formulario. Por favor, revisa el HTML."
        );
        return;
      }

      // Recoger datos de dirección del formulario
      const addressData = {
        nombreCliente: form.elements["nombre"].value,
        direccion: form.elements["direccion"].value,
        ciudad: form.elements["ciudad"].value,
        pais: form.elements["pais"].value,
      };

      if (
        !addressData.nombreCliente ||
        !addressData.direccion ||
        !addressData.ciudad ||
        !addressData.pais
      ) {
        alert(
          "Por favor, rellena todos los campos de dirección antes de continuar."
        );
        return;
      }

      // Preparar datos reales del carrito...
      const carritoStripe = carrito.map((item) => ({
        nombre: item.nombre,
        precio: item.precio,
        cantidad: item.cantidad,
      }));

      // Recalcula subtotal y envío
      subtotal = carrito.reduce(
        (sum, item) => sum + item.precio * item.cantidad,
        0
      );
      const zona = document.getElementById("zonaDropdown").dataset.selected;
      const pesoTotal = carrito.reduce(
        (sum, item) => sum + item.peso * item.cantidad,
        0
      );
      const envioCoste = calcularEnvioCoste(pesoTotal, zona);

      try {
        const response = await fetch(
          "https://anakatana-backend.onrender.com/crear-sesion",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              carrito: carritoStripe,
              envio: envioCoste,
              // 1️⃣ Calculamos la comisión para cubrir la tarifa de Stripe
              comision: (() => {
                const feeRate = 0.014;
                const baseTotal = subtotal + envioCoste;
                const totalWithFee = baseTotal / (1 - feeRate);
                return totalWithFee * feeRate;
              })(),
              direccion: addressData,
              fecha: new Date().toISOString(),
            }),
          }
        );
        const data = await response.json();

        // 2️⃣ Guardamos un registro local para “gracias.js”
        // Preparar datos para registro: solo talla por ítem y cálculo de precios en hora local
        const carritoRecord = carrito.map(item => ({
          nombre: item.nombre,
          talla: item.talla || null
        }));
        // Calcular precios
        const subtotalProductos = subtotal;
        const precioEnvio = envioCoste;
        const feeRate = 0.014;
        const baseTotal = subtotalProductos + precioEnvio;
        const totalConComision = baseTotal / (1 - feeRate);
        const precioComision = totalConComision * feeRate;
        const totalPago = subtotalProductos + precioEnvio + precioComision;
        // ID con hora local de Barcelona
        const now = new Date();
        const idLocal = [
          now.getFullYear(),
          String(now.getMonth()+1).padStart(2,'0'),
          String(now.getDate()).padStart(2,'0'),
          String(now.getHours()).padStart(2,'0'),
          String(now.getMinutes()).padStart(2,'0'),
          String(now.getSeconds()).padStart(2,'0')
        ].join('');
        // 🚩 Guarda el registro para gracias.js
        const purchaseRecord = {
          id: idLocal,
          carrito: carritoRecord,
          precioProductos: subtotalProductos.toFixed(2),
          precioEnvio: precioEnvio.toFixed(2),
          precioComision: precioComision.toFixed(2),
          total: totalPago.toFixed(2),
          direccion: addressData,
          fecha: new Date().toISOString(),
          sessionId: data.sessionId
        };

        // Guardar registro antes de redirigir
        localStorage.setItem("purchaseRecord", JSON.stringify(purchaseRecord));
        await stripe.redirectToCheckout({ sessionId: data.sessionId });
      } catch (error) {
        console.error(error);
        alert("Error al procesar el pago. Intenta de nuevo.");
      }
    }); // cierra form.addEventListener
  } else {
    console.warn("No se encontró el formulario de checkout.");
  }

  const zonaSelect = document.getElementById("zona-envio");
  if (zonaSelect) {
    zonaSelect.addEventListener("change", () => {
      const zona = zonaSelect.value;
      if (!zona) return;

      // Calcular peso total
      const pesoTotal = carrito.reduce(
        (sum, item) => sum + item.peso * item.cantidad,
        0
      );

      // Calcular nuevo coste de envío
      const envioCoste = calcularEnvioCoste(pesoTotal, zona);

      // Actualizar DOM
      document.getElementById("envio").textContent =
        envioCoste.toFixed(2) + "€";

      const subtotal = carrito.reduce(
        (sum, item) => sum + item.precio * item.cantidad,
        0
      );
      const feeRate = 0.014;
      const baseTotal = subtotal + envioCoste;
      const total = baseTotal / (1 - feeRate);
      const comision = total * feeRate;
      document.getElementById("comision").textContent =
        comision.toFixed(2) + "€";
      document.getElementById("total-pago").textContent =
        total.toFixed(2) + "€";
    });
  }
}

// ---- Dropdown personalizado para zona de envío ----
document.addEventListener("DOMContentLoaded", () => {
  const dropdown = document.getElementById("zonaDropdown");
  if (!dropdown) return;

  const toggle = dropdown.querySelector(".dropdown-toggle");
  const menu = document.getElementById("zonaOpciones");

  if (!toggle || !menu) return;

  // Poblar las opciones desde TARIFAS_ENVIO
  menu.innerHTML = "";
  Object.keys(TARIFAS_ENVIO).forEach((zona) => {
    const option = document.createElement("div");
    option.className = "dropdown-option";
    option.textContent = zona;
    option.dataset.value = zona;
    menu.appendChild(option);
  });

  // Toggle menú
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  // Cerrar al clicar fuera
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });

  // Selección de zona
  menu.addEventListener("click", (e) => {
    if (e.target.classList.contains("dropdown-option")) {
      const zona = e.target.dataset.value;
      toggle.textContent = zona;
      dropdown.dataset.selected = zona;
      dropdown.classList.remove("open");

      localStorage.setItem("zonaSeleccionada", zona);

      // Recalcular totales
      const pesoTotal = carrito.reduce(
        (sum, item) => sum + item.peso * item.cantidad,
        0
      );
      const envioCoste = calcularEnvioCoste(pesoTotal, zona);
      const subtotal = carrito.reduce(
        (sum, item) => sum + item.precio * item.cantidad,
        0
      );
      const feeRate = 0.014;
      const baseTotal = subtotal + envioCoste;
      const total = baseTotal / (1 - feeRate);
      const comision = total * feeRate; // 1.4% de la transacción total
      document.getElementById("envio").textContent =
        envioCoste.toFixed(2) + "€";
      document.getElementById("comision").textContent =
        comision.toFixed(2) + "€";
      document.getElementById("total-pago").textContent =
        total.toFixed(2) + "€";
    }
  });
});
