# Análisis del Ecommerce Anakatana y Plan de Acción

## 📊 Resumen del Proyecto

**Anakatana** es una tienda web estática con las siguientes características:

- **Frontend:** HTML/CSS/JS vanilla hospedado en GitHub Pages
- **Backend:** Node.js + Express 5 hospedado en Render (plan gratuito)
- **Pagos:** Stripe Checkout
- **Datos:** Sistema basado en archivos JSON (`productos.json`, `envios.json`, `registro.json`, `newsletter.json`, `visitas.json`)
- **Admin:** Panel protegido por Bearer token para gestión de stock e historial

---

## 🔍 Sistema de Tracking Actual

He identificado un **sistema de tracking interno completo** que registra visitas a páginas. Este sistema está implementado en múltiples capas:

### 1. Frontend (Cliente)

**Archivo:** `js/app.js` (líneas 466-489)

```javascript
(function trackPageView(){
  try {
    const pageType = document.body.dataset.pageType || "home";
    let clave = pageType;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id");

    if ((pageType === "producto" || pageType === "product") && id) {
      clave = `producto_${id}`;
    }

    fetch(`${window.API_BASE}/visitas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave })
    })
    .then(r => { if (!r.ok) console.warn('[visitas] respuesta no OK', r.status); })
    .catch(err => console.warn('[visitas] error de red', err));
  } catch (err) {
    console.warn('[visitas] error inesperado', err);
  }
})();
```

**Funcionamiento:**
- Se ejecuta automáticamente en cada carga de página
- Lee el atributo `data-page-type` del `<body>` (ej: "home", "producto", "checkout")
- Envía un POST al backend con la clave de la página visitada
- Para productos, incluye el ID del producto en la clave

### 2. Backend (Servidor)

**Archivo:** `data/index.js` (líneas 595-703)

**Componentes del sistema:**

#### a) Almacenamiento y Cache
- `visitas.json`: Archivo JSON que almacena todos los registros de visitas
- `visitasCache`: Variable en memoria que mantiene el estado actual
- Cada visita genera un registro con: `id` (timestamp), `fecha`, `path`

#### b) Endpoints
- **POST /visitas**: Recibe y registra cada visita
- **GET /visitas**: Devuelve el objeto completo de visitas (sin protección)

#### c) Sistema de Sincronización con GitHub
- **Buffer de eventos:** Acumula visitas en memoria
- **Flush periódico:** Cada 10 minutos sube `visitas.json` a GitHub
- **Flush por umbral:** Si se acumulan 200+ visitas, fuerza la subida
- **Graceful shutdown:** Al recibir SIGTERM/SIGINT, hace commit de visitas pendientes

#### d) Archivos relacionados
- `data/visitas.json`: Almacenamiento principal
- `data/visitas_resumen.json`: Posible archivo de resumen (encontrado en estructura)

---

## 🎯 Plan de Acción Detallado

### Fase 1: Eliminación del Sistema de Tracking

#### 1.1 Frontend - Modificaciones en JavaScript

**Archivo: `js/app.js`**
- ✅ **Eliminar:** Función completa `trackPageView()` (líneas 466-489)
- ✅ **Verificar:** No hay otras referencias a `/visitas` en el código

**Otros archivos JS a revisar:**
- `js/home.js` ✓ (sin referencias a tracking)
- `js/producto.js` ✓ (sin referencias a tracking)
- `js/checkout.js` ✓ (sin referencias a tracking)
- `js/gracias.js` (revisar por si acaso)
- `js/newsletter.js` ✓ (solo usa `/newsletter`, no tracking)

#### 1.2 Backend - Modificaciones en Node.js

**Archivo: `data/index.js`**

**Eliminar las siguientes secciones:**

1. **Variables y paths** (líneas ~169, 197-198):
   ```javascript
   const visitasPath = path.join(__dirname, "visitas.json");
   const leerVisitas = () => leerJSONSeguro(visitasPath, { registros: [] });
   const guardarVisitas = (obj) => fs.writeFileSync(...);
   ```

2. **Sistema de cache y flush** (líneas 595-657):
   - Variables: `visitasCache`, `lastCommittedLen`, `isFlushing`, `FLUSH_THRESHOLD`
   - Función: `guardarVisitasGitHub()`
   - Función: `tryFlush()`
   - Intervalo: `visitasInterval`
   - Modificar: `gracefulShutdown()` para eliminar referencias a visitas

3. **Endpoints** (líneas 660-703):
   - `POST /visitas`
   - `GET /visitas`

#### 1.3 Archivos de Datos

**Eliminar del repositorio:**
- `data/visitas.json`
- `data/visitas_resumen.json` (si existe)

**Nota:** Estos archivos se pueden respaldar antes de eliminar si se desea conservar el historial.

---

### Fase 2: Implementación de Pantalla de Carga

#### 2.1 Análisis del Problema

**Situación actual:**
- El frontend carga desde `https://anakatana-backend.onrender.com/productos`
- Render (plan gratuito) tiene **cold start** cuando el servicio está inactivo
- Durante la carga, la página muestra un espacio en blanco
- El hero image (`img/hifas_home.png`) está hardcodeado en el HTML

