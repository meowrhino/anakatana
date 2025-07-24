// SIN usar export
window.TARIFAS_ENVIO = {
  espana: [4, 6, 8],
  islas: [6, 8, 10],
  europa: [8, 10, 14],
  eeuu: [12, 16, 22],
  latam: [10, 14, 20],
  japon: [14, 18, 26],
};

window.calcularEnvioCoste = function (peso, zona) {
  let rango = peso <= 1 ? 0 : peso <= 2.5 ? 1 : 2;
  return window.TARIFAS_ENVIO[zona]?.[rango] ?? null;
};