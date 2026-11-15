// Inicio de sesión, recuperación y cambio de contraseña
const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../db');
const { conSesion } = require('../sesion');
// Se usa el módulo completo (sms.enviarSMS) para que las pruebas puedan reemplazar el envío
const sms = require('../sms');
const { texto, ErrorUsuario, limitar } = require('../util');

const router = express.Router();

const MINUTOS_PIN = 10;
const MAX_INTENTOS_PIN = 5;

function validarClaveNueva(nueva) {
    if (nueva.length < 6 || nueva.length > 100) {
        throw new ErrorUsuario(400, 'La nueva contraseña debe tener al menos 6 caracteres');
    }
}

// Muestra solo los últimos 4 números: "*** *** 4567"
function ocultarCelular(numero) {
    const digitos = String(numero).replace(/\D/g, '');
    return `*** *** ${digitos.slice(-4)}`;
}

// ---------- Iniciar sesión ----------
router.post('/login', async (req, res) => {
    const documento = texto(req.body?.documento);
    const contrasena = String(req.body?.contrasena ?? '');

    if (!documento || !contrasena) {
        throw new ErrorUsuario(400, 'Ingresa tu número de documento y tu contraseña');
    }
    limitar(`login:${req.ip}:${documento}`, 10, 15);

    const [filas] = await db.query(
        `SELECT u.id, u.usuario, u.contrasena, u.rol, u.debe_cambiar_clave, u.activo, p.nombres, p.primer_apellido
         FROM usuarios u LEFT JOIN perfiles p ON p.usuario_id = u.id
         WHERE u.usuario = ?`,
        [documento]
    );
    const u = filas[0];
    const coincide = u ? await bcrypt.compare(contrasena, u.contrasena).catch(() => false) : false;

    if (!coincide || !u.activo) {
        throw new ErrorUsuario(401, 'Documento o contraseña incorrectos');
    }

    const token = crypto.randomBytes(32).toString('hex');
    await db.query('INSERT INTO sesiones (token, usuario_id) VALUES (?, ?)', [token, u.id]);
    // Limpiar sesiones viejas
    await db.query('DELETE FROM sesiones WHERE creada < NOW() - INTERVAL 7 DAY');

    res.json({
        token,
        usuario: {
            id: u.id,
            documento: u.usuario,
            rol: u.rol,
            nombre: [u.nombres, u.primer_apellido].filter(Boolean).join(' ') || u.usuario,
            debeCambiarClave: Boolean(u.debe_cambiar_clave)
        }
    });
});

router.post('/logout', conSesion, async (req, res) => {
    await db.query('DELETE FROM sesiones WHERE token = ?', [req.token]);
    res.json({ mensaje: 'Sesión cerrada' });
});

// ---------- Cambiar contraseña (con la sesión iniciada) ----------
router.post('/cambiar-clave', conSesion, async (req, res) => {
    const actual = String(req.body?.actual ?? '');
    const nueva = String(req.body?.nueva ?? '');
    validarClaveNueva(nueva);
    limitar(`cambiar:${req.usuario.id}`, 10, 15);

    const [filas] = await db.query('SELECT contrasena FROM usuarios WHERE id = ?', [req.usuario.id]);
    const coincide = await bcrypt.compare(actual, filas[0].contrasena).catch(() => false);
    if (!coincide) {
        throw new ErrorUsuario(400, 'La contraseña actual no es correcta');
    }
    if (actual === nueva) {
        throw new ErrorUsuario(400, 'La nueva contraseña debe ser diferente a la actual');
    }

    await db.query('UPDATE usuarios SET contrasena = ?, debe_cambiar_clave = 0 WHERE id = ?', [
        await bcrypt.hash(nueva, 10),
        req.usuario.id
    ]);
    // Cerrar las demás sesiones abiertas de este usuario
    await db.query('DELETE FROM sesiones WHERE usuario_id = ? AND token <> ?', [req.usuario.id, req.token]);

    res.json({ mensaje: 'Contraseña actualizada correctamente' });
});

