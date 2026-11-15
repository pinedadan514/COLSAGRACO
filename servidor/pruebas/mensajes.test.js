// Pruebas del módulo Mensajes (rutas/mensajes.js): chat entre estudiantes y docentes.
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { db, conToken, prepararBDPruebas, ingresar, crearEstudiante, reiniciarLimites } = require('./ayuda');

let est;
let doc;
let admin;
before(async () => {
    await prepararBDPruebas();
    est = await ingresar('estudiante');
    doc = await ingresar('docente');
    admin = await ingresar('admin');
});
beforeEach(() => reiniciarLimites());
after(() => db.end());

describe('Módulo Mensajes: enviar y leer', () => {
    it('el docente escribe a un estudiante de su grado', async () => {
        const r = await conToken('post', '/api/mensajes', doc.token).send({ para: est.usuario.id, texto: 'Hola, ¿entregaste el taller?' });
        assert.equal(r.status, 201);
        assert.equal(r.body.remitente, 'docente');
        assert.equal(r.body.estudianteId, est.usuario.id);
        assert.equal(r.body.leido, false);
    });

    it('el estudiante responde y ambos ven la conversación', async () => {
        const r = await conToken('post', '/api/mensajes', est.token).send({ para: doc.usuario.id, texto: 'Sí profe, ya lo entregué.' });
        assert.equal(r.status, 201);
        assert.equal(r.body.remitente, 'estudiante');
        const delEst = await conToken('get', '/api/mensajes', est.token);
        const delDoc = await conToken('get', '/api/mensajes', doc.token);
        assert.equal(delEst.body.length, 2);
        assert.deepEqual(delEst.body.map((m) => m.id), delDoc.body.map((m) => m.id));
    });

    it('marcar como leídos solo afecta a los mensajes recibidos', async () => {
        await conToken('post', '/api/mensajes/leidos', est.token).send({ con: doc.usuario.id });
        const r = await conToken('get', '/api/mensajes', est.token);
        const delDocente = r.body.find((m) => m.remitente === 'docente');
        const propio = r.body.find((m) => m.remitente === 'estudiante');
        assert.equal(delDocente.leido, true);
        assert.equal(propio.leido, false);
    });
});

describe('Módulo Mensajes: validaciones y permisos', () => {
    it('rechaza mensajes vacíos o de más de 1000 caracteres', async () => {
        assert.equal((await conToken('post', '/api/mensajes', est.token).send({ para: doc.usuario.id, texto: '   ' })).status, 400);
        assert.equal((await conToken('post', '/api/mensajes', est.token).send({ para: doc.usuario.id, texto: 'x'.repeat(1001) })).status, 400);
    });

    it('un docente no puede escribir a un estudiante de un grado donde no dicta (403)', async () => {
        const otro = await crearEstudiante({ documento: '1000000070', nombres: 'Ana', apellido: 'Sexto', grado: 6 });
        assert.equal((await conToken('post', '/api/mensajes', doc.token).send({ para: otro, texto: 'Hola' })).status, 403);
    });

    it('un estudiante no puede escribir a quien no es su docente (403)', async () => {
        assert.equal((await conToken('post', '/api/mensajes', est.token).send({ para: admin.usuario.id, texto: 'Hola' })).status, 403);
    });

    it('el administrador no tiene acceso al chat (403)', async () => {
        assert.equal((await conToken('get', '/api/mensajes', admin.token)).status, 403);
    });
});
