// Prepara la base de datos de COLSAGRACO.
// Uso:  npm run preparar-bd
// - Crea las tablas que falten (se puede ejecutar varias veces sin perder datos).
// - Si encuentra la versión anterior de la base de datos (registro libre de
//   usuarios), la actualiza: borra las cuentas y los datos de ejemplo viejos.
// - Carga el catálogo de materias.
// - Crea las cuentas de prueba (estudiante, docente y administrador).

const bcrypt = require('bcrypt');
const db = require('./db');
const { claveGenerica } = require('./util');

const TABLAS = [
    `CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario VARCHAR(50) NOT NULL UNIQUE,
        contrasena VARCHAR(255) NOT NULL,
        rol ENUM('estudiante', 'docente', 'administrativo') NOT NULL DEFAULT 'estudiante',
        debe_cambiar_clave TINYINT(1) NOT NULL DEFAULT 1,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        fecha_registro TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS perfiles (
        usuario_id INT PRIMARY KEY,
        documento VARCHAR(20) NOT NULL DEFAULT '',
        nombres VARCHAR(80) NOT NULL DEFAULT '',
        primer_apellido VARCHAR(60) NOT NULL DEFAULT '',
        segundo_apellido VARCHAR(60) NOT NULL DEFAULT '',
        grado TINYINT NULL,
        fecha_nacimiento DATE NULL,
        celular VARCHAR(20) NOT NULL DEFAULT '',
        correo VARCHAR(120) NOT NULL DEFAULT '',
        direccion VARCHAR(150) NOT NULL DEFAULT '',
        acudiente_nombre VARCHAR(120) NOT NULL DEFAULT '',
        acudiente_documento VARCHAR(20) NOT NULL DEFAULT '',
        acudiente_parentesco VARCHAR(40) NOT NULL DEFAULT '',
        acudiente_celular VARCHAR(20) NOT NULL DEFAULT '',
        acudiente_correo VARCHAR(120) NOT NULL DEFAULT '',
        INDEX (grado),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS sesiones (
        token CHAR(64) PRIMARY KEY,
        usuario_id INT NOT NULL,
        creada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS recuperaciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        pin_hash VARCHAR(255) NOT NULL,
        expira DATETIME NOT NULL,
        intentos TINYINT NOT NULL DEFAULT 0,
        usado TINYINT(1) NOT NULL DEFAULT 0,
        creada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS materias (
        id VARCHAR(10) PRIMARY KEY,
        nombre VARCHAR(80) NOT NULL,
        color CHAR(7) NOT NULL DEFAULT '#1b7a3d',
        orden TINYINT NOT NULL DEFAULT 0
    )`,
    // Qué materia dicta cada docente y en qué grados (una materia por grado tiene un solo docente)
    `CREATE TABLE IF NOT EXISTS asignaciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        docente_id INT NOT NULL,
        materia_id VARCHAR(10) NOT NULL,
        grado TINYINT NOT NULL,
        UNIQUE KEY materia_grado (materia_id, grado),
        FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS notas (
        estudiante_id INT NOT NULL,
        materia_id VARCHAR(10) NOT NULL,
        nota DECIMAL(2,1) NOT NULL,
        docente_id INT NULL,
        actualizada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (estudiante_id, materia_id),
        FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
        FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS asistencia (
        estudiante_id INT NOT NULL,
        materia_id VARCHAR(10) NOT NULL,
        fecha DATE NOT NULL,
        estado ENUM('Presente', 'Falta', 'Tardanza', 'Excusa') NOT NULL,
        observacion VARCHAR(150) NOT NULL DEFAULT '',
        docente_id INT NULL,
        PRIMARY KEY (estudiante_id, materia_id, fecha),
        FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
        FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS tareas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        materia_id VARCHAR(10) NOT NULL,
        grado TINYINT NOT NULL,
        docente_id INT NOT NULL,
        titulo VARCHAR(150) NOT NULL,
        descripcion TEXT,
        fecha_entrega DATE NOT NULL,
        INDEX (grado),
        FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
        FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS tareas_entregadas (
        usuario_id INT NOT NULL,
        tarea_id INT NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (usuario_id, tarea_id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE
    )`,
    // grado NULL = para todo el colegio
    `CREATE TABLE IF NOT EXISTS eventos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(150) NOT NULL,
        fecha DATE NOT NULL,
        tipo ENUM('evaluacion', 'evento', 'festivo') NOT NULL DEFAULT 'evento',
        grado TINYINT NULL,
        creado_por INT NULL,
        FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS comunicados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(150) NOT NULL,
        autor VARCHAR(120) NOT NULL,
        autor_id INT NULL,
        categoria VARCHAR(40) NOT NULL,
        grado TINYINT NULL,
        fecha DATE NOT NULL,
        contenido TEXT NOT NULL,
        FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS comunicados_leidos (
        usuario_id INT NOT NULL,
        comunicado_id INT NOT NULL,
        PRIMARY KEY (usuario_id, comunicado_id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (comunicado_id) REFERENCES comunicados(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS mensajes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        estudiante_id INT NOT NULL,
        docente_id INT NOT NULL,
        remitente ENUM('estudiante', 'docente') NOT NULL,
        texto TEXT NOT NULL,
        leido TINYINT(1) NOT NULL DEFAULT 0,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (estudiante_id),
        INDEX (docente_id),
        FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS permisos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        tipo VARCHAR(60) NOT NULL,
        desde DATE NOT NULL,
        hasta DATE NOT NULL,
        motivo TEXT NOT NULL,
        estado ENUM('En revisión', 'Aprobado', 'Rechazado') NOT NULL DEFAULT 'En revisión',
        enviada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )`
];

