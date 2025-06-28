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