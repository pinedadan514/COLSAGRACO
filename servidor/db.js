// Conexión con MySQL (compartida por el servidor y el script de tablas)
const mysql = require('mysql2/promise');

// Se usa un "pool" para que el servidor se reconecte solo si MySQL
// se reinicia o cierra la conexión.
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'colsagraco',
    connectionLimit: 10,
    // Las columnas DATE llegan como texto 'AAAA-MM-DD' (evita problemas de zona horaria)
    dateStrings: ['DATE']
});

module.exports = db;
