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

  // 3. Calcular y mostrar totales
  const envioCoste = 0; // ajustar si se integra cálculo de envío
  document.getElementById("total-items").textContent = totalItems;
  document.getElementById("subtotal").textContent = subtotal.toFixed(2) + "€";
  document.getElementById("envio").textContent = envioCoste.toFixed(2) + "€";
  document.getElementById("total-pago").textContent =
    (subtotal + envioCoste).toFixed(2) + "€";

  // 4. Manejar envío del formulario
  // Reemplaza sólo la sección del formulario (sección 4) en checkout.js por esto:

  const stripe = Stripe(
    "pk_test_51RoOoQFQj6tWq4QNfffOAGTbBIexuM9SlmkQwRAweiulKua0pt7OqE2m5XpBxLtEQcs42NVp0LKEt2G1QVtf0s9i00kN3iJFCk"
  ); // ← Cambia aquí tu clave pública

  // Manejar envío del formulario
  const form = document.getElementById("form-checkout");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Preparar datos reales del carrito desde localStorage (ya lo tienes!)
    const carritoStripe = carrito.map((item) => ({
      nombre: item.nombre,
      precio: item.precio,
      cantidad: item.cantidad,
    }));

    // Obtienes costes ya calculados en tu lógica
    const subtotal = carrito.reduce(
      (sum, item) => sum + item.precio * item.cantidad,
      0
    );
    const zona = document.getElementById("zona-envio").value;
    const pesoTotal = carrito.reduce(
      (sum, item) => sum + item.peso * item.cantidad,
      0
    );
    const envioCoste = calcularEnvioCoste(pesoTotal, zona);
    try {
      // Crear sesión de pago en Render
      const response = await fetch(
        "https://anakatana-backend.onrender.com/crear-sesion",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carrito: carritoStripe, envio: envioCoste }),
        }
      );

      const data = await response.json();

      // Redirigir a Stripe Checkout
      await stripe.redirectToCheckout({ sessionId: data.sessionId });
    } catch (error) {
      console.error(error);
      alert("Error al procesar el pago. Intenta de nuevo.");
    }
  });

  const zonaSelect = document.getElementById("zona-envio");

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
    document.getElementById("envio").textContent = envioCoste.toFixed(2) + "€";

    const subtotal = carrito.reduce(
      (sum, item) => sum + item.precio * item.cantidad,
      0
    );
    const total = subtotal + envioCoste;

    document.getElementById("total-pago").textContent = total.toFixed(2) + "€";
  });
}
