// Manejo de botones fijos y panel de filtros

document.addEventListener("DOMContentLoaded", () => {
  const pageType = document.body.dataset.pageType;
  if (!pageType) return;

  // Contenedores fijos
  const topRight = document.createElement("div");
  topRight.classList.add("fixed-buttons-top");
  const bottomRight = document.createElement("div");
  bottomRight.classList.add("fixed-links-bottom");
  const bottomLeft = document.createElement("div");
  bottomLeft.classList.add("fixed-links-bottom", "left");

  // ==== HOME ====
  if (pageType === "home") {
    topRight.innerHTML = `
      <a href="#" id="btn-carrito" class="boton-fijo">
        carrito<sup id="carrito-count"></sup>
      </a>
      <a href="#" id="btn-filtro" class="boton-fijo">filtrar</a>
    `;
    bottomRight.innerHTML = `
      <a href="about.html" class="boton-fijo">about</a>
      <a href="mailto:hifas@algo.com" class="boton-fijo">mail</a>
    `;
  }

  // ==== PRODUCT ====
  if (pageType === "product") {
    bottomRight.innerHTML = `
      <a href="#" id="btn-carrito" class="boton-fijo">
        carrito<sup id="carrito-count"></sup>
      </a>
    `;
    bottomLeft.innerHTML = `
      <a href="mailto:hifas@algo.com" class="boton-fijo">mail</a>
      <a href="about.html" class="boton-fijo">about</a>
      <a href="index.html" class="boton-fijo">home</a>
    `;
  }

  // ==== ABOUT ====
  if (pageType === "about") {
    bottomRight.innerHTML = `
      <a href="index.html" class="boton-fijo">home</a>
      <a href="mailto:hifas@algo.com" class="boton-fijo">mail</a>
    `;
    bottomLeft.innerHTML = `
      <a href="#" id="btn-carrito" class="boton-fijo">
        carrito<sup id="carrito-count"></sup>
      </a>
    `;
  }

  // Inyectar según existan
  if (topRight.innerHTML) document.body.appendChild(topRight);
  if (bottomRight.innerHTML) document.body.appendChild(bottomRight);
  if (bottomLeft.innerHTML) document.body.appendChild(bottomLeft);

  // Inicializar panel de filtros solo en home
  if (pageType === "home") initFiltroPanel();
});

// Acciones de los botones especiales
document.addEventListener("click", (e) => {
  const target = e.target.closest("a.boton-fijo");
  if (!target) return;

  if (target.id === "btn-carrito") {
    e.preventDefault();
    abrirCarrito();
  }

  if (target.id === "btn-filtro") {
    e.preventDefault();
    toggleFiltro();
  }
});


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