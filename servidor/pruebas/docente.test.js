// Pruebas del módulo Docente (rutas/docente.js):
// materias y grados, notas, asistencia, tareas, eventos y comunicados.
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { db, conToken, prepararBDPruebas, ingresar, crearEstudiante, reiniciarLimites } = require('./ayuda');

let token;
let estudianteId;
before(async () => {
    await prepararBDPruebas();
    token = (await ingresar('docente')).token;
    estudianteId = (await ingresar('estudiante')).usuario.id;
});
beforeEach(() => reiniciarLimites());
after(() => db.end());

const hoy = () => new Date().toISOString().slice(0, 10);

describe('Módulo Docente: GET /api/docente', () => {
    it('trae el catálogo de 14 materias y las clases del docente', async () => {
        const r = await conToken('get', '/api/docente', token);
        assert.equal(r.status, 200);
        assert.equal(r.body.materias.length, 14);
        assert.equal(r.body.asignaciones.length, 3);
        assert.ok(r.body.estudiantes.some((e) => e.id === estudianteId));
    });

    it('un estudiante no puede entrar a la plataforma del docente (403)', async () => {
        const { token: tEst } = await ingresar('estudiante');
        assert.equal((await conToken('get', '/api/docente', tEst)).status, 403);
    });
});

describe('Módulo Docente: PUT /api/docente/asignaciones', () => {
    it('guarda las materias y grados que dicta (sin repetidos)', async () => {
        const r = await conToken('put', '/api/docente/asignaciones', token).send({
            asignaciones: [{ materiaId: 'mat', grado: 10 }, { materiaId: 'mat', grado: 10 }, { materiaId: 'mat', grado: 11 }, { materiaId: 'fis', grado: 10 }]
        });
        assert.equal(r.status, 200);
        assert.equal(r.body.asignaciones.length, 3);
    });

    it('rechaza un grado fuera de 6 a 11', async () => {
        const r = await conToken('put', '/api/docente/asignaciones', token).send({ asignaciones: [{ materiaId: 'mat', grado: 13 }] });
        assert.equal(r.status, 400);
    });

    it('rechaza una materia que no existe y no borra las anteriores', async () => {
        const r = await conToken('put', '/api/docente/asignaciones', token).send({ asignaciones: [{ materiaId: 'xyz', grado: 7 }] });
        assert.equal(r.status, 400);
        const [filas] = await db.query("SELECT COUNT(*) AS n FROM asignaciones a JOIN usuarios u ON u.id = a.docente_id WHERE u.usuario = '2000000002'");
        assert.equal(filas[0].n, 3, 'la transacción se deshace');
    });

    it('no deja tomar una materia y grado que ya dicta otro docente (409)', async () => {
        const bcrypt = require('bcrypt');
        const [u] = await db.query("INSERT INTO usuarios (usuario, contrasena, rol, debe_cambiar_clave) VALUES ('2000000099', ?, 'docente', 0)", [await bcrypt.hash('otra123', 4)]);
        await db.query("INSERT INTO perfiles (usuario_id, documento, nombres, primer_apellido) VALUES (?, '2000000099', 'Otra', 'Docente')", [u.insertId]);
        const { token: tOtra } = (await require('./ayuda').request(require('./ayuda').app).post('/api/login').send({ documento: '2000000099', contrasena: 'otra123' })).body;
        const r = await conToken('put', '/api/docente/asignaciones', tOtra).send({ asignaciones: [{ materiaId: 'mat', grado: 10 }] });
        assert.equal(r.status, 409);
        assert.match(r.body.mensaje, /ya la dicta Docente Prueba/);
    });
});

describe('Módulo Docente: GET /api/docente/clase', () => {
    it('lista los estudiantes de su clase ordenados por apellido', async () => {
        await crearEstudiante({ documento: '1000000050', nombres: 'Andrés', apellido: 'Álvarez', grado: 10 });
        const r = await conToken('get', '/api/docente/clase?materia=mat&grado=10', token);
        assert.equal(r.status, 200);
        assert.deepEqual(r.body.map((e) => e.documento), ['1000000050', '1000000001']);
    });

    it('no muestra estudiantes de una clase que no dicta (403)', async () => {
        const r = await conToken('get', '/api/docente/clase?materia=esp&grado=10', token);
        assert.equal(r.status, 403);
    });
});

