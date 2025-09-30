# Anakatana — README

Tienda web estática (frontend en GitHub Pages) + servidor Node/Express (backend en Render) con pagos por Stripe y registro de pedidos versionado en GitHub.

## ✨ Resumen rápido
- **Frontend:** HTML/CSS/JS “vanilla”, hospedado en **GitHub Pages**.
- **Backend:** **Node.js + Express 5**, hospedado en **Render**.
- **Pagos:** **Stripe Checkout** (el backend crea sesiones; Stripe redirige a `gracias.html`).
- **Datos:** `productos.json` y `envios.json` para catálogo y envíos; `registro.json` para historial de compras.
- **Admin:** rutas protegidas por **Bearer token** (`ADMIN_TOKEN`) para ver historial y ajustar stock.
- **CORS:** frontend y backend en dominios distintos; el servidor limita orígenes permitidos.

---

## 📁 Estructura del repo (monorepo)
```
anakatana/
├─ index.html                # Home (catálogo)
├─ producto.html             # Detalle de producto
├─ checkout.html             # Checkout (previo a Stripe)
├─ gracias.html              # Página de éxito tras Stripe
├─ about.html                # Info
├─ admin/                    # Vistas de administración
│  ├─ index.html             # Login/token + panel
│  ├─ stock.html             # Ajuste de stock
│  └─ tickets.html           # Historial de pedidos (CSV/JSON)
├─ css/
│  └─ styles.css
├─ js/
│  ├─ app.js                 # Carrito (localStorage) + utilidades comunes
│  ├─ home.js                # Carga/galería de productos
│  ├─ producto.js            # Vista de producto + tallas + popup imagen
│  ├─ checkout.js            # Orquesta POST /crear-sesion (Stripe)
│  ├─ gracias.js             # POST /guardar-carrito y limpieza carrito
│  ├─ navBtns.js             # Botones fijos (carrito, home, etc.)
│  └─ logoTexture.js         # Efectos visuales (opcional)
├─ data/                     # Datos estáticos servidos por GH Pages
│  ├─ productos.json
│  └─ envios.json
└─ data/                     # **(backend Node/Express en Render)**
   ├─ index.js               # Servidor Express 5
   ├─ package.json
   ├─ package-lock.json
   └─ registro.json          # Historial de compras (generado/actualizado)
```

> Nota: En GH Pages todo es estático; el **backend solo se ejecuta en Render**. El repositorio contiene ambos para facilitar despliegue y versionado.

---

## 🖥️ Frontend (GitHub Pages)
- **Stack:** HTML + CSS + JavaScript sin framework.
- **Páginas clave:**
  - `index.html` (lista de productos), `producto.html`, `checkout.html`, `gracias.html`, `about.html`.
  - `admin/*` para gestión de stock e historial (requiere token).
- **Datos:** suele leer `data/productos.json` y `data/envios.json` directamente (petición estática).
- **Carrito:** `localStorage` (persistente entre páginas).
- **Checkout:** llama al backend → `POST /crear-sesion` → redirección a **Stripe Checkout**.
- **Post‑pago:** en `gracias.html`, se hace `POST /guardar-carrito` al backend y se vacía el carrito.

### Variables “front” típicas
- **URL del backend**: codificada en los JS del front, p.ej. `https://anakatana-backend.onrender.com`.
- **Token admin**: lo introduce la persona admin (no está en el código). Se guarda en `localStorage` y se añade como header `Authorization: Bearer <TOKEN>`.

---

## 🔧 Backend (Render • Node.js + Express 5)
- **Dependencias principales:**
  - `express` (API REST), `cors` (CORS), `stripe` (pagos), `@octokit/rest` (subir `registro.json` a GitHub).
- **Archivos de datos:**
  - `productos.json`, `envios.json` (lectura/escritura de catálogo/envíos).
  - `registro.json` (historial de compras; el backend lo actualiza y sube a GitHub).
- **Seguridad/admin:**
  - Middleware de **token** via `Authorization: Bearer …` para rutas `/admin/*`.

### Variables de entorno (Render)
| Variable             | Uso |
|----------------------|-----|
| `FRONTEND_URL`       | Origen permitido en CORS y `success_url`/`cancel_url` de Stripe (p.ej. `https://meowrhino.github.io/anakatana`). |
| `ADMIN_TOKEN`        | Token secreto para rutas de administración. |
| `STRIPE_SECRET_KEY`  | Clave secreta de Stripe (crear Checkout Sessions). |
| `GITHUB_TOKEN`       | Token con permisos de escritura al repo (subir `registro.json`). |
| `PORT`               | Asignado por Render. El server hace `app.listen(process.env.PORT || 3000)`. |

> **Importante:** los secretos viven **solo** en Render (nunca en GH Pages).

### Endpoints principales
| Método | Ruta                      | Descripción |
|-------:|---------------------------|-------------|
| GET    | `/health`                 | Comprobación de estado del servicio. |
| GET    | `/productos`              | Devuelve catálogo (`productos.json`). |
| POST   | `/editar-stock`           | Actualiza stock de un producto (simple). |
| POST   | `/crear-sesion`           | Crea **Stripe Checkout Session** con el carrito. |
| POST   | `/guardar-carrito`        | Registra compra: añade a `registro.json`, ajusta stock y sube a GitHub. |
| GET    | `/admin/historial`        | **(Admin)** Lista de pedidos (JSON, admite `?limit=`). |
| GET    | `/admin/historial.csv`    | **(Admin)** Historial en CSV. |
| POST   | `/admin/stock-bulk`       | **(Admin)** Actualización masiva de stock. |