// [id, nombre, color]
const MATERIAS = [
    ['mat', 'Matemáticas', '#2563eb'],
    ['esp', 'Lengua Castellana', '#d7261e'],
    ['nat', 'Ciencias Naturales', '#1b7a3d'],
    ['soc', 'Ciencias Sociales', '#e8730c'],
    ['ing', 'Inglés', '#7c3aed'],
    ['tec', 'Tecnología e Informática', '#0891b2'],
    ['edf', 'Educación Física', '#ca8a04'],
    ['eti', 'Ética y Valores', '#be185d'],
    ['rel', 'Educación Religiosa', '#9333ea'],
    ['art', 'Educación Artística', '#db2777'],
    ['qui', 'Química', '#059669'],
    ['fis', 'Física', '#4f46e5'],
    ['fil', 'Filosofía', '#64748b'],
    ['pol', 'Ciencias Políticas y Económicas', '#b45309']
];

// Cuentas para hacer pruebas. Contraseña = primer apellido + 2 primeros números del documento.
const CUENTAS_PRUEBA = [
    {
        rol: 'estudiante',
        documento: '1000000001',
        nombres: 'Estudiante',
        primerApellido: 'Prueba',
        segundoApellido: 'Colsagraco',
        grado: 10,
        celular: '3000000001',
        acudienteNombre: 'Acudiente de Prueba',
        acudienteCelular: '3000000011',
        acudienteParentesco: 'Madre'
    },
    {
        rol: 'docente',
        documento: '2000000002',
        nombres: 'Docente',
        primerApellido: 'Prueba',
        segundoApellido: 'Colsagraco',
        celular: '3000000002',
        // Para que el estudiante de prueba tenga algo que ver desde el inicio
        asignaciones: [['mat', 10], ['mat', 11], ['fis', 10]]
    },
    {
        rol: 'administrativo',
        documento: '3000000003',
        nombres: 'Administrador',
        primerApellido: 'Prueba',
        segundoApellido: 'Colsagraco',
        celular: '3000000003'
    }
];

async function existeTabla(tabla) {
    const [filas] = await db.query(
        'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
        [tabla]
    );
    return filas.length > 0;
}

async function existeColumna(tabla, columna) {
    const [filas] = await db.query(
        'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
        [tabla, columna]
    );
    return filas.length > 0;
}

