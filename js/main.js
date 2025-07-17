/*
1.1. Múltiples listeners de DOMContentLoaded
	•	app.js, home.js, producto.js, logoTexture.js, navBtns.js usan todos document.addEventListener("DOMContentLoaded", …) o window.onload.
	•	Sugerencia: centralizar la inicialización en un único punto, por ejemplo un archivo main.js que importe y ejecute cada módulo:
    */

import initCarrito from "./app.js";
import initGaleria from "./home.js";
import initProducto from "./producto.js";
import initNav from "./navBtns.js";
import initLogoTexture from "./logoTexture.js";

document.addEventListener("DOMContentLoaded", () => {
  initCarrito();
  initGaleria();
  initProducto();
  initNav();
  initLogoTexture();
});

/*import initCarrito from "./app.js";
import initGaleria from "./home.js";
import initProducto from "./producto.js";
import initNav from "./navBtns.js";
import initLogoTexture from "./logoTexture.js";

document.addEventListener("DOMContentLoaded", () => {
  initCarrito();
  initGaleria();
  initProducto();
  initNav();
  initLogoTexture();
}); */