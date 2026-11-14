// Funciones de ayuda del servidor

const GRADOS = [6, 7, 8, 9, 10, 11];

const texto = (valor) => String(valor ?? '').trim();
const esFecha = (valor) => /^\d{4}-\d{2}-\d{2}$/.test(valor);
const esGrado = (valor) => GRADOS.includes(Number(valor));
const soloDigitos = (valor) => texto(valor).replace(/\D/g, '');

// Quita tildes, espacios y mayúsculas: "Peña Ruíz" -> "penaruiz"
function normalizar(valor) {
    return texto(valor)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

// Contraseña inicial: primer apellido (sin tildes, en minúscula) + dos primeros números del documento.
// Ejemplo: apellido "Pérez", documento 1098765432 -> "perez10"
function claveGenerica(primerApellido, documento) {
    return normalizar(primerApellido) + soloDigitos(documento).slice(0, 2);
}

// Error que se muestra tal cual al usuario (con su código HTTP)
class ErrorUsuario extends Error {
    constructor(estado, mensaje) {
        super(mensaje);
        this.estado = estado;
    }
}

// Limita intentos repetidos (inicio de sesión, PIN) para evitar que adivinen claves
const intentos = new Map();
function limitar(clave, maximo, minutos) {
    const ahora = Date.now();
    const registro = intentos.get(clave);
    if (!registro || registro.vence < ahora) {
        intentos.set(clave, { cantidad: 1, vence: ahora + minutos * 60000 });
        return;
    }
    registro.cantidad += 1;
    if (registro.cantidad > maximo) {
        throw new ErrorUsuario(429, `Demasiados intentos. Espera ${minutos} minutos e inténtalo de nuevo.`);
    }
}

module.exports = {
    GRADOS,
    texto,
    esFecha,
    esGrado,
    soloDigitos,
    normalizar,
    claveGenerica,
    ErrorUsuario,
    limitar
};
