// Servidor de la plataforma COLSAGRACO
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { ErrorUsuario } = require('./util');

const app = express();
app.use(cors());
// Límite alto para poder recibir el archivo de Excel de estudiantes
app.use(express.json({ limit: '12mb' }));

// Comprobar la conexión con la base de datos al iniciar
db.query('SELECT 1')
    .then(() => console.log('Conexión con MySQL exitosa'))
    .catch((error) => console.log('Error al conectar con MySQL:', error.message));

app.use('/api', require('./rutas/cuenta'));
app.use('/api/estudiante', require('./rutas/estudiante'));
app.use('/api/mensajes', require('./rutas/mensajes'));
app.use('/api/docente', require('./rutas/docente'));
app.use('/api/admin', require('./rutas/admin'));

app.use('/api', (req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// Manejo de errores: los errores "de usuario" se muestran tal cual; los demás como error interno
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

// Iniciar el servidor (puerto 3000 por defecto)
const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => {
    console.log(`Servidor COLSAGRACO funcionando en http://localhost:${PUERTO}`);
});
