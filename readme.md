

# Anakatana Backend

Guía para Deploy, Debug y Desarrollo Local

## Desarrollo Local

1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/anakatana.git
   cd anakatana
   ```
2. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
3. Crea el archivo `.env` con las variables de entorno necesarias (puedes usar `.env.example` como referencia).

4. Ejecuta la aplicación localmente:
   ```bash
   uvicorn main:app --reload
   ```
   Esto levanta el backend en `http://localhost:8000`.

5. Accede a la documentación interactiva en:
   - Swagger: http://localhost:8000/docs
   - Redoc: http://localhost:8000/redoc

## Debug

Para debuggear el backend:

1. Usa un IDE como VSCode o PyCharm.
2. Configura un breakpoint donde quieras inspeccionar el código.
3. Ejecuta el backend con el debugger del IDE o usando:
   ```bash
   uvicorn main:app --reload --debug
   ```
4. Asegúrate de tener el entorno virtual activado y las variables de entorno cargadas.

## Deploy

### Deploy Manual (ejemplo con Docker)

1. Construir la imagen:
   ```bash
   docker build -t anakatana-backend .
   ```
2. Correr el contenedor:
   ```bash
   docker run --env-file .env -p 8000:8000 anakatana-backend
   ```

### Deploy en producción (ejemplo con Gunicorn y Uvicorn Workers)

1. Instala dependencias de producción:
   ```bash
   pip install -r requirements.txt
   ```
2. Ejecuta:
   ```bash
   gunicorn main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```

### Variables de entorno

Asegúrate de definir todas las variables de entorno necesarias en el archivo `.env`. Consulta el archivo `.env.example` para ver los valores requeridos.

---

Para dudas o problemas, contacta al equipo de desarrollo.