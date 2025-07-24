async function cargarProductos() {
  const respuesta = await fetch("./productos.json");
  const productos = await respuesta.json();
  const contenedor = document.getElementById("galeria-productos");

  // Inicializar filtros con los datos de productos
  //initFilters(productos);

  // Renderizar inicialmente todos los productos
  renderProductos(productos, contenedor);
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
  const colecciones = Array.from(new Set(productos.map(p => p.coleccion).filter(Boolean)));
  const tipos = Array.from(new Set(productos.map(p => p.tipo).filter(Boolean)));

  // Populate selects
  colecciones.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    filtroColeccion.appendChild(opt);
  });
  tipos.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    filtroTipo.appendChild(opt);
  });

  // Manejar cambios de filtros
  [filtroColeccion, filtroTipo].forEach(select => {
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
    filtrados = filtrados.filter(p => p.coleccion === colecValue);
  }
  if (tipoValue) {
    filtrados = filtrados.filter(p => p.tipo === tipoValue);
  }

  renderProductos(filtrados, contenedor);
}

// Asegurar que al cargar el DOM se inicie la carga
document.addEventListener("DOMContentLoaded", cargarProductos);

/*

// Crea e inyecta el panel de filtros si no existe
function initFiltroPanel() {
  let panel = document.getElementById("filtros-panel");
  if (!panel) {
    panel = document.createElement("aside");
    panel.id = "filtros-panel";
    panel.className = "fixed top-0 right-0 h-full w-64 bg-white transform translate-x-full transition-transform z-50";
    panel.innerHTML = `
      <div class="p-4">
        <h2 class="text-lg font-semibold mb-4">Filtrar</h2>
        <label for="filtro-coleccion" class="block text-sm font-medium">Colección</label>
        <select id="filtro-coleccion" class="mt-1 block w-full border rounded p-2 mb-4">
          <option value="">Todas</option>
        </select>
        <label for="filtro-tipo" class="block text-sm font-medium">Tipo</label>
        <select id="filtro-tipo" class="mt-1 block w-full border rounded p-2">
          <option value="">Todos</option>
        </select>
      </div>
    `;
    document.body.appendChild(panel);
  }
}

// Abre o cierra el panel de filtros
function toggleFiltro() {
  const panel = document.getElementById("filtros-panel");
  if (panel) panel.classList.toggle("translate-x-full");
}

*/