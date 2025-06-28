async function cargarProductos() {
  const respuesta = await fetch("./productos.json");
  const productos = await respuesta.json();
  const contenedor = document.getElementById("productos-container");

  productos.forEach((producto) => {
    const divProducto = document.createElement("div");
    divProducto.className = "producto";

    const estaAgotado = producto.soldOut === "si" || producto.stock === 0;
    const enRebajas = producto.rebajas === "si" && producto.precioRebajas;

    // Imagen
    let imagenHTML = "";
    if (producto.img) {
      if (estaAgotado) {
        imagenHTML = `<img src="${producto.img}" alt="${producto.titulo}" class="img--soldout">`;
      } else {
        imagenHTML = `<img src="${producto.img}" alt="${producto.titulo}">`;
      }
    } else {
      imagenHTML = `<div class="no-data">no data</div>`;
    }

    // Título
    let tituloHTML = `<span class="titulo">${producto.titulo}</span>`;

    // Precio
    let precioHTML = "";
    if (enRebajas) {
      console.log("Producto en rebajas:", producto.titulo);
      precioHTML = `<span class="precio precio--tachado">${producto.precio}€</span><span class="rebaja">${" " + producto.precioRebajas}€</span>`;
    } else {
      precioHTML = `<span class="precio">${producto.precio}€</span>`;
    }

    divProducto.innerHTML = `
      ${imagenHTML}
      <div class="home_titulo_precio">
        ${tituloHTML}
        ${precioHTML}
        </div>
        <p class="descripcion_corta">${producto.descripcion_corta}</p>
    `;

    if (!estaAgotado) {
      divProducto.addEventListener("click", () => {
        window.location.href = `producto.html?id=${producto.id}`;
      });
    }

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
  actualizarContadorCarrito(); // 👈 se actualiza el número arriba
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

function actualizarContadorCarrito() {
  const total = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const contador = document.getElementById("carrito-count");
  if (contador) {
    contador.textContent = total;
  }
}