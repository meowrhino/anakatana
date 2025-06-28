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

function actualizarContadorCarrito() {
  const total = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const contador = document.getElementById("carrito-count");
  if (contador) {
    contador.textContent = total;
  }
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
