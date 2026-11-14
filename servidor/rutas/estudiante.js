// Plataforma del estudiante
const express = require('express');
const db = require('../db');
const { conSesion, soloRol } = require('../sesion');
const { texto, esFecha, ErrorUsuario } = require('../util');

const router = express.Router();
router.use(conSesion, soloRol('estudiante'));

const TIPOS_PERMISO = [
    'Cita médica',
    'Calamidad doméstica',
    'Actividad deportiva o cultural',
    'Viaje familiar',
    'Otro'
];

function perfilPublico(p = {}) {
    return {
        documento: p.documento || '',
        nombres: p.nombres || '',
        primerApellido: p.primer_apellido || '',
        segundoApellido: p.segundo_apellido || '',
        nombreCompleto: [p.nombres, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' '),
        grado: p.grado ?? null,
        fechaNacimiento: p.fecha_nacimiento || '',
        celular: p.celular || '',
        correo: p.correo || '',
        direccion: p.direccion || '',
        acudienteNombre: p.acudiente_nombre || '',
        acudienteDocumento: p.acudiente_documento || '',
        acudienteParentesco: p.acudiente_parentesco || '',
        acudienteCelular: p.acudiente_celular || '',
        acudienteCorreo: p.acudiente_correo || ''
    };
}

// Toda la información de la plataforma del estudiante en una sola petición
router.get('/', async (req, res) => {
    const id = req.usuario.id;
    const grado = req.usuario.grado;

    const [
        [perfiles],
        [materias],
        [tareas],
        [eventos],
        [asistencia],
        [novedades],
        [comunicados],
        [mensajes],
        [permisos]
    ] = await Promise.all([
        db.query('SELECT * FROM perfiles WHERE usuario_id = ?', [id]),
        db.query(
            `SELECT m.id, m.nombre, m.color, a.docente_id AS docenteId,
                    CONCAT_WS(' ', p.nombres, p.primer_apellido) AS docente, n.nota
             FROM asignaciones a
             JOIN materias m ON m.id = a.materia_id
             JOIN perfiles p ON p.usuario_id = a.docente_id
             LEFT JOIN notas n ON n.materia_id = m.id AND n.estudiante_id = ?
             WHERE a.grado = ?
             ORDER BY m.orden`,
            [id, grado]
        ),
        db.query(
            `SELECT t.id, t.materia_id AS materiaId, t.titulo, t.descripcion, t.fecha_entrega AS fecha,
                    (te.tarea_id IS NOT NULL) AS entregada
             FROM tareas t
             LEFT JOIN tareas_entregadas te ON te.tarea_id = t.id AND te.usuario_id = ?
             WHERE t.grado = ?
             ORDER BY t.fecha_entrega`,
            [id, grado]
        ),
        db.query(
            'SELECT id, titulo, fecha, tipo, grado FROM eventos WHERE grado IS NULL OR grado = ? ORDER BY fecha',
            [grado]
        ),
        db.query(
            `SELECT materia_id AS materiaId, COUNT(*) AS clases,
                    SUM(estado IN ('Presente', 'Tardanza')) AS asistidas,
                    SUM(estado = 'Tardanza') AS tardanzas
             FROM asistencia WHERE estudiante_id = ? GROUP BY materia_id`,
            [id]
        ),
        db.query(
            `SELECT CONCAT(materia_id, '-', fecha) AS id, materia_id AS materiaId, fecha, estado, observacion AS nota
             FROM asistencia WHERE estudiante_id = ? AND estado <> 'Presente'
             ORDER BY fecha DESC LIMIT 15`,
            [id]
        ),
        db.query(
            `SELECT c.id, c.titulo, c.autor, c.categoria, c.fecha, c.contenido, c.grado,
                    (cl.comunicado_id IS NOT NULL) AS leido
             FROM comunicados c
             LEFT JOIN comunicados_leidos cl ON cl.comunicado_id = c.id AND cl.usuario_id = ?
             WHERE c.grado IS NULL OR c.grado = ?
             ORDER BY c.fecha DESC, c.id DESC`,
            [id, grado]
        ),
        db.query(
            `SELECT id, estudiante_id AS estudianteId, docente_id AS docenteId, remitente, texto, leido, fecha
             FROM mensajes WHERE estudiante_id = ? ORDER BY fecha, id`,
            [id]
        ),
        db.query(
            'SELECT id, tipo, desde, hasta, motivo, estado, enviada FROM permisos WHERE usuario_id = ? ORDER BY enviada DESC, id DESC',
            [id]
        )
    ]);

    // Docentes del grado (para el chat), con las materias que dicta en ese grado
    const docentes = [];
    for (const m of materias) {
        let d = docentes.find((x) => x.id === m.docenteId);
        if (!d) {
            d = { id: m.docenteId, nombre: m.docente, color: m.color, materias: [] };
            docentes.push(d);
        }
        d.materias.push(m.nombre);
    }

    res.json({
        usuario: { id, documento: req.usuario.usuario },
        perfil: perfilPublico(perfiles[0]),
        materias: materias.map((m) => ({ ...m, nota: m.nota === null ? null : Number(m.nota) })),
        tareas: tareas.map((t) => ({ ...t, entregada: Boolean(t.entregada) })),
        eventos,
        asistencia: asistencia.map((a) => ({
            ...a,
            asistidas: Number(a.asistidas),
            tardanzas: Number(a.tardanzas)
        })),
        novedades,
        comunicados: comunicados.map((c) => ({ ...c, leido: Boolean(c.leido) })),
        mensajes: mensajes.map((m) => ({ ...m, leido: Boolean(m.leido) })),
        docentes,
        permisos,
        tiposPermiso: TIPOS_PERMISO
    });
});

