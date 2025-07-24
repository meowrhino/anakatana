// index.js

// 1) Levanta el servidor Express que tienes en server.js
require('./server.js');

// 2) Aquí podrías tener otra lógica distinta si la necesitas
console.log('Index.js sigue vivo 🍣');

// DEMO: Backend Node+Express para tienda online
// Estructura lista para copiar-pegar en Render

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Base de datos simple en JSON
const dbPath = path.join(__dirname, 'productos.json');

// Helper para leer/escribir datos
const leerProductos = () => JSON.parse(fs.readFileSync(dbPath));
const guardarProductos = (productos) => fs.writeFileSync(dbPath, JSON.stringify(productos, null, 2));

// Endpoint para obtener productos
app.get('/productos', (req, res) => {
  const productos = leerProductos();
  res.json(productos);
});

// Endpoint para guardar pedido y descontar stock
app.post('/pedido', (req, res) => {
  const { carrito } = req.body; // carrito: [{id, cantidad}, ...]

  const productos = leerProductos();
  const sinStock = [];

  carrito.forEach(item => {
    const producto = productos.find(p => p.id === item.id);
    if (producto) {
      if (producto.stock >= item.cantidad) {
        producto.stock -= item.cantidad;
      } else {
        sinStock.push({ id: producto.id, disponible: producto.stock });
      }
    }
  });

  if (sinStock.length > 0) {
    res.status(400).json({ error: 'Algunos productos no tienen suficiente stock', sinStock });
  } else {
    guardarProductos(productos);
    res.json({ success: true, mensaje: 'Pedido registrado y stock actualizado' });
  }
});

// Endpoint para editar stock (para Ana)
app.post('/editar-stock', (req, res) => {
  const { id, nuevoStock } = req.body;

  const productos = leerProductos();
  const producto = productos.find(p => p.id === id);

  if (producto) {
    producto.stock = nuevoStock;
    guardarProductos(productos);
    res.json({ success: true, mensaje: 'Stock actualizado correctamente' });
  } else {
    res.status(404).json({ error: 'Producto no encontrado' });
  }
});

// Servidor en Render escucha en el puerto asignado
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor funcionando en el puerto ${PORT}`);
});

// Añadir Stripe (usa la clave secreta en Render!)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Endpoint para crear sesión de Stripe Checkout
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