// ---------- Actualizar datos de contacto (cualquier rol) ----------
router.put('/cuenta/contacto', conSesion, async (req, res) => {
    const celular = texto(req.body?.celular).replace(/[^\d+ ]/g, '');
    const correo = texto(req.body?.correo);
    const direccion = texto(req.body?.direccion);

    if (celular && celular.replace(/\D/g, '').length < 7) {
        throw new ErrorUsuario(400, 'El número de celular no es válido');
    }
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        throw new ErrorUsuario(400, 'El correo electrónico no es válido');
    }
    if (celular.length > 20 || correo.length > 120 || direccion.length > 150) {
        throw new ErrorUsuario(400, 'Algún dato es demasiado largo');
    }

    await db.query('INSERT IGNORE INTO perfiles (usuario_id) VALUES (?)', [req.usuario.id]);
    await db.query('UPDATE perfiles SET celular = ?, correo = ?, direccion = ? WHERE usuario_id = ?', [
        celular,
        correo,
        direccion,
        req.usuario.id
    ]);
    res.json({ celular, correo, direccion });
});

// ---------- Recuperar contraseña con PIN por SMS ----------
router.post('/recuperar/solicitar', async (req, res) => {
    const documento = texto(req.body?.documento);
    if (!documento) {
        throw new ErrorUsuario(400, 'Ingresa tu número de documento');
    }
    limitar(`pin-ip:${req.ip}`, 10, 15);
    limitar(`pin-doc:${documento}`, 3, 15);

    const [filas] = await db.query(
        `SELECT u.id, p.celular, p.acudiente_celular
         FROM usuarios u LEFT JOIN perfiles p ON p.usuario_id = u.id
         WHERE u.usuario = ? AND u.activo = 1`,
        [documento]
    );
    if (filas.length === 0) {
        throw new ErrorUsuario(404, 'No encontramos una cuenta con ese número de documento');
    }

    // Se usa el celular del estudiante; si no tiene, el del acudiente
    const celular = filas[0].celular || filas[0].acudiente_celular;
    if (!celular) {
        throw new ErrorUsuario(400, 'Tu cuenta no tiene un celular registrado. Acércate a la secretaría del colegio.');
    }

    const pin = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await db.query('UPDATE recuperaciones SET usado = 1 WHERE usuario_id = ? AND usado = 0', [filas[0].id]);
    await db.query(
        'INSERT INTO recuperaciones (usuario_id, pin_hash, expira) VALUES (?, ?, NOW() + INTERVAL ? MINUTE)',
        [filas[0].id, await bcrypt.hash(pin, 10), MINUTOS_PIN]
    );

    await sms.enviarSMS(
        celular,
        `COLSAGRACO: tu PIN para cambiar la contraseña es ${pin}. Vence en ${MINUTOS_PIN} minutos. No lo compartas.`
    );

    res.json({
        mensaje: `Enviamos un PIN de 6 números al celular ${ocultarCelular(celular)}`,
        minutos: MINUTOS_PIN
    });
});

router.post('/recuperar/cambiar', async (req, res) => {
    const documento = texto(req.body?.documento);
    const pin = texto(req.body?.pin);
    const nueva = String(req.body?.nueva ?? '');
    validarClaveNueva(nueva);
    limitar(`pin-cambiar:${req.ip}`, 20, 15);

    const [filas] = await db.query(
        `SELECT r.id, r.pin_hash, r.intentos, u.id AS usuario_id
         FROM recuperaciones r JOIN usuarios u ON u.id = r.usuario_id
         WHERE u.usuario = ? AND r.usado = 0 AND r.expira > NOW()
         ORDER BY r.id DESC LIMIT 1`,
        [documento]
    );
    const r = filas[0];
    if (!r || r.intentos >= MAX_INTENTOS_PIN) {
        throw new ErrorUsuario(400, 'El PIN venció o ya no es válido. Solicita uno nuevo.');
    }

    if (!(await bcrypt.compare(pin, r.pin_hash))) {
        await db.query('UPDATE recuperaciones SET intentos = intentos + 1 WHERE id = ?', [r.id]);
        const quedan = MAX_INTENTOS_PIN - r.intentos - 1;
        throw new ErrorUsuario(
            400,
            quedan > 0 ? `El PIN no es correcto. Te quedan ${quedan} intentos.` : 'El PIN no es correcto. Solicita uno nuevo.'
        );
    }

    await db.query('UPDATE usuarios SET contrasena = ?, debe_cambiar_clave = 0 WHERE id = ?', [
        await bcrypt.hash(nueva, 10),
        r.usuario_id
    ]);
    await db.query('UPDATE recuperaciones SET usado = 1 WHERE id = ?', [r.id]);
    await db.query('DELETE FROM sesiones WHERE usuario_id = ?', [r.usuario_id]);

    res.json({ mensaje: 'Contraseña cambiada. Ya puedes iniciar sesión con tu nueva contraseña.' });
});

module.exports = router;
