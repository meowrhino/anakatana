(function () {
  document.addEventListener("DOMContentLoaded", initCheckout);

  // Usar las funciones y constantes ya definidas en app.js
  const LABELS_ZONA = window.LABELS_ZONA;
  const cargarTarifasEnvio = window.cargarTarifasEnvio;

  const FEE_RATE = window.FEE_RATE || 0.014;

  const NL_RATE = 0.10; // 10% sobre subtotal de productos
  function isNLEnabled() {
    const emailEl = document.getElementById('email');
    const chk = document.getElementById('nl-check');
    const saved = (localStorage.getItem('nl_email') || '').trim().toLowerCase();
    const email = (emailEl?.value || '').trim().toLowerCase();
    return (chk && chk.checked) || (email && saved && saved === email);
  }
  function applyNL(subtotal) {
    return isNLEnabled() ? Math.max(0, subtotal * (1 - NL_RATE)) : subtotal;
  }

  function initCheckout() {
    // 1. Obtener carrito de localStorage

    // Código postal solo números (campo 'cp')
    const cpInput = document.getElementById('cp');
    if (cpInput) {
      cpInput.addEventListener('input', (e) => {
        const digits = e.target.value.replace(/\D+/g, '');
        if (e.target.value !== digits) e.target.value = digits;
      });
      cpInput.setAttribute('inputmode', 'numeric');
      cpInput.setAttribute('pattern', '\\d*');
    }
    

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
      <a class="checkout-nombre" href="producto.html?id=${item.id}">${item.nombre}</a>
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
    const subtotalNL = applyNL(subtotal);
    document.getElementById("subtotal").textContent = subtotalNL.toFixed(2) + "€";
    document.getElementById("envio").textContent = "n/a";
    document.getElementById("comision").textContent = "n/a"; // comisión en cero hasta selección
    document.getElementById("total-pago").textContent = subtotalNL.toFixed(2) + "€";

    // 4. Manejar envío del formulario
    const stripe = Stripe(
      "pk_live_51Ls6nCLPcSoTiWwr0uMBdMDIRslS0tE6s09Rm4LOMc5UZwU1FexkUIuHfogQcVJCTcyIjZxKKtVsY4SHZE0Zykk500bPU7IDAd"
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
          !form.elements["cp"] ||
          !form.elements["pais"] ||
          !form.elements["email"]
        ) {
          alert(
            "Faltan campos obligatorios en el formulario. Por favor, revisa el HTML."
          );
          return;
        }

        // Recoger datos de dirección del formulario
        const addressData = {
          email: form.elements["email"]?.value,
          nombreCliente: form.elements["nombre"].value,
          direccion: form.elements["direccion"].value,
          cp: form.elements["cp"].value,
          pais: form.elements["pais"].value,
        };

        if (
          !addressData.nombreCliente ||
          !addressData.direccion ||
          !addressData.cp ||
          !addressData.pais ||
          !addressData.email
        ) {
          alert(
            "Por favor, rellena todos los campos de dirección antes de continuar."
          );
          return;
        }

        // Recalcula subtotal y envío
        subtotal = carrito.reduce(
          (sum, item) => sum + item.precio * item.cantidad,
          0
        );
        const zona = document.getElementById("zonaDropdown").dataset.selected;
        if (!zona) {
          alert("Selecciona una zona de envío antes de continuar.");
          return;
        }
        const pesoTotal = carrito.reduce(
          (sum, item) => sum + item.peso * item.cantidad,
          0
        );
        await cargarTarifasEnvio(true);
        const envioRaw = window.calcularEnvioCoste(pesoTotal, zona);
        const envioCoste = Number.isFinite(envioRaw) ? envioRaw : 0;

        // Newsletter: aplicar 10% sobre subtotal si procede y suscribir si la casilla está activa
        const nlChecked = !!document.getElementById('nl-check')?.checked;
        const emailForNL = (form.elements["email"]?.value || "").trim().toLowerCase();
        if (nlChecked && emailForNL) {
          try {
            await fetch(`${window.API_BASE}/newsletter`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: emailForNL })
            });
            localStorage.setItem('nl_email', emailForNL);
          } catch (_) {
            // silencioso
          }
        }
        const subtotalConNL = isNLEnabled() ? subtotal * (1 - NL_RATE) : subtotal;

        // Preparar datos del carrito para Stripe con precio unitario ya ajustado si NL aplica
        const discountFactor = isNLEnabled() ? (1 - NL_RATE) : 1;
        const carritoStripe = carrito.map((item) => ({
          nombre: item.nombre,
          precio: Number((item.precio * discountFactor).toFixed(2)),
          cantidad: item.cantidad,
        }));

        try {
          const response = await fetch(
            `${window.API_BASE}/crear-sesion`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                carrito: carritoStripe,
                envio: envioCoste,
                // 1️⃣ Calculamos la comisión para cubrir la tarifa de Stripe
                comision: (() => {
                  const baseTotal = subtotalConNL + envioCoste;
                  const totalWithFee = baseTotal / (1 - FEE_RATE);
                  return totalWithFee * FEE_RATE;
                })(),
                direccion: addressData,
            email: addressData.email,
                fecha: new Date().toISOString(),
              }),
            }
          );
          const data = await response.json();

          // 2️⃣ Guardamos un registro local para “gracias.js”
          // Preparar datos para registro: solo talla por ítem y cálculo de precios en hora local
          const carritoRecord = carrito.map((item) => ({
            nombre: item.nombre,
            talla: item.talla || null,
          }));
          // Calcular precios
          const subtotalProductos = subtotalConNL;
          const precioEnvio = envioCoste;
          const baseTotal = subtotalProductos + precioEnvio;
          const totalConComision = baseTotal / (1 - FEE_RATE);
          const precioComision = totalConComision * FEE_RATE;
          const totalPago = subtotalProductos + precioEnvio + precioComision;
          // ID con hora local de Barcelona
          const now = new Date();
          const idLocal = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0"),
            String(now.getHours()).padStart(2, "0"),
            String(now.getMinutes()).padStart(2, "0"),
            String(now.getSeconds()).padStart(2, "0"),
          ].join("");
          // 🚩 Guarda el registro para gracias.js
          const purchaseRecord = {
            id: idLocal,
            carrito: carritoRecord,
            precioProductos: subtotalProductos.toFixed(2),
            precioEnvio: precioEnvio.toFixed(2),
            precioComision: precioComision.toFixed(2),
            total: totalPago.toFixed(2),
            direccion: addressData,
            email: addressData.email,
            fecha: new Date().toISOString(),
            sessionId: data.sessionId,
          };

          // Guardar registro antes de redirigir
          localStorage.setItem(
            "purchaseRecord",
            JSON.stringify(purchaseRecord)
          );
          await stripe.redirectToCheckout({ sessionId: data.sessionId });
        } catch (error) {
          console.error(error);
          alert("Error al procesar el pago. Intenta de nuevo.");
        }
      }); // cierra form.addEventListener
    } else {
      console.warn("No se encontró el formulario de checkout.");
    }

  }

  // Helper para recalcular totales al elegir zona (para dropdown)
  function actualizarTotalesCheckout(zona) {
    if (!zona) return;
    const st = carrito.reduce((s, it) => s + it.precio * it.cantidad, 0);
    const subtotal = applyNL(st);
    const pesoTotal = carrito.reduce((s, it) => s + it.peso * it.cantidad, 0);
    const envioCoste = window.calcularEnvioCoste(pesoTotal, zona) || 0;
    const baseTotal = subtotal + envioCoste;
    const total = baseTotal / (1 - FEE_RATE);
    const comision = total * FEE_RATE;

    // Actualizar DOM
    const envioEl = document.getElementById("envio");
    const comisionEl = document.getElementById("comision");
    const totalEl = document.getElementById("total-pago");
    if (envioEl) envioEl.textContent = `${envioCoste.toFixed(2)}€`;
    if (comisionEl) comisionEl.textContent = `${comision.toFixed(2)}€`;
    if (totalEl) totalEl.textContent = `${total.toFixed(2)}€`;
  }

  // ---- Dropdown personalizado para zona de envío ----
  document.addEventListener("DOMContentLoaded", () => {
    const dropdown = document.getElementById("zonaDropdown");
    if (!dropdown) return;

    const toggle = dropdown.querySelector(".dropdown-toggle");
    const menu = document.getElementById("zonaOpciones");

    if (!toggle || !menu) return;

    // Poblar opciones desde envios.json
    menu.innerHTML = "";
    cargarTarifasEnvio(true).then(() => {
      const zonas = Object.keys(window.TARIFAS_ENVIO || {});
      // Poner entrega en mano primero
      zonas.sort((a, b) =>
        a === "entrega_mano_bcn"
          ? -1
          : b === "entrega_mano_bcn"
          ? 1
          : a.localeCompare(b)
      );
      zonas.forEach((zona) => {
        const option = document.createElement("div");
        option.className = "dropdown-option";
        const label =
          (LABELS_ZONA && LABELS_ZONA[zona]) || zona.replace(/_/g, " ");
        option.textContent = label;
        option.dataset.value = zona;
        menu.appendChild(option);
      });

      // Preseleccionar si hay una zona guardada válida
      const prevZona = localStorage.getItem("zonaSeleccionada");
      if (prevZona && window.TARIFAS_ENVIO && window.TARIFAS_ENVIO[prevZona]) {
        const prevLabel =
          (LABELS_ZONA && LABELS_ZONA[prevZona]) || prevZona.replace(/_/g, " ");
        toggle.textContent = prevLabel;
        dropdown.dataset.selected = prevZona;
        actualizarTotalesCheckout(prevZona);
      }
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
        const nice =
          (LABELS_ZONA && LABELS_ZONA[zona]) || zona.replace(/_/g, " ");
        toggle.textContent = nice;
        dropdown.dataset.selected = zona;
        dropdown.classList.remove("open");
        localStorage.setItem("zonaSeleccionada", zona);

        // Recalcular totales con helper
        actualizarTotalesCheckout(zona);
      }
    });
  });

  const nlCheck = document.getElementById('nl-check');
  const emailEl = document.getElementById('email');
  // Auto-check NL si el email ya está suscrito en backend
  if (emailEl) {
    emailEl.addEventListener('blur', async () => {
      const em = (emailEl.value || '').trim().toLowerCase();
      if (!em) return;
      try {
        const r = await fetch(`${window.API_BASE}/newsletter/${encodeURIComponent(em)}`);
        const j = await r.json();
        if (j && j.suscrito) {
          localStorage.setItem('nl_email', em);
          if (nlCheck) nlCheck.checked = true;
          recomputeTotalsLive();
        }
      } catch (_) {}
    });
  }
  function recomputeTotalsLive(){
    const zona = document.getElementById('zonaDropdown')?.dataset?.selected || '';
    if (zona) actualizarTotalesCheckout(zona); else {
      const st = carrito.reduce((s, it) => s + it.precio * it.cantidad, 0);
      const stNL = applyNL(st);
      document.getElementById('subtotal').textContent = stNL.toFixed(2) + '€';
      document.getElementById('total-pago').textContent = stNL.toFixed(2) + '€';
    }
  }
  if (nlCheck) nlCheck.addEventListener('change', recomputeTotalsLive);
  if (emailEl) emailEl.addEventListener('input', recomputeTotalsLive);
})();
