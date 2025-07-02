document.addEventListener("DOMContentLoaded", () => {
  const pageType = document.body.dataset.pageType;
  if (!pageType) return;

  // Contenedores por posición
  const topRight = document.createElement("div");
  topRight.classList.add("fixed-buttons-top");

  const bottomRight = document.createElement("div");
  bottomRight.classList.add("fixed-links-bottom");

  const bottomLeft = document.createElement("div");
  bottomLeft.classList.add("fixed-links-bottom", "left");

  // ==== HOME ====
  if (pageType === "home") {
    topRight.innerHTML = `
      <a href="#" id="btn-carrito" class="boton-fijo">carrito<sup id="carrito-count"></sup></a>
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
      <a href="#" id="btn-carrito" class="boton-fijo">carrito<sup id="carrito-count"></sup></a>
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
      <a href="#" id="btn-carrito" class="boton-fijo">carrito<sup id="carrito-count"></sup></a>
    `;
  }

  // Inyectar según existan
  if (topRight.innerHTML) document.body.appendChild(topRight);
  if (bottomRight.innerHTML) document.body.appendChild(bottomRight);
  if (bottomLeft.innerHTML) document.body.appendChild(bottomLeft);
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

// ==== NUEVA PAGINA ====
// if (pageType === "nueva") {
//   topRight.innerHTML = `
//     <a href="#" class="boton-fijo">nuevo</a>
//   `;
//   bottomRight.innerHTML = `
//     <a href="index.html" class="boton-fijo">home</a>
//   `;
//   bottomLeft.innerHTML = `
//     <a href="mailto:hifas@algo.com" class="boton-fijo">mail</a>
//   `;
// }