// Lectura del Excel de estudiantes y creación de la plantilla
const ExcelJS = require('exceljs');
const { texto, soloDigitos, normalizar, GRADOS } = require('./util');

// Columnas de la plantilla: [campo, título en el Excel, otros títulos aceptados, ancho]
const COLUMNAS = [
    ['documento', 'Documento del estudiante', ['documento', 'documento estudiante', 'numero de documento', 'identificacion'], 24, true],
    ['nombres', 'Nombres', ['nombre', 'nombres del estudiante'], 22, true],
    ['primerApellido', 'Primer apellido', ['apellido', 'primer apellido del estudiante'], 18, true],
    ['segundoApellido', 'Segundo apellido', [], 18, false],
    ['grado', 'Grado (6 a 11)', ['grado', 'curso'], 14, true],
    ['fechaNacimiento', 'Fecha de nacimiento', ['nacimiento'], 20, false],
    ['celular', 'Celular del estudiante', ['celular', 'celular estudiante', 'telefono'], 22, false],
    ['direccion', 'Dirección', ['direccion de residencia'], 28, false],
    ['acudienteNombre', 'Nombre del acudiente', ['acudiente', 'nombre acudiente'], 28, false],
    ['acudienteDocumento', 'Documento del acudiente', ['documento acudiente'], 24, false],
    ['acudienteParentesco', 'Parentesco', ['parentesco del acudiente'], 16, false],
    ['acudienteCelular', 'Celular del acudiente', ['celular acudiente', 'telefono acudiente'], 22, false],
    ['acudienteCorreo', 'Correo del acudiente', ['correo acudiente', 'email acudiente'], 28, false]
];

const NOMBRES_GRADO = {
    sexto: 6, septimo: 7, octavo: 8, noveno: 9, decimo: 10, once: 11, undecimo: 11, onceavo: 11
};