describe('Módulo Docente: PUT /api/docente/notas', () => {
    it('guarda una nota y la redondea a un decimal (acepta coma)', async () => {
        const r = await conToken('put', '/api/docente/notas', token).send({ materiaId: 'mat', grado: 10, notas: [{ estudianteId, nota: '4,46' }] });
        assert.equal(r.status, 200);
        const [[fila]] = await db.query("SELECT nota FROM notas WHERE estudiante_id = ? AND materia_id = 'mat'", [estudianteId]);
        assert.equal(Number(fila.nota), 4.5);
    });

    it('rechaza notas fuera de 1.0 a 5.0', async () => {
        for (const nota of [0.5, 5.1, 'abc']) {
            const r = await conToken('put', '/api/docente/notas', token).send({ materiaId: 'mat', grado: 10, notas: [{ estudianteId, nota }] });
            assert.equal(r.status, 400, `nota ${nota}`);
        }
    });

    it('una nota vacía borra la nota guardada', async () => {
        await conToken('put', '/api/docente/notas', token).send({ materiaId: 'fis', grado: 10, notas: [{ estudianteId, nota: 3 }] });
        await conToken('put', '/api/docente/notas', token).send({ materiaId: 'fis', grado: 10, notas: [{ estudianteId, nota: '' }] });
        const [filas] = await db.query("SELECT * FROM notas WHERE estudiante_id = ? AND materia_id = 'fis'", [estudianteId]);
        assert.equal(filas.length, 0);
    });

    it('ignora estudiantes que no son de ese grado', async () => {
        const otro = await crearEstudiante({ documento: '1000000060', nombres: 'Otro', apellido: 'Grado', grado: 7 });
        const r = await conToken('put', '/api/docente/notas', token).send({ materiaId: 'mat', grado: 10, notas: [{ estudianteId: otro, nota: 5 }] });
        assert.match(r.body.mensaje, /Se guardaron 0 notas/);
    });
});

describe('Módulo Docente: PUT /api/docente/asistencia', () => {
    it('guarda la asistencia del día y permite corregirla', async () => {
        const base = { materiaId: 'mat', grado: 10, fecha: hoy() };
        await conToken('put', '/api/docente/asistencia', token).send({ ...base, registros: [{ estudianteId, estado: 'Falta' }] });
        const r = await conToken('put', '/api/docente/asistencia', token).send({ ...base, registros: [{ estudianteId, estado: 'Excusa', observacion: 'Cita médica' }] });
        assert.equal(r.status, 200);
        const [filas] = await db.query("SELECT estado, observacion FROM asistencia WHERE estudiante_id = ? AND materia_id = 'mat'", [estudianteId]);
        assert.deepEqual(filas.map((f) => [f.estado, f.observacion]), [['Excusa', 'Cita médica']]);
    });

    it('rechaza fechas futuras y estados no válidos', async () => {
        const futura = await conToken('put', '/api/docente/asistencia', token).send({ materiaId: 'mat', grado: 10, fecha: '2099-01-01', registros: [] });
        assert.equal(futura.status, 400);
        const estado = await conToken('put', '/api/docente/asistencia', token).send({ materiaId: 'mat', grado: 10, fecha: hoy(), registros: [{ estudianteId, estado: 'Dormido' }] });
        assert.equal(estado.status, 400);
    });
});

describe('Módulo Docente: tareas, eventos y comunicados', () => {
    it('crea y elimina una tarea de su clase', async () => {
        const r = await conToken('post', '/api/docente/tareas', token).send({ materiaId: 'mat', grado: 10, titulo: 'Taller 1', descripcion: 'Guía 3', fecha: '2026-12-01' });
        assert.equal(r.status, 201);
        assert.equal((await conToken('delete', `/api/docente/tareas/${r.body.id}`, token)).status, 200);
        assert.equal((await conToken('delete', `/api/docente/tareas/${r.body.id}`, token)).status, 404);
    });

    it('no crea tareas sin título ni para clases que no dicta', async () => {
        const sinTitulo = await conToken('post', '/api/docente/tareas', token).send({ materiaId: 'mat', grado: 10, titulo: '', fecha: '2026-12-01' });
        assert.equal(sinTitulo.status, 400);
        const ajena = await conToken('post', '/api/docente/tareas', token).send({ materiaId: 'esp', grado: 6, titulo: 'Taller', fecha: '2026-12-01' });
        assert.equal(ajena.status, 403);
    });

    it('crea un evento para todo el colegio (grado nulo)', async () => {
        const r = await conToken('post', '/api/docente/eventos', token).send({ titulo: 'Izada de bandera', fecha: '2026-12-02', tipo: 'evento', grado: 'todos' });
        assert.equal(r.status, 201);
        assert.equal(r.body.grado, null);
    });

    it('rechaza un tipo de evento no válido', async () => {
        const r = await conToken('post', '/api/docente/eventos', token).send({ titulo: 'Fiesta', fecha: '2026-12-02', tipo: 'fiesta' });
        assert.equal(r.status, 400);
    });

    it('publica un comunicado firmado con su nombre', async () => {
        const r = await conToken('post', '/api/docente/comunicados', token).send({ titulo: 'Recordatorio', categoria: 'Académico', grado: 10, contenido: 'Traer calculadora el lunes.' });
        assert.equal(r.status, 201);
        const [[c]] = await db.query('SELECT autor FROM comunicados WHERE id = ?', [r.body.id]);
        assert.equal(c.autor, 'Prof. Docente Prueba');
    });

    it('rechaza comunicados con categoría no válida o muy cortos', async () => {
        const cat = await conToken('post', '/api/docente/comunicados', token).send({ titulo: 'Aviso', categoria: 'Chisme', contenido: 'Contenido largo suficiente' });
        assert.equal(cat.status, 400);
        const corto = await conToken('post', '/api/docente/comunicados', token).send({ titulo: 'Aviso', categoria: 'Otro', contenido: 'corto' });
        assert.equal(corto.status, 400);
    });
});
