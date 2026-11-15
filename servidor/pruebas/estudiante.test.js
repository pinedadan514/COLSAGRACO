// Pruebas del módulo Estudiante (rutas/estudiante.js):
// datos de la plataforma, entrega de tareas, comunicados y solicitudes de permiso.
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { db, conToken, prepararBDPruebas, ingresar, reiniciarLimites } = require('./ayuda');

let tEst;
let tDoc;
let tareaGrado10;
let tareaGrado11;
before(async () => {
    await prepararBDPruebas();
    tEst = (await ingresar('estudiante')).token;
    tDoc = (await ingresar('docente')).token;
    const estudianteId = (await ingresar('estudiante')).usuario.id;
    // El docente publica información para grado 10 y grado 11
    tareaGrado10 = (await conToken('post', '/api/docente/tareas', tDoc).send({ materiaId: 'mat', grado: 10, titulo: 'Tarea de 10', fecha: '2026-12-01' })).body.id;
    tareaGrado11 = (await conToken('post', '/api/docente/tareas', tDoc).send({ materiaId: 'mat', grado: 11, titulo: 'Tarea de 11', fecha: '2026-12-01' })).body.id;
    await conToken('post', '/api/docente/eventos', tDoc).send({ titulo: 'Evento de 10', fecha: '2026-12-05', tipo: 'evento', grado: 10 });
    await conToken('post', '/api/docente/eventos', tDoc).send({ titulo: 'Evento de 11', fecha: '2026-12-05', tipo: 'evento', grado: 11 });
    await conToken('post', '/api/docente/eventos', tDoc).send({ titulo: 'Evento general', fecha: '2026-12-06', tipo: 'festivo', grado: 'todos' });
    await conToken('post', '/api/docente/comunicados', tDoc).send({ titulo: 'Para 10', categoria: 'Académico', grado: 10, contenido: 'Comunicado para grado diez.' });
    await conToken('post', '/api/docente/comunicados', tDoc).send({ titulo: 'Para 11', categoria: 'Académico', grado: 11, contenido: 'Comunicado para grado once.' });
    await conToken('put', '/api/docente/notas', tDoc).send({ materiaId: 'mat', grado: 10, notas: [{ estudianteId, nota: 4.2 }] });
    const fecha = new Date().toISOString().slice(0, 10);
    await conToken('put', '/api/docente/asistencia', tDoc).send({ materiaId: 'mat', grado: 10, fecha, registros: [{ estudianteId, estado: 'Tardanza', observacion: '10 min' }] });
});
beforeEach(() => reiniciarLimites());
after(() => db.end());

describe('Módulo Estudiante: GET /api/estudiante', () => {
    let datos;
    before(async () => {
        const r = await conToken('get', '/api/estudiante', tEst);
        assert.equal(r.status, 200);
        datos = r.body;
    });

    it('trae el perfil del estudiante de grado 10', () => {
        assert.equal(datos.perfil.grado, 10);
        assert.equal(datos.perfil.nombreCompleto, 'Estudiante Prueba Colsagraco');
    });

    it('trae solo las materias de su grado con su docente y nota', () => {
        assert.deepEqual(datos.materias.map((m) => m.id).sort(), ['fis', 'mat']);
        const mat = datos.materias.find((m) => m.id === 'mat');
        assert.equal(mat.nota, 4.2);
        assert.equal(mat.docente, 'Docente Prueba');
    });

    it('ve las tareas, eventos y comunicados de su grado y los generales, no los de otro grado', () => {
        assert.deepEqual(datos.tareas.map((t) => t.titulo), ['Tarea de 10']);
        assert.deepEqual(datos.eventos.map((e) => e.titulo).sort(), ['Evento de 10', 'Evento general']);
        assert.deepEqual(datos.comunicados.map((c) => c.titulo), ['Para 10']);
    });

    it('calcula la asistencia por materia y lista las novedades', () => {
        assert.deepEqual(datos.asistencia, [{ materiaId: 'mat', clases: 1, asistidas: 1, tardanzas: 1 }]);
        assert.equal(datos.novedades[0].estado, 'Tardanza');
    });

    it('incluye a los docentes de su grado para el chat', () => {
        assert.equal(datos.docentes.length, 1);
        assert.deepEqual(datos.docentes[0].materias.sort(), ['Física', 'Matemáticas']);
    });
});

