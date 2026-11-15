// Pruebas del módulo Cuenta (rutas/cuenta.js y sesion.js):
// inicio y cierre de sesión, cambio de contraseña, datos de contacto y recuperación con PIN.
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, db, request, CUENTAS, prepararBDPruebas, ingresar, conToken, reiniciarLimites } = require('./ayuda');
const sms = require('../sms');

before(prepararBDPruebas);
beforeEach(() => reiniciarLimites());
after(() => db.end());

describe('Aplicación: GET /api/salud y rutas desconocidas', () => {
    it('informa que el servicio y la base de datos están funcionando', async () => {
        const r = await request(app).get('/api/salud');
        assert.equal(r.status, 200);
        assert.equal(r.body.estado, 'ok');
        assert.equal(r.body.baseDeDatos, 'conectada');
    });

    it('responde 404 en JSON para rutas de la API que no existen', async () => {
        const r = await request(app).get('/api/no-existe');
        assert.equal(r.status, 404);
        assert.equal(r.body.mensaje, 'Ruta no encontrada');
    });

    it('responde 400 si el JSON enviado está mal formado', async () => {
        const r = await request(app).post('/api/login').set('Content-Type', 'application/json').send('{malo');
        assert.equal(r.status, 400);
    });
});

describe('Módulo Cuenta: POST /api/login', () => {
    it('entrega un token de 64 caracteres y los datos del usuario', async () => {
        const r = await request(app).post('/api/login').send(CUENTAS.estudiante);
        assert.equal(r.status, 200);
        assert.equal(r.body.token.length, 64);
        assert.equal(r.body.usuario.rol, 'estudiante');
        assert.equal(r.body.usuario.documento, '1000000001');
        assert.equal(r.body.usuario.debeCambiarClave, false);
    });

    it('responde 400 si faltan el documento o la contraseña', async () => {
        const r = await request(app).post('/api/login').send({ documento: '', contrasena: '' });
        assert.equal(r.status, 400);
    });

    it('responde 401 con una contraseña incorrecta y no entrega token', async () => {
        const r = await request(app).post('/api/login').send({ documento: '1000000001', contrasena: 'mala' });
        assert.equal(r.status, 401);
        assert.equal(r.body.token, undefined);
    });

    it('responde 401 con un documento que no existe', async () => {
        const r = await request(app).post('/api/login').send({ documento: '999', contrasena: 'x' });
        assert.equal(r.status, 401);
    });

    it('bloquea con 429 después de 10 intentos seguidos', async () => {
        for (let i = 0; i < 10; i++) {
            await request(app).post('/api/login').send({ documento: '1000000001', contrasena: 'mala' });
        }
        const r = await request(app).post('/api/login').send(CUENTAS.estudiante);
        assert.equal(r.status, 429);
    });
});

describe('Módulo Cuenta: sesión y POST /api/logout', () => {
    it('rechaza peticiones sin token (401)', async () => {
        const r = await request(app).get('/api/estudiante');
        assert.equal(r.status, 401);
    });

    it('rechaza un token inventado (401)', async () => {
        const r = await conToken('get', '/api/estudiante', 'token-falso');
        assert.equal(r.status, 401);
    });

    it('después de cerrar sesión el token deja de funcionar', async () => {
        const { token } = await ingresar('estudiante');
        assert.equal((await conToken('get', '/api/estudiante', token)).status, 200);
        assert.equal((await conToken('post', '/api/logout', token)).status, 200);
        assert.equal((await conToken('get', '/api/estudiante', token)).status, 401);
    });

    it('rechaza un token vencido (más de 12 horas)', async () => {
        const { token } = await ingresar('estudiante');
        await db.query('UPDATE sesiones SET creada = NOW() - INTERVAL 13 HOUR WHERE token = ?', [token]);
        assert.equal((await conToken('get', '/api/estudiante', token)).status, 401);
    });
});

describe('Módulo Cuenta: POST /api/cambiar-clave', () => {
    it('no cambia la contraseña si la actual es incorrecta', async () => {
        const { token } = await ingresar('docente');
        const r = await conToken('post', '/api/cambiar-clave', token).send({ actual: 'mala', nueva: 'nueva123' });
        assert.equal(r.status, 400);
    });

    it('exige al menos 6 caracteres', async () => {
        const { token } = await ingresar('docente');
        const r = await conToken('post', '/api/cambiar-clave', token).send({ actual: 'prueba20', nueva: '123' });
        assert.equal(r.status, 400);
    });

    it('cambia la contraseña y permite ingresar con la nueva', async () => {
        const { token } = await ingresar('docente');
        const r = await conToken('post', '/api/cambiar-clave', token).send({ actual: 'prueba20', nueva: 'nueva123' });
        assert.equal(r.status, 200);
        const login = await request(app).post('/api/login').send({ documento: '2000000002', contrasena: 'nueva123' });
        assert.equal(login.status, 200);
        // Dejar la contraseña como estaba
        await conToken('post', '/api/cambiar-clave', login.body.token).send({ actual: 'nueva123', nueva: 'prueba20' });
    });

    it('un usuario con contraseña inicial debe cambiarla antes de usar la plataforma (403)', async () => {
        await db.query("UPDATE usuarios SET debe_cambiar_clave = 1 WHERE usuario = '1000000001'");
        const { token, usuario } = await ingresar('estudiante');
        assert.equal(usuario.debeCambiarClave, true);
        assert.equal((await conToken('get', '/api/estudiante', token)).status, 403);
        await conToken('post', '/api/cambiar-clave', token).send({ actual: 'prueba10', nueva: 'otra456' });
        assert.equal((await conToken('get', '/api/estudiante', token)).status, 200);
        await conToken('post', '/api/cambiar-clave', token).send({ actual: 'otra456', nueva: 'prueba10' });
    });
});