// Actualiza la base de datos de la versión anterior (sin roles) a la nueva
async function actualizarVersionAnterior() {
    if (!(await existeTabla('usuarios')) || (await existeColumna('usuarios', 'rol'))) return;

    const [usuarios] = await db.query('SELECT usuario FROM usuarios');
    console.log('Se encontró la versión anterior de la base de datos. Actualizando...');
    console.log(`  - Se borran las cuentas anteriores: ${usuarios.map((u) => u.usuario).join(', ') || '(ninguna)'}`);
    console.log('  - Se borran las tablas de la versión anterior (datos de ejemplo).');

    const viejas = [
        'sesiones', 'notas', 'tareas_entregadas', 'tareas', 'asistencia', 'novedades_asistencia',
        'comunicados_leidos', 'comunicados', 'mensajes', 'permisos', 'perfiles', 'eventos', 'materias'
    ];
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const tabla of viejas) {
        await db.query(`DROP TABLE IF EXISTS ${tabla}`);
    }
    await db.query('DELETE FROM usuarios');
    await db.query('ALTER TABLE usuarios AUTO_INCREMENT = 1');
    await db.query(
        `ALTER TABLE usuarios
            ADD COLUMN rol ENUM('estudiante', 'docente', 'administrativo') NOT NULL DEFAULT 'estudiante' AFTER contrasena,
            ADD COLUMN debe_cambiar_clave TINYINT(1) NOT NULL DEFAULT 1 AFTER rol,
            ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1 AFTER debe_cambiar_clave`
    );
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function cargarMaterias() {
    const [filas] = await db.query('SELECT COUNT(*) AS total FROM materias');
    if (filas[0].total > 0) return;
    await db.query('INSERT INTO materias (id, nombre, color, orden) VALUES ?', [
        MATERIAS.map((m, i) => [...m, i + 1])
    ]);
    console.log(`  + ${MATERIAS.length} materias`);
}

async function crearCuentasDePrueba() {
    for (const c of CUENTAS_PRUEBA) {
        const [existe] = await db.query('SELECT id FROM usuarios WHERE usuario = ?', [c.documento]);
        if (existe.length > 0) {
            console.log(`  = ${c.rol}: ${c.documento} (ya existía)`);
            continue;
        }

        const clave = await bcrypt.hash(claveGenerica(c.primerApellido, c.documento), 10);
        // Las cuentas de prueba no piden cambiar la contraseña, para poder reutilizarlas
        const [resultado] = await db.query(
            'INSERT INTO usuarios (usuario, contrasena, rol, debe_cambiar_clave) VALUES (?, ?, ?, 0)',
            [c.documento, clave, c.rol]
        );
        const id = resultado.insertId;
        await db.query(
            `INSERT INTO perfiles (usuario_id, documento, nombres, primer_apellido, segundo_apellido, grado,
                celular, acudiente_nombre, acudiente_celular, acudiente_parentesco)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, c.documento, c.nombres, c.primerApellido, c.segundoApellido, c.grado ?? null,
                c.celular, c.acudienteNombre ?? '', c.acudienteCelular ?? '', c.acudienteParentesco ?? ''
            ]
        );
        for (const [materia, grado] of c.asignaciones ?? []) {
            await db.query(
                'INSERT IGNORE INTO asignaciones (docente_id, materia_id, grado) VALUES (?, ?, ?)',
                [id, materia, grado]
            );
        }
        console.log(`  + ${c.rol}: ${c.documento}`);
    }
}

async function principal() {
    await actualizarVersionAnterior();

    console.log('Creando tablas...');
    for (const sql of TABLAS) {
        await db.query(sql);
    }

    console.log('Cargando catálogo de materias...');
    await cargarMaterias();

    console.log('Cuentas de prueba (ver CUENTAS-DE-PRUEBA.md):');
    await crearCuentasDePrueba();

    console.log('¡Base de datos lista!');
}

principal()
    .catch((error) => {
        console.error('Error:', error.message);
        process.exitCode = 1;
    })
    .finally(() => db.end());
