// Verificación de sesión y de rol
const db = require('./db');

// Horas que dura una sesión antes de pedir ingresar de nuevo
const HORAS_SESION = 12;

// Revisa el token y deja el usuario en req.usuario
async function conSesion(req, res, next) {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) {
        return res.status(401).json({ mensaje: 'Debe iniciar sesión' });
    }

    const [filas] = await db.query(
        `SELECT u.id, u.usuario, u.rol, u.debe_cambiar_clave AS debeCambiarClave, p.grado
         FROM sesiones s
         JOIN usuarios u ON u.id = s.usuario_id
         LEFT JOIN perfiles p ON p.usuario_id = u.id
         WHERE s.token = ? AND u.activo = 1 AND s.creada > NOW() - INTERVAL ? HOUR`,
        [token, HORAS_SESION]
    );
    if (filas.length === 0) {
        return res.status(401).json({ mensaje: 'La sesión expiró, ingrese de nuevo' });
    }

    req.usuario = { ...filas[0], debeCambiarClave: Boolean(filas[0].debeCambiarClave) };
    req.token = token;
    next();
}

// Solo deja pasar a los roles indicados (y a quien ya cambió su contraseña inicial)
function soloRol(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.usuario.rol)) {
            return res.status(403).json({ mensaje: 'No tienes permiso para esta sección' });
        }
        if (req.usuario.debeCambiarClave) {
            return res.status(403).json({ mensaje: 'Debes cambiar tu contraseña antes de continuar' });
        }
        next();
    };
}

module.exports = { conSesion, soloRol };
