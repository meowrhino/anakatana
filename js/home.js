async function cargarProductos() {
  const respuesta = await fetch("./productos.json");
  const productos = await respuesta.json();
  const contenedor = document.getElementById("galeria-productos");

  // Inicializar filtros con los datos de productos
  //initFilters(productos);

  // Renderizar inicialmente todos los productos
  renderProductos(productos, contenedor);
  applySort("name-asc");
}

function renderProductos(productos, contenedor) {
  // Limpiar contenedor antes de renderizar
  contenedor.innerHTML = "";

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

    // Título y precio
    const tituloHTML = `<span class="titulo">${producto.titulo}</span>`;
    const precioHTML = `
  <div class="precios">
    ${
      enRebajas
        ? `<span class="precio--tachado">${producto.precio}€</span>
           <span class="precio--rebajado">${producto.precioRebajas}€</span>`
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
    //activarDescripcionHover(divProducto);
  });
}

// Inicializa y gestiona los filtros de colección y tipo
function initFilters(productos) {
  const filtroColeccion = document.getElementById("filtro-coleccion");
  const filtroTipo = document.getElementById("filtro-tipo");

  if (!filtroColeccion || !filtroTipo) return;

  // Obtener valores únicos
  const colecciones = Array.from(
    new Set(productos.map((p) => p.coleccion).filter(Boolean))
  );
  const tipos = Array.from(
    new Set(productos.map((p) => p.tipo).filter(Boolean))
  );

  // Populate selects
  colecciones.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    filtroColeccion.appendChild(opt);
  });
  tipos.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    filtroTipo.appendChild(opt);
  });

  // Manejar cambios de filtros
  [filtroColeccion, filtroTipo].forEach((select) => {
    select.addEventListener("change", () => applyFilters(productos));
  });
}

// Filtra y renderiza según selección
function applyFilters(productos) {
  const filtroColeccion = document.getElementById("filtro-coleccion");
  const filtroTipo = document.getElementById("filtro-tipo");
  const contenedor = document.getElementById("galeria-productos");

  let filtrados = productos;

  const colecValue = filtroColeccion.value;
  const tipoValue = filtroTipo.value;

  if (colecValue) {
    filtrados = filtrados.filter((p) => p.coleccion === colecValue);
  }
  if (tipoValue) {
    filtrados = filtrados.filter((p) => p.tipo === tipoValue);
  }

  renderProductos(filtrados, contenedor);
}

/**ordenar proudctos: */
// Asegurar que al cargar el DOM se inicie la carga
document.addEventListener("DOMContentLoaded", cargarProductos);

let productosHome = []; // almacena la lista original

async function cargarProductos() {
  const resp = await fetch("./productos.json");
  productosHome = await resp.json();
  renderProductos(productosHome, document.getElementById("galeria-productos"));
}

/*

function toggleSort() {
  // Crear/desplegar un pequeño panel con opciones:
  // [Precio ↑], [Precio ↓], [Título A-Z], [Título Z-A]
  const existing = document.getElementById("sort-panel");
  if (existing) return existing.remove(); // cerrar
  const panel = document.createElement("div");
  panel.id = "sort-panel";
  panel.className = "fixed bottom-20 right-3 p-4 bg-black border border-white";
  panel.innerHTML = `
    <button data-ord="price-asc">Precio ↑</button>
    <button data-ord="price-desc">Precio ↓</button>
    <button data-ord="name-asc">Título A-Z</button>
    <button data-ord="name-desc">Título Z-A</button>
  `;
  panel.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      applySort(btn.dataset.ord);
      panel.remove();
    });
  });
  document.body.appendChild(panel);
}
*/

// home.js

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