**Objetivo:**
- Mostrar una pantalla de carga atractiva mientras se obtienen los productos
- Ocultar automáticamente la pantalla cuando los productos estén renderizados

#### 2.2 Diseño de la Solución

**Componentes a crear:**

1. **HTML - Estructura del loader** (en `index.html`)
   ```html
   <div id="loading-screen" class="loading-screen">
     <div class="loading-content">
       <img src="root/hifasLogo.png" alt="Hifas" class="loading-logo">
       <div class="loading-spinner"></div>
       <p class="loading-text">Cargando productos...</p>
     </div>
   </div>
   ```

2. **CSS - Estilos del loader** (en `css/styles.css`)
   - Overlay fullscreen con fondo semi-transparente o sólido
   - Logo centrado con animación sutil
   - Spinner CSS puro (sin dependencias)
   - Animación de fade-out al ocultar
   - Responsive design

3. **JavaScript - Lógica de control** (modificar `js/home.js`)
   - Mostrar loader al inicio
   - Ocultar loader después de `renderProductos()`
   - Manejar errores (mostrar mensaje si falla la carga)
   - Timeout de seguridad (ocultar después de X segundos aunque falle)

#### 2.3 Implementación Técnica

**Modificaciones en `js/home.js`:**

```javascript
async function cargarProductos() {
  const loader = document.getElementById('loading-screen');
  
  try {
    // Mostrar loader (ya está visible por defecto en HTML)
    
    const respuesta = await fetch(`${window.API_BASE}/productos`);
    
    if (!respuesta.ok) {
      throw new Error(`HTTP error! status: ${respuesta.status}`);
    }
    
    productosHome = await respuesta.json();
    applySort("name-asc");
    
    // Ocultar loader después de renderizar
    setTimeout(() => {
      if (loader) {
        loader.classList.add('fade-out');
        setTimeout(() => loader.remove(), 300);
      }
    }, 300); // Pequeño delay para suavizar la transición
    
  } catch (error) {
    console.error('Error cargando productos:', error);
    
    // Mostrar mensaje de error en el loader
    const loadingText = loader?.querySelector('.loading-text');
    if (loadingText) {
      loadingText.textContent = 'Error al cargar productos. Recargando...';
      loadingText.style.color = '#ff6b6b';
    }
    
    // Reintentar después de 2 segundos
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }
}
```

**Características del diseño:**
- **Minimalista:** Acorde al diseño actual de Anakatana
- **Performante:** CSS puro, sin librerías externas
- **Accesible:** Incluye atributos ARIA y texto alternativo
- **Responsive:** Funciona en todos los tamaños de pantalla
- **Reutilizable:** Puede adaptarse a otras páginas si es necesario

---

## 📋 Checklist de Implementación

### ✅ Tracking - Frontend
- [ ] Eliminar función `trackPageView()` de `js/app.js`
- [ ] Revisar `js/gracias.js` por referencias a tracking
- [ ] Buscar cualquier otra referencia a `/visitas` en JS