> Las rutas **admin** requieren header: `Authorization: Bearer <ADMIN_TOKEN>`.

### Ejemplos rápidos (cURL)
```bash
# Catálogo
curl https://anakatana-backend.onrender.com/productos

# Crear sesión de pago (ejemplo mínimo)
curl -X POST https://anakatana-backend.onrender.com/crear-sesion   -H "Content-Type: application/json"   -d '{ "items":[{"id":"T01","qty":2}], "envio":"PENINSULA" }'

# Guardar carrito tras éxito
curl -X POST https://anakatana-backend.onrender.com/guardar-carrito   -H "Content-Type: application/json"   -d '{ "orderId":"...", "items":[...], "total":123.45 }'

# Historial admin (JSON)
curl -H "Authorization: Bearer $ADMIN_TOKEN"   https://anakatana-backend.onrender.com/admin/historial?limit=50

# Stock masivo admin
curl -X POST https://anakatana-backend.onrender.com/admin/stock-bulk   -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json"   -d '{ "productos":[{"id":"T01","stock":7},{"id":"T02","stock":0}] }'
```

---

## 🔄 Flujo de datos (de 0 a 💳)
1. **Home** (`index.html`) carga `data/productos.json` → renderiza catálogo.
2. Usuario **añade al carrito** → `localStorage` guarda items.
3. En **checkout** → `POST /crear-sesion` (backend crea sesión Stripe) → redirección a Stripe.
4. Pago **OK** → Stripe redirige a `gracias.html`.
5. **gracias.js** → `POST /guardar-carrito` (backend registra pedido, ajusta stock, sube `registro.json` a GitHub) → limpiar carrito local.

> El front puede seguir leyendo `productos.json` desde GH Pages: como el backend lo actualiza y sube, la copia estática se mantiene **casi** al día (puede existir un ligero retardo de publicación).

---

## 🚀 Despliegue

### Backend en Render
1. Servicio **Web** Node.js apuntando a la carpeta del backend (p.ej. `anakatana/data`).
2. Scripts en `package.json`: `"start": "node index.js"`.
3. Configurar **Environment Variables**: `FRONTEND_URL`, `ADMIN_TOKEN`, `STRIPE_SECRET_KEY`, `GITHUB_TOKEN`.
4. Desplegar → URL pública tipo `https://anakatana-backend.onrender.com`.

### Frontend en GitHub Pages
1. Publicar rama `main` (raíz) o `gh-pages` (según preferencia).
2. Acceso por `https://<usuario>.github.io/anakatana/`.
3. Asegúrate de que el front apunte al dominio correcto del backend Render.

---

## 🛠️ Desarrollo local

### Requisitos
- Node.js LTS (para el backend).
- Un servidor estático local (o VSCode Live Server) para servir el front.

### Backend
```bash
cd data
npm install
# Opcional: crear .env con claves (o exportarlas en tu shell)
# STRIPE_SECRET_KEY=...
# GITHUB_TOKEN=...
# ADMIN_TOKEN=...
# FRONTEND_URL=http://127.0.0.1:5500
npm start
# Servirá en http://localhost:3000 (o el PORT que definas)
```

### Frontend
- Abre la raíz del proyecto con Live Server (o similar).
- Navega a `http://127.0.0.1:5500/` (o el puerto configurado).
- **Importante:** si usas el backend local, cambia temporalmente la URL del backend en los JS del front o define una variable global para apuntar a `http://localhost:3000`.

---

## 🔐 Seguridad y consideraciones
- **No exponer** claves en el frontend. Mantener secretos solo en Render.
- **CORS**: mantener la lista de orígenes permitidos acorde a tus dominios.
- **Admin token**: rotarlo periódicamente; guardarlo solo en el navegador del admin (y borrarlo al terminar).
- **Stripe**: el flujo se apoya en la redirección de éxito; para producción, considerar **webhooks** de Stripe para confirmaciones **server‑to‑server**.
- **JSON como “DB”**: simple y didáctico, pero no escala para alto tráfico ni concurrencia.

---

## 🧭 Roadmap sugerido
- [ ] Añadir **webhook de Stripe** para robustez del post‑pago.
- [ ] Endpoint para **invalidar caché** o un **versión hash** en `productos.json` (evitar lecturas obsoletas).
- [ ] Unificar la **config** del backend URL en un único archivo JS del front.
- [ ] Mejorar **accesibilidad** (focus states, ARIA, contrastes).
- [ ] Implementar **filtros/búsquedas** en el catálogo.
- [ ] Tests básicos (unitarios para helpers, integración para endpoints clave).

---

## 📄 Licencia
Elige una licencia (MIT/Apache-2.0/GPL‑3.0) y añádela al repositorio si corresponde.

---

## 🤝 Créditos
Proyecto educativo/didáctico. Frontend en GitHub Pages + Backend en Render + Stripe + GitHub (Octokit) para versionar el historial.
