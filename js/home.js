async function cargarProductos() {
  const respuesta = await fetch("./productos.json");
  const productos = await respuesta.json();
  const contenedor = document.getElementById("galeria-productos");

  renderProductos(productos, contenedor);
}

function renderProductos(productos, contenedor) {
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

    /* version con el sold out label:
    if (producto.img) {
      const soldOutLabel = estaAgotado
        ? `
        <span class="soldout-label" style="transform: translate(-50%, -50%) rotate(${(
          Math.random() * 50 -
          25
        ).toFixed(2)}deg);">
          sold out
        </span>`
        : "";

      const wrapperClass = `img-wrapper${estaAgotado ? " soldout" : ""}${
        enRebajas ? " en-rebajas" : ""
      }`;
      const imgClass = estaAgotado ? 'class="img--soldout"' : "";

      imagenHTML = `
        <div class="${wrapperClass}">
          <img src="${producto.img}" alt="${producto.titulo}" ${imgClass}>
          ${soldOutLabel}
          ${saleCorners}
        </div>`;
    } else {
      imagenHTML = `<div class="no-data">no data</div>`;
    }
    */

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
      <!-- <p class="descripcion_corta">${producto.descripcion_corta}</p>-->
    `;

    divProducto.addEventListener("click", () => {
      window.location.href = `producto.html?id=${producto.id}`;
    });

    contenedor.appendChild(divProducto);
    activarDescripcionHover(divProducto);
  });
}

function activarDescripcionHover(productoElemento) {
  const descripcion = productoElemento.querySelector(".descripcion_corta");

  productoElemento.addEventListener("mouseenter", () => {
    descripcion.classList.add("show");
  });

  productoElemento.addEventListener("mouseleave", () => {
    descripcion.classList.remove("show");
  });
}

document.addEventListener("DOMContentLoaded", cargarProductos);
