// checkout.js - lógica de la página Checkout

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
  const form = document.getElementById("form-checkout");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    // Aquí puedes enviar los datos a tu servidor
    alert(
      `¡Gracias por tu compra, ${form.nombre.value}!\nTotal: ${(
        subtotal + envioCoste
      ).toFixed(2)}€`
    );
    localStorage.removeItem("carrito");
    window.location.href = "index.html";
  });
}
