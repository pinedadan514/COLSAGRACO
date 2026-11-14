// Envío de mensajes de texto (SMS)
//
// MODO PRUEBA (por defecto): el mensaje se muestra en la consola del servidor.
// MODO REAL con Twilio: crea un archivo servidor/.env con estas líneas:
//     TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
//     TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
//     TWILIO_FROM=+1xxxxxxxxxx
// y reinicia el servidor con "npm start".

const { soloDigitos } = require('./util');

// Convierte un celular colombiano de 10 dígitos al formato internacional (+57...)
function formatoInternacional(numero) {
    const digitos = soloDigitos(numero);
    if (digitos.length === 10) return `+57${digitos}`;
    return `+${digitos}`;
}

function modoReal() {
    return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
}

async function enviarSMS(numero, mensaje) {
    const destino = formatoInternacional(numero);

    if (!modoReal()) {
        console.log('\n================ SMS (modo prueba) ================');
        console.log(`Para: ${destino}`);
        console.log(mensaje);
        console.log('===================================================\n');
        return;
    }

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const respuesta = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
            Authorization: 'Basic ' + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ To: destino, From: process.env.TWILIO_FROM, Body: mensaje })
    });

    if (!respuesta.ok) {
        console.error('Error de Twilio:', await respuesta.text());
        throw new Error('No se pudo enviar el SMS');
    }
}

module.exports = { enviarSMS };
