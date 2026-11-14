// Panel del administrador: carga de estudiantes por Excel y cuentas de docentes
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { conSesion, soloRol } = require('../sesion');
const { leerEstudiantes, crearPlantilla } = require('../excel');
const { texto, soloDigitos, normalizar, esGrado, claveGenerica, ErrorUsuario } = require('../util');

const router = express.Router();
router.use(conSesion, soloRol('administrativo'));

const NOMBRE = "CONCAT_WS(' ', p.nombres, p.primer_apellido, NULLIF(p.segundo_apellido, ''))";

// Resumen: estudiantes por grado y lista de docentes con lo que dictan
router.get('/', async (req, res) => {
    const [[porGrado], [docentes], [asignaciones], [perfil]] = await Promise.all([
        db.query(
            `SELECT p.grado, COUNT(*) AS total FROM usuarios u JOIN perfiles p ON p.usuario_id = u.id
             WHERE u.rol = 'estudiante' GROUP BY p.grado ORDER BY p.grado`
        ),
        db.query(
            `SELECT u.id, p.documento, ${NOMBRE} AS nombre, p.celular, p.correo, u.debe_cambiar_clave AS debeCambiarClave
             FROM usuarios u JOIN perfiles p ON p.usuario_id = u.id
             WHERE u.rol = 'docente' ORDER BY p.primer_apellido, p.nombres`
        ),
        db.query(
            `SELECT a.docente_id AS docenteId, m.nombre AS materia, a.grado
             FROM asignaciones a JOIN materias m ON m.id = a.materia_id ORDER BY m.orden, a.grado`
        ),
        db.query(
            `SELECT ${NOMBRE} AS nombre, p.celular, p.correo, p.direccion FROM perfiles p WHERE p.usuario_id = ?`,
            [req.usuario.id]
        )
    ]);

    const p = perfil[0] || {};
    res.json({
        usuario: { id: req.usuario.id, documento: req.usuario.usuario },
        perfil: { nombreCompleto: p.nombre || '', celular: p.celular || '', correo: p.correo || '', direccion: p.direccion || '' },
        porGrado: porGrado.map((g) => ({ grado: g.grado, total: Number(g.total) })),
        docentes: docentes.map((d) => ({
            ...d,
            debeCambiarClave: Boolean(d.debeCambiarClave),
            asignaciones: asignaciones.filter((a) => a.docenteId === d.id).map((a) => `${a.materia} ${a.grado}°`)
        }))
    });
});

router.get('/estudiantes', async (req, res) => {
    const grado = Number(req.query.grado);
    const [filas] = await db.query(
        `SELECT u.id, p.documento, ${NOMBRE} AS nombre, p.grado, p.celular,
                p.acudiente_nombre AS acudiente, p.acudiente_celular AS acudienteCelular,
                u.debe_cambiar_clave AS debeCambiarClave
         FROM usuarios u JOIN perfiles p ON p.usuario_id = u.id
         WHERE u.rol = 'estudiante' ${esGrado(grado) ? 'AND p.grado = ?' : ''}
         ORDER BY p.grado, p.primer_apellido, p.segundo_apellido, p.nombres`,
        esGrado(grado) ? [grado] : []
    );
    res.json(filas.map((f) => ({ ...f, debeCambiarClave: Boolean(f.debeCambiarClave) })));
});

// Descargar la plantilla de Excel
router.get('/plantilla', async (req, res) => {
    const archivo = await crearPlantilla();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-estudiantes-colsagraco.xlsx"');
    res.send(Buffer.from(archivo));
});

