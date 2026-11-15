// Pruebas del módulo Administrador (rutas/admin.js):
// resumen, listado de estudiantes, plantilla e importación de Excel, docentes y restablecer contraseñas.
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { app, db, request, conToken, prepararBDPruebas, ingresar, reiniciarLimites } = require('./ayuda');

let token;
before(async () => {
    await prepararBDPruebas();
    token = (await ingresar('admin')).token;
});
beforeEach(() => reiniciarLimites());
after(() => db.end());

async function excelBase64(filas) {
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet('Estudiantes');
    hoja.addRow(['Documento del estudiante', 'Nombres', 'Primer apellido', 'Segundo apellido', 'Grado (6 a 11)', 'Fecha de nacimiento', 'Celular del estudiante', 'Dirección', 'Nombre del acudiente', 'Documento del acudiente', 'Parentesco', 'Celular del acudiente', 'Correo del acudiente']);
    filas.forEach((f) => hoja.addRow(f));
    return Buffer.from(await libro.xlsx.writeBuffer()).toString('base64');
}

describe('Módulo Administrador: consultas', () => {
    it('GET /api/admin trae el resumen por grado y los docentes', async () => {
        const r = await conToken('get', '/api/admin', token);
        assert.equal(r.status, 200);
        assert.deepEqual(r.body.porGrado, [{ grado: 10, total: 1 }]);
        assert.equal(r.body.docentes.length, 1);
        assert.deepEqual(r.body.docentes[0].asignaciones, ['Matemáticas 10°', 'Matemáticas 11°', 'Física 10°']);
    });

    it('GET /api/admin/plantilla entrega un archivo de Excel', async () => {
        const r = await conToken('get', '/api/admin/plantilla', token).buffer(true).parse((res, cb) => {
            const partes = [];
            res.on('data', (p) => partes.push(p));
            res.on('end', () => cb(null, Buffer.concat(partes)));
        });
        assert.equal(r.status, 200);
        assert.match(r.headers['content-type'], /spreadsheetml/);
        assert.equal(r.body.subarray(0, 2).toString(), 'PK', 'un .xlsx es un archivo ZIP');
    });

    it('un docente no puede entrar al panel del administrador (403)', async () => {
        const { token: tDoc } = await ingresar('docente');
        assert.equal((await conToken('get', '/api/admin', tDoc)).status, 403);
    });
});

describe('Módulo Administrador: importar estudiantes desde Excel', () => {
    it('crea cuentas nuevas con la contraseña inicial y obliga a cambiarla', async () => {
        const archivo = await excelBase64([
            ['1098765432', 'Ana María', 'Pérez', 'Ruiz', 7, '03/05/2012', '', '', 'Luz Ruiz', '', 'Madre', '3009998877', ''],
            ['1098765433', 'Luis', 'Gómez', '', 8]
        ]);
        const r = await conToken('post', '/api/admin/importar', token).send({ archivo });
        assert.equal(r.status, 200);
        assert.deepEqual(r.body, { creados: 2, actualizados: 0, errores: [] });

        const login = await request(app).post('/api/login').send({ documento: '1098765432', contrasena: 'perez10' });
        assert.equal(login.status, 200);
        assert.equal(login.body.usuario.debeCambiarClave, true);
    });

    it('al importar de nuevo actualiza los datos sin duplicar ni cambiar la contraseña', async () => {
        const archivo = await excelBase64([['1098765432', 'Ana María', 'Pérez', 'Ruiz', 8]]);
        const r = await conToken('post', '/api/admin/importar', token).send({ archivo });
        assert.deepEqual(r.body, { creados: 0, actualizados: 1, errores: [] });
        const [[p]] = await db.query("SELECT grado FROM perfiles WHERE documento = '1098765432'");
        assert.equal(p.grado, 8);
        const login = await request(app).post('/api/login').send({ documento: '1098765432', contrasena: 'perez10' });
        assert.equal(login.status, 200, 'la contraseña sigue igual');
    });

    it('reporta las filas con error y guarda las correctas', async () => {
        const archivo = await excelBase64([['12', 'Malo', 'Documento', '', 9], ['1098765434', 'Bueno', 'Ríos', '', 9]]);
        const r = await conToken('post', '/api/admin/importar', token).send({ archivo });
        assert.equal(r.body.creados, 1);
        assert.equal(r.body.errores.length, 1);
        assert.equal(r.body.errores[0].fila, 2);
    });

    it('no convierte en estudiante a un documento que es de un docente', async () => {
        const archivo = await excelBase64([['2000000002', 'Docente', 'Prueba', '', 9]]);
        const r = await conToken('post', '/api/admin/importar', token).send({ archivo });
        assert.equal(r.body.errores.length, 1);
        assert.match(r.body.errores[0].mensaje, /docente o administrador/);
    });

    it('rechaza archivos vacíos o que no son Excel', async () => {
        assert.equal((await conToken('post', '/api/admin/importar', token).send({ archivo: '' })).status, 400);
        assert.equal((await conToken('post', '/api/admin/importar', token).send({ archivo: Buffer.from('hola').toString('base64') })).status, 400);
    });

    it('GET /api/admin/estudiantes filtra por grado', async () => {
        const r = await conToken('get', '/api/admin/estudiantes?grado=9', token);
        assert.deepEqual(r.body.map((e) => e.documento), ['1098765434']);
    });
});

describe('Módulo Administrador: docentes y contraseñas', () => {
    it('crea un docente con la contraseña inicial', async () => {
        const r = await conToken('post', '/api/admin/docentes', token).send({ documento: '52111222', nombres: 'Marta', primerApellido: 'Núñez', celular: '3004445566' });
        assert.equal(r.status, 201);
        assert.equal(r.body.claveInicial, 'nunez52');
        const login = await request(app).post('/api/login').send({ documento: '52111222', contrasena: 'nunez52' });
        assert.equal(login.body.usuario.rol, 'docente');
    });

    it('no crea un docente con documento repetido (409) ni con datos incompletos (400)', async () => {
        assert.equal((await conToken('post', '/api/admin/docentes', token).send({ documento: '52111222', nombres: 'X', primerApellido: 'Y' })).status, 409);
        assert.equal((await conToken('post', '/api/admin/docentes', token).send({ documento: '52', nombres: '', primerApellido: '' })).status, 400);
    });

    it('restablece la contraseña inicial y cierra las sesiones del usuario', async () => {
        const [[u]] = await db.query("SELECT id FROM usuarios WHERE usuario = '1098765433'");
        const { token: tEst } = (await request(app).post('/api/login').send({ documento: '1098765433', contrasena: 'gomez10' })).body;
        const r = await conToken('post', `/api/admin/usuarios/${u.id}/restablecer`, token);
        assert.equal(r.status, 200);
        assert.equal(r.body.clave, 'gomez10');
        assert.equal((await conToken('get', '/api/estudiante', tEst)).status, 401);
    });

    it('no restablece la contraseña de un administrador (404)', async () => {
        const [[u]] = await db.query("SELECT id FROM usuarios WHERE usuario = '3000000003'");
        assert.equal((await conToken('post', `/api/admin/usuarios/${u.id}/restablecer`, token)).status, 404);
    });
});
