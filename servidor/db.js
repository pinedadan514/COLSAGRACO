// Conexión con MySQL (compartida por el servidor, el script de tablas y las pruebas)
const mysql = require('mysql2/promise');

// Configuración desde variables de entorno (archivo .env en el PC, o el panel del hosting)
function configuracion() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'colsagraco',
        connectionLimit: 10,
        // Las columnas DATE llegan como texto 'AAAA-MM-DD' (evita problemas de zona horaria)
        dateStrings: ['DATE']
    };

    // Las bases de datos en la nube piden conexión cifrada (SSL).
    // DB_SSL=true activa el cifrado; DB_SSL_CA permite pegar el certificado del proveedor.
    if (process.env.DB_SSL === 'true') {
        config.ssl = process.env.DB_SSL_CA
            ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true }
            : { minVersion: 'TLSv1.2', rejectUnauthorized: true };
    }
    return config;
}

// Se usa un "pool" para que el servidor se reconecte solo si MySQL
// se reinicia o cierra la conexión.
const db = mysql.createPool(configuracion());

module.exports = db;
module.exports.configuracion = configuracion;
