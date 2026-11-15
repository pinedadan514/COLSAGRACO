// Pruebas unitarias del módulo util.js (funciones de ayuda)
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const util = require('../util');

describe('Módulo util: normalizar()', () => {
    it('quita tildes, espacios y mayúsculas', () => {
        assert.equal(util.normalizar('  Peña Ruíz '), 'penaruiz');
    });
    it('devuelve texto vacío si recibe null o undefined', () => {
        assert.equal(util.normalizar(null), '');
        assert.equal(util.normalizar(undefined), '');
    });
});

describe('Módulo util: claveGenerica()', () => {
    it('une el primer apellido normalizado con los dos primeros números del documento', () => {
        assert.equal(util.claveGenerica('Pérez', '1098765432'), 'perez10');
    });
    it('ignora puntos y espacios del documento', () => {
        assert.equal(util.claveGenerica('Gómez', '1.098.765.432'), 'gomez10');
    });
    it('funciona con apellidos compuestos', () => {
        assert.equal(util.claveGenerica('De la Torre', '52000000'), 'delatorre52');
    });
});

describe('Módulo util: validaciones', () => {
    it('esGrado acepta solo grados de 6 a 11', () => {
        for (const g of [6, 7, 8, 9, 10, 11, '10']) assert.equal(util.esGrado(g), true, `grado ${g}`);
        for (const g of [5, 12, 0, 'once', null]) assert.equal(util.esGrado(g), false, `grado ${g}`);
    });
    it('esFecha acepta solo el formato AAAA-MM-DD', () => {
        assert.equal(util.esFecha('2026-11-15'), true);
        assert.equal(util.esFecha('15/11/2026'), false);
        assert.equal(util.esFecha(''), false);
    });
    it('soloDigitos elimina todo lo que no sea número', () => {
        assert.equal(util.soloDigitos('300 123-4567'), '3001234567');
    });
    it('texto recorta espacios y convierte null en vacío', () => {
        assert.equal(util.texto('  hola  '), 'hola');
        assert.equal(util.texto(null), '');
    });
});

describe('Módulo util: limitar()', () => {
    beforeEach(() => util.reiniciarLimites());

    it('permite intentos hasta el máximo', () => {
        for (let i = 0; i < 3; i++) util.limitar('prueba', 3, 15);
    });
    it('lanza error 429 al superar el máximo', () => {
        for (let i = 0; i < 3; i++) util.limitar('prueba', 3, 15);
        assert.throws(() => util.limitar('prueba', 3, 15), (e) => e instanceof util.ErrorUsuario && e.estado === 429);
    });
    it('cuenta por separado cada clave', () => {
        for (let i = 0; i < 3; i++) util.limitar('a', 3, 15);
        util.limitar('b', 3, 15);
    });
});

describe('Módulo util: ErrorUsuario', () => {
    it('guarda el código HTTP y el mensaje', () => {
        const e = new util.ErrorUsuario(404, 'No existe');
        assert.equal(e.estado, 404);
        assert.equal(e.message, 'No existe');
        assert.ok(e instanceof Error);
    });
});
