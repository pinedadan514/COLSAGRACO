# Guía para la evidencia AA5-EV02 – Testing de la API con Postman

## Archivos que ya están listos

| Entregable | Archivo |
|---|---|
| Colección de Postman (56 peticiones, 172 pruebas automáticas) | `postman/COLSAGRACO.postman_collection.json` |
| Entorno de Postman (URL y cuentas de prueba) | `postman/COLSAGRACO_Local.postman_environment.json` |
| Archivo END POINTS | `docs/ENDPOINTS.docx` (y `docs/ENDPOINTS.md` para GitHub) |
| Documento con pruebas (falta pegar pantallazos) | `docs/Pruebas_API_Postman_AA5_EV02.docx` |
| Enlace del repositorio | `docs/REPOSITORIO.txt` |
| Script para armar el .zip | `docs/crear-entrega.ps1` |

## Lo que debes hacer tú

### 1. Preparar Postman
1. Descarga e instala Postman: https://www.postman.com/downloads/
2. Enciende MySQL y, en la terminal de Visual Studio Code, inicia el servidor:
   ```
   cd servidor
   npm start
   ```
3. En Postman: **Import** → arrastra los dos archivos de la carpeta `postman`.
4. Arriba a la derecha, selecciona el entorno **COLSAGRACO Local**.

### 2. Grabar el video (5 a 8 minutos)
Puedes grabar con la **Barra de juego de Windows** (`Win + G`) o con la herramienta Recortes (`Win + Shift + R`).

Guion sugerido:
1. **Presentación (30 s):** tu nombre, la evidencia AA5-EV02 y qué es COLSAGRACO.
2. **Servidor corriendo (20 s):** muestra la terminal con `npm start` funcionando.
3. **La colección (40 s):** muestra en Postman las 7 carpetas y el entorno con la variable `baseUrl`.
4. **Peticiones una por una (3 min)**, con el botón **Send**, mostrando el cuerpo, la respuesta y la pestaña **Test Results**:
   - `Login estudiante`: explica que devuelve un token y que se guarda solo en una variable.
   - `Login con contraseña incorrecta`: devuelve 401.
   - `Estudiante entra a ruta de docente`: devuelve 403 (seguridad por roles).
   - `Registrar nota` y `Registrar nota fuera de rango`: 200 y 400.
   - `Crear tarea` del docente y luego `Datos del estudiante`: el estudiante ve la tarea.
5. **Ejecución completa (1 min):** clic derecho sobre **COLSAGRACO API** → **Run collection** → **Run**. Muestra el resultado: 56 peticiones y 172 pruebas aprobadas.
6. **Cierre (30 s):** muestra el documento de ENDPOINTS y el enlace del repositorio.

> Si al repetir la ejecución muchas veces aparece el código **429** (demasiados intentos), reinicia el servidor (Ctrl+C y `npm start`).

### 3. Completar el documento de pruebas
Abre `docs/Pruebas_API_Postman_AA5_EV02.docx`:
- Llena los datos resaltados en amarillo (nombre, ficha, instructor, fecha).
- Pega un pantallazo en cada recuadro punteado (7 de carpetas + 1 del resumen del Runner). Para tomar pantallazos: `Win + Shift + S`, y luego `Ctrl + V` dentro del recuadro.
- En la columna **Obtenido** escribe *Pasó* en cada prueba (o *Falló* si alguna falla).
- Completa la tabla del resumen con los números que muestre el Runner.

### 4. Subir los cambios a GitHub
```
git add postman docs
git commit -m "Pruebas de la API con Postman (AA5-EV02)"
git push
```

### 5. Crear la carpeta comprimida
En PowerShell, desde la carpeta `colsagraco-react` (cambia tu nombre y la ruta del video):
```
.\docs\crear-entrega.ps1 -Nombre "NOMBRE_APELLIDO" -Video "C:\Users\danie\Videos\Captures\video.mp4"
```
Se crea en el Escritorio el archivo `NOMBRE_APELLIDO_AA5_EV02.zip` con:
- `Proyecto_COLSAGRACO/` (sin `node_modules` ni el archivo `.env` con tu contraseña)
- El video
- `Pruebas_API_Postman_AA5_EV02.docx`
- `ENDPOINTS.docx`
- `REPOSITORIO.txt`

Si PowerShell no deja ejecutar el script, usa primero:
```
Set-ExecutionPolicy -Scope Process Bypass
```
