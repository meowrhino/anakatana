window.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get("id"));
  const contenedor = document.getElementById("detalle-producto");

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
    let tallas = "";
    if (producto.tallas?.length === 1) {
      const t = producto.tallas[0];
      const esModelo = t.id === producto.tallaModelo;
      const supModelo = esModelo ? `<sup>model</sup>` : "";
      tallas = `<p class="medidas">size: ${t.descripcion}</p>`;
    } else if (producto.tallas?.length > 1) {
      tallas = `
  <details class="tallas-acordeon">
    <summary>sizes</summary>
    <div class="tallas-lista">
      ${producto.tallas
        .map((t, i) => {
          const supModelo =
            t.id === producto.tallaModelo ? `<sup>model</sup>` : "";
          return `<p>${t.descripcion} ${supModelo}</p>`;
        })
        .join("")}
    </div>
  </details>`;
    }

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
    producto.rebajas === "si" && producto.precioRebajas
      ? `<span class="precio--tachado">${producto.precio}€</span>
         <span class="precio--rebajado">${producto.precioRebajas}€</span>`
      : `<span>${producto.precio}€</span>`
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

document.addEventListener("DOMContentLoaded", () => {
  const acordeon = document.querySelector(".tallas-acordeon");
  const texto = acordeon?.querySelector(".summary-text");

  if (acordeon && texto) {
    const updateText = () => {
      texto.textContent = acordeon.open ? "hide sizes" : "see sizes";
    };
    acordeon.addEventListener("toggle", updateText);
    updateText(); // inicial
  }
});

// POPUP de imagen al hacer click
document.addEventListener("DOMContentLoaded", () => {
  const img = document.querySelector(".producto-img");
  if (!img) return;

  // Crear el overlay
  const overlay = document.createElement("div");
  overlay.id = "imagen-popup";
  overlay.innerHTML = `
    <div class="popup-img-wrapper">
      <img src="${img.src}" alt="${img.alt}">
    </div>
  `;
  document.body.appendChild(overlay);

  // Abrir al hacer click
  img.addEventListener("click", () => {
    overlay.classList.add("visible");
  });

  // Cerrar al hacer click fuera o en la imagen
  overlay.addEventListener("click", () => {
    overlay.classList.remove("visible");
  });
});
