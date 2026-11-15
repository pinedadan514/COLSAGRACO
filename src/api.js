// Comunicación con el servidor de COLSAGRACO

// Dirección del servidor:
// - En desarrollo (npm run dev) la página corre en el puerto 5173 y la API en el 3000.
// - En producción el mismo servidor entrega la página y la API, así que basta con la ruta.
// - Se puede cambiar con VITE_API_URL en un archivo .env
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3000');

const CLAVE_SESION = 'colsagraco:sesion';

export function leerSesion() {
  try {
    const sesion = JSON.parse(sessionStorage.getItem(CLAVE_SESION));
    return sesion?.token && sesion?.usuario?.rol ? sesion : null;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion) {
  sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
}

export function borrarSesion() {
  sessionStorage.removeItem(CLAVE_SESION);
}

// Error con el código HTTP, para saber si la sesión expiró (401)
export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.estado = estado;
  }
}

// Hace una petición al servidor y devuelve la respuesta en JSON.
// Si hay sesión, envía el token automáticamente.
export async function pedir(ruta, { metodo = 'GET', cuerpo } = {}) {
  const sesion = leerSesion();
  let respuesta;

  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(sesion ? { Authorization: `Bearer ${sesion.token}` } : {})
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined
    });
  } catch {
    throw new ErrorApi('No fue posible conectar con el servidor.', 0);
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new ErrorApi(datos.mensaje || 'Ocurrió un error en el servidor.', respuesta.status);
  }
  return datos;
}

// Descarga un archivo del servidor (por ejemplo, la plantilla de Excel)
export async function descargar(ruta, nombreArchivo) {
  const sesion = leerSesion();
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    headers: sesion ? { Authorization: `Bearer ${sesion.token}` } : {}
  }).catch(() => {
    throw new ErrorApi('No fue posible conectar con el servidor.', 0);
  });
  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => ({}));
    throw new ErrorApi(datos.mensaje || 'No se pudo descargar el archivo.', respuesta.status);
  }

  const url = URL.createObjectURL(await respuesta.blob());
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
