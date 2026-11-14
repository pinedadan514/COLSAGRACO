// Plataforma del docente
const express = require('express');
const db = require('../db');
const { conSesion, soloRol } = require('../sesion');
const { texto, esFecha, esGrado, ErrorUsuario } = require('../util');

const router = express.Router();
router.use(conSesion, soloRol('docente'));

const NOMBRE = "CONCAT_WS(' ', p.nombres, p.primer_apellido, NULLIF(p.segundo_apellido, ''))";
const ESTADOS = ['Presente', 'Falta', 'Tardanza', 'Excusa'];
const TIPOS_EVENTO = ['evaluacion', 'evento', 'festivo'];
const CATEGORIAS = ['Académico', 'Institucional', 'Convivencia', 'Salud', 'Otro'];

// grado "todos" o vacío = para todo el colegio
const gradoOpcional = (valor) => {
    if (valor === null || valor === undefined || valor === '' || valor === 'todos') return null;
    if (!esGrado(valor)) throw new ErrorUsuario(400, 'El grado no es válido');
    return Number(valor);
};

// Verifica que el docente dicte esa materia en ese grado
async function verificarClase(docenteId, materiaId, grado) {
    const [filas] = await db.query(
        'SELECT 1 FROM asignaciones WHERE docente_id = ? AND materia_id = ? AND grado = ?',
        [docenteId, materiaId, Number(grado)]
    );
    if (filas.length === 0) {
        throw new ErrorUsuario(403, 'No tienes asignada esa materia en ese grado');
    }
}

// Ids de los estudiantes de un grado
async function estudiantesDelGrado(grado) {
    const [filas] = await db.query(
        `SELECT u.id FROM usuarios u JOIN perfiles p ON p.usuario_id = u.id
         WHERE u.rol = 'estudiante' AND u.activo = 1 AND p.grado = ?`,
        [Number(grado)]
    );
    return new Set(filas.map((f) => f.id));
}

// Toda la información de la plataforma del docente
router.get('/', async (req, res) => {
    const id = req.usuario.id;

    const [
        [perfiles],
        [materias],
        [asignaciones],
        [ocupadas],
        [tareas],
        [eventos],
        [comunicados],
        [estudiantes],
        [mensajes]
    ] = await Promise.all([
        db.query('SELECT * FROM perfiles WHERE usuario_id = ?', [id]),
        db.query('SELECT id, nombre, color FROM materias ORDER BY orden, nombre'),
        db.query('SELECT materia_id AS materiaId, grado FROM asignaciones WHERE docente_id = ? ORDER BY grado', [id]),
        db.query(
            `SELECT a.materia_id AS materiaId, a.grado, CONCAT_WS(' ', p.nombres, p.primer_apellido) AS docente
             FROM asignaciones a JOIN perfiles p ON p.usuario_id = a.docente_id
             WHERE a.docente_id <> ?`,
            [id]
        ),
        db.query(
            `SELECT t.id, t.materia_id AS materiaId, t.grado, t.titulo, t.descripcion, t.fecha_entrega AS fecha,
                    (SELECT COUNT(*) FROM tareas_entregadas te WHERE te.tarea_id = t.id) AS entregas
             FROM tareas t WHERE t.docente_id = ? ORDER BY t.fecha_entrega`,
            [id]
        ),
        db.query(
            'SELECT id, titulo, fecha, tipo, grado, (creado_por = ?) AS mio FROM eventos ORDER BY fecha',
            [id]
        ),
        db.query(
            'SELECT id, titulo, categoria, grado, fecha, contenido FROM comunicados WHERE autor_id = ? ORDER BY fecha DESC, id DESC',
            [id]
        ),
        // Estudiantes de los grados en los que dicta clase (para el chat)
        db.query(
            `SELECT u.id, ${NOMBRE} AS nombre, p.grado
             FROM usuarios u JOIN perfiles p ON p.usuario_id = u.id
             WHERE u.rol = 'estudiante' AND u.activo = 1
               AND p.grado IN (SELECT grado FROM asignaciones WHERE docente_id = ?)
             ORDER BY p.grado, p.primer_apellido, p.nombres`,
            [id]
        ),
        db.query(
            `SELECT id, estudiante_id AS estudianteId, docente_id AS docenteId, remitente, texto, leido, fecha
             FROM mensajes WHERE docente_id = ? ORDER BY fecha, id`,
            [id]
        )
    ]);

    const p = perfiles[0] || {};
    res.json({
        usuario: { id, documento: req.usuario.usuario },
        perfil: {
            documento: p.documento || '',
            nombreCompleto: [p.nombres, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' '),
            nombres: p.nombres || '',
            primerApellido: p.primer_apellido || '',
            celular: p.celular || '',
            correo: p.correo || '',
            direccion: p.direccion || ''
        },
        materias,
        asignaciones,
        ocupadas,
        tareas: tareas.map((t) => ({ ...t, entregas: Number(t.entregas) })),
        eventos: eventos.map((e) => ({ ...e, mio: Boolean(e.mio) })),
        comunicados,
        estudiantes,
        mensajes: mensajes.map((m) => ({ ...m, leido: Boolean(m.leido) })),
        categorias: CATEGORIAS
    });
});

