<file name=checkout.js>
async function initCheckout() {
  const form = document.getElementById('checkout-form');
  const stripe = Stripe('pk_test_1234567890abcdef');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const carritoStripe = getCartItemsForStripe();
    const envioCoste = getShippingCost();
    const addressData = getAddressData();

    const response = await fetch('/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carrito: carritoStripe, envio: envioCoste, direccion: addressData })
    });

    const data = await response.json();

    // Guardar información de la compra para la página de gracias
    const purchaseRecord = {
      carrito: carritoStripe,
      envio: envioCoste,
      direccion: addressData,
      fecha: new Date().toISOString(),
      sessionId: data.sessionId
    };
    localStorage.setItem('purchaseRecord', JSON.stringify(purchaseRecord));

    await stripe.redirectToCheckout({ sessionId: data.sessionId });
  });
}
</file>