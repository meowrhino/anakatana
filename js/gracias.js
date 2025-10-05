

// Gracias.js – Lógica de la página de agradecimiento
document.addEventListener('DOMContentLoaded', () => {
  console.log('▶ Página Gracias cargada');


  // 2. Leer el objeto 'purchaseRecord' desde localStorage
  const purchaseData = localStorage.getItem('purchaseRecord');
  if (!purchaseData) {
    console.warn('⚠️ No se encontró purchaseRecord en localStorage');
    return;
  }

  // 3. Parsear el JSON almacenado
  let cartRecord;
  try {
    cartRecord = JSON.parse(purchaseData);
  } catch (err) {
    console.error('❌ Error parseando purchaseRecord:', err);
    return;
  }

  // 4. Enviar los datos al backend
  console.log('➡️ Enviando al servidor:', cartRecord);
  fetch(`${window.API_BASE}/guardar-carrito`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cartRecord)
  })
    .then(response => {
      if (response.ok) {
        console.log('✅ Carrito guardado en el servidor correctamente.');
        // Vaciar el carrito y resetear contador visual tras confirmar guardado
        localStorage.removeItem('carrito');
        const contador = document.getElementById('carrito-count');
        if (contador) contador.textContent = '0';
        // Eliminar purchaseRecord ya procesado
        localStorage.removeItem('purchaseRecord');
      } else {
        console.error('❌ Error al guardar en el servidor:', response.status, response.statusText);
      }
    })
    .catch(error => {
      console.error('❌ No se pudo conectar con el servidor:', error);
    });
});