// ----- Materias y grados que dicta -----
// Recibe { asignaciones: [{ materiaId, grado }, ...] } y reemplaza las del docente
router.put('/asignaciones', async (req, res) => {
    const lista = Array.isArray(req.body?.asignaciones) ? req.body.asignaciones : [];
    const limpias = [];
    for (const a of lista) {
        const materiaId = texto(a?.materiaId);
        if (!esGrado(a?.grado)) throw new ErrorUsuario(400, 'Hay un grado no válido');
        if (!limpias.some((x) => x.materiaId === materiaId && x.grado === Number(a.grado))) {
            limpias.push({ materiaId, grado: Number(a.grado) });
        }
    }

    const conexion = await db.getConnection();
    try {
        await conexion.beginTransaction();

        // Revisar que ninguna materia+grado la tenga otro docente
        for (const a of limpias) {
            const [ocupada] = await conexion.query(
                `SELECT m.nombre, CONCAT_WS(' ', p.nombres, p.primer_apellido) AS docente
                 FROM asignaciones a
                 JOIN materias m ON m.id = a.materia_id
                 JOIN perfiles p ON p.usuario_id = a.docente_id
                 WHERE a.materia_id = ? AND a.grado = ? AND a.docente_id <> ?`,
                [a.materiaId, a.grado, req.usuario.id]
            );
            if (ocupada.length > 0) {
                throw new ErrorUsuario(
                    409,
                    `${ocupada[0].nombre} en grado ${a.grado}° ya la dicta ${ocupada[0].docente}`
                );
            }
            const [materia] = await conexion.query('SELECT 1 FROM materias WHERE id = ?', [a.materiaId]);
            if (materia.length === 0) throw new ErrorUsuario(400, 'Hay una materia que no existe');
        }

        await conexion.query('DELETE FROM asignaciones WHERE docente_id = ?', [req.usuario.id]);
        if (limpias.length > 0) {
            await conexion.query('INSERT INTO asignaciones (docente_id, materia_id, grado) VALUES ?', [
                limpias.map((a) => [req.usuario.id, a.materiaId, a.grado])
            ]);
        }
        await conexion.commit();
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }

    res.json({ asignaciones: limpias });
});

// ----- Lista de estudiantes de una clase (con nota y asistencia de una fecha) -----
router.get('/clase', async (req, res) => {
    const materiaId = texto(req.query.materia);
    const grado = Number(req.query.grado);
    const fecha = texto(req.query.fecha);
    await verificarClase(req.usuario.id, materiaId, grado);

    const [estudiantes] = await db.query(
        `SELECT u.id, ${NOMBRE} AS nombre, p.documento, n.nota,
                a.estado, a.observacion
         FROM usuarios u
         JOIN perfiles p ON p.usuario_id = u.id
         LEFT JOIN notas n ON n.estudiante_id = u.id AND n.materia_id = ?
         LEFT JOIN asistencia a ON a.estudiante_id = u.id AND a.materia_id = ? AND a.fecha = ?
         WHERE u.rol = 'estudiante' AND u.activo = 1 AND p.grado = ?
         ORDER BY p.primer_apellido, p.segundo_apellido, p.nombres`,
        [materiaId, materiaId, esFecha(fecha) ? fecha : null, grado]
    );

    res.json(
        estudiantes.map((e) => ({
            ...e,
            nota: e.nota === null ? null : Number(e.nota),
            estado: e.estado || null,
            observacion: e.observacion || ''
        }))
    );
});

