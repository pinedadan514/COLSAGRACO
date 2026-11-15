// Configuración común de las pruebas de la página web
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom (el navegador simulado de las pruebas) no tiene scrollIntoView
Element.prototype.scrollIntoView = () => {};

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Simula el servidor: rutas = { 'GET /api/estudiante': (cuerpo, url) => [estado, respuesta] }
// Devuelve la lista de peticiones recibidas para revisarlas en la prueba.
export function servidorFalso(rutas) {
  const peticiones = [];
  vi.stubGlobal('fetch', vi.fn((url, opciones = {}) => {
    const metodo = opciones.method || 'GET';
    const ruta = url.replace('http://localhost:3000', '').split('?')[0];
    const cuerpo = opciones.body ? JSON.parse(opciones.body) : undefined;
    peticiones.push({ metodo, ruta, url, cuerpo });
    const clave = Object.keys(rutas).find((k) => {
      const [m, patron] = k.split(' ');
      return m === metodo && new RegExp(`^${patron.replace(/:\w+/g, '[^/]+')}$`).test(ruta);
    });
    if (!clave) return respuesta(404, { mensaje: `Sin simular: ${metodo} ${ruta}` });
    const [estado, datos] = rutas[clave](cuerpo, url);
    return respuesta(estado, datos);
  }));
  return peticiones;
}

// Fecha AAAA-MM-DD a n días de hoy
export function fecha(dias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Respuesta falsa de fetch para simular el servidor
export function respuesta(estado, cuerpo) {
  return Promise.resolve({
    ok: estado >= 200 && estado < 300,
    status: estado,
    json: () => Promise.resolve(cuerpo)
  });
}
