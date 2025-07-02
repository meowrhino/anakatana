// === 1. ESTADO DEL CARRITO ===
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
  const productoEnCarrito = carrito.find(
    (p) => p.id === id && p.talla === talla
  );
  if (productoEnCarrito) {
    productoEnCarrito.cantidad++;
  } else {
    carrito.push({ id, nombre, talla, cantidad: 1, peso, precio, img });
  }
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
  }
}

function abrirCarrito() {
  if (document.getElementById("popup-carrito")) return;

  const overlay = document.createElement("div");
  overlay.id = "popup-carrito";
  overlay.className = "popup-carrito";

  const modal = document.createElement("div");
  modal.className = "carrito-modal";

  const cerrarBtn = document.createElement("button");
  cerrarBtn.className = "carrito-cerrar";
  cerrarBtn.textContent = "✕";
  cerrarBtn.addEventListener("click", () => overlay.remove());

  const lista = document.createElement("div");
  lista.className = "carrito-lista";

  let pesoTotal = 0;
  let subtotal = 0;

  carrito.forEach((item) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "carrito-producto";

    const img = document.createElement("img");
    img.src = item.img;
    img.alt = item.nombre;
    img.className = "carrito-img";

    const info = document.createElement("div");
    info.className = "carrito-info";
    info.innerHTML = `
      <p class="carrito-nombre">${item.nombre}</p>
      <p class="carrito-detalles">${item.talla ? `size: ${item.talla}` : ""}</p>
      <p class="carrito-precio">${item.cantidad} × ${item.precio.toFixed(
      2
    )}€</p>
    `;

    subtotal += item.precio * item.cantidad;
    pesoTotal += item.peso * item.cantidad;

    itemDiv.appendChild(img);
    itemDiv.appendChild(info);
    lista.appendChild(itemDiv);
  });

  const envioWrapper = document.createElement("div");
  envioWrapper.className = "carrito-envio";
  envioWrapper.innerHTML = `
    <label for="envio-zona">estimar envío</label>
    <select id="envio-zona">
      <option value="">elige zona</option>
      <option value="espana">España</option>
      <option value="islas">Islas</option>
      <option value="europa">Europa</option>
      <option value="eeuu">EEUU</option>
      <option value="latam">LATAM</option>
      <option value="japon">Japón</option>
    </select>
    <p id="envio-estimado"></p>
  `;

  const totalTexto = document.createElement("p");
  totalTexto.className = "carrito-total";
  totalTexto.textContent = `Total productos: ${subtotal.toFixed(2)}€`;

  const btnPagar = document.createElement("button");
  btnPagar.className = "carrito-pagar";
  btnPagar.textContent = "PAGAR";

  modal.appendChild(cerrarBtn);
  modal.appendChild(lista);
  modal.appendChild(envioWrapper);
  modal.appendChild(totalTexto);
  modal.appendChild(btnPagar);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Lógica de cálculo de envío
  document.getElementById("envio-zona").addEventListener("change", (e) => {
    const zona = e.target.value;
    const precios = {
      espana: [4, 6, 8],
      islas: [6, 8, 10],
      europa: [8, 10, 14],
      eeuu: [12, 16, 22],
      latam: [10, 14, 20],
      japon: [14, 18, 26],
    };

    let rango = 0;
    if (pesoTotal <= 1) rango = 0;
    else if (pesoTotal <= 2.5) rango = 1;
    else rango = 2;

    const precio = precios[zona]?.[rango];
    const envioTexto = document.getElementById("envio-estimado");
    if (precio != null) {
      envioTexto.textContent = `Envío estimado: ${precio.toFixed(2)}€`;
      totalTexto.textContent = `Total estimado: ${(subtotal + precio).toFixed(
        2
      )}€`;
    } else {
      envioTexto.textContent = "";
      totalTexto.textContent = `Total productos: ${subtotal.toFixed(2)}€`;
    }
  });
}

// Para asegurarse que el contador se actualiza cuando ya se haya creado en el DOM
const observer = new MutationObserver(() => {
  const contador = document.getElementById("carrito-count");
  if (contador) {
    actualizarContadorCarrito();
    observer.disconnect();
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// === 4. OPCIONAL: ENVÍO DE PEDIDO (a futuro) ===

/*
document.getElementById("hacer-pedido").addEventListener("click", async () => {
  if (carrito.length === 0) {
    alert("El carrito está vacío.");
    return;
  }

  const pedido = {
    carrito: carrito.map(({ id, cantidad }) => ({ id, cantidad })),
  };

  const respuesta = await fetch("http://localhost:3000/pedido", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pedido),
  });

  const resultado = await respuesta.json();

  if (resultado.success) {
    alert(resultado.mensaje);
    carrito.length = 0; // Vaciar carrito tras pedido exitoso
    actualizarCarrito();
  } else {
    alert("Hubo un error al realizar el pedido.");
  }
});

*/
