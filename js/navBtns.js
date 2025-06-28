document.addEventListener("DOMContentLoaded", () => {
  const pageType = document.body.dataset.pageType;
  if (!pageType) return;

  const botonesArriba = document.createElement("div");
  botonesArriba.classList.add("fixed-buttons-top");

  const linksAbajo = document.createElement("div");
  linksAbajo.classList.add("fixed-links-bottom");

  // TOP RIGHT: carrito y filtro (solo en home)
  if (pageType === "home") {
    botonesArriba.innerHTML = `
  <a href="#" id="btn-carrito" class="boton-fijo">carrito<sup id="carrito-count"></sup></a>
  <a href="#" id="btn-filtro" class="boton-fijo">filtrar</a>
`;
  }

  // BOTTOM RIGHT: about y mail
  if (pageType !== "about") {
    linksAbajo.innerHTML += `
      <a href="about.html" class="boton-fijo">about</a>
    `;
  } else {
    linksAbajo.innerHTML += `
      <a href="index.html" class="boton-fijo">home</a>
    `;
  }

  linksAbajo.innerHTML += `
    <a href="mailto:hifas@algo.com" class="boton-fijo">mail</a>
  `;

  document.body.appendChild(botonesArriba);
  document.body.appendChild(linksAbajo);
});

/**JS funcional para evitar navegación y abrir popup/desplegable:*/

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