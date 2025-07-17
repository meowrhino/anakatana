let producto = null;

function obtenerPrecio(producto) {
  const base =
    producto.rebajas === "si" && producto.precioRebajas
      ? producto.precioRebajas
      : producto.precio;
  return parseFloat(base.replace(",", "."));
}

// // // // // const talla = document.getElementById("select-talla")?.value || null;

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
    producto = productos.find((p) => p.id === id);

    if (!producto) {
      contenedor.innerHTML = "<p class='error'>Producto no disponible.</p>";
      return;
    }

    const estaRebajado =
      producto.precio_original && producto.precio_original > producto.precio;
    const estaAgotado = producto.soldOut === "si" || producto.stock === 0;

    // Texto constante
    const makingTime = `All products are handmade and individually made ^^* so they take between 2 and 4 weeks to make depending on the number of orders. We appreciate your support <3`;

    let tallas = "";

    if (producto.tallas?.length) {
      const opciones = producto.tallas
        .map((t, i) => {
          const texto = `${t.descripcion}${
            t.id === producto.tallaModelo ? " (seen in model)" : ""
          }`;
          return `<div class="dropdown-option" data-index="${i}" role="option">${texto}</div>`;
        })
        .join("");

      const extraOption =
        producto.tallas.length > 1
          ? `<div class="dropdown-option" data-index="custom" role="option">custom (send mail)</div>`
          : "";

      tallas = `
  <div class="talla-wrapper">
    <div class="dropdown" role="listbox" tabindex="0" data-selected="${
      producto.tallas.findIndex((t) => t.id === producto.tallaModelo) || 0
    }">
      <div class="dropdown-toggle">${
        producto.tallas.find((t) => t.id === producto.tallaModelo)
          ?.descripcion || producto.tallas[0]?.descripcion
      }</div>
      <div class="dropdown-menu">${opciones}${extraOption}</div>
    </div>
  </div>
`;
    }

    // Colección
    const coleccion = producto["colección"]
      ? `<p class="coleccion">${producto["colección"]}<sup> collection</sup></p>`
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

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-añadir-carrito")) {
      const id = parseInt(
        new URLSearchParams(window.location.search).get("id")
      );
      const nombre =
        document.querySelector(".titulo")?.textContent || "producto";
      const talla =
        document.querySelector(".dropdown[data-selected] .dropdown-toggle")
          ?.textContent || null;

      agregarAlCarrito(
        producto.id,
        producto.titulo,
        talla,
        producto.peso,
        obtenerPrecio(producto),
        producto.img
      );
    }
  });
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

document.addEventListener("click", (e) => {
  const toggle = e.target.closest(".dropdown-toggle");
  const option = e.target.closest(".dropdown-option");

  if (toggle) {
    // Cerrar otros dropdowns abiertos
    document.querySelectorAll(".dropdown.open").forEach((d) => {
      if (d !== toggle.closest(".dropdown")) d.classList.remove("open");
    });
    // Abrir o cerrar el actual
    toggle.closest(".dropdown").classList.toggle("open");
    return;
  }

  if (option) {
    const container = option.closest(".dropdown");
    const toggle = container.querySelector(".dropdown-toggle");
    toggle.textContent = option.textContent;
    container.classList.remove("open");
    container.dataset.selected = option.dataset.index;
    return;
  }

  // Si se clicó fuera, cerrar todos
  document
    .querySelectorAll(".dropdown.open")
    .forEach((d) => d.classList.remove("open"));
});

// --- ajuste dinámico de ratio en móvil ---
(function () {
  // Si quieres que solo corra en móvil, comprueba el ancho:
  if (window.innerWidth < 480) {
    document.querySelectorAll(".producto-img-container").forEach((wrapper) => {
      const img = wrapper.querySelector("img");

      function ajustarRatio() {
        const ratio = img.naturalHeight / img.naturalWidth;
        wrapper.style.paddingBottom = `${ratio * 100}%`;
      }

      if (img.complete) {
        // ya estuvo en caché
        ajustarRatio();
      } else {
        img.addEventListener("load", ajustarRatio);
      }
    });
  }
})();