// Texto de una celda, sin importar si es número, fecha, fórmula o texto con formato
function valorCelda(celda) {
    const v = celda.value;
    if (v === null || v === undefined) return '';
    if (v instanceof Date) {
        // Excel guarda las fechas en UTC
        return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}-${String(v.getUTCDate()).padStart(2, '0')}`;
    }
    if (typeof v === 'object') {
        if (v.richText) return v.richText.map((t) => t.text).join('').trim();
        if (v.text) return String(v.text).trim();
        if ('result' in v) return v.result instanceof Date ? valorCelda({ value: v.result }) : String(v.result ?? '').trim();
        return '';
    }
    return String(v).trim();
}

function leerGrado(valor) {
    const digitos = soloDigitos(valor);
    if (digitos) return Number(digitos);
    return NOMBRES_GRADO[normalizar(valor)] ?? null;
}

// Acepta 2010-05-03, 03/05/2010 o 3-5-2010 (día/mes/año)
function leerFecha(valor) {
    const t = texto(valor);
    if (!t) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return undefined; // fecha con formato desconocido
}

// Lee el archivo y devuelve { filas: [{ fila, datos }], errores: [{ fila, mensaje }] }
async function leerEstudiantes(buffer) {
    const libro = new ExcelJS.Workbook();
    try {
        await libro.xlsx.load(buffer);
    } catch {
        throw new Error('El archivo no es un Excel válido (.xlsx)');
    }
    const hoja = libro.worksheets[0];
    if (!hoja) throw new Error('El archivo no tiene hojas');

    // Ubicar cada columna según el título de la primera fila
    const posiciones = {};
    hoja.getRow(1).eachCell((celda, numero) => {
        const titulo = normalizar(valorCelda(celda));
        for (const [campo, nombre, otros] of COLUMNAS) {
            if (posiciones[campo]) continue;
            if ([nombre, ...otros].map(normalizar).includes(titulo)) posiciones[campo] = numero;
        }
    });

    const faltantes = COLUMNAS.filter(([campo, , , , obligatoria]) => obligatoria && !posiciones[campo]).map((c) => c[1]);
    if (faltantes.length > 0) {
        throw new Error(`Faltan columnas en el Excel: ${faltantes.join(', ')}. Descarga la plantilla para ver el formato.`);
    }

    const filas = [];
    const errores = [];
    const documentosVistos = new Set();

    for (let n = 2; n <= hoja.rowCount; n++) {
        const fila = hoja.getRow(n);
        const datos = {};
        for (const [campo] of COLUMNAS) {
            datos[campo] = posiciones[campo] ? valorCelda(fila.getCell(posiciones[campo])) : '';
        }
        if (Object.values(datos).every((v) => v === '')) continue; // fila vacía

        datos.documento = soloDigitos(datos.documento);
        datos.acudienteDocumento = soloDigitos(datos.acudienteDocumento);
        datos.celular = soloDigitos(datos.celular);
        datos.acudienteCelular = soloDigitos(datos.acudienteCelular);
        datos.grado = leerGrado(datos.grado);
        const fecha = leerFecha(datos.fechaNacimiento);

        const problema =
            (datos.documento.length < 5 || datos.documento.length > 15) ? 'El documento debe tener entre 5 y 15 números' :
            !datos.nombres ? 'Falta el nombre' :
            !normalizar(datos.primerApellido) ? 'Falta el primer apellido' :
            !GRADOS.includes(datos.grado) ? 'El grado debe ser un número de 6 a 11' :
            fecha === undefined ? 'La fecha de nacimiento no se entiende (use día/mes/año)' :
            documentosVistos.has(datos.documento) ? 'El documento está repetido en el archivo' :
            null;

        if (problema) {
            errores.push({ fila: n, documento: datos.documento, mensaje: problema });
            continue;
        }
        documentosVistos.add(datos.documento);
        datos.fechaNacimiento = fecha;
        filas.push({ fila: n, datos });
    }

    if (filas.length + errores.length > 3000) {
        throw new Error('El archivo tiene demasiadas filas (máximo 3000)');
    }
    return { filas, errores };
}

// Plantilla vacía para que el colegio la llene
async function crearPlantilla() {
    const libro = new ExcelJS.Workbook();
    libro.creator = 'COLSAGRACO';

    const hoja = libro.addWorksheet('Estudiantes', { views: [{ state: 'frozen', ySplit: 1 }] });
    hoja.columns = COLUMNAS.map(([campo, titulo, , ancho]) => ({ header: titulo, key: campo, width: ancho }));

    const encabezado = hoja.getRow(1);
    encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    encabezado.alignment = { vertical: 'middle', wrapText: true };
    encabezado.height = 30;
    COLUMNAS.forEach(([, , , , obligatoria], i) => {
        encabezado.getCell(i + 1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: obligatoria ? 'FF0F3D22' : 'FF1B7A3D' }
        };
    });

    // Documentos y celulares como texto, para que Excel no los convierta en números raros
    for (const campo of ['documento', 'celular', 'acudienteDocumento', 'acudienteCelular']) {
        hoja.getColumn(campo).numFmt = '@';
    }
    hoja.dataValidations.add('E2:E3000', {
        type: 'list',
        allowBlank: false,
        formulae: ['"6,7,8,9,10,11"'],
        showErrorMessage: true,
        errorTitle: 'Grado no válido',
        error: 'Escriba un grado de 6 a 11'
    });

    const ayuda = libro.addWorksheet('Instrucciones');
    ayuda.getColumn(1).width = 110;
    [
        'INSTRUCCIONES PARA CARGAR ESTUDIANTES EN COLSAGRACO',
        '',
        '1. Llene la hoja "Estudiantes", un estudiante por fila. No cambie los títulos de la primera fila.',
        '2. Columnas obligatorias (verde oscuro): Documento, Nombres, Primer apellido y Grado (6 a 11).',
        '3. La fecha de nacimiento se escribe como día/mes/año, por ejemplo 03/05/2010.',
        '4. El celular del estudiante (o, si no tiene, el del acudiente) se usa para enviar el PIN de recuperación de contraseña.',
        '',
        'CÓMO INGRESA EL ESTUDIANTE',
        '- Usuario: su número de documento.',
        '- Contraseña inicial: su primer apellido en minúsculas y sin tildes + los dos primeros números del documento.',
        '  Ejemplo: Primer apellido "Pérez", documento 1098765432  ->  contraseña: perez10',
        '- La primera vez que ingrese, la plataforma le pedirá crear una contraseña nueva.',
        '',
        'Si un estudiante ya existe (mismo documento), se actualizan sus datos y su grado, pero NO su contraseña.'
    ].forEach((linea, i) => {
        const celda = ayuda.getCell(i + 1, 1);
        celda.value = linea;
        if (i === 0 || linea === 'CÓMO INGRESA EL ESTUDIANTE') celda.font = { bold: true, size: 13 };
    });

    return libro.xlsx.writeBuffer();
}

module.exports = { leerEstudiantes, crearPlantilla };
