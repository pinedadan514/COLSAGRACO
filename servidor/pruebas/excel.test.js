// Pruebas unitarias del módulo excel.js (lectura del Excel de estudiantes y plantilla)
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { leerEstudiantes, crearPlantilla } = require('../excel');

const ENCABEZADOS = [
    'Documento del estudiante', 'Nombres', 'Primer apellido', 'Segundo apellido', 'Grado (6 a 11)',
    'Fecha de nacimiento', 'Celular del estudiante', 'Dirección', 'Nombre del acudiente',
    'Documento del acudiente', 'Parentesco', 'Celular del acudiente', 'Correo del acudiente'
];

async function excelCon(filas, encabezados = ENCABEZADOS) {
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet('Estudiantes');
    hoja.addRow(encabezados);
    filas.forEach((f) => hoja.addRow(f));
    return Buffer.from(await libro.xlsx.writeBuffer());
}

describe('Módulo excel: crearPlantilla()', () => {
    it('genera un Excel con la hoja Estudiantes y las 13 columnas', async () => {
        const libro = new ExcelJS.Workbook();
        await libro.xlsx.load(await crearPlantilla());
        const hoja = libro.getWorksheet('Estudiantes');
        assert.ok(hoja, 'debe existir la hoja Estudiantes');
        assert.equal(hoja.getRow(1).cellCount, 13);
        assert.equal(hoja.getCell('A1').value, 'Documento del estudiante');
        assert.ok(libro.getWorksheet('Instrucciones'), 'debe traer la hoja de instrucciones');
    });

    it('la plantilla vacía se puede volver a leer sin errores', async () => {
        const r = await leerEstudiantes(Buffer.from(await crearPlantilla()));
        assert.deepEqual(r, { filas: [], errores: [] });
    });
});

describe('Módulo excel: leerEstudiantes()', () => {
    it('lee un estudiante válido y normaliza sus datos', async () => {
        const r = await leerEstudiantes(await excelCon([
            ['1.098.765.432', 'Ana María', 'Peña', 'Ruíz', '10°', '03/05/2010', '300 111 2233', 'Cra 1', 'Luz Ruíz', '52000000', 'Madre', '3009998877', 'luz@correo.com']
        ]));
        assert.equal(r.errores.length, 0);
        assert.equal(r.filas.length, 1);
        const d = r.filas[0].datos;
        assert.equal(d.documento, '1098765432');
        assert.equal(d.grado, 10);
        assert.equal(d.fechaNacimiento, '2010-05-03');
        assert.equal(d.celular, '3001112233');
        assert.equal(d.acudienteNombre, 'Luz Ruíz');
    });

    it('acepta grados escritos en palabras y fechas reales de Excel', async () => {
        const r = await leerEstudiantes(await excelCon([
            ['1000000002', 'Luis', 'Gómez', '', 'décimo', new Date(Date.UTC(2009, 0, 15))],
            ['1000000003', 'Sofía', 'Díaz', '', 'once']
        ]));
        assert.equal(r.errores.length, 0);
        assert.equal(r.filas[0].datos.grado, 10);
        assert.equal(r.filas[0].datos.fechaNacimiento, '2009-01-15');
        assert.equal(r.filas[1].datos.grado, 11);
    });

    it('reporta las filas con errores indicando el número de fila', async () => {
        const r = await leerEstudiantes(await excelCon([
            ['123', 'Corto', 'Documento', '', 10],
            ['1000000010', '', 'SinNombre', '', 10],
            ['1000000011', 'Sin', '', '', 10],
            ['1000000012', 'Grado', 'Malo', '', 13],
            ['1000000013', 'Fecha', 'Mala', '', 7, '2010/31/31'],
            ['1000000014', 'Bueno', 'Uno', '', 6],
            ['1000000014', 'Repetido', 'Uno', '', 6]
        ]));
        assert.equal(r.filas.length, 1);
        assert.deepEqual(r.errores.map((e) => e.fila), [2, 3, 4, 5, 6, 8]);
        assert.match(r.errores[0].mensaje, /entre 5 y 15/);
        assert.match(r.errores[3].mensaje, /6 a 11/);
        assert.match(r.errores[5].mensaje, /repetido/);
    });

    it('ignora las filas vacías', async () => {
        const r = await leerEstudiantes(await excelCon([[], ['1000000020', 'Ana', 'Ruiz', '', 8], []]));
        assert.equal(r.filas.length, 1);
        assert.equal(r.errores.length, 0);
    });

    it('informa las columnas obligatorias que faltan', async () => {
        await assert.rejects(leerEstudiantes(await excelCon([], ['Documento', 'Nombres'])), /Primer apellido.*Grado/);
    });

    it('rechaza un archivo que no es Excel', async () => {
        await assert.rejects(leerEstudiantes(Buffer.from('esto no es un excel')), /no es un Excel válido/);
    });
});