// Importar estudiantes: { archivo: "<contenido del Excel en base64>" }
router.post('/importar', async (req, res) => {
    const base64 = texto(req.body?.archivo);
    if (!base64) throw new ErrorUsuario(400, 'Selecciona un archivo de Excel');

    let lectura;
    try {
        lectura = await leerEstudiantes(Buffer.from(base64, 'base64'));
    } catch (error) {
        throw new ErrorUsuario(400, error.message);
    }

    const resultado = { creados: 0, actualizados: 0, errores: lectura.errores };

    for (const { fila, datos: d } of lectura.filas) {
        try {
            const [existe] = await db.query('SELECT id, rol FROM usuarios WHERE usuario = ?', [d.documento]);
            const perfil = [
                d.documento, d.nombres, d.primerApellido, d.segundoApellido, d.grado, d.fechaNacimiento,
                d.celular, d.direccion, d.acudienteNombre, d.acudienteDocumento, d.acudienteParentesco,
                d.acudienteCelular, d.acudienteCorreo
            ];

            if (existe.length > 0) {
                if (existe[0].rol !== 'estudiante') {
                    resultado.errores.push({ fila, documento: d.documento, mensaje: 'Ese documento pertenece a un docente o administrador' });
                    continue;
                }
                await db.query(
                    `UPDATE perfiles SET documento = ?, nombres = ?, primer_apellido = ?, segundo_apellido = ?, grado = ?,
                        fecha_nacimiento = ?, celular = ?, direccion = ?, acudiente_nombre = ?, acudiente_documento = ?,
                        acudiente_parentesco = ?, acudiente_celular = ?, acudiente_correo = ?
                     WHERE usuario_id = ?`,
                    [...perfil, existe[0].id]
                );
                resultado.actualizados++;
            } else {
                const clave = await bcrypt.hash(claveGenerica(d.primerApellido, d.documento), 10);
                const [nuevo] = await db.query(
                    "INSERT INTO usuarios (usuario, contrasena, rol, debe_cambiar_clave) VALUES (?, ?, 'estudiante', 1)",
                    [d.documento, clave]
                );
                await db.query(
                    `INSERT INTO perfiles (usuario_id, documento, nombres, primer_apellido, segundo_apellido, grado,
                        fecha_nacimiento, celular, direccion, acudiente_nombre, acudiente_documento,
                        acudiente_parentesco, acudiente_celular, acudiente_correo)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [nuevo.insertId, ...perfil]
                );
                resultado.creados++;
            }
        } catch (error) {
            console.error(error);
            resultado.errores.push({ fila, documento: d.documento, mensaje: 'No se pudo guardar (revise que los datos no sean demasiado largos)' });
        }
    }

    resultado.errores.sort((a, b) => a.fila - b.fila);
    res.json(resultado);
});

// Crear cuenta de docente
router.post('/docentes', async (req, res) => {
    const documento = soloDigitos(req.body?.documento);
    const nombres = texto(req.body?.nombres);
    const primerApellido = texto(req.body?.primerApellido);
    const segundoApellido = texto(req.body?.segundoApellido);
    const celular = soloDigitos(req.body?.celular);
    const correo = texto(req.body?.correo);

    if (documento.length < 5 || documento.length > 15) throw new ErrorUsuario(400, 'El documento debe tener entre 5 y 15 números');
    if (!nombres || nombres.length > 80) throw new ErrorUsuario(400, 'Escribe los nombres del docente');
    if (!normalizar(primerApellido) || primerApellido.length > 60) throw new ErrorUsuario(400, 'Escribe el primer apellido del docente');
    if (segundoApellido.length > 60) throw new ErrorUsuario(400, 'El segundo apellido es demasiado largo');
    if (celular && celular.length < 7) throw new ErrorUsuario(400, 'El celular no es válido');
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new ErrorUsuario(400, 'El correo no es válido');

    const claveInicial = claveGenerica(primerApellido, documento);
    try {
        const [nuevo] = await db.query(
            "INSERT INTO usuarios (usuario, contrasena, rol, debe_cambiar_clave) VALUES (?, ?, 'docente', 1)",
            [documento, await bcrypt.hash(claveInicial, 10)]
        );
        await db.query(
            `INSERT INTO perfiles (usuario_id, documento, nombres, primer_apellido, segundo_apellido, celular, correo)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [nuevo.insertId, documento, nombres, primerApellido, segundoApellido, celular, correo]
        );
        res.status(201).json({ id: nuevo.insertId, claveInicial });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') throw new ErrorUsuario(409, 'Ya existe una cuenta con ese documento');
        throw error;
    }
});

// Volver a la contraseña inicial (para quien no tiene celular para recuperar)
router.post('/usuarios/:id/restablecer', async (req, res) => {
    const [filas] = await db.query(
        `SELECT u.id, u.rol, p.primer_apellido, p.documento FROM usuarios u
         JOIN perfiles p ON p.usuario_id = u.id WHERE u.id = ?`,
        [Number(req.params.id)]
    );
    const u = filas[0];
    if (!u || u.rol === 'administrativo') throw new ErrorUsuario(404, 'El usuario no existe');

    const clave = claveGenerica(u.primer_apellido, u.documento);
    await db.query('UPDATE usuarios SET contrasena = ?, debe_cambiar_clave = 1 WHERE id = ?', [await bcrypt.hash(clave, 10), u.id]);
    await db.query('DELETE FROM sesiones WHERE usuario_id = ?', [u.id]);
    res.json({ clave });
});

module.exports = router;
