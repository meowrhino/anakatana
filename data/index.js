/**
 * index.js — Backend Express para la tienda
 * ----------------------------------------
 * • Sirve el catálogo desde JSON local.
 * • Gestiona stock y edición de stock.
 * • Crea sesiones de pago en Stripe Checkout.
 * • Guarda historial de compras en JSON y lo sube a GitHub.
 *
 * Estructura del archivo (secciones):
 *  1) Imports y setup de entorno
 *  2) Inicialización de Express + CORS + parsers
 *  3) Helpers de validación y utilidades
 *  4) Rutas de catálogo/stock
 *  5) Integraciones (Stripe, GitHub) y helpers relacionados
 *  6) Rutas de checkout y registro de compras
 *  7) Healthcheck y arranque del servidor
 */

// ───────────────────────────────────────────────────────────────────────────────
// 1) IMPORTS Y SETUP DE ENTORNO
// ───────────────────────────────────────────────────────────────────────────────
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// URL del frontend para redirecciones de Stripe (puede venir por env var)
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://meowrhino.github.io/anakatana';

// ───────────────────────────────────────────────────────────────────────────────
// 2) INICIALIZACIÓN DE EXPRESS + CORS + PARSERS
// ───────────────────────────────────────────────────────────────────────────────
const app = express();

/**
 * CORS: permitimos orígenes de desarrollo y el dominio público de producción.
 *  - Si cambias dónde sirves el front, añade su URL en ALLOWED_ORIGINS.
 */
