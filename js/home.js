let productosHome = []; // almacena la lista original

// 1. Cargar productos y ordenar alfabéticamente al inicio
document.addEventListener("DOMContentLoaded", cargarProductos);

async function cargarProductos() {
  // añadimos un parámetro único para evitar caché del navegador
  const respuesta = await fetch(`data/productos.json?v=${Date.now()}`, {
    cache: "no-store",
  });
  productosHome = await respuesta.json();

  // Renderiza inicialmente A→Z
  applySort("name-asc");
}

function renderProductos(productos, contenedor) {
  // --- Preservar el HERO si existe ---
  const hero = contenedor.querySelector("#home-hero");

  // Elimina sólo los nodos de productos (todo menos el hero)
  Array.from(contenedor.children).forEach((n) => {
    if (n.id !== "home-hero") n.remove();
  });

  // Si por cualquier motivo no existe (p.ej. primera carga), lo creamos
  if (!hero) {
    const nuevoHero = document.createElement("div");
    nuevoHero.id = "home-hero";
    nuevoHero.setAttribute("role", "img");
    nuevoHero.setAttribute("aria-label", "Hifas hero");
    nuevoHero.innerHTML = `<img src="img/hifas_home.png" alt="Hifas — hero home">`;
    contenedor.prepend(nuevoHero);
  }

  // --- Render del resto de productos debajo del hero ---
  productos.forEach((producto) => {
    const divProducto = document.createElement("div");
    divProducto.className = "producto";

    const estaAgotado = producto.soldOut === "si" || producto.stock === 0;
    const enRebajas = producto.rebajas === "si" && producto.precioRebajas;

    const saleCorners = enRebajas
      ? `
      <span class="corner-label top-left">SALE</span>
      <span class="corner-label top-right">SALE</span>
      <span class="corner-label bottom-left">SALE</span>
      <span class="corner-label bottom-right">SALE</span>
    `
      : "";

    // Imagen
    let imagenHTML = "";

    if (producto.img) {
      // Etiqueta estilo esquina si está agotado
      const soldOutOverlay = estaAgotado
        ? `
<div class="soldout-overlay">
  <span class="soldout-label-central">SOLD OUT</span>
</div>
`
        : "";

      const wrapperClass = `img-wrapper${estaAgotado ? " soldout" : ""}${
        enRebajas ? " en-rebajas" : ""
      }`;
      const imgClass = estaAgotado ? 'class="img--soldout"' : "";

      imagenHTML = `
  <div class="${wrapperClass}">
    <img src="${producto.img}" alt="${producto.titulo}" ${imgClass}>
    ${soldOutOverlay}
    ${saleCorners}
  </div>`;
    } else {
      imagenHTML = `<div class="no-data">no data</div>`;
    }

    // Título y precio (precios siempre a la izquierda; si hay rebajas -> primero normal tachado, luego rebajado)
    const tituloHTML = `<span class="titulo">${producto.titulo}</span>`;
    const precioHTML = `
  <div class="precios">
    ${
      enRebajas
      ? `
      <span class="precio--rebajado">${producto.precioRebajas}€</span>
      <span class="precio--tachado">${producto.precio}€</span>
      `
        : `<span class="precio">${producto.precio}€</span>`
    }
  </div>`;

    divProducto.innerHTML = `
      ${imagenHTML}
      <div class="home_titulo_precio">
        ${tituloHTML}
        ${precioHTML}
      </div>
    `;

    divProducto.addEventListener("click", () => {
      window.location.href = `producto.html?id=${producto.id}`;
    });

    contenedor.appendChild(divProducto);
  });
}

function applySort(criteria) {
  const sorted = [...productosHome];

  switch (criteria) {
    case "price-asc":
      sorted.sort(
        (a, b) =>
          parseFloat(a.precio.replace(",", ".")) -
          parseFloat(b.precio.replace(",", "."))
      );
      break;

    case "price-desc":
      sorted.sort(
        (a, b) =>
          parseFloat(b.precio.replace(",", ".")) -
          parseFloat(a.precio.replace(",", "."))
      );
      break;

    case "name-asc":
      sorted.sort((a, b) => a.titulo.localeCompare(b.titulo));
      break;

    case "name-desc":
      sorted.sort((a, b) => b.titulo.localeCompare(a.titulo));
      break;

    case "rebajas-first":
      // trae primero los que tengan rebajas === "si"
      sorted.sort((a, b) => (b.rebajas === "si") - (a.rebajas === "si"));
      break;

    case "soldout-last":
      // empuja al final los sold out === "si"
      sorted.sort((a, b) => (a.soldOut === "si") - (b.soldOut === "si"));
      break;

    case "category-order":
      // orden específico de categorías
      const order = ["top", "bottom", "accesorio"];
      sorted.sort(
        (a, b) => order.indexOf(a.tipo[0]) - order.indexOf(b.tipo[0])
      );
      break;

    default:
      console.warn("applySort: criterio desconocido:", criteria);
  }

  renderProductos(sorted, document.getElementById("galeria-productos"));
}

function abrirSort() {
  // 1) si ya está abierto, ciérralo
  if (document.getElementById("popup-sort")) return;

  // 2) crea overlay + modal
  const overlay = document.createElement("div");
  overlay.id = "popup-sort";
  overlay.className = "popup-carrito";

  const modal = document.createElement("div");
  modal.className = "carrito-modal";
  modal.style.maxWidth = "300px";
  modal.style.padding = "1rem";
  modal.style.position = "relative";

  // 3) botón cerrar
  const btnCerrar = document.createElement("button");
  btnCerrar.className = "carrito-cerrar";
  btnCerrar.textContent = "✕";
  btnCerrar.addEventListener("click", () => overlay.remove());
  modal.appendChild(btnCerrar);

  // 4) opciones de ordenación (todas en un mismo panel)
  const panel = document.createElement("div");
  panel.className = "sort-panel";
  panel.innerHTML = `
  <button data-ord="rebajas-first">rebajas primero</button>
  <button data-ord="soldout-last">sold out último</button>
  <button data-ord="category-order">top bottom acc</button>
    <button data-ord="price-asc">precio ↑</button>
    <button data-ord="price-desc">precio ↓</button>
    <button data-ord="name-asc">A-Z</button>
    <button data-ord="name-desc">Z-A</button>
  `;
  panel.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      applySort(btn.dataset.ord);
      overlay.remove();
    });
  });
  modal.appendChild(panel);

  // 5) monta en el DOM
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