// ----- Registrar notas -----
// { materiaId, grado, notas: [{ estudianteId, nota }] }  (nota vacía = borrar)
router.put('/notas', async (req, res) => {
    const materiaId = texto(req.body?.materiaId);
    const grado = Number(req.body?.grado);
    await verificarClase(req.usuario.id, materiaId, grado);

    const delGrado = await estudiantesDelGrado(grado);
    const notas = Array.isArray(req.body?.notas) ? req.body.notas : [];
    let guardadas = 0;

    for (const { estudianteId, nota } of notas) {
        if (!delGrado.has(Number(estudianteId))) continue;

        if (nota === null || nota === '' || nota === undefined) {
            await db.query('DELETE FROM notas WHERE estudiante_id = ? AND materia_id = ?', [estudianteId, materiaId]);
            continue;
        }
        const valor = Math.round(Number(String(nota).replace(',', '.')) * 10) / 10;
        if (!(valor >= 1 && valor <= 5)) {
            throw new ErrorUsuario(400, 'Las notas deben estar entre 1.0 y 5.0');
        }
        await db.query(
            `INSERT INTO notas (estudiante_id, materia_id, nota, docente_id) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE nota = VALUES(nota), docente_id = VALUES(docente_id)`,
            [estudianteId, materiaId, valor, req.usuario.id]
        );
        guardadas++;
    }

    res.json({ mensaje: `Se guardaron ${guardadas} notas` });
});

// ----- Registrar asistencia -----
// { materiaId, grado, fecha, registros: [{ estudianteId, estado, observacion }] }
router.put('/asistencia', async (req, res) => {
    const materiaId = texto(req.body?.materiaId);
    const grado = Number(req.body?.grado);
    const fecha = texto(req.body?.fecha);
    await verificarClase(req.usuario.id, materiaId, grado);

    if (!esFecha(fecha)) throw new ErrorUsuario(400, 'La fecha no es válida');
    const [[{ hoy }]] = await db.query('SELECT CURDATE() AS hoy');
    if (fecha > hoy) throw new ErrorUsuario(400, 'No se puede registrar asistencia de una fecha futura');

    const delGrado = await estudiantesDelGrado(grado);
    const registros = Array.isArray(req.body?.registros) ? req.body.registros : [];
    let guardados = 0;

    for (const r of registros) {
        if (!delGrado.has(Number(r.estudianteId))) continue;
        if (!ESTADOS.includes(r.estado)) throw new ErrorUsuario(400, 'Hay un estado de asistencia no válido');
        await db.query(
            `INSERT INTO asistencia (estudiante_id, materia_id, fecha, estado, observacion, docente_id)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE estado = VALUES(estado), observacion = VALUES(observacion), docente_id = VALUES(docente_id)`,
            [r.estudianteId, materiaId, fecha, r.estado, texto(r.observacion).slice(0, 150), req.usuario.id]
        );
        guardados++;
    }

    res.json({ mensaje: `Asistencia guardada para ${guardados} estudiantes` });
});

// ----- Tareas -----
router.post('/tareas', async (req, res) => {
    const materiaId = texto(req.body?.materiaId);
    const grado = Number(req.body?.grado);
    const titulo = texto(req.body?.titulo);
    const descripcion = texto(req.body?.descripcion);
    const fecha = texto(req.body?.fecha);
    await verificarClase(req.usuario.id, materiaId, grado);

    if (titulo.length < 3 || titulo.length > 150) throw new ErrorUsuario(400, 'El título debe tener entre 3 y 150 caracteres');
    if (descripcion.length > 2000) throw new ErrorUsuario(400, 'La descripción es demasiado larga');
    if (!esFecha(fecha)) throw new ErrorUsuario(400, 'La fecha de entrega no es válida');

    const [resultado] = await db.query(
        'INSERT INTO tareas (materia_id, grado, docente_id, titulo, descripcion, fecha_entrega) VALUES (?, ?, ?, ?, ?, ?)',
        [materiaId, grado, req.usuario.id, titulo, descripcion, fecha]
    );
    res.status(201).json({ id: resultado.insertId, materiaId, grado, titulo, descripcion, fecha, entregas: 0 });
});

