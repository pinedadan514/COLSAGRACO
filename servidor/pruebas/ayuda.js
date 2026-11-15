// Ayudas compartidas por las pruebas que usan la base de datos.
// IMPORTANTE: las pruebas usan una base de datos separada (colsagraco_test),
// que se borra y se crea de nuevo en cada archivo de pruebas. Nunca tocan "colsagraco".
process.env.DB_NAME = process.env.DB_NAME_PRUEBAS || 'colsagraco_test';

const mysql = require('mysql2/promise');
const request = require('supertest');
const db = require('../db');
const app = require('../app');
const { prepararBaseDeDatos } = require('../preparar-bd');
const { reiniciarLimites } = require('../util');

const CUENTAS = {
    estudiante: { documento: '1000000001', contrasena: 'prueba10' },
    docente: { documento: '2000000002', contrasena: 'prueba20' },
    admin: { documento: '3000000003', contrasena: 'prueba30' }
};

// Crea la base de datos de pruebas desde cero
async function prepararBDPruebas() {
    const { host, port, user, password, ssl, database } = db.configuracion();
    if (!/test/.test(database)) {
        throw new Error(`Por seguridad, las pruebas solo corren en una base de datos de prueba (recibido: ${database})`);
    }
    const conexion = await mysql.createConnection({ host, port, user, password, ssl });
    await conexion.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await conexion.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    await conexion.end();
    await prepararBaseDeDatos({ silencioso: true });
}

// Inicia sesión y devuelve { token, usuario }
async function ingresar(rol) {
    const r = await request(app).post('/api/login').send(CUENTAS[rol]);
    if (r.status !== 200) throw new Error(`No se pudo iniciar sesión como ${rol}: ${r.status} ${r.body.mensaje}`);
    return r.body;
}

// Petición con el token en el encabezado Authorization
function conToken(metodo, ruta, token) {
    return request(app)[metodo](ruta).set('Authorization', `Bearer ${token}`);
}

// Crea un estudiante directamente en la base de datos (para pruebas que necesitan más de uno)
async function crearEstudiante({ documento, nombres, apellido, grado }) {
    const bcrypt = require('bcrypt');
    const [r] = await db.query(
        "INSERT INTO usuarios (usuario, contrasena, rol, debe_cambiar_clave) VALUES (?, ?, 'estudiante', 0)",
        [documento, await bcrypt.hash('clave123', 4)]
    );
    await db.query(
        'INSERT INTO perfiles (usuario_id, documento, nombres, primer_apellido, grado) VALUES (?, ?, ?, ?, ?)',
        [r.insertId, documento, nombres, apellido, grado]
    );
    return r.insertId;
}

module.exports = { app, db, request, CUENTAS, prepararBDPruebas, ingresar, conToken, crearEstudiante, reiniciarLimites };
