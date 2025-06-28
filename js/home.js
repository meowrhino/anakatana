async function cargarProductos() {
  const respuesta = await fetch("./productos.json");
  const productos = await respuesta.json();
  const contenedor = document.getElementById("productos-container");

  productos.forEach((producto) => {
    const divProducto = document.createElement("div");
    divProducto.className = "producto";

    const estaAgotado = producto.soldOut === "si" || producto.stock === 0;
    const enRebajas = producto.rebajas === "si" && producto.precioRebajas;

    // Imagen
    // Imagen
    let imagenHTML = "";
    if (producto.img) {
      const saleCorners = enRebajas
        ? `
      <span class="corner-label top-left">SALE</span>
      <span class="corner-label top-right">SALE</span>
      <span class="corner-label bottom-left">SALE</span>
      <span class="corner-label bottom-right">SALE</span>
    `
        : "";

      if (estaAgotado) {
        imagenHTML = `
      <div class="img-wrapper soldout ${enRebajas ? "en-rebajas" : ""}">
        <img src="${producto.img}" alt="${
          producto.titulo
        }" class="img--soldout">
        <span class="soldout-label" style="transform: translate(-50%, -50%) rotate(${(
          Math.random() * 50 -
          25
        ).toFixed(2)}deg);">
  sold out
</span>
        ${saleCorners}
      </div>
    `;
      } else {
        imagenHTML = `
      <div class="img-wrapper ${enRebajas ? "en-rebajas" : ""}">
        <img src="${producto.img}" alt="${producto.titulo}">
        ${saleCorners}
      </div>
    `;
      }
    } else {
      imagenHTML = `<div class="no-data">no data</div>`;
    }

    // Título
    let tituloHTML = `<span class="titulo">${producto.titulo}</span>`;

    // Precio
    let precioHTML = "";
    if (enRebajas) {
      precioHTML = `<span class="precio precio--tachado">${
        producto.precio
      }€</span><span class="rebaja">${" " + producto.precioRebajas}€</span>`;
    } else {
      precioHTML = `<span class="precio">${producto.precio}€</span>`;
    }

    divProducto.innerHTML = `
      ${imagenHTML}
      <div class="home_titulo_precio">
        ${tituloHTML}
        ${precioHTML}
        </div>
        <p class="descripcion_corta">${producto.descripcion_corta}</p>
    `;

    if (!estaAgotado) {
      divProducto.addEventListener("click", () => {
        window.location.href = `producto.html?id=${producto.id}`;
      });
    }

    contenedor.appendChild(divProducto);
    activarDescripcionHover(divProducto); // 👈 ¡Aquí faltaba esto!
  });
}

document.addEventListener("DOMContentLoaded", cargarProductos);

function activarDescripcionHover(productoElemento) {
  const descripcion = productoElemento.querySelector(".descripcion_corta");

  productoElemento.addEventListener("mouseenter", () => {
    descripcion.classList.add("show");
  });

  productoElemento.addEventListener("mouseleave", () => {
    descripcion.classList.remove("show");
  });
}
