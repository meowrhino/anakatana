// server.js  (backend separado de app.js)

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware
app.post('/crear-sesion', async (req, res) => {
  const { carrito, envio } = req.body;

  // Preparar los items para Stripe Checkout
  const itemsStripe = carrito.map(item => ({
    price_data: {
      currency: 'eur',
      product_data: { name: item.nombre },
      unit_amount: Math.round(item.precio * 100),
    },
    quantity: item.cantidad,
  }));

  // Añadir envío como un item extra
  itemsStripe.push({
    price_data: {
      currency: 'eur',
      product_data: { name: 'Envío' },
      unit_amount: Math.round(envio * 100),
    },
    quantity: 1,
  });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: itemsStripe,
      mode: 'payment',
      success_url: 'https://meowrhino.github.io/anakatana/gracias.html',
      cancel_url: 'https://meowrhino.github.io/anakatana/sorry.html',
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- Endpoints de historial de compras ---

// Guardar un nuevo registro de compra
app.post('/guardar-carrito', (req, res) => {
  const nuevoRegistro = req.body;
  let registros = [];

  if (fs.existsSync(registroPath)) {
    try {
      const data = fs.readFileSync(registroPath, 'utf-8');
      registros = data ? JSON.parse(data) : [];
    } catch {
      registros = [];
    }
  }

  registros.push(nuevoRegistro);
  try {
    fs.writeFileSync(registroPath, JSON.stringify(registros, null, 2));
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Error escribiendo registro:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Obtener todo el historial de compras
app.get('/historial', (req, res) => {
  if (!fs.existsSync(registroPath)) {
    return res.json([]);
  }
  try {
    const data = fs.readFileSync(registroPath, 'utf-8');
    const registros = data ? JSON.parse(data) : [];
    res.json(registros);
  } catch (err) {
    console.error('Error leyendo historial:', err);
    res.status(500).json({ error: err.message });
  }
});             // parsea JSON en req.body
app.use(cors());                     // permite peticiones desde tu frontend

// Ruta al archivo donde acumularemos los registros
const registroPath = path.join(__dirname, 'registro.json');

// POST /guardar-carrito -> añade un nuevo registro al JSON
app.post('/guardar-carrito', (req, res) => {
  const nuevoRegistro = req.body;
  let registros = [];

  // 1) Leer registros previos si existe el archivo
  if (fs.existsSync(registroPath)) {
    try {
      const data = fs.readFileSync(registroPath, 'utf-8');
      registros = data ? JSON.parse(data) : [];
    } catch (err) {
      console.warn('⚠️ No se pudo parsear registro.json, se reinicia array');
      registros = [];
    }
  }

  // 2) Agregar el nuevo registro
  registros.push(nuevoRegistro);

  // 3) Escribir el archivo actualizado
  try {
    fs.writeFileSync(registroPath, JSON.stringify(registros, null, 2));
    console.log('✅ Registro guardado:', nuevoRegistro);
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('❌ Error escribiendo registro.json:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en puerto ${PORT}`);
});
