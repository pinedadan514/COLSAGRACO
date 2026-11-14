// Chat entre estudiantes y docentes
const express = require('express');
const db = require('../db');
const { conSesion, soloRol } = require('../sesion');
const { texto, ErrorUsuario } = require('../util');

const router = express.Router();
router.use(conSesion, soloRol('estudiante', 'docente'));

const CAMPOS = `id, estudiante_id AS estudianteId, docente_id AS docenteId, remitente, texto, leido, fecha`;
const formato = (m) => ({ ...m, leido: Boolean(m.leido) });

// Un estudiante solo puede escribir a docentes de su grado, y un docente
// solo a estudiantes de los grados en los que dicta clase.
async function puedenHablar(estudianteId, docenteId) {
    const [filas] = await db.query(
        `SELECT 1 FROM perfiles p
         JOIN usuarios u ON u.id = p.usuario_id AND u.rol = 'estudiante'
         JOIN asignaciones a ON a.grado = p.grado AND a.docente_id = ?
         WHERE p.usuario_id = ? LIMIT 1`,
        [docenteId, estudianteId]
    );
    return filas.length > 0;
}

// Mensajes del usuario (se consulta cada cierto tiempo para ver respuestas nuevas)
router.get('/', async (req, res) => {
    const columna = req.usuario.rol === 'estudiante' ? 'estudiante_id' : 'docente_id';
    const [filas] = await db.query(
        `SELECT ${CAMPOS} FROM mensajes WHERE ${columna} = ? ORDER BY fecha, id`,
        [req.usuario.id]
    );
    res.json(filas.map(formato));
});

// Enviar un mensaje: { para: id del otro usuario, texto }
router.post('/', async (req, res) => {
    const para = Number(req.body?.para);
    const contenido = texto(req.body?.texto);
    if (!contenido || contenido.length > 1000) {
        throw new ErrorUsuario(400, 'El mensaje debe tener entre 1 y 1000 caracteres');
    }

    const soyEstudiante = req.usuario.rol === 'estudiante';
    const estudianteId = soyEstudiante ? req.usuario.id : para;
    const docenteId = soyEstudiante ? para : req.usuario.id;

    if (!(await puedenHablar(estudianteId, docenteId))) {
        throw new ErrorUsuario(403, 'No puedes enviar mensajes a este usuario');
    }

    const [resultado] = await db.query(
        'INSERT INTO mensajes (estudiante_id, docente_id, remitente, texto) VALUES (?, ?, ?, ?)',
        [estudianteId, docenteId, req.usuario.rol, contenido]
    );
    const [filas] = await db.query(`SELECT ${CAMPOS} FROM mensajes WHERE id = ?`, [resultado.insertId]);
    res.status(201).json(formato(filas[0]));
});

// Marcar como leídos los mensajes recibidos de una persona: { con: id del otro usuario }
router.post('/leidos', async (req, res) => {
    const con = Number(req.body?.con);
    const soyEstudiante = req.usuario.rol === 'estudiante';
    await db.query(
        `UPDATE mensajes SET leido = 1
         WHERE ${soyEstudiante ? 'estudiante_id' : 'docente_id'} = ?
           AND ${soyEstudiante ? 'docente_id' : 'estudiante_id'} = ?
           AND remitente <> ?`,
        [req.usuario.id, con, req.usuario.rol]
    );
    res.json({ mensaje: 'Mensajes leídos' });
});

module.exports = router;
