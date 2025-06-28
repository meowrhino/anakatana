async function cargarProductos() {
  const respuesta = await fetch("./productos.json");
  const productos = await respuesta.json();
  const contenedor = document.getElementById("productos-container");

  productos.forEach((producto) => {
    const divProducto = document.createElement("div");
    divProducto.className = "producto";

    // Imagen o placeholder
    const imagenHTML = producto.img
      ? `<img src="${producto.img}" alt="${producto.titulo}">`
      : `<div class="no-data">no data</div>`;

    divProducto.innerHTML = `
      ${imagenHTML}
      <div class="home_titulo_precio">
        <span class="titulo">${producto.titulo}</span>
        <span class="precio">${producto.precio}€</span>
        </div>
        <p class="descripcion_corta">${producto.descripcion_corta}</p>
    `;

    // Evento click: lleva a la página de producto (puedes ajustar el link más adelante)
    divProducto.addEventListener("click", () => {
      window.location.href = `producto.html?id=${producto.id}`;
    });

    contenedor.appendChild(divProducto);
    activarDescripcionHover(divProducto); // 👈 ¡Aquí faltaba esto!
  });
}

document.addEventListener("DOMContentLoaded", cargarProductos);

const carrito = [];

function agregarAlCarrito(id, nombre) {
  const productoEnCarrito = carrito.find((p) => p.id === id);
  if (productoEnCarrito) {
    productoEnCarrito.cantidad++;
  } else {
    carrito.push({ id, nombre, cantidad: 1 });
  }
  actualizarCarrito();
}

function actualizarCarrito() {
  const listaCarrito = document.getElementById("carrito");
  listaCarrito.innerHTML = "";
  carrito.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.nombre} x ${item.cantidad}`;
    listaCarrito.appendChild(li);
  });
}

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

function activarDescripcionHover(productoElemento) {
  const descripcion = productoElemento.querySelector(".descripcion_corta");

  productoElemento.addEventListener("mouseenter", () => {
    descripcion.classList.add("show");
  });

  productoElemento.addEventListener("mouseleave", () => {
    descripcion.classList.remove("show");
  });
}
