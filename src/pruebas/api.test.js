// Pruebas unitarias del módulo api.js (comunicación con el servidor y sesión)
import { describe, it, expect, vi } from 'vitest';
import { pedir, leerSesion, guardarSesion, borrarSesion, ErrorApi } from '../api.js';
import { respuesta } from './configuracion.js';

const SESION = { token: 'abc123', usuario: { id: 1, rol: 'estudiante', nombre: 'Ana' } };

describe('API: sesión en el navegador', () => {
  it('guarda, lee y borra la sesión', () => {
    expect(leerSesion()).toBeNull();
    guardarSesion(SESION);
    expect(leerSesion()).toEqual(SESION);
    borrarSesion();
    expect(leerSesion()).toBeNull();
  });

  it('ignora una sesión incompleta o dañada', () => {
    sessionStorage.setItem('colsagraco:sesion', JSON.stringify({ token: 'x' }));
    expect(leerSesion()).toBeNull();
    sessionStorage.setItem('colsagraco:sesion', '{no es json');
    expect(leerSesion()).toBeNull();
  });
});

describe('API: pedir()', () => {
  it('envía JSON y el token de la sesión', async () => {
    guardarSesion(SESION);
    const fetchFalso = vi.fn(() => respuesta(200, { ok: true }));
    vi.stubGlobal('fetch', fetchFalso);

    const datos = await pedir('/api/estudiante/permisos', { metodo: 'POST', cuerpo: { tipo: 'Otro' } });

    expect(datos).toEqual({ ok: true });
    const [url, opciones] = fetchFalso.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/estudiante/permisos');
    expect(opciones.method).toBe('POST');
    expect(opciones.headers.Authorization).toBe('Bearer abc123');
    expect(JSON.parse(opciones.body)).toEqual({ tipo: 'Otro' });
  });

  it('sin sesión no envía el encabezado Authorization', async () => {
    const fetchFalso = vi.fn(() => respuesta(200, {}));
    vi.stubGlobal('fetch', fetchFalso);
    await pedir('/api/login', { metodo: 'POST', cuerpo: {} });
    expect(fetchFalso.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('lanza ErrorApi con el mensaje y el código del servidor', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta(401, { mensaje: 'La sesión expiró' })));
    const error = await pedir('/api/estudiante').catch((e) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error.message).toBe('La sesión expiró');
    expect(error.estado).toBe(401);
  });

  it('informa cuando no hay conexión con el servidor (estado 0)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
    const error = await pedir('/api/login').catch((e) => e);
    expect(error.estado).toBe(0);
    expect(error.message).toMatch(/No fue posible conectar/);
  });
});