describe('Módulo Cuenta: PUT /api/cuenta/contacto', () => {
    it('guarda celular, correo y dirección', async () => {
        const { token } = await ingresar('estudiante');
        const r = await conToken('put', '/api/cuenta/contacto', token)
            .send({ celular: '300 123 4567', correo: 'ana@correo.com', direccion: 'Albania' });
        assert.equal(r.status, 200);
        assert.deepEqual(r.body, { celular: '300 123 4567', correo: 'ana@correo.com', direccion: 'Albania' });
    });

    it('rechaza un correo no válido', async () => {
        const { token } = await ingresar('estudiante');
        const r = await conToken('put', '/api/cuenta/contacto', token).send({ correo: 'correo-malo' });
        assert.equal(r.status, 400);
    });
});

describe('Módulo Cuenta: recuperación con PIN', () => {
    let ultimoSMS = null;
    before(() => {
        // En lugar de enviar el SMS, se guarda para leer el PIN
        sms.enviarSMS = async (numero, mensaje) => { ultimoSMS = { numero, mensaje }; };
    });
    const pinEnviado = () => ultimoSMS.mensaje.match(/(\d{6})/)[1];

    it('responde 404 si el documento no existe', async () => {
        const r = await request(app).post('/api/recuperar/solicitar').send({ documento: '55555' });
        assert.equal(r.status, 404);
    });

    it('envía un PIN de 6 números al celular y muestra solo los últimos 4 dígitos', async () => {
        await db.query("UPDATE perfiles p JOIN usuarios u ON u.id = p.usuario_id SET p.celular = '3000000001' WHERE u.usuario = '1000000001'");
        const r = await request(app).post('/api/recuperar/solicitar').send({ documento: '1000000001' });
        assert.equal(r.status, 200);
        assert.match(r.body.mensaje, /\*\*\* \*\*\* 0001/);
        assert.equal(ultimoSMS.numero, '3000000001');
        assert.match(pinEnviado(), /^\d{6}$/);
    });

    it('si el estudiante no tiene celular, usa el del acudiente', async () => {
        await db.query("UPDATE perfiles p JOIN usuarios u ON u.id = p.usuario_id SET p.celular = '' WHERE u.usuario = '1000000001'");
        await request(app).post('/api/recuperar/solicitar').send({ documento: '1000000001' });
        assert.equal(ultimoSMS.numero, '3000000011');
        await db.query("UPDATE perfiles p JOIN usuarios u ON u.id = p.usuario_id SET p.celular = '3000000001' WHERE u.usuario = '1000000001'");
    });

    it('rechaza un PIN incorrecto e indica los intentos restantes', async () => {
        await request(app).post('/api/recuperar/solicitar').send({ documento: '1000000001' });
        const r = await request(app).post('/api/recuperar/cambiar').send({ documento: '1000000001', pin: '000000', nueva: 'otra123' });
        assert.equal(r.status, 400);
        assert.match(r.body.mensaje, /Te quedan 4 intentos/);
    });

    it('con el PIN correcto cambia la contraseña, cierra sesiones y el PIN no se puede reutilizar', async () => {
        const { token } = await ingresar('estudiante');
        await request(app).post('/api/recuperar/solicitar').send({ documento: '1000000001' });
        const pin = pinEnviado();
        const r = await request(app).post('/api/recuperar/cambiar').send({ documento: '1000000001', pin, nueva: 'recuperada1' });
        assert.equal(r.status, 200);
        assert.equal((await conToken('get', '/api/estudiante', token)).status, 401, 'las sesiones anteriores se cierran');
        const login = await request(app).post('/api/login').send({ documento: '1000000001', contrasena: 'recuperada1' });
        assert.equal(login.status, 200);
        const otraVez = await request(app).post('/api/recuperar/cambiar').send({ documento: '1000000001', pin, nueva: 'otra999' });
        assert.equal(otraVez.status, 400, 'el PIN ya fue usado');
        await conToken('post', '/api/cambiar-clave', login.body.token).send({ actual: 'recuperada1', nueva: 'prueba10' });
    });

    it('limita a 3 solicitudes de PIN por documento', async () => {
        for (let i = 0; i < 3; i++) await request(app).post('/api/recuperar/solicitar').send({ documento: '1000000001' });
        const r = await request(app).post('/api/recuperar/solicitar').send({ documento: '1000000001' });
        assert.equal(r.status, 429);
    });
});