### ✅ Tracking - Backend
- [ ] Eliminar imports y variables relacionadas con visitas
- [ ] Eliminar función `guardarVisitasGitHub()`
- [ ] Eliminar endpoints `POST /visitas` y `GET /visitas`
- [ ] Limpiar `gracefulShutdown()` de referencias a visitas
- [ ] Eliminar intervalo `visitasInterval`

### ✅ Tracking - Archivos
- [ ] Respaldar `data/visitas.json` (opcional)
- [ ] Eliminar `data/visitas.json` del repositorio
- [ ] Eliminar `data/visitas_resumen.json` (si existe)

### ✅ Loading Screen - HTML
- [ ] Agregar estructura del loader en `index.html`
- [ ] Verificar rutas de imágenes (logo)

### ✅ Loading Screen - CSS
- [ ] Crear estilos para `.loading-screen`
- [ ] Crear animación del spinner
- [ ] Crear animación de fade-out
- [ ] Probar en diferentes dispositivos

### ✅ Loading Screen - JavaScript
- [ ] Modificar `cargarProductos()` en `js/home.js`
- [ ] Implementar manejo de errores
- [ ] Implementar timeout de seguridad
- [ ] Probar con conexión lenta

### ✅ Testing
- [ ] Probar carga normal de productos
- [ ] Probar con cold start de Render
- [ ] Probar manejo de errores
- [ ] Verificar que no hay errores en consola
- [ ] Verificar que no hay llamadas a `/visitas`

---

## 🚀 Orden de Ejecución Recomendado

1. **Crear rama de trabajo** en Git
2. **Eliminar tracking del frontend** (menos crítico, no rompe nada)
3. **Implementar loading screen** (mejora UX inmediatamente)
4. **Eliminar tracking del backend** (requiere redeploy en Render)
5. **Probar en local** con backend local
6. **Deploy a producción** (GitHub Pages + Render)
7. **Verificar en producción** que todo funciona correctamente

---

## ⚠️ Consideraciones Importantes

### Cloudflare Analytics
- Una vez eliminado el tracking interno, configurar **Cloudflare Web Analytics** en el dominio
- Agregar el script de Cloudflare en el `<head>` de las páginas HTML
- No requiere modificaciones en el backend

### Render Free Tier
- El cold start puede tardar **30-60 segundos** en activarse
- La loading screen debe ser paciente y dar feedback al usuario
- Considerar agregar un mensaje tipo "Esto puede tardar un momento en la primera carga"

### Backup de Datos
- Antes de eliminar `visitas.json`, hacer un backup si se desea conservar el historial
- El archivo se puede descargar desde GitHub o desde el servidor de Render

### Testing
- Probar exhaustivamente en local antes de hacer deploy
- Verificar que el backend arranca sin errores después de eliminar el código de tracking
- Comprobar que no hay referencias rotas en el código

---

## 📝 Notas Adicionales

### Archivos que NO se modifican
- `data/productos.json` ✓
- `data/envios.json` ✓
- `data/registro.json` ✓
- `data/newsletter.json` ✓
- `data/package.json` ✓
- Todos los archivos de admin ✓
- Archivos de checkout y pago ✓

### Beneficios de los Cambios

**Eliminación de tracking:**
- ✅ Código más limpio y mantenible
- ✅ Menos llamadas al backend (mejor performance)
- ✅ Menos complejidad en el sistema
- ✅ Tracking más profesional vía Cloudflare

**Loading screen:**
- ✅ Mejor experiencia de usuario
- ✅ Feedback visual durante la carga
- ✅ Manejo elegante del cold start de Render
- ✅ Percepción de mayor profesionalidad

---

## 🎨 Propuesta de Diseño del Loader

Basándome en el estilo minimalista de Anakatana, propongo:

- **Fondo:** Blanco o color de marca
- **Logo:** El logo de Hifas centrado (ya existe en `root/hifasLogo.png`)
- **Spinner:** Círculo simple con animación de rotación en color de marca
- **Texto:** "Cargando productos..." en la tipografía IBM Plex Sans
- **Animación:** Fade-out suave de 300ms al desaparecer

---

¿Te parece bien este plan? ¿Quieres que proceda con la implementación o prefieres ajustar algo antes de empezar?