const ALLOWED_ORIGINS = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://meowrhino.github.io'
];
app.use(cors({
  origin(origin, cb) {
    // Permite peticiones sin origin (curl, healthchecks) o listadas
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// Body parser JSON
app.use(express.json());

// ───────────────────────────────────────────────────────────────────────────────
// 3) HELPERS DE VALIDACIÓN Y UTILIDADES
// ───────────────────────────────────────────────────────────────────────────────
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const toCents = (eur) => Math.round(Number(eur) * 100);

/** Valida carrito para /pedido (stock): [{ id, cantidad }] */
function validateCarritoStock(carrito) {
  const errors = [];
  if (!Array.isArray(carrito) || carrito.length === 0) {
    return { ok: false, errors: ['carrito debe ser un array con al menos 1 ítem'] };
  }
  carrito.forEach((it, idx) => {
    if (!('id' in it)) errors.push(`item[${idx}].id requerido`);
    if (!('cantidad' in it)) errors.push(`item[${idx}].cantidad requerida`);
    const qty = Number(it.cantidad);
    if (!Number.isInteger(qty) || qty <= 0) errors.push(`item[${idx}].cantidad debe ser entero ≥ 1`);
  });
  return { ok: errors.length === 0, errors };
}

/** Valida carrito para /crear-sesion (Stripe): [{ nombre, precio, cantidad }] */
function validateCarritoCheckout(carrito) {
  const errors = [];
  if (!Array.isArray(carrito) || carrito.length === 0) {
    return { ok: false, errors: ['carrito debe ser un array con al menos 1 ítem'] };
  }
  carrito.forEach((it, idx) => {
    if (!isNonEmptyString(it.nombre)) errors.push(`item[${idx}].nombre string requerido`);
    const precioNum = Number(it.precio);
    if (!Number.isFinite(precioNum) || precioNum < 0) errors.push(`item[${idx}].precio debe ser número ≥ 0`);
    const qty = Number(it.cantidad);
    if (!Number.isInteger(qty) || qty <= 0) errors.push(`item[${idx}].cantidad debe ser entero ≥ 1`);
  });
  return { ok: errors.length === 0, errors };
}

/** Convierte y valida que un valor sea número ≥ 0 */
function coerceNonNegNumber(name, v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: `${name} debe ser número ≥ 0` };
  }
  return { ok: true, value: n };
}

// Rutas/Paths de datos en disco (JSON “persistente”)
const dbPath = path.join(__dirname, 'productos.json');
const registroPath = path.join(__dirname, 'registro.json');

// Helpers para leer/escribir los JSON (siempre como texto UTF-8)
const leerProductos = () => JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
const guardarProductos = (productos) => fs.writeFileSync(dbPath, JSON.stringify(productos, null, 2), 'utf-8');

// ───────────────────────────────────────────────────────────────────────────────
// 4) RUTAS DE CATÁLOGO Y STOCK
// ───────────────────────────────────────────────────────────────────────────────
/**
 * GET /productos — devuelve el catálogo completo desde productos.json
 */
app.get('/productos', (_req, res) => {
  const productos = leerProductos();
  res.json(productos);
});

/**
 * POST /pedido — descuenta stock del JSON si hay unidades suficientes.
 * Body esperado: { carrito: [{ id, cantidad }, ...] }
 */
app.post('/pedido', (req, res) => {
  const { carrito } = req.body;
  const check = validateCarritoStock(carrito);
  if (!check.ok) {
    return res.status(400).json({ error: 'Payload inválido', detalle: check.errors });
  }

  const productos = leerProductos();
  const sinStock = [];

  carrito.forEach(item => {
    const qty = Number(item.cantidad);
    const producto = productos.find(p => p.id === item.id);
    if (producto) {
      if (Number.isFinite(producto.stock) && producto.stock >= qty) {
        producto.stock -= qty;
      } else {
        sinStock.push({ id: producto.id, disponible: Math.max(0, Number(producto.stock) || 0) });
      }
    }
  });

  if (sinStock.length > 0) {
    return res.status(400).json({ error: 'Algunos productos no tienen suficiente stock', sinStock });
  }

  try {
    guardarProductos(productos);
    return res.json({ success: true, mensaje: 'Pedido registrado y stock actualizado' });
  } catch (e) {
    console.error('Error guardando productos:', e);
    return res.status(500).json({ error: 'Error guardando stock' });
  }
});

/**
 * POST /editar-stock — actualiza el stock de un producto concreto.
 * Body esperado: { id, nuevoStock }
 */
app.post('/editar-stock', (req, res) => {
  const { id, nuevoStock } = req.body;
  const stockNum = Number(nuevoStock);
  if (!Number.isInteger(stockNum) || stockNum < 0) {
    return res.status(400).json({ error: 'nuevoStock debe ser entero ≥ 0' });
  }

  const productos = leerProductos();
  const producto = productos.find(p => p.id === id);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

  producto.stock = stockNum;
  try {
    guardarProductos(productos);
    return res.json({ success: true, mensaje: 'Stock actualizado correctamente' });
  } catch (e) {
    console.error('Error guardando productos:', e);
    return res.status(500).json({ error: 'Error guardando stock' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// 5) INTEGRACIONES: STRIPE + GITHUB (para registro de compras)
// ───────────────────────────────────────────────────────────────────────────────
// Stripe: clave desde variables de entorno en Render
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ STRIPE_SECRET_KEY no está definida. /crear-sesion fallará.');
}

// GitHub: para subir el registro.json al repositorio
const { Octokit } = require('@octokit/rest');
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
if (!process.env.GITHUB_TOKEN) {
  console.warn('⚠️ GITHUB_TOKEN no está definido. Subida a GitHub puede fallar.');
}

/**
 * Sube `registro.json` al repo remoto en la ruta `anakatana/data/registro.json`.
 *  - Si cambias la ubicación en tu repo, actualiza `ghPath`.
 */
async function subirRegistroAGitHub(contenidoBase64, sha) {
  const owner = 'meowrhino'; // usuario/organización
  const repo = 'anakatana';  // nombre del repo
  const ghPath = 'anakatana/data/registro.json'; // ruta dentro del repo

  // Si no tenemos SHA, intenta obtenerlo (para update vs create)
  if (!sha) {
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: ghPath });
      sha = data.sha;
    } catch (e) {
      if (e.status !== 404) throw e; // 404 = archivo aún no existe
    }
  }

  // Crea o actualiza el archivo
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: ghPath,
    message: `chore: actualización registro.json (${new Date().toISOString()})`,
    content: contenidoBase64,
    sha
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// 6) RUTAS DE CHECKOUT Y REGISTRO DE COMPRAS
// ───────────────────────────────────────────────────────────────────────────────
/**
 * POST /crear-sesion — crea una sesión de Stripe Checkout con los items del carrito.
 * Body esperado: { carrito: [{ nombre, precio, cantidad }], envio: number, comision?: number }
 */
app.post('/crear-sesion', async (req, res) => {
  const { carrito, envio, comision } = req.body;

  // Valida carrito
  const check = validateCarritoCheckout(carrito);
  if (!check.ok) {
    return res.status(400).json({ error: 'Payload inválido', detalle: check.errors });
  }

  // Valida envio/comision
  const envioChk = coerceNonNegNumber('envio', envio);
  if (!envioChk.ok) return res.status(400).json({ error: envioChk.error });
  const comisionChk = (comision === undefined || comision === null)
    ? { ok: true, value: 0 }
    : coerceNonNegNumber('comision', comision);
  if (!comisionChk.ok) return res.status(400).json({ error: comisionChk.error });

  // Construye items Stripe a partir del carrito
  const itemsStripe = carrito.map(item => ({
    price_data: {
      currency: 'eur',
      product_data: { name: String(item.nombre).trim() },
      unit_amount: Math.max(0, toCents(item.precio)),
    },
    quantity: Number(item.cantidad),
  }));

  // Envío como ítem adicional
  itemsStripe.push({
    price_data: {
      currency: 'eur',
      product_data: { name: 'Envío' },
      unit_amount: Math.max(0, toCents(envioChk.value)),
    },
    quantity: 1,
  });

  // Comisión (si aplica)
  if (comisionChk.value > 0) {
    itemsStripe.push({
      price_data: {
        currency: 'eur',
        product_data: { name: 'Comisión Stripe' },
        unit_amount: Math.max(0, toCents(comisionChk.value)),
      },
      quantity: 1,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: itemsStripe,
      mode: 'payment',
      success_url: `${FRONTEND_URL}/gracias.html`,
      cancel_url: `${FRONTEND_URL}/sorry.html`,
    });
    return res.json({ sessionId: session.id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /guardar-carrito — guarda el pedido en registro.json y sube el archivo a GitHub.
 */
app.post('/guardar-carrito', async (req, res) => {
  const nuevoRegistro = req.body;
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

  // 3) Escribir el archivo actualizado + subir a GitHub
  try {
    fs.writeFileSync(registroPath, JSON.stringify(registros, null, 2), 'utf-8');
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

/**
 * GET /historial — devuelve todos los registros almacenados
 */
app.get('/historial', (_req, res) => {
  if (!fs.existsSync(registroPath)) return res.json([]);
  try {
    const data = fs.readFileSync(registroPath, 'utf-8');
    const registros = data ? JSON.parse(data) : [];
    res.json(registros);
  } catch (err) {
    console.error('Error leyendo historial:', err);
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// 7) HEALTHCHECK Y ARRANQUE
// ───────────────────────────────────────────────────────────────────────────────
// Healthcheck simple para verificar que el servicio vive
app.get('/health', (_req, res) => res.send('ok'));

// Arranque (Render provee PORT por env vars)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en puerto ${PORT}`);
});