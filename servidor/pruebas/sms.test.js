// Pruebas unitarias del módulo sms.js (envío del PIN por mensaje de texto)
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const sms = require('../sms');

describe('Módulo sms: formatoInternacional()', () => {
    it('agrega +57 a un celular colombiano de 10 dígitos', () => {
        assert.equal(sms.formatoInternacional('300 123 4567'), '+573001234567');
    });
    it('respeta un número que ya trae indicativo', () => {
        assert.equal(sms.formatoInternacional('+57 3001234567'), '+573001234567');
    });
});

describe('Módulo sms: enviarSMS() en modo prueba', () => {
    beforeEach(() => {
        delete process.env.TWILIO_ACCOUNT_SID;
        delete process.env.TWILIO_AUTH_TOKEN;
        delete process.env.TWILIO_FROM;
    });

    it('no está en modo real si faltan las claves de Twilio', () => {
        assert.equal(sms.modoReal(), false);
    });

    it('muestra el mensaje en la consola en lugar de enviarlo', async (t) => {
        const consola = t.mock.method(console, 'log', () => {});
        const red = t.mock.method(globalThis, 'fetch', async () => ({ ok: true }));
        await sms.enviarSMS('3001234567', 'Tu PIN es 123456');
        const impreso = consola.mock.calls.map((c) => c.arguments.join(' ')).join('\n');
        assert.match(impreso, /\+573001234567/);
        assert.match(impreso, /Tu PIN es 123456/);
        assert.equal(red.mock.callCount(), 0, 'no debe llamar a internet en modo prueba');
    });
});

describe('Módulo sms: enviarSMS() con Twilio', () => {
    it('llama a la API de Twilio con el número y el mensaje', async (t) => {
        process.env.TWILIO_ACCOUNT_SID = 'AC123';
        process.env.TWILIO_AUTH_TOKEN = 'secreto';
        process.env.TWILIO_FROM = '+15550001111';
        const red = t.mock.method(globalThis, 'fetch', async () => ({ ok: true }));
        await sms.enviarSMS('3001234567', 'Hola');
        const [url, opciones] = red.mock.calls[0].arguments;
        assert.match(url, /Accounts\/AC123\/Messages\.json$/);
        assert.equal(opciones.body.get('To'), '+573001234567');
        assert.equal(opciones.body.get('Body'), 'Hola');
        delete process.env.TWILIO_ACCOUNT_SID;
    });

    it('lanza un error si Twilio rechaza el envío', async (t) => {
        process.env.TWILIO_ACCOUNT_SID = 'AC123';
        process.env.TWILIO_AUTH_TOKEN = 'secreto';
        process.env.TWILIO_FROM = '+15550001111';
        t.mock.method(console, 'error', () => {});
        t.mock.method(globalThis, 'fetch', async () => ({ ok: false, text: async () => 'error' }));
        await assert.rejects(sms.enviarSMS('3001234567', 'Hola'), /No se pudo enviar el SMS/);
        delete process.env.TWILIO_ACCOUNT_SID;
    });
});
