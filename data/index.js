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
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// URL del frontend para redirecciones de Stripe (puede venir por env var)
const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://meowrhino.github.io/anakatana";

// ───────────────────────────────────────────────────────────────────────────────
// 2) INICIALIZACIÓN DE EXPRESS + CORS + PARSERS
// ───────────────────────────────────────────────────────────────────────────────
const app = express();

/** === Admin auth (token simple) === */
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
function adminAuth(req, res, next) {
  const h = req.headers["authorization"] || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (ADMIN_TOKEN && token === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: "unauthorized" });
}

/**
 * CORS: permitimos orígenes de desarrollo y el dominio público de producción.
 *  - Si cambias dónde sirves el front, añade su URL en ALLOWED_ORIGINS.
 */
const ALLOWED_ORIGINS = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://meowrhino.github.io",
];
app.use(
  cors({
    origin(origin, cb) {
      // Permite peticiones sin origin (curl, healthchecks) o listadas
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parser JSON
app.use(express.json());

// ───────────────────────────────────────────────────────────────────────────────
// 3) HELPERS DE VALIDACIÓN Y UTILIDADES
// ───────────────────────────────────────────────────────────────────────────────
const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const toCents = (eur) => Math.round(Number(eur) * 100);

/** Valida carrito para /pedido (stock): [{ id, cantidad }] */
function validateCarritoStock(carrito) {
  const errors = [];
  if (!Array.isArray(carrito) || carrito.length === 0) {
    return {
      ok: false,
      errors: ["carrito debe ser un array con al menos 1 ítem"],
    };
  }
  carrito.forEach((it, idx) => {
    if (!("id" in it)) errors.push(`item[${idx}].id requerido`);
    if (!("cantidad" in it)) errors.push(`item[${idx}].cantidad requerida`);
    const qty = Number(it.cantidad);
    if (!Number.isInteger(qty) || qty <= 0)
      errors.push(`item[${idx}].cantidad debe ser entero ≥ 1`);
  });
  return { ok: errors.length === 0, errors };
}

/** Valida carrito para /crear-sesion (Stripe): [{ nombre, precio, cantidad }] */
function validateCarritoCheckout(carrito) {
  const errors = [];
  if (!Array.isArray(carrito) || carrito.length === 0) {
    return {
      ok: false,
      errors: ["carrito debe ser un array con al menos 1 ítem"],
    };
  }
  carrito.forEach((it, idx) => {
    if (!isNonEmptyString(it.nombre))
      errors.push(`item[${idx}].nombre string requerido`);
    const precioNum = Number(it.precio);
    if (!Number.isFinite(precioNum) || precioNum < 0)
      errors.push(`item[${idx}].precio debe ser número ≥ 0`);
    const qty = Number(it.cantidad);
    if (!Number.isInteger(qty) || qty <= 0)
      errors.push(`item[${idx}].cantidad debe ser entero ≥ 1`);
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
const dbPath = path.join(__dirname, "productos.json");
const registroPath = path.join(__dirname, "registro.json");

// Helpers para leer/escribir los JSON (siempre como texto UTF-8)
const leerProductos = () => JSON.parse(fs.readFileSync(dbPath, "utf-8"));
const guardarProductos = (productos) =>
  fs.writeFileSync(dbPath, JSON.stringify(productos, null, 2), "utf-8");

// ─── Newsletter & Visitas (paths y helpers) ───────────────────────────────────
const newsletterPath = path.join(__dirname, "newsletter.json");
const visitasPath = path.join(__dirname, "visitas.json");

function leerJSONSeguro(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); }
  catch { fs.writeFileSync(p, JSON.stringify(fallback, null, 2), "utf-8"); return fallback; }
}

const leerNewsletter = () => leerJSONSeguro(newsletterPath, { suscritos: [] });
const guardarNewsletter = (obj) => fs.writeFileSync(newsletterPath, JSON.stringify(obj, null, 2), "utf-8");

const leerVisitas = () => leerJSONSeguro(visitasPath, {});
const guardarVisitas = (obj) => fs.writeFileSync(visitasPath, JSON.stringify(obj, null, 2), "utf-8");

// ───────────────────────────────────────────────────────────────────────────────
// 4) RUTAS DE CATÁLOGO Y STOCK
// ───────────────────────────────────────────────────────────────────────────────
/**
 * GET /productos — devuelve el catálogo completo desde productos.json
 */
app.get("/productos", (_req, res) => {
  const productos = leerProductos();
  res.json(productos);
});

/**
 * POST /pedido — descuenta stock del JSON si hay unidades suficientes.
 * Body esperado: { carrito: [{ id, cantidad }, ...] }
 */
app.post("/pedido", (req, res) => {
  const { carrito } = req.body;
  const check = validateCarritoStock(carrito);
  if (!check.ok) {
    return res
      .status(400)
      .json({ error: "Payload inválido", detalle: check.errors });
  }

  const productos = leerProductos();
  const sinStock = [];

  carrito.forEach((item) => {
    const qty = Number(item.cantidad);
    const producto = productos.find((p) => p.id === item.id);
    if (producto) {
      if (Number.isFinite(producto.stock) && producto.stock >= qty) {
        producto.stock -= qty;
      } else {
        sinStock.push({
          id: producto.id,
          disponible: Math.max(0, Number(producto.stock) || 0),
        });
      }
    }
  });

  if (sinStock.length > 0) {
    return res
      .status(400)
      .json({
        error: "Algunos productos no tienen suficiente stock",
        sinStock,
      });
  }

  try {
    guardarProductos(productos);
    return res.json({
      success: true,
      mensaje: "Pedido registrado y stock actualizado",
    });
  } catch (e) {
    console.error("Error guardando productos:", e);
    return res.status(500).json({ error: "Error guardando stock" });
  }
});

/**
 * POST /editar-stock — actualiza el stock de un producto concreto.
 * Body esperado: { id, nuevoStock }
 */
app.post("/editar-stock", (req, res) => {
  const { id, nuevoStock } = req.body;
  const stockNum = Number(nuevoStock);
  if (!Number.isInteger(stockNum) || stockNum < 0) {
    return res.status(400).json({ error: "nuevoStock debe ser entero ≥ 0" });
  }

  const productos = leerProductos();
  const producto = productos.find((p) => p.id === id);
  if (!producto)
    return res.status(404).json({ error: "Producto no encontrado" });

  producto.stock = stockNum;
  try {
    guardarProductos(productos);
    return res.json({
      success: true,
      mensaje: "Stock actualizado correctamente",
    });
  } catch (e) {
    console.error("Error guardando productos:", e);
    return res.status(500).json({ error: "Error guardando stock" });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// 5) INTEGRACIONES: STRIPE + GITHUB (para registro de compras)
// ───────────────────────────────────────────────────────────────────────────────
// Stripe: clave desde variables de entorno en Render
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("⚠️ STRIPE_SECRET_KEY no está definida. /crear-sesion fallará.");
}

// GitHub: para subir el registro.json al repositorio
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
if (!process.env.GITHUB_TOKEN) {
  console.warn(
    "⚠️ GITHUB_TOKEN no está definido. Subida a GitHub puede fallar."
  );
}

/**
 * Sube `registro.json` al repo remoto en la ruta `anakatana/data/registro.json`.
 *  - Si cambias la ubicación en tu repo, actualiza `ghPath`.
 */
async function subirRegistroAGitHub(contenidoBase64, sha) {
  const owner = "meowrhino"; // usuario/organización
  const repo = "anakatana"; // nombre del repo
  const ghPath = "data/registro.json"; // ruta dentro del repo

  // Si no tenemos SHA, intenta obtenerlo (para update vs create)
  if (!sha) {
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: ghPath,
      });
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
    sha,
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// 6) RUTAS DE CHECKOUT Y REGISTRO DE COMPRAS
// ───────────────────────────────────────────────────────────────────────────────
/**
 * POST /crear-sesion — crea una sesión de Stripe Checkout con los items del carrito.
 * Body esperado: { carrito: [{ nombre, precio, cantidad }], envio: number, comision?: number }
 */
app.post("/crear-sesion", async (req, res) => {
  const { carrito, envio, comision } = req.body;

  // Valida carrito
  const check = validateCarritoCheckout(carrito);
  if (!check.ok) {
    return res
      .status(400)
      .json({ error: "Payload inválido", detalle: check.errors });
  }

  // Valida envio/comision
  const envioChk = coerceNonNegNumber("envio", envio);
  if (!envioChk.ok) return res.status(400).json({ error: envioChk.error });
  const comisionChk =
    comision === undefined || comision === null
      ? { ok: true, value: 0 }
      : coerceNonNegNumber("comision", comision);
  if (!comisionChk.ok)
    return res.status(400).json({ error: comisionChk.error });

  // Construye items Stripe a partir del carrito
  const itemsStripe = carrito.map((item) => ({
    price_data: {
      currency: "eur",
      product_data: { name: String(item.nombre).trim() },
      unit_amount: Math.max(0, toCents(item.precio)),
    },
    quantity: Number(item.cantidad),
  }));

  // Envío como ítem adicional
  itemsStripe.push({
    price_data: {
      currency: "eur",
      product_data: { name: "Envío" },
      unit_amount: Math.max(0, toCents(envioChk.value)),
    },
    quantity: 1,
  });

  // Comisión (si aplica)
  if (comisionChk.value > 0) {
    itemsStripe.push({
      price_data: {
        currency: "eur",
        product_data: { name: "Comisión Stripe" },
        unit_amount: Math.max(0, toCents(comisionChk.value)),
      },
      quantity: 1,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: itemsStripe,
      mode: "payment",
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
app.post("/guardar-carrito", async (req, res) => {
  const nuevoRegistro = req.body;
  console.log("📝 /guardar-carrito recibe:", nuevoRegistro);
  let registros = [];

  // 1) Leer registros previos si existe el archivo
  if (fs.existsSync(registroPath)) {
    try {
      const data = fs.readFileSync(registroPath, "utf-8");
      registros = data ? JSON.parse(data) : [];
    } catch (err) {
      console.warn("⚠️ No se pudo parsear registro.json, se reinicia array");
      registros = [];
    }
  }

  // 2) Agregar el nuevo registro
  registros.push(nuevoRegistro);

  // === MVP: restar stock según carrito ===
  try {
    const productos = leerProductos();
    if (Array.isArray(nuevoRegistro?.carrito)) {
      nuevoRegistro.carrito.forEach((it) => {
        const id = Number(it.id);
        const cant = Number(it.cantidad) || 0;
        const p = productos.find((x) => Number(x.id) === id);
        if (p) {
          const prev = Number(p.stock) || 0;
          p.stock = Math.max(0, prev - cant);
        } else {
          console.warn("⚠️ Producto no encontrado al restar stock:", id);
        }
      });
      guardarProductos(productos);
      console.log("✅ Stock actualizado tras compra");
    }
  } catch (e) {
    console.error("❌ Error actualizando stock tras compra:", e);
  }
  // === /MVP ===

  // 3) Escribir el archivo actualizado + subir a GitHub
  try {
    fs.writeFileSync(registroPath, JSON.stringify(registros, null, 2), "utf-8");
    try {
      const contenido = fs.readFileSync(registroPath, "utf-8");
      const contenidoBase64 = Buffer.from(contenido).toString("base64");
      await subirRegistroAGitHub(contenidoBase64);
      console.log("✅ registro.json subido a GitHub");
    } catch (err) {
      console.error("❌ Error subiendo registro.json a GitHub:", err);
    }
    console.log("✅ Registro guardado:", nuevoRegistro);
    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("❌ Error escribiendo registro.json:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

/**
 * GET /historial — devuelve todos los registros almacenados
 */
app.get("/historial", (_req, res) => {
  if (!fs.existsSync(registroPath)) return res.json([]);
  try {
    const data = fs.readFileSync(registroPath, "utf-8");
    const registros = data ? JSON.parse(data) : [];
    res.json(registros);
  } catch (err) {
    console.error("Error leyendo historial:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── NEWSLETTER ───────────────────────────────────────────────────────────────
// GET /newsletter/:email  -> {suscrito: true/false}
app.get("/newsletter/:email", (req, res) => {
  const email = String(req.params.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "email requerido" });
  const { suscritos } = leerNewsletter();
  return res.json({ suscrito: suscritos.includes(email) });
});

// POST /newsletter  body: {email}
app.post("/newsletter", async (req, res) => {
  try {
    const email = String((req.body?.email || "")).trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: "email inválido" });
    }

    const data = leerNewsletter();
    const yaEstaba = data.suscritos.includes(email);
    if (!yaEstaba) {
      data.suscritos.push(email);
      try { guardarNewsletter(data); } catch (e) { console.error("Error guardando newsletter.json local:", e); }
      // Subir a GitHub para reflejar en el repo
      const body = JSON.stringify(data, null, 2);
      try {
        await upsertFileOnGitHub(
          "data/newsletter.json",
          body,
          `chore: newsletter add ${email} (${new Date().toISOString()})`
        );
      } catch (e) {
        console.error("GitHub upsert newsletter.json falló:", e.message || e);
      }
      return res.status(201).json({ ok: true, new: true, email, total: data.suscritos.length });
    }

    // Ya estaba
    return res.status(409).json({ ok: true, new: false, email, total: data.suscritos.length });
  } catch (err) {
    console.error("/newsletter error:", err);
    return res.status(500).json({ error: "internal" });
  }
});

// ─── SEGUIMIENTO DE VISITAS ───────────────────────────────────────────────────
// POST /visitas  body: {clave: "home" | "producto_T02" | ...}
app.post("/visitas", async (req, res) => {
  try {
    let clave = String(req.body?.clave || "").trim();
    if (!clave) return res.status(400).json({ error: "clave requerida" });
    clave = clave.replace(/[^a-z0-9_]/gi, "_").toLowerCase();

    const v = leerVisitas();
    v[clave] = (v[clave] || 0) + 1;
    try { guardarVisitas(v); } catch (e) { console.error("Error guardando visitas.json local:", e); }

    // Subir a GitHub para reflejar en el repo (cap opcional de tamaño si lo añades en el futuro)
    const body = JSON.stringify(v, null, 2);
    try {
      await upsertFileOnGitHub(
        "data/visitas.json",
        body,
        `chore: visitas ${clave} (+1) (${new Date().toISOString()})`
      );
    } catch (e) {
      console.error("GitHub upsert visitas.json falló:", e.message || e);
    }

    // 204 No Content es suficiente para el front; si prefieres JSON, cambia a 200 con payload
    return res.sendStatus(204);
  } catch (err) {
    console.error("/visitas error:", err);
    return res.status(500).json({ error: "internal" });
  }
});

// GET /visitas -> objeto completo (opcionalment se puede proteger)
app.get("/visitas", (_req, res) => {
  res.json(leerVisitas());
});

// ───────────────────────────────────────────────────────────────────────────────
// 7) HEALTHCHECK Y ARRANQUE
// ───────────────────────────────────────────────────────────────────────────────
// Healthcheck simple para verificar que el servicio vive
app.get("/health", (_req, res) => res.send("ok"));

// Arranque (Render provee PORT por env vars)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en puerto ${PORT}`);
});

/** Subir/actualizar archivo en GitHub (ruta dentro del repo) */
async function upsertFileOnGitHub(pathInRepo, contentString, message) {
  if (!process.env.GITHUB_TOKEN) return null;
  try {
    const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = "meowrhino";
    const repo = "anakatana";
    // get SHA if exists
    let sha;
    try {
      const { data: current } = await gh.repos.getContent({
        owner,
        repo,
        path: pathInRepo,
      });
      if (!Array.isArray(current)) sha = current.sha;
    } catch (_) {}
    const result = await gh.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: pathInRepo,
      message,
      content: Buffer.from(contentString).toString("base64"),
      sha,
    });
    return result;
  } catch (e) {
    console.error("GitHub upsert error:", e.message);
    return null;
  }
}

/** Admin: actualizar stock en lote
 * Body: { updates: [{id, stock}, ...] }
 */
app.post("/admin/stock-bulk", adminAuth, (req, res) => {
  const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];
  if (!updates.length) return res.status(400).json({ error: "no updates" });

  const productos = leerProductos();
  let updated = 0;
  updates.forEach((u) => {
    const id = Number(u.id);
    const s = Number(u.stock);
    if (!Number.isInteger(id) || !Number.isFinite(s) || s < 0) return;
    const p = productos.find((x) => Number(x.id) === id);
    if (p) {
      p.stock = s;
      updated++;
    }
  });
  guardarProductos(productos);

  // opcional: subir productos.json al repo para reflejar en GitHub Pages
  const body = JSON.stringify(productos, null, 2);
  upsertFileOnGitHub(
    "data/productos.json",
    body,
    `chore(admin): stock-bulk (${new Date().toISOString()})`
  )
    .then(() => {})
    .catch(() => {});

  res.json({ updated });
});

/** Admin: reemplazar productos.json completo
 * Acepta: { productos: [...] } o directamente un array []
 */
app.post("/admin/productos", adminAuth, (req, res) => {
  const payload = req.body;
  const productos = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.productos)
    ? payload.productos
    : null;
  if (!Array.isArray(productos))
    return res.status(400).json({ error: "productos debe ser array" });

  // Validación simple de estructura
  for (const p of productos) {
    if (typeof p !== "object" || p == null)
      return res.status(400).json({ error: "producto inválido" });
    if (!("id" in p) || !("precio" in p) || !("titulo" in p))
      return res
        .status(400)
        .json({ error: "producto incompleto (id, titulo, precio requeridos)" });
  }

  // Persistir
  try {
    fs.writeFileSync(dbPath, JSON.stringify(productos, null, 2), "utf-8");
  } catch (e) {
    console.error("No se pudo guardar productos.json:", e);
    return res.status(500).json({ error: "no se pudo guardar productos.json" });
  }

  // subir a GitHub para que GitHub Pages lo sirva
  const body = JSON.stringify(productos, null, 2);
  upsertFileOnGitHub(
    "data/productos.json",
    body,
    `chore(admin): actualizar productos (${new Date().toISOString()})`
  )
    .then(() => {})
    .catch(() => {});

  res.json({ ok: true, count: productos.length });
});

/** Admin: exportar historial en CSV */
app.get("/admin/historial.csv", adminAuth, (_req, res) => {
  let registros = [];
  try {
    if (fs.existsSync(registroPath)) {
      registros = JSON.parse(fs.readFileSync(registroPath, "utf-8") || "[]");
    }
  } catch (e) {}
  const escape = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const csv = [
    "id,fecha,email,total,envio,comision,productos",
    ...registros.map((r) =>
      [
        r.id,
        r.fecha,
        r?.direccion?.email || "",
        r.total,
        r.precioEnvio,
        r.precioComision,
        (r.carrito || [])
          .map((it) => `${it.nombre} x${it.cantidad}`)
          .join(" / "),
      ]
        .map(escape)
        .join(",")
    ),
  ].join("\n");
  res.type("text/csv").send(csv);
});

/** Admin: historial paginado JSON */
app.get("/admin/historial", adminAuth, (req, res) => {
  let registros = [];
  try {
    if (fs.existsSync(registroPath)) {
      registros = JSON.parse(fs.readFileSync(registroPath, "utf-8") || "[]");
    }
  } catch (e) {}
  const total = registros.length;
  const off = Math.max(0, parseInt(req.query.offset || "0", 10));
  const lim = Math.max(
    1,
    Math.min(500, parseInt(req.query.limit || "100", 10))
  );
  res.json({ total, items: registros.slice(off, off + lim) });
});
