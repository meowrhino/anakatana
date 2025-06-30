window.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get("id"));
  const contenedor = document.getElementById("producto-container");

  if (!id) {
    contenedor.innerHTML = "<p class='error'>Producto no encontrado.</p>";
    return;
  }

  try {
    const respuesta = await fetch("./productos.json");
    const productos = await respuesta.json();
    const producto = productos.find((p) => p.id === id);

    if (!producto) {
      contenedor.innerHTML = "<p class='error'>Producto no disponible.</p>";
      return;
    }

    const estaRebajado =
      producto.precio_original && producto.precio_original > producto.precio;
    const estaAgotado = producto.soldOut === "si" || producto.stock === 0;

    // Texto constante
    const makingTime = `All products are handmade and individually made ^^* so they take between 2 and 4 weeks to make depending on the number of orders. We appreciate your support <3`;

    // Tallas
    const tallas = producto.tallas?.length
      ? `<p class="medidas">${producto.tallas
          .map((t, i) => {
            const supNumero = `<sup>${i + 1}</sup>`;
            const esModelo = t.id === producto.tallaModelo;
            const supModelo = esModelo ? `<sup>model</sup>` : "";
            return `${supNumero}${t.descripcion}${supModelo}`;
          })
          .join(" <br> ")}</p>`
      : "";

    // Colección
    const coleccion = producto["colección"]
      ? `<p class="coleccion">${producto["colección"]}<sup>collection</sup></p>`
      : "";

    // Botón o mensaje según stock
    const botonCarrito = !estaAgotado
      ? `<button class="btn-añadir-carrito">Añadir al carrito</button>`
      : `<p class="agotado-msg">Este producto está agotado.</p>`;

    // HTML principal
    contenedor.innerHTML = `
      <div class="producto-layout">
        <div class="producto-img-container">
          <img src="${producto.img}" alt="${
      producto.titulo
    }" class="producto-img" />
        </div>
        <div class="producto-info">
          <div class="home_titulo_precio">
            <span class="titulo">${producto.titulo}</span>
            <p class="precio">
              ${
                estaRebajado
                  ? `<span class="precio--rebajado">${producto.precio}€</span>
                     <span class="precio--tachado">${producto.precio_original}€</span>`
                  : `${producto.precio}€`
              }
            </p>
          </div>
          <p class="descripcion">${producto.descripcion}</p>
          ${tallas}
          ${coleccion}
          <p class="making-time">${makingTime}</p>
          ${botonCarrito}
        </div>
      </div>
    `;
  } catch (e) {
    contenedor.innerHTML = "<p class='error'>Error al cargar el producto.</p>";
  }
});
