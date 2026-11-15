// Aplicación Express de COLSAGRACO (sin iniciar el servidor).
// server.js la pone a escuchar en un puerto; las pruebas la usan directamente.
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { ErrorUsuario } = require('./util');

const app = express();
app.use(cors());
// Límite alto para poder recibir el archivo de Excel de estudiantes
app.use(express.json({ limit: '12mb' }));

// ----- API -----
// Estado del servicio (lo usa el hosting para saber si la aplicación está funcionando)
app.get('/api/salud', async (req, res) => {
    const db = require('./db');
    try {
        await db.query('SELECT 1');
        res.json({ estado: 'ok', baseDeDatos: 'conectada', version: require('./package.json').version });
    } catch {
        res.status(503).json({ estado: 'error', baseDeDatos: 'sin conexión' });
    }
});

app.use('/api', require('./rutas/cuenta'));
app.use('/api/estudiante', require('./rutas/estudiante'));
app.use('/api/mensajes', require('./rutas/mensajes'));
app.use('/api/docente', require('./rutas/docente'));
app.use('/api/admin', require('./rutas/admin'));

app.use('/api', (req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// ----- Página web -----
// Si existe la versión compilada de la página (carpeta dist, creada con "npm run build"),
// el mismo servidor la entrega. Así la aplicación completa queda en una sola URL.
const carpetaWeb = path.join(__dirname, '..', 'dist');
if (fs.existsSync(path.join(carpetaWeb, 'index.html'))) {
    app.use(express.static(carpetaWeb));
    app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(carpetaWeb, 'index.html')));
}

// ----- Manejo de errores -----
// Los errores "de usuario" se muestran tal cual; los demás como error interno
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
    if (error instanceof ErrorUsuario) {
        return res.status(error.estado).json({ mensaje: error.message });
    }
    if (error.type === 'entity.too.large') {
        return res.status(413).json({ mensaje: 'El archivo es demasiado grande (máximo 12 MB)' });
    }
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ mensaje: 'Los datos enviados no son válidos' });
    }
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
});

module.exports = app;