describe('Módulo Estudiante: PUT /api/estudiante/tareas/:id/entrega', () => {
    it('marca y desmarca una tarea de su grado', async () => {
        const marcar = await conToken('put', `/api/estudiante/tareas/${tareaGrado10}/entrega`, tEst).send({ entregada: true });
        assert.equal(marcar.status, 200);
        let r = await conToken('get', '/api/estudiante', tEst);
        assert.equal(r.body.tareas[0].entregada, true);
        await conToken('put', `/api/estudiante/tareas/${tareaGrado10}/entrega`, tEst).send({ entregada: false });
        r = await conToken('get', '/api/estudiante', tEst);
        assert.equal(r.body.tareas[0].entregada, false);
    });

    it('no puede marcar una tarea de otro grado (404)', async () => {
        const r = await conToken('put', `/api/estudiante/tareas/${tareaGrado11}/entrega`, tEst).send({ entregada: true });
        assert.equal(r.status, 404);
    });
});

describe('Módulo Estudiante: POST /api/estudiante/comunicados/leidos', () => {
    it('marca como leídos todos los comunicados de su grado', async () => {
        assert.equal((await conToken('post', '/api/estudiante/comunicados/leidos', tEst).send({})).status, 200);
        const r = await conToken('get', '/api/estudiante', tEst);
        assert.ok(r.body.comunicados.every((c) => c.leido));
        const [[n]] = await db.query('SELECT COUNT(*) AS n FROM comunicados_leidos');
        assert.equal(n.n, 1, 'no marca el comunicado de grado 11');
    });
});

describe('Módulo Estudiante: solicitudes de permiso', () => {
    it('crea una solicitud en revisión y la puede cancelar', async () => {
        const r = await conToken('post', '/api/estudiante/permisos', tEst).send({ tipo: 'Cita médica', desde: '2026-12-01', hasta: '2026-12-02', motivo: 'Cita con el odontólogo.' });
        assert.equal(r.status, 201);
        assert.equal(r.body.estado, 'En revisión');
        assert.equal((await conToken('delete', `/api/estudiante/permisos/${r.body.id}`, tEst)).status, 200);
    });

    it('no cancela solicitudes ya revisadas', async () => {
        const r = await conToken('post', '/api/estudiante/permisos', tEst).send({ tipo: 'Otro', desde: '2026-12-01', hasta: '2026-12-01', motivo: 'Motivo de prueba largo.' });
        await db.query("UPDATE permisos SET estado = 'Aprobado' WHERE id = ?", [r.body.id]);
        assert.equal((await conToken('delete', `/api/estudiante/permisos/${r.body.id}`, tEst)).status, 404);
    });

    it('valida tipo, fechas y motivo', async () => {
        const casos = [
            { tipo: 'Vacaciones', desde: '2026-12-01', hasta: '2026-12-01', motivo: 'Motivo suficiente.' },
            { tipo: 'Otro', desde: '2026-12-05', hasta: '2026-12-01', motivo: 'Motivo suficiente.' },
            { tipo: 'Otro', desde: '01/12/2026', hasta: '2026-12-01', motivo: 'Motivo suficiente.' },
            { tipo: 'Otro', desde: '2026-12-01', hasta: '2026-12-01', motivo: 'corto' }
        ];
        for (const c of casos) {
            assert.equal((await conToken('post', '/api/estudiante/permisos', tEst).send(c)).status, 400, JSON.stringify(c));
        }
    });

    it('un docente no puede usar las rutas del estudiante (403)', async () => {
        assert.equal((await conToken('get', '/api/estudiante', tDoc)).status, 403);
    });
});
