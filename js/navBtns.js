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
      <a href="#" id="btn-ordenar" class="boton-fijo">ordenar</a>
    `;
    bottomRight.innerHTML = `
      <a href="about.html" class="boton-fijo">about</a>
      <a href="politicas.html" class="boton-fijo">políticas</a>
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
    <a href="index.html" class="boton-fijo">home</a>
    <a href="about.html" class="boton-fijo">about</a>
    <a href="politicas.html" class="boton-fijo">políticas</a>
      <a href="mailto:hifas@algo.com" class="boton-fijo">mail</a>
    `;
  }

  // ==== checkout ====
  if (pageType === "checkout") {
    bottomRight.innerHTML = `
      <a href="#" id="btn-carrito" class="boton-fijo">
        carrito<sup id="carrito-count"></sup>
      </a>
    `;
    bottomLeft.innerHTML = `
    <a href="index.html" class="boton-fijo">home</a>
    <a href="about.html" class="boton-fijo">about</a>
    <a href="politicas.html" class="boton-fijo">políticas</a>
    <a href="mailto:hifas@algo.com" class="boton-fijo">mail</a>
    `;
  }

  // ==== ABOUT ====
  if (pageType === "about") {
    bottomRight.innerHTML = `
      <a href="index.html" class="boton-fijo">home</a>
      <a href="politicas.html" class="boton-fijo">políticas</a>
      <a href="mailto:hifas@algo.com" class="boton-fijo">mail</a>
    `;
    bottomLeft.innerHTML = `
      <a href="#" id="btn-carrito" class="boton-fijo">
        carrito<sup id="carrito-count"></sup>
      </a>
    `;
  }

  // ==== POLICY ====
  if (pageType === "policy") {
    bottomRight.innerHTML = `
      <a href="index.html" class="boton-fijo">home</a>
      <a href="about.html" class="boton-fijo">about</a>
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
  /*
  if (pageType === "home") initFiltroPanel();
  */
});
// Acciones de los botones especiales
document.addEventListener("click", (e) => {
  const target = e.target.closest("a.boton-fijo");
  if (!target) return;

  if (target.id === "btn-carrito") {
    e.preventDefault();
    abrirCarrito();
  }

  if (target.id === "btn-ordenar") {
    e.preventDefault();
    abrirSort();
  }
});