router.delete('/tareas/:id', async (req, res) => {
    const [r] = await db.query('DELETE FROM tareas WHERE id = ? AND docente_id = ?', [Number(req.params.id), req.usuario.id]);
    if (r.affectedRows === 0) throw new ErrorUsuario(404, 'La tarea no existe');
    res.json({ mensaje: 'Tarea eliminada' });
});

// ----- Eventos del calendario -----
router.post('/eventos', async (req, res) => {
    const titulo = texto(req.body?.titulo);
    const fecha = texto(req.body?.fecha);
    const tipo = texto(req.body?.tipo);
    const grado = gradoOpcional(req.body?.grado);

    if (titulo.length < 3 || titulo.length > 150) throw new ErrorUsuario(400, 'El título debe tener entre 3 y 150 caracteres');
    if (!esFecha(fecha)) throw new ErrorUsuario(400, 'La fecha no es válida');
    if (!TIPOS_EVENTO.includes(tipo)) throw new ErrorUsuario(400, 'El tipo de evento no es válido');

    const [resultado] = await db.query(
        'INSERT INTO eventos (titulo, fecha, tipo, grado, creado_por) VALUES (?, ?, ?, ?, ?)',
        [titulo, fecha, tipo, grado, req.usuario.id]
    );
    res.status(201).json({ id: resultado.insertId, titulo, fecha, tipo, grado, mio: true });
});

router.delete('/eventos/:id', async (req, res) => {
    const [r] = await db.query('DELETE FROM eventos WHERE id = ? AND creado_por = ?', [Number(req.params.id), req.usuario.id]);
    if (r.affectedRows === 0) throw new ErrorUsuario(404, 'Solo puedes eliminar los eventos que creaste');
    res.json({ mensaje: 'Evento eliminado' });
});

// ----- Comunicados -----
router.post('/comunicados', async (req, res) => {
    const titulo = texto(req.body?.titulo);
    const categoria = texto(req.body?.categoria);
    const contenido = texto(req.body?.contenido);
    const grado = gradoOpcional(req.body?.grado);

    if (titulo.length < 3 || titulo.length > 150) throw new ErrorUsuario(400, 'El título debe tener entre 3 y 150 caracteres');
    if (!CATEGORIAS.includes(categoria)) throw new ErrorUsuario(400, 'La categoría no es válida');
    if (contenido.length < 10 || contenido.length > 5000) {
        throw new ErrorUsuario(400, 'El comunicado debe tener entre 10 y 5000 caracteres');
    }

    const [[perfil]] = await db.query(
        "SELECT CONCAT_WS(' ', nombres, primer_apellido) AS nombre FROM perfiles WHERE usuario_id = ?",
        [req.usuario.id]
    );
    const autor = `Prof. ${perfil?.nombre || req.usuario.usuario}`;

    const [resultado] = await db.query(
        'INSERT INTO comunicados (titulo, autor, autor_id, categoria, grado, fecha, contenido) VALUES (?, ?, ?, ?, ?, CURDATE(), ?)',
        [titulo, autor, req.usuario.id, categoria, grado, contenido]
    );
    const [filas] = await db.query(
        'SELECT id, titulo, categoria, grado, fecha, contenido FROM comunicados WHERE id = ?',
        [resultado.insertId]
    );
    res.status(201).json(filas[0]);
});

router.delete('/comunicados/:id', async (req, res) => {
    const [r] = await db.query('DELETE FROM comunicados WHERE id = ? AND autor_id = ?', [Number(req.params.id), req.usuario.id]);
    if (r.affectedRows === 0) throw new ErrorUsuario(404, 'El comunicado no existe');
    res.json({ mensaje: 'Comunicado eliminado' });
});

module.exports = router;
