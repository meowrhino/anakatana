window.calcularEnvioCoste = function (peso, zona) {
  let rango = peso <= 1 ? 0 : peso <= 2.5 ? 1 : 2;
  return window.TARIFAS_ENVIO[zona]?.[rango] ?? null;
};