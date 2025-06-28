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
    const producto = productos.find(p => p.id === id);

    if (!producto) {
      contenedor.innerHTML = "<p class='error'>Producto no disponible.</p>";
      return;
    }

    const estaRebajado = producto.precio_original && producto.precio_original > producto.precio;

    contenedor.innerHTML = `
      <div class="producto-detalle">
        <img src="${producto.img}" alt="${producto.titulo}" class="producto-img" />
        <h1>${producto.titulo}</h1>
        <p class="descripcion">${producto.descripcion_larga || producto.descripcion_corta || "Sin descripción"}</p>
        <p class="precio">
          ${estaRebajado ? `<span class="precio--rebajado">${producto.precio}€</span>
          <span class="precio--tachado">${producto.precio_original}€</span>` : `${producto.precio}€`}
        </p>
        <button class="btn-añadir-carrito">Añadir al carrito</button>
      </div>
    `;
  } catch (e) {
    contenedor.innerHTML = "<p class='error'>Error al cargar el producto.</p>";
  }
});