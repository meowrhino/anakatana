/**
 * index.js
 * Punto de entrada del servidor Express en Render.
 * Define rutas de productos, checkout con Stripe, y registro de compras.
 */
// index.js

// DEMO: Backend Node+Express para tienda online
// Estructura lista para copiar-pegar en Render

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
// Habilitar CORS y parseo de JSON en todas las rutas
app.use(cors());
app.use(express.json());

// Base de datos simple en JSON
const dbPath = path.join(__dirname, 'productos.json');
// Ruta al archivo donde almacenaremos los registros de compra
const registroPath = path.join(__dirname, 'registro.json');

// Helper para leer/escribir datos
const leerProductos = () => JSON.parse(fs.readFileSync(dbPath));
const guardarProductos = (productos) => fs.writeFileSync(dbPath, JSON.stringify(productos, null, 2));

// --- Rutas de catálogo de productos ---
app.get('/productos', (req, res) => {
  const productos = leerProductos();
  res.json(productos);
});

// --- Gestión de pedidos y stock ---
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


// Añadir Stripe (usa la clave secreta en Render!)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Cliente de GitHub para subir registro.json
const { Octokit } = require('@octokit/rest');
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

/**
 * Sube el archivo registro.json al repositorio GitHub.
 * @param {string} contenidoBase64 - Contenido del archivo en Base64.
 * @param {string} [sha] - SHA previo del archivo (opcional).
 */
async function subirRegistroAGitHub(contenidoBase64, sha) {
  const owner = 'meowrhino'; // reemplaza con tu usuario/organización
  const repo = 'anakatana';     // reemplaza con el nombre de tu repositorio
  const path = 'registro.json';

  // Si no tenemos SHA, intentamos obtenerlo
  if (!sha) {
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path });
      sha = data.sha;
    } catch (e) {
      if (e.status !== 404) throw e;
    }
  }

  // Crear o actualizar el archivo en GitHub
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: `chore: actualización registro.json (${new Date().toISOString()})`,
    content: contenidoBase64,
    sha
  });
}

// --- Stripe Checkout: creación de sesión ---
app.post('/crear-sesion', async (req, res) => {
  const { carrito, envio, comision } = req.body;

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

  // Añadir comisión de Stripe como ítem extra si existe
  if (comision && comision > 0) {
    itemsStripe.push({
      price_data: {
        currency: 'eur',
        product_data: { name: 'Comisión Stripe' },
        unit_amount: Math.round(comision * 100),
      },
      quantity: 1,
    });
  }

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

// --- Registro de compras en registro.json ---
app.post('/guardar-carrito', async (req, res) => {
  const nuevoRegistro = req.body;
  // Depurar datos recibidos
  console.log('📝 /guardar-carrito recibe:', nuevoRegistro);
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
    // --- Subida automática a GitHub ---
    try {
      const contenido = fs.readFileSync(registroPath, 'utf-8');
      const contenidoBase64 = Buffer.from(contenido).toString('base64');
      await subirRegistroAGitHub(contenidoBase64);
      console.log('✅ registro.json subido a GitHub');
    } catch (err) {
      console.error('❌ Error subiendo registro.json a GitHub:', err);
    }
    console.log('✅ Registro guardado:', nuevoRegistro);
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('❌ Error escribiendo registro.json:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// --- Historial de todas las compras ---
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
});

// --- Inicio del servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en puerto ${PORT}`);
});