// ----- Tareas -----
router.put('/tareas/:id/entrega', async (req, res) => {
    const tareaId = Number(req.params.id);
    const entregada = Boolean(req.body?.entregada);

    const [tarea] = await db.query('SELECT id FROM tareas WHERE id = ? AND grado = ?', [tareaId, req.usuario.grado]);
    if (tarea.length === 0) throw new ErrorUsuario(404, 'La tarea no existe');

    if (entregada) {
        await db.query('INSERT IGNORE INTO tareas_entregadas (usuario_id, tarea_id) VALUES (?, ?)', [req.usuario.id, tareaId]);
    } else {
        await db.query('DELETE FROM tareas_entregadas WHERE usuario_id = ? AND tarea_id = ?', [req.usuario.id, tareaId]);
    }
    res.json({ id: tareaId, entregada });
});

// ----- Comunicados -----
router.post('/comunicados/leidos', async (req, res) => {
    // Recibe { ids: [1, 2] } o, si no se envían ids, marca todos como leídos
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : null;
    if (ids && ids.length === 0) return res.json({ mensaje: 'Sin cambios' });

    await db.query(
        `INSERT IGNORE INTO comunicados_leidos (usuario_id, comunicado_id)
         SELECT ?, id FROM comunicados WHERE (grado IS NULL OR grado = ?) ${ids ? 'AND id IN (?)' : ''}`,
        ids ? [req.usuario.id, req.usuario.grado, ids] : [req.usuario.id, req.usuario.grado]
    );
    res.json({ mensaje: 'Comunicados marcados como leídos' });
});

// ----- Solicitudes de permiso -----
router.post('/permisos', async (req, res) => {
    const tipo = texto(req.body?.tipo);
    const desde = texto(req.body?.desde);
    const hasta = texto(req.body?.hasta);
    const motivo = texto(req.body?.motivo);

    if (!TIPOS_PERMISO.includes(tipo)) throw new ErrorUsuario(400, 'Tipo de permiso no válido');
    if (!esFecha(desde) || !esFecha(hasta)) throw new ErrorUsuario(400, 'Las fechas no son válidas');
    if (hasta < desde) throw new ErrorUsuario(400, 'La fecha final no puede ser anterior a la fecha inicial');
    if (motivo.length < 10 || motivo.length > 1000) {
        throw new ErrorUsuario(400, 'Describe el motivo con al menos 10 caracteres');
    }

    const [resultado] = await db.query(
        'INSERT INTO permisos (usuario_id, tipo, desde, hasta, motivo) VALUES (?, ?, ?, ?, ?)',
        [req.usuario.id, tipo, desde, hasta, motivo]
    );
    const [filas] = await db.query(
        'SELECT id, tipo, desde, hasta, motivo, estado, enviada FROM permisos WHERE id = ?',
        [resultado.insertId]
    );
    res.status(201).json(filas[0]);
});

router.delete('/permisos/:id', async (req, res) => {
    // Solo se pueden cancelar las solicitudes propias que siguen en revisión
    const [resultado] = await db.query(
        "DELETE FROM permisos WHERE id = ? AND usuario_id = ? AND estado = 'En revisión'",
        [Number(req.params.id), req.usuario.id]
    );
    if (resultado.affectedRows === 0) throw new ErrorUsuario(404, 'La solicitud no existe o ya fue revisada');
    res.json({ mensaje: 'Solicitud cancelada' });
});

module.exports = router;
