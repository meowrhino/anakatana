let producto = null;

function obtenerPrecio(producto) {
  const base =
    producto.rebajas === "si" && producto.precioRebajas
      ? producto.precioRebajas
      : producto.precio;
  return parseFloat(String(base).replace(",", "."));
}

window.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get("id"));
  const contenedor = document.getElementById("detalle-producto");

  if (!id) {
    if (contenedor) contenedor.innerHTML = "<p class='error'>Producto no encontrado.</p>";
    return;
  }

  try {
    const respuesta = await fetch("data/productos.json");
    const productos = await respuesta.json();
    producto = productos.find((p) => p.id === id);

    if (!producto) {
      contenedor.innerHTML = "<p class='error'>Producto no disponible.</p>";
      return;
    }

    const estaAgotado = producto.soldOut === "si" || producto.stock === 0;
    const makingTime =
      "All products are handmade and individually made ^^* so they take between 2 and 4 weeks to make depending on the number of orders. We appreciate your support <3";

    // --- Tallas (dropdown) ---
    let tallas = "";
    if (producto.tallas?.length) {
      const opciones = producto.tallas
        .map((t, i) => {
          return `<div class="dropdown-option" data-index="${i}" data-id="${t.id}" data-desc="${t.descripcion}" role="option"><strong>talla ${t.id}</strong> <span class="desc">${t.descripcion || ""}</span></div>`;
        })
        .join("");

      const extraOption =
        producto.tallas.length > 1
          ? `<div class="dropdown-option" data-index="custom" data-id="custom" role="option">custom (send mail)</div>`
          : "";

      const sel =
        producto.tallas.find((t) => t.id === producto.tallaModelo) ||
        producto.tallas[0];

      tallas = `
        <div class="talla-wrapper">
          <div class="dropdown" role="listbox" tabindex="0"
               data-selected="${producto.tallas.findIndex((t) => t.id === (sel?.id)) || 0}"
               data-talla-id="${sel?.id || ""}">
            <div class="dropdown-toggle"><strong>talla ${sel?.id}</strong> <span class="desc">${sel?.descripcion || ""}</span></div>
            <div class="dropdown-menu">${opciones}${extraOption}</div>
          </div>
        </div>
      `;
    }

    // Colección
    const coleccion = producto["colección"]
      ? `<p class="coleccion">${producto["colección"]}<sup> collection</sup></p>`
      : "";

    // CTA / stock
    const botonCarrito = !estaAgotado
      ? `<button class="btn-añadir-carrito">Añadir al carrito</button>`
      : `<p class="agotado-msg">Este producto está agotado.</p>`;

    // ====== MARKUP ======
    // Layout: grid (definido en CSS) — móvil 1 col (imagen arriba ~66dvh), desktop 1/3 vs 2/3.
    contenedor.innerHTML = `
      <div class="producto-layout">
        <div class="producto-media">
          <div class="producto-img-container">
            <img src="${producto.img}" alt="${producto.titulo}" class="producto-img" />
          </div>
          <div class="producto-gallery" aria-label="Galería de imágenes"></div>
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

    // --- Galería: thumbs bajo la imagen, centrados y alineados con ésta ---
    (function initGaleria() {
      const media = document.querySelector(".producto-media");
      const cont = media?.querySelector(".producto-img-container");
      const mainImg = cont?.querySelector(".producto-img");
      const gallery = media?.querySelector(".producto-gallery");
      if (!media || !cont || !mainImg || !gallery) return;

      const imagenes =
        producto.galeria && producto.galeria.length
          ? producto.galeria
          : [producto.img];

      if (imagenes.length <= 1) {
        mainImg.src = imagenes[0];
        gallery.remove(); // no mostramos barra de thumbs si sólo hay 1
        return;
      }

      let idx = 0;
      const setMain = (i) => {
        idx = ((i % imagenes.length) + imagenes.length) % imagenes.length;
        mainImg.src = imagenes[idx];
        thumbsStrip
          .querySelectorAll(".thumb")
          .forEach((b, j) => b.classList.toggle("active", j === idx));
      };

      const thumbsStrip = document.createElement("div");
      thumbsStrip.className = "producto-thumbs";

      imagenes.forEach((src, i) => {
        const btn = document.createElement("button");
        btn.className = "thumb" + (i === 0 ? " active" : "");
        btn.setAttribute("aria-label", `Imagen ${i + 1} de ${imagenes.length}`);
        const im = document.createElement("img");
        im.src = src;
        im.alt = `miniatura ${i + 1}`;
        btn.appendChild(im);
        btn.addEventListener("click", () => setMain(i));
        thumbsStrip.appendChild(btn);
      });

      const next = document.createElement("button");
      next.className = "thumbs-next";
      next.textContent = "›";
      next.setAttribute("aria-label", "Siguiente imagen");
      next.addEventListener("click", () => setMain(idx + 1));

      gallery.appendChild(thumbsStrip);
      gallery.appendChild(next);

      setMain(0);
    })();
  } catch (e) {
    if (contenedor) contenedor.innerHTML = "<p class='error'>Error al cargar el producto.</p>";
  }

  // Añadir al carrito
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-añadir-carrito")) {
      const dropdown = document.querySelector(".dropdown");
      const tallaId = dropdown?.dataset.tallaId || null;
      const talla = tallaId ? `talla ${tallaId}` : null;

      window.agregarAlCarrito(
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

// Texto de acordeón si existe (tallas)
document.addEventListener("DOMContentLoaded", () => {
  const acordeon = document.querySelector(".tallas-acordeon");
  const texto = acordeon?.querySelector(".summary-text");
  if (acordeon && texto) {
    const updateText = () => {
      texto.textContent = acordeon.open ? "hide sizes" : "see sizes";
    };
    acordeon.addEventListener("toggle", updateText);
    updateText();
  }
});

// Eliminado: overlay fullscreen al clicar imagen (lightbox)
// Eliminado: ajuste dinámico de ratio en móvil (lo gestiona CSS)
